const express = require('express');
const http = require('http');
const zlib = require('zlib');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const onvif = require('node-onvif');
const db = require('./db');
const { startMjpegStream, isValidStreamUrl, stopAllSessions } = require('./transcoder');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('\n================================================================');
  console.error('FATAL ERROR: Environment variable JWT_SECRET is missing or too short.');
  console.error('JWT_SECRET must be at least 32 characters long for security.');
  console.error('Example generation: openssl rand -hex 32');
  console.error('================================================================\n');
  process.exit(1);
}

app.disable('x-powered-by');

// Security headers & lightweight native Gzip compression for JSON/HTML/CSS/JS (never compresses MJPEG streams)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  if (req.path.startsWith('/api/streams/')) {
    return next();
  }

  const acceptEncoding = req.headers['accept-encoding'] || '';
  if (!acceptEncoding.includes('gzip')) {
    return next();
  }

  const origJson = res.json.bind(res);
  res.json = (body) => {
    const payload = Buffer.from(JSON.stringify(body), 'utf8');
    if (payload.length < 1024) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.send(payload);
    }
    zlib.gzip(payload, (err, compressed) => {
      if (err) {
        return origJson(body);
      }
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Content-Encoding', 'gzip');
      res.setHeader('Vary', 'Accept-Encoding');
      res.send(compressed);
    });
  };
  next();
});

app.use(express.json({ limit: '64kb' }));

// Optimized Static File Serving with ETag & tiered Cache-Control headers
app.use(express.static(path.join(__dirname, '../public'), {
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    if (filePath.includes(`${path.sep}icons${path.sep}`) || filePath.endsWith('.svg') || filePath.endsWith('.png')) {
      res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400'); // 7 days for icons
    } else if (filePath.endsWith('.css') || filePath.endsWith('.js')) {
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate'); // instant ETag validation
    }
  }
}));

// Promisified SQLite helpers for non-blocking async/await & Promise.all parallelization
const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
});

const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
});

const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function (err) {
    if (err) reject(err);
    else resolve({ lastID: this.lastID, changes: this.changes });
  });
});

// Ultra-fast In-Memory Camera Cache (eliminates DB roundtrips on /api/cameras and /api/streams/mjpeg/:id)
let camerasCache = null;
let camerasByIdCache = new Map();

async function getCachedCameras() {
  if (camerasCache !== null) {
    return camerasCache;
  }
  const rows = await dbAll('SELECT id, name, url, stream_type, refresh_interval FROM cameras ORDER BY id ASC');
  camerasCache = rows;
  camerasByIdCache = new Map(rows.map(r => [r.id, r]));
  return rows;
}

async function getCachedCameraById(id) {
  if (camerasCache === null) {
    await getCachedCameras();
  }
  return camerasByIdCache.get(id) || null;
}

function invalidateCameraCache() {
  camerasCache = null;
  camerasByIdCache.clear();
}

// Middleware: Authenticate JWT
function authenticateToken(req, res, next) {
  // Can be in header OR query parameter (for MJPEG <img> tags)
  const authHeader = req.headers['authorization'];
  const token = (authHeader && authHeader.split(' ')[1]) || req.query.token;

  if (!token) return res.status(401).json({ error: 'Access token missing' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
}

const VALID_ROLES = ['admin', 'coadmin', 'moderator', 'user'];

// Middleware: Require Admin or CoAdmin for User Management
function requireUserManager(req, res, next) {
  if (req.user.role !== 'admin' && req.user.role !== 'coadmin') {
    return res.status(403).json({ error: 'Administrator or Co-Administrator permissions required' });
  }
  next();
}

// === AUTH API ===

// Login (Non-blocking async bcrypt verification)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const user = await dbGet(
      'SELECT id, username, password, role, can_view_cameras, can_edit_cameras FROM users WHERE username = ?',
      [String(username).trim()]
    );
    if (!user) return res.status(400).json({ error: 'User not found' });

    const passwordIsValid = await bcrypt.compare(String(password), user.password);
    if (!passwordIsValid) return res.status(401).json({ error: 'Invalid password' });

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, can_view: user.can_view_cameras, can_edit: user.can_edit_cameras },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        can_view: user.can_view_cameras === 1,
        can_edit: user.can_edit_cameras === 1
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Change own password (Non-blocking async bcrypt compare + hash)
app.put('/api/auth/password', authenticateToken, async (req, res) => {
  try {
    if (req.user.role === 'stream-viewer') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    const user = await dbGet('SELECT id, password FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const passwordIsValid = await bcrypt.compare(String(currentPassword), user.password);
    if (!passwordIsValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hash = await bcrypt.hash(String(newPassword), 10);
    await dbRun('UPDATE users SET password = ? WHERE id = ?', [hash, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === USER MANAGEMENT API (Admin & CoAdmin) ===

// List users
app.get('/api/users', authenticateToken, requireUserManager, async (req, res) => {
  try {
    const rows = await dbAll('SELECT id, username, role, can_edit_cameras, can_view_cameras FROM users ORDER BY id ASC');
    res.json(rows.map(r => ({
      id: r.id,
      username: r.username,
      role: r.role,
      can_edit: r.can_edit_cameras === 1,
      can_view: r.can_view_cameras === 1
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create user (Non-blocking async bcrypt hash)
app.post('/api/users', authenticateToken, requireUserManager, async (req, res) => {
  try {
    const { username, password, role } = req.body || {};
    const trimmedUsername = username ? String(username).trim() : '';
    if (!trimmedUsername || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const userRole = VALID_ROLES.includes(role) ? role : 'user';

    // CoAdmin can only create moderator or user
    if (req.user.role === 'coadmin' && (userRole === 'admin' || userRole === 'coadmin')) {
      return res.status(403).json({ error: 'Co-Administrators can only create Moderator or User accounts' });
    }

    const rawCanEdit = req.body.can_edit !== undefined ? req.body.can_edit : req.body.can_edit_cameras;
    const rawCanView = req.body.can_view !== undefined ? req.body.can_view : req.body.can_view_cameras;

    const defaultEdit = ['admin', 'coadmin', 'moderator'].includes(userRole);
    const editPermission = (rawCanEdit !== undefined ? Boolean(rawCanEdit) : defaultEdit) ? 1 : 0;
    const viewPermission = (rawCanView !== undefined ? Boolean(rawCanView) : true) ? 1 : 0;

    const hash = await bcrypt.hash(String(password), 10);

    try {
      const result = await dbRun(
        'INSERT INTO users (username, password, role, can_edit_cameras, can_view_cameras) VALUES (?, ?, ?, ?, ?)',
        [trimmedUsername, hash, userRole, editPermission, viewPermission]
      );
      res.json({ success: true, userId: result.lastID });
    } catch (insertErr) {
      return res.status(400).json({ error: 'Username already exists' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update user (Parallel DB queries via Promise.all + non-blocking async bcrypt)
async function handleUpdateUser(req, res) {
  try {
    const targetId = parseInt(req.params.id, 10);
    if (Number.isNaN(targetId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const { username, password, role } = req.body || {};

    // Parallel lookup of target user and total admin count
    const [targetUser, adminCountRow] = await Promise.all([
      dbGet('SELECT id, username, role, can_edit_cameras, can_view_cameras FROM users WHERE id = ?', [targetId]),
      dbGet('SELECT COUNT(*) as adminCount FROM users WHERE role = ?', ['admin'])
    ]);

    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    // CoAdmin restrictions: cannot edit admin or coadmin accounts, and cannot promote anyone to admin or coadmin
    if (req.user.role === 'coadmin') {
      if (targetUser.role === 'admin' || targetUser.role === 'coadmin') {
        return res.status(403).json({ error: 'Co-Administrators cannot modify Admin or Co-Admin accounts' });
      }
      if (role === 'admin' || role === 'coadmin') {
        return res.status(403).json({ error: 'Co-Administrators cannot assign Admin or Co-Admin roles' });
      }
    }

    const nextRole = role && VALID_ROLES.includes(role) ? role : targetUser.role;
    const nextUsername = username !== undefined && String(username).trim() !== '' ? String(username).trim() : targetUser.username;

    const rawCanEdit = req.body.can_edit !== undefined ? req.body.can_edit : req.body.can_edit_cameras;
    const rawCanView = req.body.can_view !== undefined ? req.body.can_view : req.body.can_view_cameras;
    const editPermission = rawCanEdit !== undefined ? (rawCanEdit ? 1 : 0) : targetUser.can_edit_cameras;
    const viewPermission = rawCanView !== undefined ? (rawCanView ? 1 : 0) : targetUser.can_view_cameras;

    // Prevent user from demoting their own role
    if (targetId === req.user.id && nextRole !== targetUser.role) {
      return res.status(400).json({ error: 'You cannot change your own role' });
    }

    // If demoting an admin, ensure at least one admin remains
    if (targetUser.role === 'admin' && nextRole !== 'admin' && (!adminCountRow || adminCountRow.adminCount <= 1)) {
      return res.status(400).json({ error: 'Cannot demote the last remaining Administrator' });
    }

    try {
      if (password && String(password).length > 0) {
        const hash = await bcrypt.hash(String(password), 10);
        await dbRun(
          'UPDATE users SET username = ?, password = ?, role = ?, can_edit_cameras = ?, can_view_cameras = ? WHERE id = ?',
          [nextUsername, hash, nextRole, editPermission, viewPermission, targetId]
        );
      } else {
        await dbRun(
          'UPDATE users SET username = ?, role = ?, can_edit_cameras = ?, can_view_cameras = ? WHERE id = ?',
          [nextUsername, nextRole, editPermission, viewPermission, targetId]
        );
      }
      res.json({ success: true });
    } catch (updateErr) {
      return res.status(400).json({ error: 'Username already exists or update failed' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

app.put('/api/users/:id', authenticateToken, requireUserManager, handleUpdateUser);
app.put('/api/users/:id/permissions', authenticateToken, requireUserManager, handleUpdateUser);

// Delete user (Parallel DB queries via Promise.all)
app.delete('/api/users/:id', authenticateToken, requireUserManager, async (req, res) => {
  try {
    const targetId = parseInt(req.params.id, 10);
    if (Number.isNaN(targetId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    if (targetId === req.user.id) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    const [targetUser, adminCountRow] = await Promise.all([
      dbGet('SELECT id, role FROM users WHERE id = ?', [targetId]),
      dbGet('SELECT COUNT(*) as adminCount FROM users WHERE role = ?', ['admin'])
    ]);

    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    if (req.user.role === 'coadmin' && (targetUser.role === 'admin' || targetUser.role === 'coadmin')) {
      return res.status(403).json({ error: 'Co-Administrators cannot delete Admin or Co-Admin accounts' });
    }

    if (targetUser.role === 'admin' && (!adminCountRow || adminCountRow.adminCount <= 1)) {
      return res.status(400).json({ error: 'Cannot delete the last remaining Administrator' });
    }

    await dbRun('DELETE FROM users WHERE id = ?', [targetId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === CAMERA MANAGEMENT API ===

const VALID_STREAM_TYPES = ['auto', 'rtsp', 'mjpeg', 'hls', 'snapshot'];

// List cameras (Served from sub-millisecond In-Memory Cache)
app.get('/api/cameras', authenticateToken, async (req, res) => {
  try {
    if (req.user.role === 'stream-viewer' || req.user.can_view !== 1) {
      return res.status(403).json({ error: 'No permission to view cameras' });
    }
    const rows = await getCachedCameras();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add camera
app.post('/api/cameras', authenticateToken, async (req, res) => {
  try {
    if (req.user.can_edit !== 1) {
      return res.status(403).json({ error: 'No permission to edit cameras' });
    }
    const { name, url, stream_type, refresh_interval } = req.body || {};
    const trimmedName = name ? String(name).trim() : '';
    const trimmedUrl = url ? String(url).trim() : '';

    if (!trimmedName || !trimmedUrl) {
      return res.status(400).json({ error: 'Camera name and URL required' });
    }
    if (!isValidStreamUrl(trimmedUrl)) {
      return res.status(400).json({ error: 'Invalid URL protocol. Only rtsp://, rtsps://, http://, and https:// are allowed.' });
    }

    const sType = VALID_STREAM_TYPES.includes(stream_type) ? stream_type : 'auto';
    const rInterval = Math.min(3600, Math.max(1, parseInt(refresh_interval, 10) || 2));

    const result = await dbRun(
      'INSERT INTO cameras (name, url, stream_type, refresh_interval) VALUES (?, ?, ?, ?)',
      [trimmedName, trimmedUrl, sType, rInterval]
    );
    invalidateCameraCache();
    res.json({ success: true, cameraId: result.lastID });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update camera
app.put('/api/cameras/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.can_edit !== 1) {
      return res.status(403).json({ error: 'No permission to edit cameras' });
    }
    const cameraId = parseInt(req.params.id, 10);
    const { name, url, stream_type, refresh_interval } = req.body || {};
    const trimmedName = name ? String(name).trim() : '';
    const trimmedUrl = url ? String(url).trim() : '';

    if (!trimmedName || !trimmedUrl) {
      return res.status(400).json({ error: 'Camera name and URL required' });
    }
    if (!isValidStreamUrl(trimmedUrl)) {
      return res.status(400).json({ error: 'Invalid URL protocol. Only rtsp://, rtsps://, http://, and https:// are allowed.' });
    }

    const sType = VALID_STREAM_TYPES.includes(stream_type) ? stream_type : 'auto';
    const rInterval = Math.min(3600, Math.max(1, parseInt(refresh_interval, 10) || 2));

    await dbRun(
      'UPDATE cameras SET name = ?, url = ?, stream_type = ?, refresh_interval = ? WHERE id = ?',
      [trimmedName, trimmedUrl, sType, rInterval, cameraId]
    );
    invalidateCameraCache();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete camera
app.delete('/api/cameras/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.can_edit !== 1) {
      return res.status(403).json({ error: 'No permission to edit cameras' });
    }
    const cameraId = parseInt(req.params.id, 10);
    await dbRun('DELETE FROM cameras WHERE id = ?', [cameraId]);
    invalidateCameraCache();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ONVIF Camera Discovery API (Single shared probe promise if multiple scans are triggered concurrently)
let activeDiscoveryPromise = null;

app.get('/api/cameras/discovery', authenticateToken, async (req, res) => {
  if (req.user.can_edit !== 1) {
    return res.status(403).json({ error: 'No permission to discover cameras' });
  }

  try {
    if (!activeDiscoveryPromise) {
      console.log('Starting ONVIF network probe...');
      activeDiscoveryPromise = onvif.startProbe().finally(() => {
        activeDiscoveryPromise = null;
      });
    }
    const deviceInfoList = await activeDiscoveryPromise;
    res.json(deviceInfoList);
  } catch (err) {
    console.error('ONVIF Probe failed:', err.message);
    res.status(500).json({ error: `Suchlauf fehlgeschlagen: ${err.message}` });
  }
});

// Generate Permanent JWT Token for Dashboard Camera Stream (Strictly scoped to camera ID with minimal stream-viewer role)
app.get('/api/cameras/:id/token', authenticateToken, async (req, res) => {
  try {
    if (req.user.role === 'stream-viewer' || req.user.can_view !== 1) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const cameraId = parseInt(req.params.id, 10);
    const row = await getCachedCameraById(cameraId);
    if (!row) {
      return res.status(404).json({ error: 'Camera not found' });
    }

    // Generate a long-lived token (20 years) with minimal permissions, scoped strictly to this camera ID
    const token = jwt.sign(
      {
        role: 'stream-viewer',
        scoped_camera_id: cameraId,
        can_view: 1,
        can_edit: 0
      },
      JWT_SECRET,
      { expiresIn: '7300d' } // ~20 years
    );

    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === STREAMING PROXY API ===

// HTTP MJPEG Stream Route (Uses In-Memory Camera Cache for 0ms DB lookup)
app.get('/api/streams/mjpeg/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.can_view !== 1) {
      return res.status(403).send('Forbidden');
    }

    const requestedCameraId = parseInt(req.params.id, 10);

    // If token is a scoped stream-viewer token, verify that it matches the requested camera ID
    if (req.user.role === 'stream-viewer') {
      if (req.user.scoped_camera_id !== requestedCameraId) {
        return res.status(403).send('Forbidden: Token not authorized for this camera');
      }
    }

    const row = await getCachedCameraById(requestedCameraId);
    if (!row) {
      return res.status(404).send('Camera not found');
    }

    // Launch Multi-Protocol MJPEG stream dispatcher
    startMjpegStream(row, req, res);
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).send('Internal server error');
    }
  }
});

// Graceful Shutdown: Clean up all active FFmpeg child processes and SQLite WAL on SIGTERM/SIGINT
function gracefulShutdown(signal) {
  console.log(`\nReceived ${signal}. Stopping active streams and closing server...`);
  stopAllSessions();
  server.close(() => {
    db.close(() => {
      process.exit(0);
    });
  });
}

if (require.main === module) {
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  server.listen(PORT, () => {
    console.log(`RTSP Stream Hub running on port ${PORT}`);
  });
}

module.exports = app;
