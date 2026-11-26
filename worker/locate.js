// Page finder: before the expensive reading, a fast model looks at the whole report (page images and text) and says
// where the auditor's report, the audited statements and the notes are. Text rules cannot do this for every layout
// (scanned pages, scrambled fonts, chapter lists on every page, condensed summaries in the board report).

const PAGE = { type: 'INTEGER', nullable: true };

export const LOCATE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    totalPages: { type: 'INTEGER' },
    auditorFrom: PAGE, auditorTo: PAGE,
    balanceSheetPage: PAGE, incomeStatementPage: PAGE, cashFlowPage: PAGE,
    statementsFrom: PAGE, statementsTo: PAGE,
    notesFrom: PAGE, notesTo: PAGE,
  },
  required: ['totalPages', 'auditorFrom', 'auditorTo', 'balanceSheetPage', 'incomeStatementPage', 'cashFlowPage',
    'statementsFrom', 'statementsTo', 'notesFrom', 'notesTo'],
};

export const LOCATE_PROMPT = `This PDF is a listed company's annual report or financial statements. Find where its audited financial statements are.

All page numbers are PDF page indices: the position of the page in this file, counting the first page as 1. Ignore the page numbers printed on the pages. Some pages are scanned images; read them visually.

Return:
- totalPages: the number of pages in this file.
- auditorFrom, auditorTo: first and last page of the independent auditor's report on the financial statements (the report that states the audit opinion). Not the audit committee's report, not the internal audit section, not an agenda item.
- balanceSheetPage, incomeStatementPage, cashFlowPage: the page of the audited statement of financial position (balance sheet), the statement of profit or loss (income statement), and the statement of cash flows. These are the full audited statements that follow the auditor's report, with two year columns. Never a summary, highlight or analysis table in the board of directors' report.
- statementsFrom, statementsTo: first and last page of the primary statements as a block (financial position through cash flows, including comprehensive income and changes in equity).
- notesFrom, notesTo: first and last page of the notes to the financial statements.
Use null for anything the file does not contain. Do not guess.`;

/** Pure: turn a page-finder answer into one page range to keep, or null when the answer is not trustworthy. */
export function keepRange(loc, total) {
  if (!loc || !Number.isInteger(total) || total < 1) return null;
  const ok = (p) => Number.isInteger(p) && p >= 1 && p <= total;
  const core = [loc.balanceSheetPage, loc.incomeStatementPage, loc.cashFlowPage].filter(ok);
  if (!ok(loc.balanceSheetPage) || core.length < 2) return null; // without the balance sheet located, do not cut
  const starts = [loc.auditorFrom, loc.statementsFrom, ...core].filter(ok);
  const ends = [loc.notesTo, loc.statementsTo, loc.auditorTo, ...core].filter(ok);
  // One page of margin before, and everything to the end of the notes (or of the file when the notes are not found).
  const from = Math.max(1, Math.min(...starts) - 1);
  const to = ok(loc.notesTo) ? Math.min(total, Math.max(...ends) + 1) : total;
  if (!ok(loc.auditorFrom)) return { from: Math.max(1, from - 8), to }; // auditor not found: keep 8 more pages before
  return { from, to };
}
