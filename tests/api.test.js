process.env.JWT_SECRET = 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90';

const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
const jwt = require('jsonwebtoken');
const app = require('../src/server');
const { resolveStreamType } = require('../src/transcoder');

let server;
let baseUrl;

test.before(async () => {
  // Start server on a dynamic port
  server = http.createServer(app);
  await new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      baseUrl = `http://127.0.0.1:${address.port}`;
      console.log(`Test server running at ${baseUrl}`);
      resolve();
    });
  });
});

test.after(() => {
  server.close();
});

test('POST /api/auth/login - Invalid user returns error', async () => {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'fakeuser', password: 'wrongpassword' })
  });
  
  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.strictEqual(data.error, 'User not found');
});

test('GET /api/cameras - Missing token returns 401', async () => {
  const res = await fetch(`${baseUrl}/api/cameras`);
  assert.strictEqual(res.status, 401);
  const data = await res.json();
  assert.strictEqual(data.error, 'Access token missing');
});

test('Stream Type Resolver - Auto detects RTSP, MJPEG, HLS, Snapshot', () => {
  assert.strictEqual(resolveStreamType('rtsp://192.168.1.10/stream', 'auto'), 'rtsp');
  assert.strictEqual(resolveStreamType('http://192.168.1.10/video.m3u8', 'auto'), 'hls');
  assert.strictEqual(resolveStreamType('https://domain.com/cam.jpg', 'auto'), 'snapshot');
  assert.strictEqual(resolveStreamType('http://192.168.1.10/mjpg/video.cgi', 'auto'), 'mjpeg');
  assert.strictEqual(resolveStreamType('http://192.168.1.10/stream', 'snapshot'), 'snapshot');
});

test('Security - Scoped stream-viewer token restrictions', async () => {
  // Create a token scoped strictly to Camera 1 as stream-viewer
  const scopedToken = jwt.sign(
    { role: 'stream-viewer', scoped_camera_id: 1, can_view: 1, can_edit: 0 },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  // 1. stream-viewer must be rejected when attempting to access admin user management (/api/users)
  const resUsers = await fetch(`${baseUrl}/api/users`, {
    headers: { 'Authorization': `Bearer ${scopedToken}` }
  });
  assert.strictEqual(resUsers.status, 403);

  // 2. stream-viewer must be rejected when attempting to list cameras (/api/cameras)
  const resCameras = await fetch(`${baseUrl}/api/cameras`, {
    headers: { 'Authorization': `Bearer ${scopedToken}` }
  });
  assert.strictEqual(resCameras.status, 403);

  // 3. stream-viewer must be rejected when attempting to access a different camera ID (/api/streams/mjpeg/2)
  const resWrongCam = await fetch(`${baseUrl}/api/streams/mjpeg/2?token=${scopedToken}`);
  assert.strictEqual(resWrongCam.status, 403);
});
