// Gemini structured-output schema for extracting a company's statements from a PDF.
// Shared by the Worker (sent to Gemini) and the client converter (tests).

export const BS_KEYS = ['cash', 'receivables', 'inventory', 'otherCurrentAssets', 'totalCurrentAssets', 'ppeNet', 'otherNonCurrentAssets',
  'totalAssets', 'payables', 'shortTermDebt', 'otherCurrentLiabilities', 'totalCurrentLiabilities', 'longTermDebt',
  'otherNonCurrentLiabilities', 'totalLiabilities', 'equityParent', 'nci', 'totalEquity', 'retainedEarnings',
  'grossLoans', 'allowanceLoans', 'netLoans', 'npl', 'deposits', 'totalInvestments'];
export const IS_KEYS = ['revenue', 'cogs', 'grossProfit', 'sga', 'operatingIncome', 'depreciation', 'interestExpense', 'pbt', 'tax',
  'netIncome', 'netIncomeParent', 'nonRecurring', 'netInterestIncome', 'nonInterestIncome', 'operatingExpenses', 'provisionExpense',
  'insuranceRevenue', 'insuranceServiceExpenses', 'netReinsuranceResult', 'insuranceServiceResult', 'investmentIncome'];
export const CF_KEYS = ['cfo', 'capex', 'cfi', 'cff', 'dividendsPaid', 'netChangeCash', 'fxEffect', 'cashBegin', 'cashEnd'];

const LINE = { type: 'OBJECT', nullable: true, properties: { v: { type: 'NUMBER' }, page: { type: 'INTEGER' } }, required: ['v', 'page'] };
const block = (keys) => ({ type: 'OBJECT', properties: Object.fromEntries(keys.map((k) => [k, LINE])) });
const QUOTE = { type: 'OBJECT', properties: { title: { type: 'STRING' }, quote: { type: 'STRING' }, page: { type: 'INTEGER' } }, required: ['quote', 'page'] };

export const EXTRACTION_SCHEMA = {
  type: 'OBJECT',
  properties: {
    meta: {
      type: 'OBJECT',
      properties: {
        nameAr: { type: 'STRING' }, nameEn: { type: 'STRING' }, ticker: { type: 'STRING', nullable: true },
        sector: { type: 'STRING', enum: ['industrial', 'services', 'bank', 'insurance', 'investment'] },
        activityAr: { type: 'STRING' }, currency: { type: 'STRING' }, unit: { type: 'STRING', enum: ['1', '1000', '1000000'] },
        consolidated: { type: 'BOOLEAN' }, framework: { type: 'STRING', enum: ['IFRS', 'IFRS17'] },
        isAnnualAudited: { type: 'BOOLEAN' },
        years: { type: 'ARRAY', items: { type: 'INTEGER' } },
      },
      required: ['nameAr', 'sector', 'currency', 'unit', 'consolidated', 'framework', 'isAnnualAudited', 'years'],
    },
    years: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          year: { type: 'INTEGER' }, bs: block(BS_KEYS), is: block(IS_KEYS), cf: block(CF_KEYS),
          shares: { ...LINE }, capitalAdequacy: { ...LINE },
        },
        required: ['year', 'bs', 'is', 'cf'],
      },
    },
    disclosures: {
      type: 'OBJECT',
      properties: {
        auditor: {
          type: 'OBJECT',
          properties: {
            opinion: { type: 'STRING', enum: ['unmodified', 'qualified', 'adverse', 'disclaimer', 'not-found'] },
            firm: { type: 'STRING' },
            emphasis: { ...QUOTE, nullable: true },
            goingConcern: { type: 'STRING', enum: ['none', 'material-uncertainty'] },
            goingConcernQuote: { ...QUOTE, nullable: true },
            kams: { type: 'ARRAY', items: QUOTE },
          },
          required: ['opinion', 'goingConcern', 'kams'],
        },
        relatedParties: { type: 'ARRAY', items: { type: 'OBJECT', properties: { party: { type: 'STRING' }, nature: { type: 'STRING' }, amount: { type: 'NUMBER', nullable: true }, page: { type: 'INTEGER' } } } },
        contingencies: { type: 'ARRAY', items: { type: 'OBJECT', properties: { text: { type: 'STRING' }, amount: { type: 'NUMBER', nullable: true }, page: { type: 'INTEGER' } } } },
        subsequentEvents: { type: 'ARRAY', items: { type: 'OBJECT', properties: { text: { type: 'STRING' }, page: { type: 'INTEGER' } } } },
        policyChanges: { type: 'ARRAY', items: { type: 'OBJECT', properties: { text: { type: 'STRING' }, page: { type: 'INTEGER' } } } },
        notesIncluded: { type: 'BOOLEAN' },
      },
      required: ['auditor', 'notesIncluded'],
    },
  },
  required: ['meta', 'years', 'disclosures'],
};

export const EXTRACTION_PROMPT = `You are extracting audited financial statements from the attached PDF for an accounting analysis engine. Accuracy matters more than completeness.

Return JSON matching the schema. Rules:
- Use the latest fiscal year and its comparative year (two entries in "years", latest first; meta.years = [latest, comparative]).
- Use CONSOLIDATED statements when present. Copy figures EXACTLY as printed in the published unit (meta.unit "1", "1000" or "1000000").
- Every number has "page" = the PDF page index (1-based) where it is printed. If a line is not printed, set it to null. Never estimate or compute a missing line, except: grossProfit = revenue − cost of sales when both are printed; operatingIncome = gross profit − operating/selling/admin expenses (before finance costs and tax) when no operating subtotal is printed.
- Expenses (cogs, sga, interestExpense, tax, capex, dividendsPaid, depreciation, insuranceServiceExpenses, provisionExpense, operatingExpenses) are POSITIVE numbers. Signed values keep their sign: cfi, cff, netChangeCash, fxEffect, netReinsuranceResult, and losses (negative netIncome).
- receivables = trade receivables net of expected credit losses. payables = trade payables. shortTermDebt = bank loans, overdrafts, facilities and current portion of long-term loans (NOT lease liabilities). longTermDebt = non-current interest-bearing loans. capex = purchases of property, plant & equipment + payments for projects in progress (+ intangibles only if combined). depreciation = depreciation + amortisation added back in the cash-flow statement. shares = number of shares outstanding at year end (actual count, not thousands).
- sector: bank for commercial/Islamic banks; insurance for insurers (framework "IFRS17" when the income statement shows insurance revenue / insurance service result); investment for holding and real-estate investment companies; industrial for manufacturers and agriculture; services otherwise.
- Banks: grossLoans = gross direct credit facilities; allowanceLoans = ECL allowance on them; netLoans as presented; npl = gross stage-3 / non-performing facilities from the credit-risk note; deposits = customers' deposits; capitalAdequacy = regulatory capital adequacy ratio as a decimal (e.g. 0.152).
- Insurance (IFRS 17): insuranceRevenue, insuranceServiceExpenses, netReinsuranceResult (net result from reinsurance contracts held, signed), insuranceServiceResult = the result AFTER reinsurance (= insuranceRevenue − insuranceServiceExpenses + netReinsuranceResult; often labelled "insurance and reinsurance contracts results"), investmentIncome, totalInvestments. dividendsPaid = cash dividends PAID in the cash-flow statement, not dividends declared.
- Auditor's report: opinion type (use "not-found" if the file contains no independent auditor's report; never guess "unmodified"), firm, emphasis-of-matter paragraph (short quote ≤ 40 words + page) or null, going concern ("material-uncertainty" only if the auditor has a material-uncertainty paragraph), key audit matters (title + ≤ 2-sentence quote + page). Quotes in the report's own language.
- relatedParties: only material balances/transactions in the related-party note. contingencies, subsequentEvents, policyChanges: only real items in the notes. disclosures.notesIncluded = false if the PDF has no notes.
- meta.isAnnualAudited = false if these are interim or unaudited statements.`;
