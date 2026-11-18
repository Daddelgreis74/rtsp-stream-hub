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

test('User Management & 4-Role Hierarchy (Admin, CoAdmin, Moderator, User)', async () => {
  const db = require('../src/db');

  // Helper to run SQL promises
  const runSql = (sql, params = []) => new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });

  // Clean up any leftover test users
  await runSql(`DELETE FROM users WHERE username LIKE 'test_%'`);

  // Create tokens for each role
  const adminToken = jwt.sign(
    { id: 1, username: 'admin', role: 'admin', can_view: 1, can_edit: 1 },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  // 1. Admin creates a CoAdmin, Moderator, and User
  const resCreateCoAdmin = await fetch(`${baseUrl}/api/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
    body: JSON.stringify({ username: 'test_coadmin', password: 'pw123', role: 'coadmin' })
  });
  assert.strictEqual(resCreateCoAdmin.status, 200);
  const coAdminData = await resCreateCoAdmin.json();
  assert.ok(coAdminData.userId);

  const coAdminToken = jwt.sign(
    { id: coAdminData.userId, username: 'test_coadmin', role: 'coadmin', can_view: 1, can_edit: 1 },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  // 2. CoAdmin CANNOT create an Admin or another CoAdmin
  const resCoAdminCreateAdmin = await fetch(`${baseUrl}/api/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${coAdminToken}` },
    body: JSON.stringify({ username: 'test_illegal_admin', password: 'pw123', role: 'admin' })
  });
  assert.strictEqual(resCoAdminCreateAdmin.status, 403);

  const resCoAdminCreateCoAdmin = await fetch(`${baseUrl}/api/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${coAdminToken}` },
    body: JSON.stringify({ username: 'test_illegal_coadmin', password: 'pw123', role: 'coadmin' })
  });
  assert.strictEqual(resCoAdminCreateCoAdmin.status, 403);

  // 3. CoAdmin CAN create a Moderator and a User
  const resCoAdminCreateMod = await fetch(`${baseUrl}/api/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${coAdminToken}` },
    body: JSON.stringify({ username: 'test_moderator', password: 'pw123', role: 'moderator' })
  });
  assert.strictEqual(resCoAdminCreateMod.status, 200);
  const modData = await resCoAdminCreateMod.json();

  const resCoAdminCreateUser = await fetch(`${baseUrl}/api/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${coAdminToken}` },
    body: JSON.stringify({ username: 'test_user', password: 'pw123', role: 'user' })
  });
  assert.strictEqual(resCoAdminCreateUser.status, 200);
  const stdUserData = await resCoAdminCreateUser.json();

  // 4. Moderator CANNOT access /api/users
  const modToken = jwt.sign(
    { id: modData.userId, username: 'test_moderator', role: 'moderator', can_view: 1, can_edit: 1 },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
  const resModListUsers = await fetch(`${baseUrl}/api/users`, {
    headers: { 'Authorization': `Bearer ${modToken}` }
  });
  assert.strictEqual(resModListUsers.status, 403);

  // 5. CoAdmin CAN update Moderator/User (username, permissions, password), but CANNOT promote them to Admin/CoAdmin
  const resCoAdminPromoteIllegal = await fetch(`${baseUrl}/api/users/${stdUserData.userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${coAdminToken}` },
    body: JSON.stringify({ role: 'admin' })
  });
  assert.strictEqual(resCoAdminPromoteIllegal.status, 403);

  const resCoAdminUpdateUser = await fetch(`${baseUrl}/api/users/${stdUserData.userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${coAdminToken}` },
    body: JSON.stringify({ username: 'test_user_renamed', role: 'moderator', can_view: true, can_edit: true, password: 'newpw456' })
  });
  assert.strictEqual(resCoAdminUpdateUser.status, 200);

  // 6. Verify login works with updated username & password, and user can change their own password
  const resLoginRenamed = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'test_user_renamed', password: 'newpw456' })
  });
  assert.strictEqual(resLoginRenamed.status, 200);
  const loginRenamedData = await resLoginRenamed.json();
  assert.strictEqual(loginRenamedData.user.role, 'moderator');
  assert.strictEqual(loginRenamedData.user.can_edit, true);

  const resChangeOwnPw = await fetch(`${baseUrl}/api/auth/password`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${loginRenamedData.token}` },
    body: JSON.stringify({ currentPassword: 'newpw456', newPassword: 'selfchanged789' })
  });
  assert.strictEqual(resChangeOwnPw.status, 200);

  // 7. Self-delete protection & CoAdmin delete works on Moderator/User
  const resSelfDelete = await fetch(`${baseUrl}/api/users/${coAdminData.userId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${coAdminToken}` }
  });
  assert.strictEqual(resSelfDelete.status, 400);

  const resCoAdminDeleteMod = await fetch(`${baseUrl}/api/users/${modData.userId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${coAdminToken}` }
  });
  assert.strictEqual(resCoAdminDeleteMod.status, 200);

  // Clean up remaining test users via Admin
  await fetch(`${baseUrl}/api/users/${stdUserData.userId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const resAdminDeleteCoAdmin = await fetch(`${baseUrl}/api/users/${coAdminData.userId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  assert.strictEqual(resAdminDeleteCoAdmin.status, 200);
});
