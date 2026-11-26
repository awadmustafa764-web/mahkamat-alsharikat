import { EXTRACT_URL } from './config.js';
import { toCompanyData } from './extracted.js';
import { validateCompany, runIntegrity, analyze } from '../engine/index.js';
import { benchmarks } from './cases.js';

const ERRORS = {
  'too-large': 'الملف أكبر من 25 ميغابايت. ارفع ملف القوائم المالية والإيضاحات فقط.',
  'not-pdf': 'الملف ليس PDF صالحاً.',
  'origin-not-allowed': 'هذا الموقع غير مسموح له باستخدام خدمة القراءة.',
  'missing-key': 'خدمة القراءة غير مهيأة بعد (مفتاح القراءة مفقود).',
  'extraction-failed': 'لم تتمكن خدمة القراءة من استخراج القوائم من هذا الملف. جرّب ملفاً أوضح، أو افتح شركة جاهزة.',
};

/**
 * Send the PDF to the Worker, convert, validate and analyze.
 * @param {File} file
 * @param {(stepId:string)=>void} onStep progress callback with real stage ids
 * @returns {Promise<{data, case, integrity, problems:string[]}>}
 */
export async function analyzeUpload(file, onStep = () => {}) {
  onStep('send');
  let res;
  try {
    res = await fetch(EXTRACT_URL, { method: 'POST', headers: { 'Content-Type': 'application/pdf', 'X-File-Name': encodeURIComponent(file.name) }, body: file });
  } catch {
    throw new Error('تعذّر الاتصال بخدمة القراءة. تأكد من الاتصال بالإنترنت، أو افتح شركة جاهزة.');
  }
  onStep('read');
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(ERRORS[body.error] ?? 'حدث خطأ في خدمة القراءة.');

  onStep('check');
  const data = toCompanyData(body.data, file.name);
  const problems = [];
  if (!data.meta.isAnnualAudited) problems.push('الملف يبدو قوائم مرحلية أو غير مدققة؛ هذا السجل يقرأ القوائم السنوية المدققة.');
  const v = validateCompany(data);
  if (!v.ok) problems.push(...v.errors.map((e) => `بند ناقص: ${e}`));
  const integrity = runIntegrity(data);

  onStep('analyze');
  const c = v.ok ? analyze(data, benchmarks) : null;
  return { data, case: c, integrity, problems };
}
