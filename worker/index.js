// Cloudflare Worker: receives a PDF, asks Gemini to extract the statements, returns JSON.
// The Gemini key lives only in the Worker secret GEMINI_API_KEY (set with `npx wrangler secret put GEMINI_API_KEY`).
import { EXTRACTION_SCHEMA, EXTRACTION_PROMPT } from './schema.js';

const API = 'https://generativelanguage.googleapis.com';
const MAX_BYTES = 25 * 1024 * 1024;

function cors(env, origin) {
  const allowed = (env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const ok = allowed.includes(origin) || /^http:\/\/localhost:\d+$/.test(origin ?? '');
  return ok ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', Vary: 'Origin' } : null;
}

const json = (body, status, headers) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers } });

async function uploadToGemini(env, bytes, name) {
  const start = await fetch(`${API}/upload/v1beta/files`, {
    method: 'POST',
    headers: {
      'x-goog-api-key': env.GEMINI_API_KEY,
      'X-Goog-Upload-Protocol': 'resumable', 'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': String(bytes.byteLength), 'X-Goog-Upload-Header-Content-Type': 'application/pdf',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ file: { display_name: name.slice(0, 80) } }),
  });
  const url = start.headers.get('x-goog-upload-url');
  if (!start.ok || !url) throw new Error(`upload-start ${start.status}`);
  const up = await fetch(url, {
    method: 'POST',
    headers: { 'X-Goog-Upload-Offset': '0', 'X-Goog-Upload-Command': 'upload, finalize' },
    body: bytes,
  });
  if (!up.ok) throw new Error(`upload ${up.status}`);
  let { file } = await up.json();
  for (let i = 0; i < 20 && file.state === 'PROCESSING'; i++) {
    await new Promise((r) => setTimeout(r, 1500));
    file = await (await fetch(`${API}/v1beta/${file.name}`, { headers: { 'x-goog-api-key': env.GEMINI_API_KEY } })).json();
  }
  if (file.state !== 'ACTIVE') throw new Error(`file-state ${file.state}`);
  return file;
}

async function extract(env, file) {
  const model = env.GEMINI_MODEL || 'gemini-2.5-flash';
  const res = await fetch(`${API}/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': env.GEMINI_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ file_data: { mime_type: 'application/pdf', file_uri: file.uri } }, { text: EXTRACTION_PROMPT }] }],
      generationConfig: { temperature: 0, responseMimeType: 'application/json', responseSchema: EXTRACTION_SCHEMA },
    }),
  });
  if (!res.ok) throw new Error(`generate ${res.status}`);
  const out = await res.json();
  const text = out.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  return JSON.parse(text);
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    const headers = cors(env, origin);
    if (!headers) return json({ error: 'origin-not-allowed' }, 403);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST' || new URL(request.url).pathname !== '/extract') return json({ error: 'not-found' }, 404, headers);
    if (!env.GEMINI_API_KEY) return json({ error: 'missing-key' }, 500, headers);

    const len = Number(request.headers.get('Content-Length') || 0);
    if (len > MAX_BYTES) return json({ error: 'too-large' }, 413, headers);
    const bytes = await request.arrayBuffer();
    if (bytes.byteLength > MAX_BYTES) return json({ error: 'too-large' }, 413, headers);
    if (new TextDecoder().decode(bytes.slice(0, 5)) !== '%PDF-') return json({ error: 'not-pdf' }, 415, headers);

    try {
      const file = await uploadToGemini(env, bytes, request.headers.get('X-File-Name') ?? 'statements.pdf');
      const data = await extract(env, file);
      return json({ data, model: env.GEMINI_MODEL || 'gemini-2.5-flash' }, 200, headers);
    } catch (e) {
      return json({ error: 'extraction-failed', detail: String(e.message).slice(0, 120) }, 502, headers);
    }
  },
};
