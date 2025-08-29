const { spawn } = require('child_process');
process.env.DATABASE_URL ||= 'postgresql://postgres:postgres@localhost:5432/catalog';
const path = require('path');

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function startServer() {
  const env = { ...process.env, PORT: '4001' };
  const proc = spawn('node', ['src/index.js'], { env, stdio: 'inherit' });
  await wait(1000);
  return proc;
}

function stopServer(proc) {
  return new Promise(resolve => {
    proc.once('exit', resolve);
    proc.kill('SIGINT');
  });
}

async function request(path, opts) {
  const res = await fetch(`http://localhost:4001${path}`, opts);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

(async () => {
  const createBody = { name: 'TestProd', category: 'Cat', priceUV: 1 };
  let server = await startServer();
  let res = await request('/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(createBody)
  });
  if (res.status !== 200) throw new Error('create failed');
  const id = res.data.id;
  await stopServer(server);

  server = await startServer();
  res = await request(`/api/products/${id}`);
  if (res.data.name !== 'TestProd') throw new Error('not persisted');

  await request(`/api/products/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Updated', category: 'Cat' })
  });
  res = await request(`/api/products/${id}`);
  if (res.data.name !== 'Updated') throw new Error('not updated');

  await request(`/api/products/${id}`, { method: 'DELETE' });
  res = await request(`/api/products/${id}`);
  if (res.status !== 404) throw new Error('not deleted');
  await stopServer(server);
  console.log('persistence test passed');
})().catch(err => {
  console.error(err);
  process.exit(1);
});
