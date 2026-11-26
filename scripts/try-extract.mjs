// Usage: node scripts/try-extract.mjs <pdf> <out.json>  — sends a PDF to the live Worker (dev helper).
import { readFileSync, writeFileSync } from 'node:fs';
const [, , pdf, out] = process.argv;
const t = Date.now();
const r = await fetch('https://mahkamat-extract.mustafaawad.workers.dev/extract', {
  method: 'POST', headers: { Origin: 'http://localhost:5173', 'Content-Type': 'application/pdf', 'X-File-Name': 'statements.pdf' }, body: readFileSync(pdf),
});
const b = await r.text();
writeFileSync(out, b);
console.log('HTTP', r.status, ((Date.now() - t) / 1000).toFixed(1) + 's');
console.log(b.slice(0, 300));
