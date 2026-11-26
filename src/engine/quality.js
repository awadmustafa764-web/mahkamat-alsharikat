import { val, src, growth, cur, prior } from './get.js';
import { label } from './ratios/labels.js';

const pct = (x) => `${(x * 100).toFixed(1)}%`;
const inp = (d, y, stmt, key) => ({ labelAr: `${label(stmt, key)} ${y}`, value: val(d, y, stmt, key), src: src(d, y, stmt, key) });

/** Sloan (1996) accrual ratio: (NI − CFO) / average total assets. */
export function sloanAccrual(d) {
  const y = cur(d), p = prior(d);
  const ni = val(d, y, 'is', 'netIncome'), cfo = val(d, y, 'cf', 'cfo');
  const ta = val(d, y, 'bs', 'totalAssets'), tap = val(d, p, 'bs', 'totalAssets');
  if ([ni, cfo, ta, tap].some((v) => v === null) || ta + tap === 0) return null;
  return (ni - cfo) / ((ta + tap) / 2);
}

/**
 * Earnings-quality red flags. Fixed, published thresholds; see docs.
 * @returns {{id, severity:'watch'|'alert', labelAr, detailAr, inputs, axis:'quality'}[]}
 */
export function redFlags(d) {
  const y = cur(d), p = prior(d);
  const v = (s, k, yr = y) => val(d, yr, s, k);
  const g = (s, k) => growth(v(s, k), v(s, k, p));
  const flags = [];
  const add = (id, severity, labelAr, detailAr, inputs) => flags.push({ id, severity, labelAr, detailAr, inputs, axis: 'quality' });

  const gNi = g('is', 'netIncome'), gCfo = g('cf', 'cfo');
  if (gNi !== null && gCfo !== null && gNi > 0 && gCfo < 0) {
    add('niUpCfoDown', 'alert', 'الربح يرتفع والنقد التشغيلي ينخفض',
      `نما صافي الربح ${pct(gNi)} بينما انخفض صافي التدفق النقدي التشغيلي ${pct(Math.abs(gCfo))}.`,
      [inp(d, y, 'is', 'netIncome'), inp(d, p, 'is', 'netIncome'), inp(d, y, 'cf', 'cfo'), inp(d, p, 'cf', 'cfo')]);
  }
  const gR = g('bs', 'receivables'), gRev = g('is', 'revenue');
  if (gR !== null && gRev !== null && gR - gRev > 0.10) {
    add('receivablesOutpaceRevenue', 'alert', 'الذمم المدينة تنمو أسرع من الإيرادات',
      `نمت الذمم المدينة ${pct(gR)} مقابل نمو الإيرادات ${pct(gRev)}، أي بفارق ${pct(gR - gRev)}.`,
      [inp(d, y, 'bs', 'receivables'), inp(d, p, 'bs', 'receivables'), inp(d, y, 'is', 'revenue'), inp(d, p, 'is', 'revenue')]);
  }
  const gInv = g('bs', 'inventory'), gCogs = g('is', 'cogs');
  if (gInv !== null && gCogs !== null && gInv - gCogs > 0.10) {
    add('inventoryOutpaceCogs', 'watch', 'المخزون ينمو أسرع من تكلفة المبيعات',
      `نما المخزون ${pct(gInv)} مقابل نمو تكلفة المبيعات ${pct(gCogs)}.`,
      [inp(d, y, 'bs', 'inventory'), inp(d, p, 'bs', 'inventory'), inp(d, y, 'is', 'cogs'), inp(d, p, 'is', 'cogs')]);
  }
  const ni = v('is', 'netIncome'), cfo = v('cf', 'cfo');
  if (ni !== null && cfo !== null && ni > 0 && cfo / ni < 0.8) {
    add('lowCfoToNi', 'watch', 'النقد التشغيلي أقل من الربح المعلن',
      `كل دينار ربح قابله ${(cfo / ni).toFixed(2)} دينار فقط من النقد التشغيلي.`,
      [inp(d, y, 'cf', 'cfo'), inp(d, y, 'is', 'netIncome')]);
  }
  const s = sloanAccrual(d);
  if (s !== null && s > 0.10) {
    add('highAccruals', 'alert', 'مستحقات مرتفعة',
      `نسبة المستحقات (Sloan) = ${pct(s)} من متوسط الأصول، والحد المرجعي 10%.`,
      [inp(d, y, 'is', 'netIncome'), inp(d, y, 'cf', 'cfo'), inp(d, y, 'bs', 'totalAssets'), inp(d, p, 'bs', 'totalAssets')]);
  }
  const nr = v('is', 'nonRecurring');
  if (nr !== null && ni !== null && ni > 0 && nr / ni > 0.30) {
    add('nonRecurringShare', 'watch', 'جزء كبير من الربح غير متكرر',
      `البنود غير المتكررة تشكل ${pct(nr / ni)} من صافي الربح.`, [inp(d, y, 'is', 'nonRecurring'), inp(d, y, 'is', 'netIncome')]);
  }
  const debt = (v('bs', 'shortTermDebt') ?? 0) + (v('bs', 'longTermDebt') ?? 0);
  const ta = v('bs', 'totalAssets'), ie = v('is', 'interestExpense');
  if (ie !== null && ta && debt > 0 && debt / ta >= 0.05) {
    const rate = ie / debt;
    if (rate < 0.02 || rate > 0.20) {
      add('impliedInterestRate', 'watch', 'معدل فائدة ضمني غير منطقي',
        `مصاريف التمويل ÷ القروض = ${pct(rate)}، خارج النطاق المعقول 2%–20%؛ قد تكون هناك قروض غير معروضة أو فوائد مرسملة.`,
        [inp(d, y, 'is', 'interestExpense'), inp(d, y, 'bs', 'shortTermDebt'), inp(d, y, 'bs', 'longTermDebt')]);
    }
  }
  return flags;
}
