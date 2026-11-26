import { val, cur, prior, priorPriorTotalAssets } from './get.js';
import { rulesFor } from './sectors.js';

const excluded = (d, id) => rulesFor(d.meta.sector).excluded.find((e) => e.id === id)?.reasonAr ?? null;
const div = (a, b) => (a === null || b === null || b === 0 ? null : a / b);

/**
 * Piotroski (2000) F-Score — nine binary signals.
 * ROA, CFO, ACCRUAL and ΔTURN use beginning-of-year total assets; ΔLEVER uses average total assets.
 * When the prior year's beginning assets are unknown, prior year-end assets are used and approximation=true.
 */
export function piotroski(d) {
  const reason = excluded(d, 'piotroski');
  if (reason) return { score: null, signals: [], approximation: false, excludedReason: reason };
  const y = cur(d), p = prior(d);
  const v = (s, k, yr) => val(d, yr, s, k);
  const taC = v('bs', 'totalAssets', y), taP = v('bs', 'totalAssets', p);
  const pp = priorPriorTotalAssets(d);
  const approximation = pp === null;
  const begC = taP, begP = pp ?? taP;

  const roaC = div(v('is', 'netIncome', y), begC), roaP = div(v('is', 'netIncome', p), begP);
  const cfoC = div(v('cf', 'cfo', y), begC);
  const levC = div(v('bs', 'longTermDebt', y) ?? 0, (taP + taC) / 2);
  const levP = div(v('bs', 'longTermDebt', p) ?? 0, (begP + taP) / 2);
  const crC = div(v('bs', 'totalCurrentAssets', y), v('bs', 'totalCurrentLiabilities', y));
  const crP = div(v('bs', 'totalCurrentAssets', p), v('bs', 'totalCurrentLiabilities', p));
  const gm = (yr) => { const r = v('is', 'revenue', yr), c = v('is', 'cogs', yr); return r && c !== null ? (r - c) / r : null; };
  const turnC = div(v('is', 'revenue', y), begC), turnP = div(v('is', 'revenue', p), begP);
  const shC = v('top', 'shares', y), shP = v('top', 'shares', p);
  const sub = (a, b) => (a === null || b === null ? null : a - b);

  const S = (id, labelAr, value, pass) => ({ id, labelAr, value, pass: value === null ? false : pass, missing: value === null });
  const signals = [
    S('roa', 'العائد على الأصول موجب', roaC, roaC > 0),
    S('cfo', 'التدفق النقدي التشغيلي موجب', cfoC, cfoC > 0),
    S('deltaRoa', 'تحسّن العائد على الأصول عن السنة السابقة', sub(roaC, roaP), sub(roaC, roaP) > 0),
    S('accrual', 'التدفق النقدي التشغيلي أكبر من صافي الربح (نسبةً للأصول)', sub(cfoC, roaC), sub(cfoC, roaC) > 0),
    S('deltaLever', 'انخفاض نسبة القروض طويلة الأجل إلى متوسط الأصول (أو عدم ارتفاعها)', sub(levC, levP), sub(levC, levP) <= 0),
    S('deltaLiquid', 'تحسّن نسبة التداول', sub(crC, crP), sub(crC, crP) > 0),
    S('eqOffer', 'لم تُصدر الشركة أسهماً جديدة', sub(shC, shP), sub(shC, shP) <= 0),
    S('deltaMargin', 'تحسّن هامش مجمل الربح', sub(gm(y), gm(p)), sub(gm(y), gm(p)) > 0),
    S('deltaTurn', 'تحسّن دوران الأصول', sub(turnC, turnP), sub(turnC, turnP) > 0),
  ];
  return { score: signals.filter((s) => s.pass).length, signals, approximation, missing: signals.filter((s) => s.missing).map((s) => s.id) };
}

/**
 * Altman Z″ (Altman 1995; Altman, Hartzell & Peck) for non-manufacturing and emerging-market firms, without the 3.25 constant.
 * Z″ = 6.56·X1 + 3.26·X2 + 6.72·X3 + 1.05·X4; safe > 2.60, grey 1.10–2.60, distress < 1.10. EM score = Z″ + 3.25.
 */
export function altmanZpp(d, year) {
  const reason = excluded(d, 'altman');
  if (reason) return { z: null, excludedReason: reason };
  const v = (s, k) => val(d, year, s, k);
  const ta = v('bs', 'totalAssets');
  const x1 = div(v('bs', 'totalCurrentAssets') - v('bs', 'totalCurrentLiabilities'), ta);
  const x2 = div(v('bs', 'retainedEarnings'), ta);
  const x3 = div(v('is', 'operatingIncome'), ta);
  const x4 = div(v('bs', 'totalEquity'), v('bs', 'totalLiabilities'));
  if ([x1, x2, x3, x4].some((x) => x === null || !Number.isFinite(x))) return { z: null, x1, x2, x3, x4, reason: 'بيانات ناقصة' };
  const z = 6.56 * x1 + 3.26 * x2 + 6.72 * x3 + 1.05 * x4;
  const zone = z > 2.6 ? 'safe' : z < 1.1 ? 'distress' : 'grey';
  return { z, x1, x2, x3, x4, zone, emScore: z + 3.25 };
}

/** Three-step DuPont on year-end balances: ROE = net margin × asset turnover × equity multiplier. */
export function dupont(d, year) {
  const v = (s, k) => val(d, year, s, k);
  const netMargin = div(v('is', 'netIncome'), v('is', 'revenue'));
  const assetTurnover = div(v('is', 'revenue'), v('bs', 'totalAssets'));
  const eq = v('bs', 'totalEquity');
  const equityMultiplier = eq !== null && eq > 0 ? div(v('bs', 'totalAssets'), eq) : null;
  const roe = [netMargin, assetTurnover, equityMultiplier].some((x) => x === null) ? null : netMargin * assetTurnover * equityMultiplier;
  return { netMargin, assetTurnover, equityMultiplier, roe };
}
