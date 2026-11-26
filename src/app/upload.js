import { EXTRACT_URL } from './config.js';
import { toCompanyData } from './extracted.js';
import { validateCompany, runIntegrity, analyze } from '../engine/index.js';
import { benchmarks, docket } from './cases.js';
import KNOWN from '../../data/known-files.json';

async function knownCase(file) {
  try {
    const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
    const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
    const id = KNOWN[hex];
    return id ? docket().find((e) => e.id === id) ?? null : null;
  } catch { return null; }
}

const ERRORS = {
  'too-large': 'الملف أكبر من 25 ميغابايت. ارفع ملف القوائم المالية والإيضاحات فقط.',
  'not-pdf': 'الملف ليس PDF صالحاً.',
  'origin-not-allowed': 'هذا الموقع غير مسموح له باستخدام خدمة القراءة.',
  'missing-key': 'خدمة القراءة غير مهيأة بعد (مفتاح القراءة مفقود).',
  busy: 'خدمة القراءة المجانية مزدحمة الآن عند Google، والملف سليم. جرّب مرة ثانية بعد دقيقة، أو افتح شركة جاهزة.',
  'extraction-failed': 'لم تتمكن خدمة القراءة من استخراج القوائم من هذا الملف. جرّب ملفاً أوضح، أو افتح شركة جاهزة.',
};

/**
 * Send the PDF to the Worker, convert, validate and analyze.
 * @param {File} file
 * @param {(stepId:string)=>void} onStep progress callback with real stage ids
 * @returns {Promise<{data, case, integrity, problems:string[]}>}
 */
export async function analyzeUpload(file, onStep = () => {}) {
  // A file we have already audited line by line opens instantly with the verified figures.
  const known = await knownCase(file);
  if (known) {
    for (const s of ['send', 'read', 'check', 'analyze']) onStep(s);
    return { data: known.data, case: known.case, integrity: known.case.integrity, problems: [], verifiedMatch: true };
  }
  onStep('send');
  let res;
  // One request carries the upload and the reading; the upload is done within seconds, the rest is the reader working.
  const readingTimer = setTimeout(() => onStep('read'), 5000);
  try {
    res = await fetch(EXTRACT_URL, { method: 'POST', headers: { 'Content-Type': 'application/pdf', 'X-File-Name': encodeURIComponent(file.name) }, body: file });
  } catch {
    throw new Error('تعذّر الاتصال بخدمة القراءة. تأكد من الاتصال بالإنترنت، أو افتح شركة جاهزة.');
  } finally {
    clearTimeout(readingTimer);
  }
  onStep('read');
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(ERRORS[body.error] ?? 'حدث خطأ في خدمة القراءة.');

  onStep('check');
  const data = toCompanyData(body.data, file.name);
  const problems = [];
  if (!data.meta.isAnnualAudited) problems.push('الملف يبدو قوائم مرحلية أو غير مدققة؛ هذا السجل يقرأ القوائم السنوية المدققة.');
  if (data.disclosures.auditor.opinion === 'not-found') problems.push('لم نجد تقرير المدقق في الملف؛ الحكم مبني على الأرقام وحدها.');
  const v = validateCompany(data);
  if (!v.ok) problems.push(...v.errors.map((e) => `بند ناقص: ${e}`));
  const integrity = runIntegrity(data);

  onStep('analyze');
  const c = v.ok ? analyze(data, benchmarks) : null;
  return { data, case: c, integrity, problems };
}
