const { before, after, test } = require('node:test');
const assert = require('node:assert');
const { spawn } = require('node:child_process');
const path = require('path');
const fs = require('fs');

let server;

before(async () => {
  server = spawn('node', ['src/index.js'], { cwd: path.join(__dirname, '..'), stdio: 'inherit' });
  await new Promise(resolve => setTimeout(resolve, 1000));
});

after(() => {
  server.kill();
});

test('create and delete product with image', async () => {
  const form = new FormData();
  form.append('name', 'Test Product');
  form.append('category', 'TestCat');
  form.append('image', new Blob(['hello'], { type: 'text/plain' }), 'test.txt');

  const res = await fetch('http://localhost:4000/api/products', { method: 'POST', body: form });
  assert.strictEqual(res.status, 201);
  const created = await res.json();
  assert.ok(created.id);
  assert.ok(created.image && created.image.filename);

  const filePath = path.join(__dirname, '..', 'public', 'uploads', created.image.filename);
  assert.ok(fs.existsSync(filePath));

  const getRes = await fetch(`http://localhost:4000/api/products/${created.id}`);
  assert.strictEqual(getRes.status, 200);
  const fetched = await getRes.json();
  assert.strictEqual(fetched.id, created.id);

  const delRes = await fetch(`http://localhost:4000/api/products/${created.id}`, { method: 'DELETE' });
  assert.strictEqual(delRes.status, 200);
  await new Promise(r => setTimeout(r, 100));
  assert.ok(!fs.existsSync(filePath));
});

