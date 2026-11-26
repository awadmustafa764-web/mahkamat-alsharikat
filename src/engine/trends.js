import { val, src, growth, cur, prior } from './get.js';
import { label } from './ratios/labels.js';

/**
 * Not reported as anomalies: totals/subtotals, and lines that merely mirror another finding
 * (parent-share profit duplicates net income; retained earnings move with profit; cash-flow totals are covered by the quality flags).
 * They still appear in horizontalVertical().
 */
const EXCLUDED = new Set(['totalCurrentAssets', 'totalAssets', 'totalCurrentLiabilities', 'totalLiabilities', 'totalEquity',
  'grossProfit', 'pbt', 'cashBegin', 'cashEnd', 'netChangeCash', 'netIncomeParent', 'retainedEarnings', 'equityParent',
  'cfo', 'cfi', 'cff', 'dividendsPaid', 'fxEffect']);

/** Materiality base per statement: total assets, revenue (or insurance revenue / NII), |CFO|. */
function base(d, y, stmt) {
  if (stmt === 'bs') return val(d, y, 'bs', 'totalAssets');
  if (stmt === 'is') return val(d, y, 'is', 'revenue') ?? val(d, y, 'is', 'insuranceRevenue') ?? val(d, y, 'is', 'netInterestIncome');
  const c = val(d, y, 'cf', 'cfo');
  return c === null ? null : Math.abs(c);
}

/** Horizontal (yoy change) and vertical (share of base) analysis for every line present in both years. */
export function horizontalVertical(d) {
  const y = cur(d), p = prior(d);
  const rows = [];
  for (const stmt of ['bs', 'is', 'cf']) {
    const keys = Object.keys(d.years[String(y)]?.[stmt] ?? {});
    const b = base(d, y, stmt);
    for (const key of keys) {
      const c = val(d, y, stmt, key), q = val(d, p, stmt, key);
      if (c === null) continue;
      rows.push({ stmt, key, labelAr: label(stmt, key), cur: c, prior: q, change: growth(c, q),
        share: b ? Math.abs(c) / Math.abs(b) : null, src: src(d, y, stmt, key) });
    }
  }
  return rows;
}

/**
 * Material, unusual changes: |change| ≥ 25% and share ≥ 5% of base. Alert when |change| ≥ 50% or the sign flipped.
 * @returns {{stmt,key,labelAr,cur,prior,change,share,severity:'watch'|'alert',src}[]}
 */
export function findAnomalies(d) {
  const out = [];
  for (const r of horizontalVertical(d)) {
    if (EXCLUDED.has(r.key) || r.change === null || r.share === null) continue;
    const flipped = r.prior !== null && Math.sign(r.cur) !== Math.sign(r.prior) && r.prior !== 0 && r.cur !== 0;
    const big = Math.abs(r.change) >= 0.25;
    const material = r.share >= 0.05 - 1e-12;
    if (!(material && (big || flipped))) continue;
    out.push({ ...r, severity: flipped || Math.abs(r.change) >= 0.5 ? 'alert' : 'watch', flipped });
  }
  return out;
}
