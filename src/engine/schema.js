import { val } from './get.js';

export const SECTORS = ['industrial', 'services', 'bank', 'insurance', 'investment'];

const NONFIN_REQUIRED = {
  bs: ['cash', 'receivables', 'totalCurrentAssets', 'totalAssets', 'totalCurrentLiabilities', 'totalLiabilities', 'totalEquity', 'retainedEarnings'],
  is: ['revenue', 'operatingIncome', 'netIncome'],
  cf: ['cfo'],
};
const NONFIN_OPTIONAL = {
  bs: ['inventory', 'otherCurrentAssets', 'ppeNet', 'otherNonCurrentAssets', 'payables', 'shortTermDebt', 'otherCurrentLiabilities',
    'longTermDebt', 'otherNonCurrentLiabilities', 'equityParent', 'nci'],
  is: ['cogs', 'grossProfit', 'sga', 'depreciation', 'interestExpense', 'pbt', 'tax', 'netIncomeParent', 'nonRecurring'],
  cf: ['capex', 'cfi', 'cff', 'dividendsPaid', 'netChangeCash', 'cashBegin', 'cashEnd'],
};

/** Required and optional line keys per sector. */
export const SECTOR_KEYS = {
  industrial: { required: { ...NONFIN_REQUIRED, bs: [...NONFIN_REQUIRED.bs, 'inventory'], is: [...NONFIN_REQUIRED.is, 'cogs'] },
    optional: { ...NONFIN_OPTIONAL, bs: NONFIN_OPTIONAL.bs.filter((k) => k !== 'inventory'), is: NONFIN_OPTIONAL.is.filter((k) => k !== 'cogs') } },
  services: { required: NONFIN_REQUIRED, optional: NONFIN_OPTIONAL },
  investment: {
    required: { bs: ['totalAssets', 'totalLiabilities', 'totalEquity', 'equityParent'], is: ['netIncome'], cf: [] },
    optional: { bs: ['cash', 'shortTermDebt', 'longTermDebt'], is: ['revenue', 'fairValueGains', 'netIncomeParent'], cf: ['cfo', 'dividendsPaid'] },
  },
  bank: {
    required: { bs: ['grossLoans', 'npl', 'deposits', 'totalAssets', 'totalEquity'], is: ['netInterestIncome', 'netIncome'], cf: [] },
    optional: { bs: ['allowanceLoans', 'netLoans', 'totalLiabilities', 'equityParent'], is: ['nonInterestIncome', 'operatingExpenses', 'provisionExpense', 'netIncomeParent'], cf: [] },
  },
  insurance: {
    required: { bs: ['totalAssets', 'totalEquity'], is: ['insuranceRevenue', 'insuranceServiceResult', 'netIncome'], cf: [] },
    optional: { bs: ['totalInvestments', 'totalLiabilities', 'equityParent'], is: ['insuranceServiceExpenses', 'netReinsuranceResult', 'investmentIncome', 'netIncomeParent'], cf: [] },
  },
};

/**
 * Validate CompanyData shape and presence of sector-required lines.
 * @returns {{ok:boolean, errors:string[], missing:string[]}}
 */
export function validateCompany(d) {
  const errors = [];
  const missing = [];
  const m = d?.meta;
  if (!m) return { ok: false, errors: ['meta مفقود'], missing };
  if (!m.sector) errors.push('meta.sector مفقود');
  else if (!SECTORS.includes(m.sector)) errors.push(`meta.sector غير معروف: ${m.sector}`);
  if (!Array.isArray(m.years) || m.years.length < 2) errors.push('meta.years يجب أن يحتوي سنتين على الأقل');
  if (errors.length) return { ok: false, errors, missing };

  const keys = SECTOR_KEYS[m.sector];
  for (const year of m.years.slice(0, 2)) {
    if (!d.years?.[String(year)]) { errors.push(`السنة ${year} مفقودة`); continue; }
    for (const [stmt, list] of Object.entries(keys.required)) {
      for (const k of list) if (val(d, year, stmt, k) === null) errors.push(`${year}.${stmt}.${k} مطلوب`);
    }
    for (const [stmt, list] of Object.entries(keys.optional)) {
      for (const k of list) if (val(d, year, stmt, k) === null) missing.push(`${year}.${stmt}.${k}`);
    }
  }
  if (!d.disclosures?.auditor?.opinion) errors.push('disclosures.auditor.opinion مطلوب');
  return { ok: errors.length === 0, errors, missing };
}
