import { EXTRACT_URL } from './config.js';
import { toCompanyData } from './extracted.js';
import { inspectPdf, cutPdf, shiftPages } from './trim.js';
import { keepRange } from '../../worker/locate.js';
import { validateCompany, runIntegrity, analyze } from '../engine/index.js';
import { benchmarks, docket } from './cases.js';
import KNOWN from '../../data/known-files.json';
// The page finder lives beside the reader on the same Worker.
const LOCATE_URL = EXTRACT_URL.replace(/extract$/, 'locate');

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
  const { range, how, total } = await planCut(file);
  const blob = range ? await cutPdf(file, range) : null;
  const cut = blob ? { ...range, total } : null;
  onStep('trim', cut ? `الصفحات ${cut.from}–${cut.to} من ${total}${how === 'finder' ? '' : ' (بالقواعد النصية)'}` : 'يُرسل الملف كاملاً');
  onStep('send');
  let body = await read(cut ? blob : file, file.name, onStep);
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

/**
 * Which pages to send. 1) The page finder: a fast model looks at the whole report, scans included, and says where
 * the auditor's report, statements and notes are. 2) If it fails, the text rules. 3) Otherwise the whole file.
 * Small files (30 pages or fewer) always go whole.
 */
async function planCut(file) {
  const { total, guess } = await inspectPdf(file);
  if (total <= 30) return { range: null, total };
  const worth = (r) => r && r.to - r.from + 1 <= total * 0.8; // a cut that barely helps is not worth the risk
  try {
    const res = await fetch(LOCATE_URL, { method: 'POST', headers: { 'Content-Type': 'application/pdf', 'X-File-Name': encodeURIComponent(file.name) }, body: file });
    if (res.ok) {
      const loc = (await res.json()).data;
      // The finder must have seen the same file: a page count that disagrees means its answer cannot be trusted.
      const range = loc?.totalPages === total ? keepRange(loc, total) : null;
      if (range) return { range: worth(range) ? range : null, how: 'finder', total };
    }
  } catch { /* the page finder is an optimisation; fall through to the text rules */ }
  return { range: worth(guess) ? guess : null, how: 'rules', total };
}

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
