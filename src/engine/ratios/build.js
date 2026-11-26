import { val, src } from '../get.js';
import { label } from './labels.js';

export const BASIS_YEAR_END = 'أرصدة آخر المدة';

/** One input reference: [stmt, key, sign?, optionalDefault?] */
function readTerm(d, y, [stmt, key, sign = 1, dflt]) {
  let v = val(d, y, stmt, key);
  if (v === null && dflt !== undefined) v = dflt;
  return { stmt, key, sign, v };
}

/**
 * Build a ratio definition.
 * @param {object} o
 * @param {string} o.id
 * @param {string} o.hall
 * @param {string|null} o.axis
 * @param {string} o.labelAr
 * @param {string} o.formulaAr
 * @param {'higher'|'lower'} o.better
 * @param {Array} o.num  terms summed (with sign) for the numerator
 * @param {Array} [o.den] terms for the denominator (omit for a level, e.g. FCF)
 * @param {number} [o.mult]
 * @param {'equity'|'income'|'positive'} [o.guard]  how to treat a non-positive denominator
 * @param {boolean} [o.absolute] absolute amount, not comparable across companies (never graded)
 * @param {string} [o.unitAr] e.g. 'يوم', 'مرة', '%'
 */
export function ratio(o) {
  return {
    ...o,
    better: o.better ?? 'higher',
    compute(d, y) {
      const numT = o.num.map((t) => readTerm(d, y, t));
      const denT = (o.den ?? []).map((t) => readTerm(d, y, t));
      const inputs = [...numT, ...denT].map((t) => ({ labelAr: label(t.stmt, t.key), value: t.v, src: src(d, y, t.stmt, t.key), stmt: t.stmt, key: t.key }));
      const base = { inputs, basisAr: BASIS_YEAR_END };
      if ([...numT, ...denT].some((t) => t.v === null)) return { ...base, value: null, reason: 'بيانات ناقصة' };
      const num = numT.reduce((s, t) => s + t.sign * t.v, 0);
      if (!o.den) return { ...base, value: num * (o.mult ?? 1) };
      const den = denT.reduce((s, t) => s + t.sign * t.v, 0);
      if (o.guard === 'equity' && den < 0) return { ...base, value: null, reason: 'حقوق الملكية سالبة', flag: 'negativeEquity' };
      if (o.guard === 'income' && den <= 0) return { ...base, value: null, reason: 'صافي الربح سالب أو صفر', flag: 'negativeIncome' };
      if (o.guard === 'positive' && den <= 0) return { ...base, value: null, reason: 'المقام سالب أو صفر' };
      if (den === 0) return { ...base, value: null, reason: 'المقام صفر' };
      return { ...base, value: (num / den) * (o.mult ?? 1) };
    },
  };
}
