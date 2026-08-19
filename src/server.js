const express = require('express');
const http = require('http');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const path = require('path');
const db = require('./db');
const { startMjpegStream } = require('./transcoder');

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

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

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

// Middleware: Require Admin
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Administrator permissions required' });
  }
  next();
}

// === AUTH API ===

// Login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(400).json({ error: 'User not found' });

    const passwordIsValid = bcrypt.compareSync(password, user.password);
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
  });
});

// === USER MANAGEMENT API (Admin only) ===

// List users
app.get('/api/users', authenticateToken, requireAdmin, (req, res) => {
  db.all('SELECT id, username, role, can_edit_cameras, can_view_cameras FROM users', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(r => ({
      id: r.id,
      username: r.username,
      role: r.role,
      can_edit: r.can_edit_cameras === 1,
      can_view: r.can_view_cameras === 1
    })));
  });
});

// Create user
app.post('/api/users', authenticateToken, requireAdmin, (req, res) => {
  const { username, password, role, can_edit, can_view } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(password, salt);
  const userRole = role || 'user';
  const editPermission = can_edit ? 1 : 0;
  const viewPermission = can_view ? 1 : 0;

  db.run(
    'INSERT INTO users (username, password, role, can_edit_cameras, can_view_cameras) VALUES (?, ?, ?, ?, ?)',
    [username, hash, userRole, editPermission, viewPermission],
    function (err) {
      if (err) return res.status(400).json({ error: 'Username already exists' });
      res.json({ success: true, userId: this.lastID });
    }
  );
});

// Update permissions
app.put('/api/users/:id/permissions', authenticateToken, requireAdmin, (req, res) => {
  const { role, can_edit, can_view } = req.body;
  const editPermission = can_edit ? 1 : 0;
  const viewPermission = can_view ? 1 : 0;

  db.run(
    'UPDATE users SET role = ?, can_edit_cameras = ?, can_view_cameras = ? WHERE id = ?',
    [role, editPermission, viewPermission, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

// Delete user
app.delete('/api/users/:id', authenticateToken, requireAdmin, (req, res) => {
  db.run('DELETE FROM users WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// === CAMERA MANAGEMENT API ===

// List cameras
app.get('/api/cameras', authenticateToken, (req, res) => {
  if (req.user.role === 'stream-viewer' || req.user.can_view !== 1) {
    return res.status(403).json({ error: 'No permission to view cameras' });
  }
  db.all('SELECT * FROM cameras', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Add camera
app.post('/api/cameras', authenticateToken, (req, res) => {
  if (req.user.can_edit !== 1) {
    return res.status(403).json({ error: 'No permission to edit cameras' });
  }
  const { name, url, stream_type, refresh_interval } = req.body;
  if (!name || !url) {
    return res.status(400).json({ error: 'Camera name and URL required' });
  }

  const sType = stream_type || 'auto';
  const rInterval = parseInt(refresh_interval, 10) || 2;

  db.run(
    'INSERT INTO cameras (name, url, stream_type, refresh_interval) VALUES (?, ?, ?, ?)',
    [name, url, sType, rInterval],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, cameraId: this.lastID });
    }
  );
});

// Update camera
app.put('/api/cameras/:id', authenticateToken, (req, res) => {
  if (req.user.can_edit !== 1) {
    return res.status(403).json({ error: 'No permission to edit cameras' });
  }
  const { name, url, stream_type, refresh_interval } = req.body;
  const sType = stream_type || 'auto';
  const rInterval = parseInt(refresh_interval, 10) || 2;

  db.run(
    'UPDATE cameras SET name = ?, url = ?, stream_type = ?, refresh_interval = ? WHERE id = ?',
    [name, url, sType, rInterval, req.params.id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
});

// Delete camera
app.delete('/api/cameras/:id', authenticateToken, (req, res) => {
  if (req.user.can_edit !== 1) {
    return res.status(403).json({ error: 'No permission to edit cameras' });
  }
  db.run('DELETE FROM cameras WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// ONVIF Camera Discovery API
app.get('/api/cameras/discovery', authenticateToken, (req, res) => {
  if (req.user.can_edit !== 1) {
    return res.status(403).json({ error: 'No permission to discover cameras' });
  }

  const onvif = require('node-onvif');
  console.log('Starting ONVIF network probe...');
  onvif.startProbe().then((device_info_list) => {
    res.json(device_info_list);
  }).catch((err) => {
    console.error('ONVIF Probe failed:', err.message);
    res.status(500).json({ error: `Suchlauf fehlgeschlagen: ${err.message}` });
  });
});

// Generate Permanent JWT Token for Dashboard Camera Stream (Strictly scoped to camera ID with minimal stream-viewer role)
app.get('/api/cameras/:id/token', authenticateToken, (req, res) => {
  if (req.user.role === 'stream-viewer' || req.user.can_view !== 1) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const cameraId = parseInt(req.params.id, 10);

  db.get('SELECT * FROM cameras WHERE id = ?', [cameraId], (err, row) => {
    if (err || !row) {
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
  });
});

// === STREAMING PROXY API ===

// HTTP MJPEG Stream Route
app.get('/api/streams/mjpeg/:id', authenticateToken, (req, res) => {
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

  db.get('SELECT * FROM cameras WHERE id = ?', [requestedCameraId], (err, row) => {
    if (err || !row) {
      return res.status(404).send('Camera not found');
    }
    // Launch Multi-Protocol MJPEG stream dispatcher
    startMjpegStream(row, req, res);
  });
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`RTSP Stream Hub running on port ${PORT}`);
  });
}

module.exports = app;
