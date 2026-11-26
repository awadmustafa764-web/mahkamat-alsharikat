import { AXES, RATING_LABELS } from './constants.js';
import { AXIS_LABELS } from './texts.js';

const gradeFromPoints = (p) => (p >= 3.5 ? 'A' : p >= 2.5 ? 'B' : p >= 1.5 ? 'C' : p >= 0.5 ? 'D' : 'E');
const labelIndex = (p) => (p >= 3 ? 0 : p >= 2 ? 1 : p >= 1 ? 2 : 3);
const mean = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;

/**
 * Aggregate graded evidence into axes and an overall label, then apply audit-based downgrades.
 * Downgrades are driven by evidence ids so the judge can dismiss them too.
 * @param {object[]} evidence  flat list
 * @returns {{label, points, axes:{[axis]:{grade,points,count}}, downgrades:string[]}}
 */
export function aggregate(evidence) {
  const axes = {};
  for (const axis of AXES) {
    const pts = evidence.filter((e) => e.axis === axis && e.benchmark?.points !== null && e.benchmark?.points !== undefined).map((e) => e.benchmark.points);
    if (pts.length) { const p = mean(pts); axes[axis] = { grade: gradeFromPoints(p), points: p, count: pts.length }; }
  }
  const avail = Object.values(axes).map((a) => a.points);
  const points = avail.length ? mean(avail) : 0;
  let idx = labelIndex(points);
  const downgrades = [];
  const has = (id, pred = () => true) => evidence.some((e) => e.id === id && pred(e));
  if (has('qualifiedOpinion')) { idx = Math.min(3, idx + 1); downgrades.push('رأي المدقق متحفظ: خُفّض التصنيف درجة.'); }
  if (has('altman', (e) => e.zone === 'distress')) { idx = Math.min(3, idx + 1); downgrades.push('مؤشر Altman في منطقة التعثر: خُفّض التصنيف درجة.'); }
  if (has('goingConcern') && idx < 2) { idx = 2; downgrades.push('شك جوهري في الاستمرارية: الحد الأعلى للتصنيف «تحت المراقبة».'); }
  if ((has('adverseOpinion') || has('disclaimerOpinion')) && idx < 3) { idx = 3; downgrades.push('رأي معاكس أو امتناع عن الرأي: التصنيف «ضعيف».'); }
  return { label: RATING_LABELS[idx], points, axes, downgrades };
}

/** Confidence in the result: data completeness and integrity. */
export function confidence(integrityOk, completeness) {
  if (integrityOk && completeness >= 0.9) return 'high';
  if (integrityOk) return 'medium';
  return 'low';
}

/** Flatten all evidence in a Case (halls + models live inside halls). */
export const allEvidence = (c) => Object.values(c.halls).flat();

/**
 * The visitor's (judge's) verdict: same aggregation, excluding evidence voted unconvincing.
 * @param {object} caseObj
 * @param {{[evidenceId:string]:'convincing'|'unconvincing'}} votes
 */
export function judgeRating(caseObj, votes) {
  const kept = allEvidence(caseObj).filter((e) => votes[e.id] !== 'unconvincing');
  const j = aggregate(kept);
  const diffAr = [];
  for (const axis of AXES) {
    const m = caseObj.rating.axes[axis]?.grade, g = j.axes[axis]?.grade;
    if (m !== g) diffAr.push(`${AXIS_LABELS[axis]}: النموذج ${m ?? '—'}، والقاضي ${g ?? '—'}`);
  }
  if (j.label !== caseObj.rating.label) diffAr.push(`التصنيف العام: النموذج «${caseObj.rating.label}»، والقاضي «${j.label}»`);
  return { ...j, diffAr };
}
