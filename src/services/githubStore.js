"use strict";

const { Buffer } = require("buffer");
const fs = require("fs");
const path = require("path");

let fetchFn = global.fetch;
if (!fetchFn) {
  try { ({ fetch: fetchFn } = require('undici')); }
  catch (err) { throw new Error('Fetch API unavailable'); }
}

const GITHUB_API = "https://api.github.com";
const ownerRepo = process.env.DATA_REPO; // e.g. "user/repo"
const branch = process.env.DATA_BRANCH || "main";
const filePath = process.env.DATA_PATH || "data/catalogo.json";
const token = process.env.GITHUB_TOKEN || "";
const uploadsPath = "data/uploads";
const localUploadsDir = path.join(__dirname, "..", "..", "public", "uploads");

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
  const apiMsg = out.json?.message ? ` - ${out.json.message}` : '';
  throw new Error(`GitHub getFile failed: ${out.status} ${out.statusText}${apiMsg}`);
}

async function putFile(obj, message = 'chore(data): update catalog') {
  if (!ownerRepo) throw new Error('DATA_REPO ausente');
  const url = `${GITHUB_API}/repos/${ownerRepo}/contents/${encodeURIComponent(filePath)}`;
  let sha;
  try { sha = (await getFile()).sha; } catch { sha = undefined; }
  const content = Buffer.from(JSON.stringify(obj, null, 2), 'utf8').toString('base64');
  const body = { message, content, branch, sha };
  const out = await httpJson(url, { method: 'PUT', body: JSON.stringify(body) });
  if (!out.ok) {
    const apiMsg = out.json?.message ? ` - ${out.json.message}` : '';
    throw new Error(`GitHub putFile failed: ${out.status} ${out.statusText}${apiMsg}`);
  }
  return out.json.content.sha;
}

function ensureShape(obj) {
  let cats = [];
  const raw = obj?.settings?.categoriesOrder;
  if (Array.isArray(raw)) cats = raw;
  else if (typeof raw === "string") {
    cats = raw.split("|").map(s => s.trim()).filter(Boolean);
  }
  return {
    products: Array.isArray(obj?.products) ? obj.products : [],
    settings: { categoriesOrder: cats }
  };
}

let cache = null;
let mode = 'github';

async function load() {
  try {
    const { json } = await getFile();
    if (!json) {
      const initial = {
        products: [],
        settings: {
          categoriesOrder: [
            'Bebidas não alcoólicas',
            'Bebidas alcoólicas',
            'Bomboniere',
            'Cigarro',
            'Utilidades'
          ]
        }
      };
      await putFile(initial, 'chore(data): init catalog');
      cache = initial;
    } else {
      cache = ensureShape(json);
    }
    await restoreImages();
  } catch (err) {
    console.error('[githubStore] GitHub unavailable, falling back to memory:', err);
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
  if (mode !== 'github') throw new Error('GitHub persistence not available');
  await putFile(cache, `chore(data): update at ${new Date().toISOString()}`);
  return cache;
}

async function uploadImage(localPath, fileName) {
  if (mode !== 'github') throw new Error('GitHub persistence not available');
  const fullPath = `${uploadsPath}/${fileName}`;
  const url = `${GITHUB_API}/repos/${ownerRepo}/contents/${encodeURIComponent(fullPath)}`;
  const data = await fs.promises.readFile(localPath);
  let sha;
  try {
    const existing = await httpJson(`${url}?ref=${branch}`);
    if (existing.ok) sha = existing.json.sha;
  } catch {}
  const body = {
    message: `chore(image): upload ${fileName}`,
    content: data.toString('base64'),
    branch,
    sha
  };
  const out = await httpJson(url, { method: 'PUT', body: JSON.stringify(body) });
  if (!out.ok) {
    const apiMsg = out.json?.message ? ` - ${out.json.message}` : '';
    throw new Error(`GitHub uploadImage failed: ${out.status} ${out.statusText}${apiMsg}`);
  }
}

async function deleteImage(fileName) {
  if (mode !== 'github') return;
  const fullPath = `${uploadsPath}/${fileName}`;
  const url = `${GITHUB_API}/repos/${ownerRepo}/contents/${encodeURIComponent(fullPath)}`;
  try {
    const meta = await httpJson(`${url}?ref=${branch}`);
    if (!meta.ok) return;
    await httpJson(url, {
      method: 'DELETE',
      body: JSON.stringify({ message: `chore(image): delete ${fileName}`, sha: meta.json.sha, branch })
    });
  } catch (err) {
    console.warn('[githubStore] deleteImage failed:', err);
  }
}

async function restoreImages() {
  if (mode !== 'github') return;
  fs.mkdirSync(localUploadsDir, { recursive: true });
  for (const p of cache.products) {
    if (!p.imageUrl || !p.imageUrl.startsWith('/uploads/')) continue;
    const fileName = p.imageUrl.replace('/uploads/', '');
    const localFile = path.join(localUploadsDir, fileName);
    if (fs.existsSync(localFile)) continue;
    try {
      const url = `${GITHUB_API}/repos/${ownerRepo}/contents/${encodeURIComponent(uploadsPath + '/' + fileName)}?ref=${branch}`;
      const out = await httpJson(url);
      if (out.ok) {
        const buf = Buffer.from(out.json.content || '', out.json.encoding || 'base64');
        await fs.promises.writeFile(localFile, buf);
      }
    } catch (err) {
      console.warn('[githubStore] restore image failed:', fileName, err);
    }
  }
}

module.exports = { load, getCache, save, uploadImage, deleteImage };
