/**
 * Accessors for CompanyData. A line may be a plain number or {v:number, src:{page,doc}}.
 */

/** @returns {number} current (latest) fiscal year */
export const cur = (d) => d.meta.years[0];
/** @returns {number} comparative fiscal year */
export const prior = (d) => d.meta.years[1];

function line(d, year, stmt, key) {
  const y = d.years?.[String(year)];
  if (!y) return undefined;
  if (stmt === 'top') return y[key];
  return y[stmt]?.[key];
}

/** @returns {number|null} */
export function val(d, year, stmt, key) {
  const l = line(d, year, stmt, key);
  if (l === undefined || l === null) return null;
  const n = typeof l === 'object' ? l.v : l;
  return typeof n === 'number' && Number.isFinite(n) ? n : null;
}

/** @returns {{page:number, doc:string}|null} */
export function src(d, year, stmt, key) {
  const l = line(d, year, stmt, key);
  return l && typeof l === 'object' && l.src ? l.src : null;
}

/** Division that never yields NaN/Infinity. */
export function safeDiv(a, b) {
  if (a === null || a === undefined || b === null || b === undefined) return { value: null, reason: 'بيانات ناقصة' };
  if (b === 0) return { value: null, reason: 'المقام صفر' };
  return { value: a / b };
}

/** Relative change against |prior|; null when prior is 0 or missing. */
export function growth(curV, priorV) {
  if (curV === null || priorV === null || curV === undefined || priorV === undefined || priorV === 0) return null;
  return (curV - priorV) / Math.abs(priorV);
}

/** Prior-prior total assets (optional, for Piotroski beginning-of-year assets). */
export function priorPriorTotalAssets(d) {
  const l = d.priorPriorTotalAssets;
  if (l === undefined || l === null) return null;
  return typeof l === 'object' ? l.v : l;
}
