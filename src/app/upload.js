import { EXTRACT_URL } from './config.js';
import { toCompanyData } from './extracted.js';
import { trimPdf, shiftPages } from './trim.js';
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
  quota: 'انتهت حصة القراءة المجانية لهذا اليوم عند Google، وتتجدد كل يوم قرابة العاشرة صباحاً بتوقيت فلسطين. الشركات الجاهزة تعمل الآن.',
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
    for (const s of ['trim', 'send', 'read', 'check', 'analyze']) onStep(s);
    return { data: known.data, case: known.case, integrity: known.case.integrity, problems: [], verifiedMatch: true };
  }
  // Long annual reports stall the free reader: send only the auditor's report, statements and notes.
  onStep('trim');
  const { file: toSend, cut } = await trimPdf(file);
  onStep('trim', cut ? `الصفحات ${cut.from}–${cut.to} من ${cut.total}` : 'يُرسل الملف كاملاً');
  onStep('send');
  let body = await read(toSend, file.name, onStep);
  let offset = cut ? cut.from - 1 : 0;

  onStep('check');
  let data = toCompanyData(shiftPages(body.data, offset), file.name);
  let v = validateCompany(data);
  // Safety net for the cut: if the trimmed pages did not yield the core lines or the auditor's report, the cut may
  // have missed something, so the whole file is read before anything is judged.
  if (cut && (!v.ok || data.disclosures.auditor.opinion === 'not-found')) {
    onStep('send', 'لم تكتمل القراءة من الصفحات المقتطعة، نعيد إرسال الملف كاملاً');
    try {
      body = await read(file, file.name, onStep);
      offset = 0;
      data = toCompanyData(body.data, file.name);
      v = validateCompany(data);
    } catch { /* keep the first reading; its problems are reported below */ }
    onStep('check');
  }
  const problems = [];
  if (!data.meta.isAnnualAudited) problems.push('الملف يبدو قوائم مرحلية أو غير مدققة؛ هذا السجل يقرأ القوائم السنوية المدققة.');
  if (data.disclosures.auditor.opinion === 'not-found') problems.push('لم نجد تقرير المدقق في الملف؛ الحكم مبني على الأرقام وحدها.');
  if (!v.ok) problems.push(MISSING_CORE);
  const integrity = runIntegrity(data);

  onStep('analyze');
  const c = v.ok ? analyze(data, benchmarks) : null;
  return { data, case: c, integrity, problems, cut: offset ? cut : null, missing: v.ok ? [] : v.errors };
}

const MISSING_CORE = 'لم نتمكن من قراءة البنود الأساسية في هذا الملف (مثل مجموع الأصول وحقوق الملكية وصافي الربح)، فلن نصدر حكماً على أرقام ناقصة. تأكد أن الملف يحتوي القوائم المالية السنوية المدققة، أو ارفع ملف القوائم المالية وحده.';

/** One request carries the upload and the reading; the upload is done within seconds, the rest is the reader working. */
async function read(blob, name, onStep) {
  const readingTimer = setTimeout(() => onStep('read'), 5000);
  let res;
  try {
    res = await fetch(EXTRACT_URL, { method: 'POST', headers: { 'Content-Type': 'application/pdf', 'X-File-Name': encodeURIComponent(name) }, body: blob });
  } catch {
    throw new Error('تعذّر الاتصال بخدمة القراءة. تأكد من الاتصال بالإنترنت، أو افتح شركة جاهزة.');
  } finally {
    clearTimeout(readingTimer);
  }
  onStep('read');
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(ERRORS[body.error] ?? 'حدث خطأ في خدمة القراءة.');
  return body;
}
