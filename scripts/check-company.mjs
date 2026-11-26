// Usage: node scripts/check-company.mjs data/companies/aziza.json
// Validates a CompanyData file, runs integrity checks and a full analysis, and prints a short report.
import { readFileSync } from 'node:fs';
import { validateCompany, runIntegrity, analyze } from '../src/engine/index.js';

const path = process.argv[2];
if (!path) { console.error('usage: node scripts/check-company.mjs <file.json>'); process.exit(2); }
const d = JSON.parse(readFileSync(path, 'utf8'));

const v = validateCompany(d);
console.log('VALID:', v.ok, v.errors.length ? v.errors : '');
if (v.missing.length) console.log('MISSING optional:', v.missing.join(', '));
const it = runIntegrity(d);
console.log('INTEGRITY:', it.ok);
for (const c of it.checks) if (!c.ok) console.log(`  ✘ ${c.year} ${c.id} expected=${c.expected} actual=${c.actual} diff=${c.diff}${c.soft ? ' (soft)' : ''}`);

let unsourced = 0;
for (const [y, yd] of Object.entries(d.years)) for (const stmt of ['bs', 'is', 'cf']) for (const [k, l] of Object.entries(yd[stmt] ?? {})) {
  if (typeof l !== 'object' || !l.src?.page) { unsourced++; console.log(`  no src: ${y}.${stmt}.${k}`); }
}
console.log('UNSOURCED lines:', unsourced);

if (v.ok) {
  const c = analyze(d, {});
  console.log('RATING:', c.rating.label, c.rating.points.toFixed(2), 'confidence', c.rating.confidence);
  console.log('SURPRISE:', c.surprise?.id ?? 'none');
  for (const [h, ev] of Object.entries(c.halls)) console.log(` ${h}:`, ev.map((e) => `${e.id}=${e.value === null || e.value === undefined ? '-' : +Number(e.value).toFixed(4)}`).join(' '));
}
process.exit(v.ok && it.ok && unsourced === 0 ? 0 : 1);
