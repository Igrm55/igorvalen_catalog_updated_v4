 codex/add-github-storage-service-for-catalog-r0klsc
=======
 codex/add-github-storage-service-for-catalog-ymiwro
 codex/add-github-storage-service-for-catalog-6t7hvp

 codex/add-github-storage-service-for-catalog-d0sknz
 main
 main
 main
// Store do catálogo usando GitHub Contents API (CommonJS)

// fetch compat: usa global.fetch se existir; senão, undici
let _fetch = globalThis.fetch;
if (_fetch) {
  console.log('[githubStore] using global fetch');
} else {
  try {
    ({ fetch: _fetch } = require('undici'));
    console.log('[githubStore] using undici fetch');
  } catch (err) {
    console.error('[githubStore] fetch not available', err);
    throw new Error('Fetch não disponível e undici não instalado');
  }
}

const GITHUB_API = 'https://api.github.com';
const ownerRepo = process.env.DATA_REPO;            // ex: "lgrm55/catalogo-data"
 codex/add-github-storage-service-for-catalog-r0klsc
=======
const ownerRepo = process.env.DATA_REPO;            // ex: "Igrm55/catalogo-data"
 main
const branch = process.env.DATA_BRANCH || 'main';
const filePath = process.env.DATA_PATH || 'data/catalogo.json';
const token = process.env.GITHUB_TOKEN;

 codex/add-github-storage-service-for-catalog-r0klsc
=======
 codex/add-github-storage-service-for-catalog-ymiwro
 codex/add-github-storage-service-for-catalog-6t7hvp


const GITHUB_API = 'https://api.github.com';

const ownerRepo = process.env.DATA_REPO;            // ex: "Igrm55/catalogo-data"
const branch    = process.env.DATA_BRANCH || 'main';
const filePath  = process.env.DATA_PATH   || 'data/catalogo.json';
const token     = process.env.GITHUB_TOKEN;

// fetch compat (Node 18+ tem global.fetch; se não tiver, usa undici)
let _fetch = global.fetch;
if (!_fetch) {
  try {
    ({ fetch: _fetch } = require('undici'));
  } catch (err) {
    throw new Error('Fetch não disponível. Instale "undici" ou use Node 18+ com global.fetch.');
  }
}

 main
 main
 main
 main
function headers() {
  return {
    Authorization: `Bearer ${token}`,
    'User-Agent': 'catalogo-app',
 codex/add-github-storage-service-for-catalog-r0klsc
=======
 codex/add-github-storage-service-for-catalog-ymiwro
 codex/add-github-storage-service-for-catalog-6t7hvp

 codex/add-github-storage-service-for-catalog-d0sknz
 main
 main
 main
    'Content-Type': 'application/json',
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };
}

function ensureShape(json) {
  if (!json || typeof json !== 'object') {
    return { products: [], settings: { categoriesOrder: [] } };
  }
  if (!Array.isArray(json.products)) json.products = [];
  if (!json.settings || typeof json.settings !== 'object') {
    json.settings = { categoriesOrder: [] };
  }
  if (!Array.isArray(json.settings.categoriesOrder)) {
    json.settings.categoriesOrder = [];
  }
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
  if (!meta) return { sha: null, json: null };
 codex/add-github-storage-service-for-catalog-r0klsc
=======
 codex/add-github-storage-service-for-catalog-ymiwro
 codex/add-github-storage-service-for-catalog-6t7hvp


    'Content-Type': 'application/json'
  };
}

async function getFile() {
  const url = `${GITHUB_API}/repos/${ownerRepo}/contents/${encodeURIComponent(filePath)}?ref=${branch}`;
  const res = await _fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`GitHub getFile failed: ${res.status} ${res.statusText}`);
  const meta = await res.json();
 main
 main
 main
 main
  const content = Buffer.from(meta.content, meta.encoding).toString('utf8');
  return { sha: meta.sha, json: JSON.parse(content) };
}

async function putFile(obj, message = 'chore(data): update catalog') {
  const normalized = ensureShape(obj);
  const content = Buffer.from(JSON.stringify(normalized, null, 2), 'utf8').toString('base64');
  const meta = await getFileMeta(); // pega sha se já existir
 codex/add-github-storage-service-for-catalog-r0klsc
=======
 codex/add-github-storage-service-for-catalog-ymiwro
  const normalized = ensureShape(obj);
  const content = Buffer.from(JSON.stringify(normalized, null, 2), 'utf8').toString('base64');
  const meta = await getFileMeta(); // pega sha se já existir
 codex/add-github-storage-service-for-catalog-6t7hvp
  const normalized = ensureShape(obj);
  const content = Buffer.from(JSON.stringify(normalized, null, 2), 'utf8').toString('base64');
  const meta = await getFileMeta(); // pega sha se já existir

 codex/add-github-storage-service-for-catalog-d0sknz
  const normalized = ensureShape(obj);
  const content = Buffer.from(JSON.stringify(normalized, null, 2), 'utf8').toString('base64');
  const meta = await getFileMeta(); // pega sha se já existir

  const content = Buffer.from(JSON.stringify(obj, null, 2), 'utf8').toString('base64');

  // tenta pegar SHA; se o arquivo ainda não existe, segue sem SHA
  let sha;
  try { sha = (await getFile()).sha; } catch (_) { sha = undefined; }

 main
 main
 main
 main
  const body = {
    message,
    content,
    branch,
 codex/add-github-storage-service-for-catalog-r0klsc
=======
 codex/add-github-storage-service-for-catalog-ymiwro
 codex/add-github-storage-service-for-catalog-6t7hvp

 codex/add-github-storage-service-for-catalog-d0sknz
 main
 main
> main
    sha: meta ? meta.sha : undefined,
    committer: {
      name: process.env.DATA_COMMITTER_NAME || 'Catalog Bot',
      email: process.env.DATA_COMMITTER_EMAIL || 'bot@example.com'
    }
  };
  const url = `${GITHUB_API}/repos/${ownerRepo}/contents/${encodeURIComponent(filePath)}`;
  const res = await _fetch(url, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(body)
  });
 codex/add-github-storage-service-for-catalog-r0klsc
=======
codex/add-github-storage-service-for-catalog-ymiwro
 codex/add-github-storage-service-for-catalog-6t7hvp


    sha,
    committer: {
      name:  process.env.DATA_COMMITTER_NAME || 'Catalog Bot',
      email: process.env.DATA_COMMITTER_EMAIL || 'bot@example.com'
    }
  };

  const url = `${GITHUB_API}/repos/${ownerRepo}/contents/${encodeURIComponent(filePath)}`;
  const res = await _fetch(url, { method: 'PUT', headers: headers(), body: JSON.stringify(body) });
 main
 main
 main
 main
  if (!res.ok) throw new Error(`GitHub putFile failed: ${res.status} ${res.statusText}`);
  const out = await res.json();
  return out.content.sha;
}

let cache = null;

async function load() {
  const { json } = await getFile();
 codex/add-github-storage-service-for-catalog-r0klsc
=======
 codex/add-github-storage-service-for-catalog-ymiwro
 codex/add-github-storage-service-for-catalog-6t7hvp

 codex/add-github-storage-service-for-catalog-d0sknz
 main
 main
 main
  if (!json) {
    const initial = { products: [], settings: { categoriesOrder: [] } };
    await putFile(initial, 'chore(data): init catalog');
    cache = initial;
    return cache;
  }
  cache = ensureShape(json);
 codex/add-github-storage-service-for-catalog-r0klsc
=======
 codex/add-github-storage-service-for-catalog-ymiwro
 codex/add-github-storage-service-for-catalog-6t7hvp


  cache = json;
 main
 main
 main
 main
  return cache;
}

function getCache() {
  if (!cache) throw new Error('Catalog cache not loaded yet');
  return cache;
}

async function save(next) {
  await putFile(next, `chore(data): update at ${new Date().toISOString()}`);
  cache = ensureShape(next);
 codex/add-github-storage-service-for-catalog-r0klsc
  return cache;
}

module.exports = { load, getCache, save };
=======
 codex/add-github-storage-service-for-catalog-ymiwro
  cache = ensureShape(next);
 codex/add-github-storage-service-for-catalog-6t7hvp
  cache = ensureShape(next);

 codex/add-github-storage-service-for-catalog-d0sknz
  cache = ensureShape(next);

  cache = next;
 main
 main
 main
  return cache;
}

module.exports = { load, getCache, save };
 main
