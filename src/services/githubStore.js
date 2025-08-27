'use strict';

const { Buffer } = require('buffer');

let fetchFn = global.fetch;
if (!fetchFn) {
  try { ({ fetch: fetchFn } = require('undici')); }
  catch (err) { throw new Error('Fetch API unavailable'); }
}

const GITHUB_API = 'https://api.github.com';
const ownerRepo = process.env.DATA_REPO;            // e.g. "user/repo"
const branch = process.env.DATA_BRANCH || 'main';
const filePath = process.env.DATA_PATH || 'data/catalogo.json';
const token = process.env.GITHUB_TOKEN || '';

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
  try { json = text ? JSON.parse(text) : null; } catch {}
  return { ok: res.ok, status: res.status, statusText: res.statusText, json };
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
  const body = { message, content, branch, sha };
  const out = await httpJson(url, { method: 'PUT', body: JSON.stringify(body) });
  if (!out.ok) throw new Error(`GitHub putFile failed: ${out.status} ${out.statusText}`);
  return out.json.content.sha;
}

function ensureShape(obj) {
  return {
    products: Array.isArray(obj?.products) ? obj.products : [],
    settings: {
      categoriesOrder: Array.isArray(obj?.settings?.categoriesOrder)
        ? obj.settings.categoriesOrder
        : []
    }
  };
}

let cache = null;
let mode = 'github';

async function load() {
  try {
    const { json } = await getFile();
    if (!json) {
      const initial = { products: [], settings: { categoriesOrder: [] } };
      await putFile(initial, 'chore(data): init catalog');
      cache = initial;
    } else {
      cache = ensureShape(json);
    }
  } catch (err) {
    console.warn('[githubStore] GitHub unavailable, falling back to memory:', err.message);
    cache = { products: [], settings: { categoriesOrder: [] } };
    mode = 'memory';
  }
  return cache;
}

function getCache() {
  if (!cache) throw new Error('Catalog cache not loaded yet');
  return cache;
}

async function save(next) {
  cache = ensureShape(next);
  if (mode === 'github') {
    try {
      await putFile(cache, `chore(data): update at ${new Date().toISOString()}`);
    } catch (err) {
      console.warn('[githubStore] save to GitHub failed (keeping memory):', err.message);
      mode = 'memory';
    }
  }
  return cache;
}

module.exports = { load, getCache, save };
