/** Fixed disclaimer shown on every verdict (spec §5, §2). */
export const DISCLAIMER =
  'تحليل تعليمي مبني على القوائم المنشورة، لا يشمل التقييم السعري، وليس توصية استثمارية.';

/** Model rating labels, strongest first. */
export const RATING_LABELS = ['قوي', 'مستقر', 'تحت المراقبة', 'ضعيف'];

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
