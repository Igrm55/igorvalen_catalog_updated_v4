import { spawn } from 'child_process';
import assert from 'assert';

const server = spawn('node', ['src/server.js'], {
  cwd: new URL('..', import.meta.url).pathname,
  env: { ...process.env, PORT: '5050', FALLBACK_MEMORY: 'true' },
  stdio: 'inherit',
});

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  await wait(1000);
  const base = 'http://localhost:5050';
  const health = await fetch(base + '/healthz');
  assert.strictEqual(health.status, 200);
  const items = await fetch(base + '/api/items');
  assert.strictEqual(items.status, 200);
  console.log('backend smoke test ok');
  server.kill();
}

run().catch((err) => {
  console.error(err);
  server.kill();
  process.exit(1);
});
