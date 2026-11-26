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

const BALANCE_SHEET = ['قائمة المركز المالي', 'بيان المركز المالي', 'الميزانية العامة', 'statement of financial position', 'balance sheet'].map(fuzzy);
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
  const nearFigures = (i) => t.slice(i, i + 9).some((_, k) => figures(i + k) >= 25);
  const accept = (from) => (n - from <= n * 0.8 ? { from: from + 1, to: n } : null); // a cut that barely helps is not worth it

  // 1. The auditor's-report divider, past the opening pages (whose contents page names it too), followed within
  //    8 pages by a page of figures. It comes first because board reports often print a condensed "balance sheet"
  //    summary earlier on; starting there made the reader take figures from the summary, not the audited statements.
  const aud = t.findIndex((_, i) => i >= n * 0.3 && isAuditor(i) && nearFigures(i));
  if (aud >= 0) return accept(aud);
  // 2. No readable divider: the balance sheet itself, its title plus a table of figures.
  const bs = t.findIndex((p, i) => BALANCE_SHEET.some((re) => re.test(p)) && figures(i) >= 25);
  if (bs >= 0) {
    // Back up to the auditor's report. Its pages are often scanned images with no text, so take the nearest
    // auditor marker within 12 pages, or failing that the 9 pages before the balance sheet. The opinion is on the
    // report's first page and a bank's report (with key audit matters) can run 8 pages, so err on keeping more.
    let from = Math.max(0, bs - 9);
    for (let i = bs; i >= Math.max(0, bs - 12); i--) if (isAuditor(i)) { from = i; break; }
    return accept(from);
  }
  // 3. Statements scanned as images: a block of text-less pages that runs to the end of the file.
  let k = n;
  while (k > 0 && t[k - 1].replace(/[\d٠-٩]/g, '').length < 20) k--;
  if (n - k >= 6) return accept(Math.max(0, k - 1)); // keep the divider page just before the scans
  return null;
}

/**
 * Browser: return a smaller PDF holding only the financial section, or the original file when no cut is safe.
 * @param {File} file
 * @returns {Promise<{file: File|Blob, cut: {from:number,to:number,total:number}|null}>}
 */
export async function trimPdf(file) {
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const pdfjs = await import('pdfjs-dist');
    const { default: workerSrc } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
    pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
    const task = pdfjs.getDocument({ data: bytes.slice(), verbosity: 0 });
    const doc = await task.promise;
    const pages = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const c = await (await doc.getPage(i)).getTextContent();
      pages.push(c.items.map((x) => ({ str: x.str ?? '', x: x.transform?.[4] ?? 0, y: x.transform?.[5] ?? 0 })));
    }
    const total = doc.numPages;
    await task.destroy();
    const range = pickPages(stripRunning(pages));
    if (!range) return { file, cut: null };

    const { PDFDocument } = await import('pdf-lib');
    const src = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    const out = await PDFDocument.create({ updateMetadata: false }); // no timestamp: the same report always cuts to the same bytes, so the reader's store recognises it
    const idx = Array.from({ length: range.to - range.from + 1 }, (_, k) => range.from - 1 + k);
    (await out.copyPages(src, idx)).forEach((p) => out.addPage(p));
    const blob = new Blob([await out.save()], { type: 'application/pdf' });
    return { file: blob, cut: { ...range, total } };
  } catch (e) {
    console.warn('trimPdf: sending the whole file', e);
    return { file, cut: null }; // any parsing trouble: send the original, never block the upload
  }
}

/** Pure: the reader cites pages of the trimmed file; shift every "page" so citations point into the uploaded report. */
export function shiftPages(x, offset) {
  if (!offset || x === null || typeof x !== 'object') return x;
  if (Array.isArray(x)) return x.map((y) => shiftPages(y, offset));
  return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, k === 'page' && Number.isInteger(v) ? v + offset : shiftPages(v, offset)]));
}
