// Usage: node scripts/compare-extract.mjs <extract.json> <verified company.json>
import { readFileSync } from 'node:fs';
import { toCompanyData } from '../src/app/extracted.js';
import { runIntegrity, analyze, benchmarksFromFile } from '../src/engine/index.js';
const [, , ex, ver] = process.argv;
const got = toCompanyData(JSON.parse(readFileSync(ex, 'utf8')).data);
const ref = JSON.parse(readFileSync(ver, 'utf8'));
let match = 0, miss = 0, wrong = [], extra = 0;
for (const [y, yd] of Object.entries(ref.years)) for (const stmt of ['bs', 'is', 'cf']) for (const [k, l] of Object.entries(yd[stmt] ?? {})) {
  const g = got.years[y]?.[stmt]?.[k];
  if (!g) { miss++; continue; }
  const ok = Math.abs(g.v - l.v) <= Math.max(1, Math.abs(l.v) * 0.0005);
  ok ? match++ : wrong.push(`${y}.${stmt}.${k}: got ${g.v} expected ${l.v} (p${g.src.page} vs p${l.src.page})`);
}
console.log(`matched ${match}, wrong ${wrong.length}, missing ${miss}`);
wrong.forEach((w) => console.log('  ✘', w));
console.log('auditor', got.disclosures.auditor.opinion, '| ref', ref.disclosures.auditor.opinion, '| going concern', got.disclosures.auditor.goingConcern, '| emphasis', !!got.disclosures.auditor.emphasis);
console.log('integrity', runIntegrity(got).ok, runIntegrity(got).checks.filter((c) => !c.ok).map((c) => `${c.year} ${c.id} diff ${c.diff}`).join('; '));
const b = benchmarksFromFile(JSON.parse(readFileSync('data/pex-benchmark.json', 'utf8')));
const cg = analyze(got, b), cr = analyze(ref, b);
console.log('verdict extracted:', cg.rating.verdict.labelAr, cg.rating.points.toFixed(2), '| verified:', cr.rating.verdict.labelAr, cr.rating.points.toFixed(2));
