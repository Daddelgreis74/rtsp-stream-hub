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
const JWT_SECRET = process.env.JWT_SECRET || 'rtsp-stream-hub-secret-key-12345';
const GO2RTC_URL = process.env.GO2RTC_URL || 'http://192.168.178.100:1984'; // Default to TrueNAS Go2RTC API

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
  if (req.user.can_view !== 1) {
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
  const { name, url } = req.body;
  if (!name || !url) {
    return res.status(400).json({ error: 'Camera name and URL required' });
  }

  db.run('INSERT INTO cameras (name, url) VALUES (?, ?)', [name, url], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, cameraId: this.lastID });
  });
});

// Update camera
app.put('/api/cameras/:id', authenticateToken, (req, res) => {
  if (req.user.can_edit !== 1) {
    return res.status(403).json({ error: 'No permission to edit cameras' });
  }
  const { name, url } = req.body;
  db.run('UPDATE cameras SET name = ?, url = ? WHERE id = ?', [name, url, req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
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

// Generate Permanent JWT Token for Dashboard Camera Stream
app.get('/api/cameras/:id/token', authenticateToken, (req, res) => {
  if (req.user.can_view !== 1) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  db.get('SELECT * FROM cameras WHERE id = ?', [req.params.id], (err, row) => {
    if (err || !row) {
      return res.status(404).json({ error: 'Camera not found' });
    }

    // Generate a long-lived token (20 years)
    const token = jwt.sign(
      { id: req.user.id, username: req.user.username, role: req.user.role, can_view: 1, can_edit: 0 },
      JWT_SECRET,
      { expiresIn: '7300d' } // ~20 years
    );

    res.json({ token });
  });
});

// === STREAMING PROXY API ===

// HTTP MJPEG Stream Route (Transcoding fallback)
app.get('/api/streams/mjpeg/:id', authenticateToken, (req, res) => {
  if (req.user.can_view !== 1) {
    return res.status(403).send('Forbidden');
  }

  db.get('SELECT url FROM cameras WHERE id = ?', [req.params.id], (err, row) => {
    if (err || !row) {
      return res.status(404).send('Camera not found');
    }
    // Launch FFmpeg transcoder
    startMjpegStream(row.url, req, res);
  });
});

// WebRTC Signaling Proxy Route (for Go2RTC)
app.post('/api/streams/webrtc/:id', authenticateToken, async (req, res) => {
  if (req.user.can_view !== 1) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  db.get('SELECT url FROM cameras WHERE id = ?', [req.params.id], async (err, row) => {
    if (err || !row) {
      return res.status(404).json({ error: 'Camera not found' });
    }

    try {
      const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
      
      // We send the SDP offer to the local go2rtc server
      // go2rtc requires the camera RTSP url to be defined or we can register it dynamically
      // For simplicity, we can pass the URL directly as a source parameter or register it!
      const go2rtcSignalingUrl = `${GO2RTC_URL}/api/whip?src=${encodeURIComponent(row.url)}`;
      
      const response = await fetch(go2rtcSignalingUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/sdp',
        },
        body: req.body.sdp
      });

      if (!response.ok) {
        const details = await response.text();
        return res.status(response.status).json({ error: `Go2RTC error: ${details}` });
      }

      const answerSdp = await response.text();
      res.send(answerSdp);
    } catch (fetchErr) {
      console.error('Go2RTC proxy connection failed:', fetchErr.message);
      res.status(502).json({ error: 'Go2RTC stream proxy unavailable' });
    }
  });
});

server.listen(PORT, () => {
  console.log(`RTSP Stream Hub running on port ${PORT}`);
});
