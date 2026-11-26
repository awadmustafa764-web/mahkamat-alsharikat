import { RATIOS } from './ratios/index.js';
import { rulesFor } from './sectors.js';
import { cur } from './get.js';

const GRADES = ['A', 'B', 'C', 'D', 'E'];
const POINTS = { A: 4, B: 3, C: 2, D: 1, E: 0 };

/** Minimum peers for a sector comparison; below this, reference bands are used. */
export const MIN_PEERS = 4;

/**
 * Rule-of-thumb bands used ONLY when a sector has fewer than MIN_PEERS companies.
 * cuts = thresholds for A, B, C, D (beyond the last one → E). Not standards; see data/SOURCES.md.
 */
export const REFERENCE_BANDS = {
  currentRatio: { better: 'higher', cuts: [2.0, 1.5, 1.2, 1.0] },
  quickRatio: { better: 'higher', cuts: [1.5, 1.0, 0.8, 0.5] },
  interestCoverage: { better: 'higher', cuts: [8, 5, 3, 1.5] },
  debtToEquity: { better: 'lower', cuts: [0.5, 1.0, 1.5, 2.5] },
  netMargin: { better: 'higher', cuts: [0.15, 0.08, 0.04, 0] },
  roa: { better: 'higher', cuts: [0.10, 0.05, 0.02, 0] },
  roe: { better: 'higher', cuts: [0.15, 0.10, 0.05, 0] },
  cfoToNi: { better: 'higher', cuts: [1.2, 1.0, 0.8, 0.5] },
  nplRatio: { better: 'lower', cuts: [0.03, 0.05, 0.08, 0.12] },
  capitalAdequacy: { better: 'higher', cuts: [0.16, 0.14, 0.125, 0.105] },
  combinedRatio: { better: 'lower', cuts: [0.85, 0.92, 0.97, 1.0] },
  insServiceMargin: { better: 'higher', cuts: [0.10, 0.05, 0.02, 0] },
  insRoe: { better: 'higher', cuts: [0.15, 0.10, 0.05, 0] },
  equityToAssets: { better: 'higher', cuts: [0.35, 0.25, 0.18, 0.12] },
  bankRoe: { better: 'higher', cuts: [0.15, 0.10, 0.05, 0] },
  bankRoa: { better: 'higher', cuts: [0.015, 0.010, 0.007, 0.003] },
  costToIncome: { better: 'lower', cuts: [0.45, 0.55, 0.65, 0.75] },
  nplCoverage: { better: 'higher', cuts: [1.0, 0.8, 0.6, 0.4] },
  loanToDeposit: { better: 'lower', cuts: [0.70, 0.80, 0.90, 1.0] },
  debtRatio: { better: 'lower', cuts: [0.35, 0.50, 0.65, 0.80] },
  operatingMargin: { better: 'higher', cuts: [0.15, 0.10, 0.05, 0] },
};

export function median(xs) {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Share of peers strictly below x plus half of ties, as 0..100. */
export function percentileRank(x, xs) {
  const below = xs.filter((v) => v < x).length;
  const ties = xs.filter((v) => v === x).length;
  return Math.round(((below + 0.5 * ties) / xs.length) * 10000) / 100;
}

const fromPercentile = (p) => (p >= 80 ? 'A' : p >= 60 ? 'B' : p >= 40 ? 'C' : p >= 20 ? 'D' : 'E');

function fromBand(value, band) {
  for (let i = 0; i < band.cuts.length; i++) {
    const ok = band.better === 'lower' ? value <= band.cuts[i] : value >= band.cuts[i];
    if (ok) return GRADES[i];
  }
  return 'E';
}

/**
 * @returns {{grade:string|null, points:number|null, basis:'sector'|'reference'|null, median:number|null, n:number, percentile:number|null}}
 */
export function gradeRatio(ratioId, value, sectorBench) {
  const def = RATIOS[ratioId];
  const peers = sectorBench?.ratios?.[ratioId]?.filter((v) => Number.isFinite(v)) ?? [];
  const none = { grade: null, points: null, basis: null, median: peers.length ? median(peers) : null, n: peers.length, percentile: null };
  if (value === null || value === undefined || !Number.isFinite(value) || def?.absolute) return none;
  if (peers.length >= MIN_PEERS) {
    const percentile = percentileRank(value, peers);
    const eff = def.better === 'lower' ? 100 - percentile : percentile;
    const grade = fromPercentile(eff);
    return { grade, points: POINTS[grade], basis: 'sector', median: median(peers), n: peers.length, percentile };
  }
  const band = REFERENCE_BANDS[ratioId];
  if (!band) return none;
  const grade = fromBand(value, band);
  return { ...none, grade, points: POINTS[grade], basis: 'reference' };
}

/**
 * Build sector benchmarks from full CompanyData objects or compact rows {sector, ratios:{id:value}}.
 * @returns {{[sector]:{n:number, ratios:{[id]:number[]}}}}
 */
export function buildBenchmarks(items) {
  const out = {};
  for (const it of items) {
    const sector = it.meta?.sector ?? it.sector;
    const b = (out[sector] ??= { n: 0, ratios: {} });
    b.n += 1;
    const values = it.meta
      ? Object.fromEntries(rulesFor(sector).applied.filter((id) => !RATIOS[id].absolute).map((id) => [id, RATIOS[id].compute(it, cur(it)).value]))
      : it.ratios;
    for (const [id, v] of Object.entries(values)) if (v !== null && Number.isFinite(v)) (b.ratios[id] ??= []).push(v);
  }
  return out;
}

export { POINTS };
