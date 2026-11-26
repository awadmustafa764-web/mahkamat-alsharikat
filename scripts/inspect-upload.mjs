// Usage: node scripts/inspect-upload.mjs <reader-result.json> <pageOffset>
// Shows what the site would do with a reading: integrity, verdict, and every line with its page in the original file.
import { readFileSync } from 'node:fs';
import { toCompanyData } from '../src/app/extracted.js';
import { shiftPages } from '../src/app/trim.js';
import { runIntegrity, analyze, benchmarksFromFile, validateCompany } from '../src/engine/index.js';
const [, , f, off = '0'] = process.argv;
const d = toCompanyData(shiftPages(JSON.parse(readFileSync(f, 'utf8')).data, Number(off)), 'upload.pdf');
console.log(d.meta.nameAr, '|', d.meta.sector, '|', d.meta.currency, 'unit', d.meta.unit, '| years', d.meta.years.join(','), '| audited', d.meta.isAnnualAudited);
for (const [y, yd] of Object.entries(d.years)) for (const s of ['bs', 'is', 'cf']) console.log(y, s, Object.entries(yd[s]).map(([k, l]) => `${k}=${l.v}@${l.src.page}${l.src.derived ? '*' : ''}`).join('  '));
const a = d.disclosures.auditor; console.log('auditor', a.opinion, a.firm, '| GC', a.goingConcern, '| emphasis', !!a.emphasis, '| KAMs', a.kams.map((k) => `${k.title}@${k.page}`).join('; '));
const i = runIntegrity(d); console.log('integrity', i.ok, i.checks.filter((c) => !c.ok).map((c) => `${c.year} ${c.id} diff ${c.diff}`).join('; '));
const v = validateCompany(d); if (!v.ok) console.log('INVALID', v.errors.join(', '));
else { const c = analyze(d, benchmarksFromFile(JSON.parse(readFileSync('data/pex-benchmark.json', 'utf8')))); console.log('verdict', c.rating.verdict.labelAr, c.rating.points.toFixed(2), '|', c.rating.verdict.becauseAr.join(' / ')); }
