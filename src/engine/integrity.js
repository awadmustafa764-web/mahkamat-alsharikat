import { val } from './get.js';
import { tol } from './constants.js';

/**
 * Each check: [id, labelAr, (d, year) => [expected, actual] | null, soft?]
 * Returning null means the inputs are absent, so the check is skipped.
 * Soft checks are reported but never block the analysis (e.g. cash in the cash-flow
 * statement may legitimately net bank overdrafts, so it can differ from balance-sheet cash).
 */
const CHECKS = [
  ['balance', 'الأصول = الخصوم + حقوق الملكية', (d, y) => need(d, y, [['bs', 'totalAssets']], [['bs', 'totalLiabilities'], ['bs', 'totalEquity']])],
  ['currentAssetsSum', 'مجموع الأصول المتداولة = مجموع بنودها', (d, y) =>
    need(d, y, [['bs', 'totalCurrentAssets']], [['bs', 'cash'], ['bs', 'receivables'], ['bs', 'inventory', 0], ['bs', 'otherCurrentAssets']])],
  ['currentLiabilitiesSum', 'مجموع الخصوم المتداولة = مجموع بنودها', (d, y) =>
    need(d, y, [['bs', 'totalCurrentLiabilities']], [['bs', 'payables'], ['bs', 'shortTermDebt', 0], ['bs', 'otherCurrentLiabilities']])],
  ['liabilitiesSum', 'إجمالي الخصوم = المتداولة + القروض طويلة الأجل + غير المتداولة الأخرى', (d, y) =>
    need(d, y, [['bs', 'totalLiabilities']], [['bs', 'totalCurrentLiabilities'], ['bs', 'longTermDebt', 0], ['bs', 'otherNonCurrentLiabilities']])],
  ['equitySum', 'حقوق الملكية = حقوق مساهمي الشركة الأم + حقوق غير المسيطرين', (d, y) =>
    need(d, y, [['bs', 'totalEquity']], [['bs', 'equityParent'], ['bs', 'nci', 0]])],
  ['grossProfit', 'مجمل الربح = الإيرادات − تكلفة المبيعات', (d, y) => {
    const gp = val(d, y, 'is', 'grossProfit'), r = val(d, y, 'is', 'revenue'), c = val(d, y, 'is', 'cogs');
    return gp === null || r === null || c === null ? null : [gp, r - c];
  }],
  ['cashRoll', 'نقد آخر المدة − نقد أول المدة = صافي التغير في النقد', (d, y) => {
    const e = val(d, y, 'cf', 'cashEnd'), b = val(d, y, 'cf', 'cashBegin'), n = val(d, y, 'cf', 'netChangeCash');
    if (e === null || b === null || n === null) return null;
    return [e - b, n + (val(d, y, 'cf', 'fxEffect') ?? 0)];
  }],
  ['cashTie', 'نقد آخر المدة في التدفقات = النقد في الميزانية', (d, y) => {
    const e = val(d, y, 'cf', 'cashEnd'), c = val(d, y, 'bs', 'cash');
    return e === null || c === null ? null : [c, e];
  }, true],
];

/**
 * expectedKeys summed vs partKeys summed. A part given as [stmt,key,0] defaults to 0 when absent;
 * any other absent key skips the check.
 */
function need(d, y, expectedKeys, partKeys) {
  const sum = (list) => {
    let s = 0;
    for (const [stmt, key, dflt] of list) {
      const v = val(d, y, stmt, key);
      if (v === null) { if (dflt === undefined) return null; s += dflt; } else s += v;
    }
    return s;
  };
  const e = sum(expectedKeys), a = sum(partKeys);
  return e === null || a === null ? null : [e, a];
}

/**
 * @returns {{ok:boolean, checks:{id,year,ok,expected,actual,diff,labelAr,soft}[]}}
 */
export function runIntegrity(d) {
  const checks = [];
  for (const year of d.meta.years.slice(0, 2)) {
    for (const [id, labelAr, fn, soft = false] of CHECKS) {
      const r = fn(d, year);
      if (!r) continue;
      const [expected, actual] = r;
      const diff = Math.abs(expected - actual);
      checks.push({ id, year, ok: diff <= tol(expected), expected, actual, diff, labelAr, soft });
    }
  }
  return { ok: checks.every((c) => c.ok || c.soft), checks };
}
