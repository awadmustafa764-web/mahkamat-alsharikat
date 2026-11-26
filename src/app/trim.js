// Cut an annual report down to the auditor's report + financial statements + notes before sending it to the reader.
// Annual reports put board letters, photos and governance first (heavy images, no figures); the reader then times out.
// Detection works on page text and tolerates the broken glyphs many Arabic PDFs produce (e.g. "المر�ز المالي").

const norm = (s) => s.normalize('NFKC')
  .replace(/[ً-ْـ]/g, '') // harakat, tatweel
  .replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ی/g, 'ي').replace(/ک/g, 'ك').replace(/ھ/g, 'ه').replace(/ة/g, 'ه')
  .toLowerCase();
// Some PDFs space every letter ("ق ا ئ م ة"), so titles are matched with all whitespace removed.
const squash = (s) => norm(s).replace(/\s+/g, '');

/** Pattern where any letter may come out as U+FFFD; also matched reversed (visual-order PDFs). Applied to squashed text. */
function fuzzy(phrase) {
  const p = squash(phrase);
  const body = (s) => [...s].map((c) => `[${c.replace(/[\\\]^-]/g, '\\$&')}\\uFFFD]`).join('');
  return new RegExp(`${body(p)}|${body([...p].reverse().join(''))}`);
}

// Titles of the primary statements. Short forms on purpose: "الربح والخسار" also matches the garbled "بيان ة الربح والخسار".
const STATEMENT = ['المركز المالي', 'الميزانية العامة', 'قائمة الدخل', 'بيان الدخل', 'الربح والخسار', 'الربح او الخسار',
  'التدفقات النقدية', 'statement of financial position', 'balance sheet', 'profit or loss', 'income statement', 'statement of cash flows'].map(fuzzy);
const AUDITOR = ['تقرير مدقق', 'تقرير المدقق المستقل', 'مدقق الحسابات المستقل', 'independent auditor'].map(fuzzy);
const NUMBER = /[\d٠-٩][\d٠-٩٬,.]{2,}/g;

/**
 * Pure: page texts without running headers, footers and side navigation, i.e. any text item that sits at the same
 * spot on at least a quarter of the pages. Some reports print the chapter list ("تقرير مدقق الحسابات" included) on
 * every page, which would otherwise make every page look like the auditor's report.
 * @param {{str:string,x:number,y:number}[][]} pages
 */
export function stripRunning(pages) {
  const key = (it) => `${it.str.trim()}@${Math.round(it.x / 6)},${Math.round(it.y / 6)}`;
  const seen = new Map();
  for (const p of pages) for (const k of new Set(p.map(key))) seen.set(k, (seen.get(k) ?? 0) + 1);
  const limit = Math.max(3, pages.length * 0.25);
  return pages.map((p) => p.filter((it) => !it.str.trim() || seen.get(key(it)) < limit).map((it) => it.str).join(' '));
}

/**
 * Pure: which pages to keep, given each page's text (index 0 = page 1).
 * @returns {{from:number,to:number}|null} 1-based inclusive range, or null to send the whole file.
 */
export function pickPages(pageTexts) {
  const n = pageTexts.length;
  if (n < 30) return null; // already small: statements-only files go as they are
  const t = pageTexts.map(squash);
  const figures = (i) => (pageTexts[i].match(NUMBER) ?? []).length;
  const isAuditor = (i) => AUDITOR.some((re) => re.test(t[i]));
  const isBlank = (i) => t[i].replace(/[\d٠-٩\-–.]/g, '').length < 20; // a scanned page: no text layer
  const accept = (from) => (n - from <= n * 0.8 ? { from: from + 1, to: n } : null); // a cut that barely helps is not worth it

  // A primary statement page: its title at the TOP of the page (notes only mention it mid-text) and a table of figures.
  const isStatement = (i) => STATEMENT.some((re) => re.test(t[i].slice(0, 160))) && figures(i) >= 15;
  // 1. The auditor's report, past the opening pages (whose contents page names it too), counted only when a statement
  //    page follows within 8 pages. The phrase may sit anywhere on the page (a bank's report opens with the firm's
  //    letterhead); the statement-page test rejects audit-committee and AGM pages that merely mention the auditor.
  //    It comes before rule 2 because board reports often print a condensed "balance sheet" summary earlier on;
  //    starting there made the reader take figures from the summary, not the audited statements.
  const aud = t.findIndex((_, i) => i >= n * 0.3 && isAuditor(i) && t.slice(i + 1, i + 9).some((_, k) => isStatement(i + 1 + k)));
  if (aud >= 0) return accept(aud);
  // 1b. Statement titles unreadable (scrambled fonts): a divider page that opens with the auditor phrase, followed
  //     within 8 pages by a table of figures.
  const divider = t.findIndex((p, i) => i >= n * 0.3 && AUDITOR.some((re) => re.test(p.slice(0, 160)))
    && t.slice(i, i + 9).some((_, k) => figures(i + k) >= 25));
  if (divider >= 0) return accept(divider);
  // 2. No readable divider: the first primary statement, recognised by its title at the TOP of the page plus a table
  //    of figures. Notes mention "statement of financial position" mid-text too; taking such a note page once cut
  //    away the statements of a file whose balance sheet was a scan (JCC 2023, 2026-11-26).
  const st = t.findIndex((_, i) => isStatement(i));
  if (st >= 0) {
    // Back up to the auditor's report: the nearest auditor marker within 12 pages, else 9 pages (the opinion is on
    // the report's first page and a bank's report can run 8 pages, so err on keeping more).
    for (let i = st; i >= Math.max(0, st - 12); i--) if (isAuditor(i)) return accept(i);
    // No readable marker, and scanned pages right before the statements: the auditor's report and maybe the balance
    // sheet are images there, and nothing tells where they start. Send the whole file rather than guess.
    if ([1, 2, 3].some((k) => st - k >= 0 && isBlank(st - k))) return null;
    return accept(Math.max(0, st - 9));
  }
  // 3. Statements scanned as images: a block of text-less pages that runs to the end of the file.
  let k = n;
  while (k > 0 && isBlank(k - 1)) k--;
  if (n - k >= 6) return accept(Math.max(0, k - 1)); // keep the divider page just before the scans
  return null;
}

/**
 * Browser: page count and the text-rule guess at the financial section. Never throws.
 * @param {File} file
 * @returns {Promise<{total:number, guess:{from:number,to:number}|null}>}
 */
export async function inspectPdf(file) {
  try {
    const pdfjs = await import('pdfjs-dist');
    const { default: workerSrc } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
    pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
    const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), verbosity: 0 });
    const doc = await task.promise;
    const pages = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const c = await (await doc.getPage(i)).getTextContent();
      pages.push(c.items.map((x) => ({ str: x.str ?? '', x: x.transform?.[4] ?? 0, y: x.transform?.[5] ?? 0 })));
    }
    const total = doc.numPages;
    await task.destroy();
    return { total, guess: pickPages(stripRunning(pages)) };
  } catch (e) {
    console.warn('inspectPdf: could not read the PDF in the browser', e);
    return { total: 0, guess: null };
  }
}

/**
 * Browser: a PDF holding only pages from..to (1-based, inclusive). Byte-identical for the same input, so the reader's
 * store recognises a report cut before. Returns null when the PDF cannot be rebuilt (the caller sends the whole file).
 */
export async function cutPdf(file, { from, to }) {
  try {
    const { PDFDocument } = await import('pdf-lib');
    const src = await PDFDocument.load(new Uint8Array(await file.arrayBuffer()), { ignoreEncryption: true, updateMetadata: false });
    const out = await PDFDocument.create({ updateMetadata: false }); // no timestamp, so the bytes never change
    const idx = Array.from({ length: to - from + 1 }, (_, k) => from - 1 + k);
    (await out.copyPages(src, idx)).forEach((p) => out.addPage(p));
    return new Blob([await out.save()], { type: 'application/pdf' });
  } catch (e) {
    console.warn('cutPdf: sending the whole file', e);
    return null;
  }
}

/** Pure: the reader cites pages of the trimmed file; shift every "page" so citations point into the uploaded report. */
export function shiftPages(x, offset) {
  if (!offset || x === null || typeof x !== 'object') return x;
  if (Array.isArray(x)) return x.map((y) => shiftPages(y, offset));
  return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, k === 'page' && Number.isInteger(v) ? v + offset : shiftPages(v, offset)]));
}
