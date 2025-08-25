 codex/add-github-storage-service-for-catalog-uqukq6
// Store do catálogo usando GitHub Contents API (CommonJS)

// fetch compat: usa global.fetch se existir; senão, undici
let _fetch = globalThis.fetch;
if (!_fetch) {
  try { ({ fetch: _fetch } = require('undici')); }
  catch { throw new Error('Fetch não disponível e undici não instalado'); }
}

// Store do catálogo usando GitHub Contents API
 main

const GITHUB_API = 'https://api.github.com';
const ownerRepo = process.env.DATA_REPO;            // ex: "Igrm55/catalogo-data"
const branch    = process.env.DATA_BRANCH || 'main';
const filePath  = process.env.DATA_PATH   || 'data/catalogo.json';
const token     = process.env.GITHUB_TOKEN;

 codex/add-github-storage-service-for-catalog-uqukq6
// usa fetch nativo do Node 18+
const _fetch = globalThis.fetch;

 main
function headers() {
  return {
    Authorization: `Bearer ${token}`,
    'User-Agent': 'catalogo-app',
    'Content-Type': 'application/json'
  };
}

 codex/add-github-storage-service-for-catalog-uqukq6
function ensureShape(json) {
  if (Array.isArray(json)) return { products: json, settings: {} };
  if (!json || typeof json !== 'object') return { products: [], settings: {} };
  if (!Array.isArray(json.products)) json.products = [];
  if (!json.settings || typeof json.settings !== 'object') json.settings = {};
  return json;
}

async function getFileMeta() {
  const url = `${GITHUB_API}/repos/${ownerRepo}/contents/${encodeURIComponent(filePath)}?ref=${branch}`;
  const res = await _fetch(url, { headers: headers() });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub getFileMeta failed: ${res.status} ${res.statusText}`);
  return res.json();
}

async function getFile() {
  const meta = await getFileMeta();
  if (!meta) return { sha: null, json: { products: [], settings: {} } };
  const content = Buffer.from(meta.content, meta.encoding).toString('utf8');
  return { sha: meta.sha, json: ensureShape(JSON.parse(content)) };
}

async function putFile(obj, message = 'chore(data): update catalog') {
  const normalized = ensureShape(obj);
  const content = Buffer.from(JSON.stringify(normalized, null, 2), 'utf8').toString('base64');
  const meta = await getFileMeta(); // pega sha se já existir
async function getFile() {
  const url = `${GITHUB_API}/repos/${ownerRepo}/contents/${encodeURIComponent(filePath)}?ref=${branch}`;
  const res = await _fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`GitHub getFile failed: ${res.status} ${res.statusText}`);
  const meta = await res.json();
  const content = Buffer.from(meta.content, meta.encoding).toString('utf8');
  return { sha: meta.sha, json: JSON.parse(content) };
}

async function putFile(obj, message = 'chore(data): update catalog') {
  const content = Buffer.from(JSON.stringify(obj, null, 2), 'utf8').toString('base64');
  let sha;
  try { sha = (await getFile()).sha; } catch (_) { sha = undefined; }

 main
  const body = {
    message,
    content,
    branch,
 codex/add-github-storage-service-for-catalog-uqukq6
    sha: meta ? meta.sha : undefined,
=======
    sha,
 main
    committer: {
      name:  process.env.DATA_COMMITTER_NAME || 'Catalog Bot',
      email: process.env.DATA_COMMITTER_EMAIL || 'bot@example.com'
    }
  };
 codex/add-github-storage-service-for-catalog-uqukq6
=======

 main
  const url = `${GITHUB_API}/repos/${ownerRepo}/contents/${encodeURIComponent(filePath)}`;
  const res = await _fetch(url, { method: 'PUT', headers: headers(), body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`GitHub putFile failed: ${res.status} ${res.statusText}`);
  const out = await res.json();
  return out.content.sha;
}

let cache = null;

async function load() {
  const { json } = await getFile();
 codex/add-github-storage-service-for-catalog-uqukq6
  cache = ensureShape(json);
=======
  cache = json;
 main
  return cache;
}

function getCache() {
  if (!cache) throw new Error('Catalog cache not loaded yet');
  return cache;
}

async function save(next) {
  await putFile(next, `chore(data): update at ${new Date().toISOString()}`);
 codex/add-github-storage-service-for-catalog-uqukq6
  cache = ensureShape(next);
  return cache;
}

module.exports = { load, getCache, save };
=======
  cache = next;
  return cache;
}

module.exports = { load, getCache, save };
 main
