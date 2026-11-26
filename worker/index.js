// Cloudflare Worker: receives a PDF, asks Gemini to extract the statements, returns JSON.
// The Gemini key lives only in the Worker secret GEMINI_API_KEY (set with `npx wrangler secret put GEMINI_API_KEY`).
import { EXTRACTION_SCHEMA, EXTRACTION_PROMPT } from './schema.js';

const API = 'https://generativelanguage.googleapis.com';
const MAX_BYTES = 25 * 1024 * 1024;
// Bump when EXTRACTION_PROMPT or EXTRACTION_SCHEMA changes, so old stored readings are not reused.
const CACHE_VERSION = 'v1';
// Read-accuracy proven against verified figures, best first.
// 3.8/3.7 are not listed until they pass the same test (their quota was spent on 2026-11-25 before they could be measured).
const TESTED_MODELS = ['gemini-3.6-flash', 'gemini-3.5-flash'];

function cors(env, origin) {
  const allowed = (env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const ok = allowed.includes(origin) || /^http:\/\/localhost:\d+$/.test(origin ?? '');
  return ok ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, X-File-Name, X-Model', Vary: 'Origin' } : null;
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

let candidates = null;
let usableModels = [];
let resolvedModel = null;

/** Models to try, best first: GEMINI_MODEL if available, then the accuracy-tested models. */
async function modelCandidates(env) {
  if (candidates) return candidates;
  const r = await fetch(`${API}/v1beta/models?pageSize=200`, { headers: { 'x-goog-api-key': env.GEMINI_API_KEY } });
  const { models = [] } = await r.json();
  const usable = models.filter((m) => m.supportedGenerationMethods?.includes('generateContent')).map((m) => m.name.replace('models/', ''));
  usableModels = usable;
  const wanted = env.GEMINI_MODEL && usable.includes(env.GEMINI_MODEL) ? [env.GEMINI_MODEL] : [];
  // Each model has its own free daily quota, so a longer chain means more readings per day.
  // Only models that read our hand-verified files with zero wrong lines are allowed (tests of 2026-11-25 on the
  // NIC statements, 43/43; the "flash-lite" models misread capex or missed 28 lines and are excluded).
  // Untested models are never tried: a wrong figure is worse than no reading.
  candidates = [...new Set([...wanted, ...TESTED_MODELS.filter((m) => usable.includes(m))])];
  return candidates;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function extract(env, file, only) {
  const tried = [];
  for (const model of only ? [only] : await modelCandidates(env)) {
    // Free-tier flash models often answer 503 "overloaded" for a few seconds; waiting 3s, 6s, 12s usually gets through.
    for (let attempt = 0; attempt < 4; attempt++) {
      // Default thinking on purpose: a low-thinking test read 3 lines wrong and flipped the verdict (2026-11-25).
      const res = await generate(env, file, model, false);
      if (res.ok) { resolvedModel = model; return res.data; }
      tried.push(`${model}:${res.status}`);
      // 429 = quota for this model is used up: retrying only burns more quota, so move to the next model.
      if (res.status !== 503 && res.status !== 500) break;
      if (attempt < 3) await sleep(3000 * 2 ** attempt);
    }
  }
  throw new Error(`generate ${tried.join(' ') || 'no-model'}`);
}

async function generate(env, file, model, lowThinking) {
  const res = await fetch(`${API}/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': env.GEMINI_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ file_data: { mime_type: 'application/pdf', file_uri: file.uri } }, { text: EXTRACTION_PROMPT }] }],
      generationConfig: {
        temperature: 0, responseMimeType: 'application/json', responseSchema: EXTRACTION_SCHEMA,
        ...(lowThinking ? { thinkingConfig: { thinkingLevel: 'low' } } : {}),
      },
    }),
  });
  if (!res.ok) return { ok: false, status: res.status };
  const out = await res.json();
  const text = out.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  return { ok: true, data: JSON.parse(text) };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    const headers = cors(env, origin);
    if (!headers) return json({ error: 'origin-not-allowed' }, 403);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method === 'GET' && new URL(request.url).pathname === '/models') {
      const c = await modelCandidates(env);
      return json({ candidates: c, ...(new URL(request.url).searchParams.has('all') ? { all: usableModels } : {}) }, 200, headers); // model names only; no secrets
    }
    if (request.method !== 'POST' || new URL(request.url).pathname !== '/extract') return json({ error: 'not-found' }, 404, headers);
    if (!env.GEMINI_API_KEY) return json({ error: 'missing-key' }, 500, headers);

    const len = Number(request.headers.get('Content-Length') || 0);
    if (len > MAX_BYTES) return json({ error: 'too-large' }, 413, headers);
    const bytes = await request.arrayBuffer();
    if (bytes.byteLength > MAX_BYTES) return json({ error: 'too-large' }, 413, headers);
    if (new TextDecoder().decode(bytes.slice(0, 5)) !== '%PDF-') return json({ error: 'not-pdf' }, 415, headers);

    // Local testing only: force one model to measure its accuracy against verified figures (never cached).
    const only = /^http:\/\/localhost:\d+$/.test(origin ?? '') ? request.headers.get('X-Model') : null;
    // A file read once is never sent to Gemini again: same bytes → same stored result, from any device.
    const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map((b) => b.toString(16).padStart(2, '0')).join('');
    const key = `${CACHE_VERSION}:${hash}`;
    if (env.EXTRACT_CACHE && !only) {
      const hit = await env.EXTRACT_CACHE.get(key, 'json').catch(() => null);
      if (hit) return json({ ...hit, cached: true }, 200, headers);
    }

    try {
      const file = await uploadToGemini(env, bytes, request.headers.get('X-File-Name') ?? 'statements.pdf');
      const data = await extract(env, file, only);
      const result = { data, model: resolvedModel, readAt: new Date().toISOString() };
      if (env.EXTRACT_CACHE && !only) await env.EXTRACT_CACHE.put(key, JSON.stringify(result)).catch(() => {});
      return json(result, 200, headers);
    } catch (e) {
      const msg = String(e.message);
      // Every model answered "overloaded" or "quota": the file is fine, the free tier is busy.
      const busy = msg.startsWith('generate') && /:(503|429|524)/.test(msg) && !/:(400|413)/.test(msg);
      // No model answered anything but 429: today's free quota is spent (it resets daily at midnight Pacific time).
      const quota = busy && !/:(503|500|524)/.test(msg);
      return json({ error: quota ? 'quota' : busy ? 'busy' : 'extraction-failed', detail: msg.slice(0, 160) }, busy ? 503 : 502, headers);
    }
  },
};
