/** Fixed disclaimer shown on every verdict (spec §5, §2). */
export const DISCLAIMER =
  'حكم تعليمي مبني على القوائم المالية المنشورة وحدها؛ لا يأخذ سعر السهم أو التقييم السوقي في الحساب.';

/** Model rating labels, strongest first. */
export const RATING_LABELS = ['قوي', 'مستقر', 'تحت المراقبة', 'ضعيف'];

/** The investment verdict paired with each rating label, same order. */
export const VERDICTS = [
  { decision: 'invest', labelAr: 'استثمر', reasonAr: 'المركز المالي قوي في أغلب المحاور، ولا توجد أدلة جوهرية ضده.' },
  { decision: 'invest-cautiously', labelAr: 'استثمر بحذر', reasonAr: 'المركز المالي مقبول، لكن هناك نقاط ضعف تستحق المتابعة قبل القرار.' },
  { decision: 'hold-off', labelAr: 'لا تستثمر الآن', reasonAr: 'الأدلة ضد الشركة أثقل من الأدلة معها في هذه السنة؛ يُعاد النظر بعد القوائم القادمة.' },
  { decision: 'avoid', labelAr: 'لا تستثمر', reasonAr: 'ضعف مالي واضح أو تحفّظ جوهري من المدقق.' },
];

/** Exhibition halls in visiting order (the verdict hall is separate). */
export const HALLS = ['intro', 'profitability', 'liquidity', 'solvency', 'efficiency', 'quality', 'disclosures'];

/** Scoring axes. */
export const AXES = ['profitability', 'liquidity', 'solvency', 'efficiency', 'quality'];

/**
 * Rounding tolerance for comparing published totals.
 * @param {number} total
 * @returns {number}
 */
export function tol(total) {
  return Math.max(2, 0.0005 * Math.abs(total));
}
