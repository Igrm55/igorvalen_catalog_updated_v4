// Store do catálogo usando GitHub Contents API (CommonJS)

// fetch compat: usa global.fetch se existir; senão, undici
let _fetch = globalThis.fetch;
if (!_fetch) {
  try { ({ fetch: _fetch } = require('undici')); }
  catch { throw new Error('Fetch não disponível e undici não instalado'); }
}

const GITHUB_API = 'https://api.github.com';
const ownerRepo = process.env.DATA_REPO;            // ex: "Igrm55/catalogo-data"
const branch    = process.env.DATA_BRANCH || 'main';
const filePath  = process.env.DATA_PATH   || 'data/catalogo.json';
const token     = process.env.GITHUB_TOKEN;

function headers() {
  return {
    Authorization: `Bearer ${token}`,
    'User-Agent': 'catalogo-app',
    'Content-Type': 'application/json'
  };
}

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
  const body = {
    message,
    content,
    branch,
    sha: meta ? meta.sha : undefined,
    committer: {
      name:  process.env.DATA_COMMITTER_NAME || 'Catalog Bot',
      email: process.env.DATA_COMMITTER_EMAIL || 'bot@example.com'
    }
  };
  const url = `${GITHUB_API}/repos/${ownerRepo}/contents/${encodeURIComponent(filePath)}`;
  const res = await _fetch(url, { method: 'PUT', headers: headers(), body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`GitHub putFile failed: ${res.status} ${res.statusText}`);
  const out = await res.json();
  return out.content.sha;
}

let cache = null;

async function load() {
  const { json } = await getFile();
  cache = ensureShape(json);
  return cache;
}

function getCache() {
  if (!cache) throw new Error('Catalog cache not loaded yet');
  return cache;
}

async function save(next) {
  await putFile(next, `chore(data): update at ${new Date().toISOString()}`);
  cache = ensureShape(next);
  return cache;
}

module.exports = { load, getCache, save };
