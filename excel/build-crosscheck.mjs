// Usage: node excel/build-crosscheck.mjs data/companies/aziza.json excel/crosscheck-aziza.xlsx
// Writes a workbook whose "Calc" sheet contains live Excel formulas (not values) over the "Data" sheet.
import { readFileSync } from 'node:fs';
import ExcelJS from 'exceljs';
import { buildCrosscheck } from './crosscheck.js';
import { label } from '../src/engine/ratios/labels.js';
import { RATIOS } from '../src/engine/ratios/index.js';

const [, , input, output] = process.argv;
if (!input || !output) { console.error('usage: node excel/build-crosscheck.mjs <company.json> <out.xlsx>'); process.exit(2); }
const d = JSON.parse(readFileSync(input, 'utf8'));
const { data, calc } = buildCrosscheck(d);

const wb = new ExcelJS.Workbook();
wb.creator = 'محكمة الشركات';
const note = wb.addWorksheet('اقرأني', { views: [{ rightToLeft: true }] });
note.addRow([`ملف مطابقة مستقل: ${d.meta.nameAr}`]);
note.addRow(['ورقة Data فيها الأرقام كما نُشرت، وورقة Calc فيها معادلات Excel حية تعيد حساب كل نسبة ونموذج.']);
note.addRow(['غيّر أي رقم في Data وستتغير النتائج فوراً؛ يجب أن تطابق ما يعرضه الموقع.']);
note.getColumn(1).width = 110;

const ds = wb.addWorksheet('Data', { views: [{ rightToLeft: true }] });
data.forEach((r, i) => {
  const [key, a, b] = r;
  const [stmt, k] = String(key).split('.');
  const row = ds.addRow([key, a, b, i === 0 ? 'البند' : k ? label(stmt, k) : key]);
  if (i === 0) row.font = { bold: true };
});
ds.columns.forEach((c, i) => (c.width = [28, 16, 16, 44][i]));

const cs = wb.addWorksheet('Calc', { views: [{ rightToLeft: true }] });
calc.forEach((r, i) => {
  const [id, formula] = r;
  if (i === 0) { cs.addRow(['id', 'value', 'البيان']).font = { bold: true }; return; }
  const row = cs.addRow([id, { formula: formula.slice(1) }, RATIOS[id]?.labelAr ?? id]);
  row.getCell(2).numFmt = '0.0000';
});
cs.columns.forEach((c, i) => (c.width = [18, 14, 48][i]));

await wb.xlsx.writeFile(output);
console.log('wrote', output);
