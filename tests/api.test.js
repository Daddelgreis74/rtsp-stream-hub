const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
const app = require('../src/server');

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
