'use strict';

const { Buffer } = require('buffer');

const GITHUB_API = 'https://api.github.com';

const ownerRepo = process.env.DATA_REPO;               // ex: "lgrm55/catalogo-data"
const branch    = process.env.DATA_BRANCH || 'main';   // ex: "main"
const filePath  = process.env.DATA_PATH   || 'data/catalogo.json';
const token     = process.env.GITHUB_TOKEN || '';

let fetchFn = global.fetch;
if (fetchFn) {
  console.log('[githubStore] using global fetch');
} else {
  try {
    ({ fetch: fetchFn } = require('undici'));
    console.log('[githubStore] using undici fetch');
  } catch {
    // Último fallback (não deve acontecer em Node >=18, mas mantemos por segurança)
    throw new Error('Fetch indisponível. Instale "undici" ou use Node >= 18.');
  }
}

function headers() {
  const h = {
    'User-Agent': 'catalogo-app',
    'Content-Type': 'application/json'
  };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function httpJson(url, init = {}) {
  const res = await fetchFn(url, { ...init, headers: { ...headers(), ...(init.headers || {}) } });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* deixa json=null */ }
  return { ok: res.ok, status: res.status, statusText: res.statusText, json, raw: text };
}

async function getFile() {
  if (!ownerRepo) throw new Error('DATA_REPO ausente');
  const url = `${GITHUB_API}/repos/${ownerRepo}/contents/${encodeURIComponent(filePath)}?ref=${branch}`;

  const out = await httpJson(url);
  if (out.ok) {
    const meta = out.json;
    const content = Buffer.from(meta.content || '', meta.encoding || 'base64').toString('utf8');
    return { sha: meta.sha, json: JSON.parse(content || '{}') };
  }
  if (out.status === 404) {
    // arquivo ainda não existe — tratamos como novo
    return { sha: undefined, json: null };
  }
  throw new Error(`GitHub getFile failed: ${out.status} ${out.statusText}`);
}

async function putFile(obj, message = 'chore(data): update catalog') {
  if (!ownerRepo) throw new Error('DATA_REPO ausente');
  const url = `${GITHUB_API}/repos/${ownerRepo}/contents/${encodeURIComponent(filePath)}`;

  let sha;
  try { sha = (await getFile()).sha; } catch { sha = undefined; }

  const content = Buffer.from(JSON.stringify(obj, null, 2), 'utf8').toString('base64');

  const body = {
    message,
    content,
    branch,
    sha,
    committer: {
      name:  process.env.DATA_COMMITTER_NAME  || 'Catalog Bot',
      email: process.env.DATA_COMMITTER_EMAIL || 'bot@example.com'
    }
  };

  const out = await httpJson(url, { method: 'PUT', body: JSON.stringify(body) });
  if (!out.ok) throw new Error(`GitHub putFile failed: ${out.status} ${out.statusText}`);
  return out.json?.content?.sha || null;
}

// -------------- cache em memória + modo de operação --------------
let cache = null;
let mode  = 'github'; // 'github' | 'memory'

function defaultCatalog() {
  return { products: [], settings: { categoriesOrder: [] } };
}

async function load() {
  try {
    const got = await getFile();
    if (got.json == null) {
      // não existia — cria vazio no GitHub
      const initial = defaultCatalog();
      await putFile(initial, 'chore(data): initialize catalog');
      cache = initial;
    } else {
      cache = got.json;
      // saneamento mínimo
      cache.products = Array.isArray(cache.products) ? cache.products : [];
      cache.settings = cache.settings || { categoriesOrder: [] };
      cache.settings.categoriesOrder = Array.isArray(cache.settings.categoriesOrder)
        ? cache.settings.categoriesOrder
        : [];
    }
    mode = 'github';
    console.log('[githubStore] loaded from GitHub');
    return cache;
  } catch (err) {
    console.warn('[githubStore] GitHub unavailable, falling back to memory:', err.message);
    cache = defaultCatalog();
    mode  = 'memory';
    return cache;
  }
}

function getCache() {
  if (!cache) throw new Error('Catalog cache not loaded yet');
  return cache;
}

async function save(next) {
  cache = next;
  if (mode === 'github') {
    try {
      await putFile(next, `chore(data): update at ${new Date().toISOString()}`);
      return cache;
    } catch (err) {
      console.warn('[githubStore] save to GitHub failed (keeping memory):', err.message);
      mode = 'memory';
      return cache;
    }
  }
  // em memória: apenas mantém
  return cache;
}

module.exports = { load, getCache, save };
