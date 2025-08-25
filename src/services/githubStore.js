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

async function getFile() {
  const url = `${GITHUB_API}/repos/${ownerRepo}/contents/${encodeURIComponent(filePath)}?ref=${branch}`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`GitHub getFile failed: ${res.status} ${res.statusText}`);
  const meta = await res.json();
  const content = Buffer.from(meta.content, meta.encoding).toString('utf8');
  return { sha: meta.sha, json: JSON.parse(content) };
}

async function putFile(obj, message = 'chore(data): update catalog') {
  const content = Buffer.from(JSON.stringify(obj, null, 2), 'utf8').toString('base64');
  let sha;
  try { sha = (await getFile()).sha; } catch (_) { sha = undefined; }
  const body = {
    message,
    content,
    branch,
    sha,
    committer: {
      name:  process.env.DATA_COMMITTER_NAME || 'Catalog Bot',
      email: process.env.DATA_COMMITTER_EMAIL || 'bot@example.com'
    }
  };
  const url = `${GITHUB_API}/repos/${ownerRepo}/contents/${encodeURIComponent(filePath)}`;
  const res = await fetch(url, { method: 'PUT', headers: headers(), body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`GitHub putFile failed: ${res.status} ${res.statusText}`);
  const out = await res.json();
  return out.content.sha;
}

let cache = null;

async function load() {
  const { json } = await getFile();
  cache = json;
  return cache;
}

function getCache() {
  if (!cache) throw new Error('Catalog cache not loaded yet');
  return cache;
}

async function save(next) {
  await putFile(next, `chore(data): update at ${new Date().toISOString()}`);
  cache = next;
  return cache;
}

module.exports = { load, getCache, save };
