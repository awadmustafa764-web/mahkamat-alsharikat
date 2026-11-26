import { describe, it, expect } from 'vitest';
import { fixture } from '../helpers.js';
import { median, percentileRank, gradeRatio, buildBenchmarks, REFERENCE_BANDS } from '../../src/engine/benchmarks.js';

const bench = (values) => ({ n: values.length, ratios: { currentRatio: values, debtToEquity: values } });

describe('statistics', () => {
  it('median and percentile rank (ties count half)', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
    expect(percentileRank(5, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])).toBe(45);
    expect(percentileRank(11, [1, 2, 3])).toBe(100);
  });
});

describe('gradeRatio', () => {
  it('grades against the sector when n ≥ 4', () => {
    const b = bench([0.8, 1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 2.2, 2.4, 3.0]);
    const g = gradeRatio('currentRatio', 2.6667, b);
    expect(g.basis).toBe('sector');
    expect(g.n).toBe(10);
    expect(g.median).toBeCloseTo(1.7, 6);
    expect(g.percentile).toBe(90);
    expect(g.grade).toBe('A');
  });
  it('inverts for lower-is-better ratios', () => {
    const b = bench([0.8, 1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 2.2, 2.4, 3.0]);
    expect(gradeRatio('debtToEquity', 0.7, b).grade).toBe('A');
    expect(gradeRatio('debtToEquity', 2.9, b).grade).toBe('E');
  });
  it('uses reference bands when n < 4', () => {
    const b = bench([1.1, 1.3]);
    const g = gradeRatio('currentRatio', 2.6667, b);
    expect(g.basis).toBe('reference');
    expect(g.grade).toBe('A');
    expect(gradeRatio('debtToEquity', 0.6667, b).grade).toBe('B');
    expect(gradeRatio('currentRatio', 0.9, b).grade).toBe('E');
  });
  it('returns grade null for a ratio with no band and a thin sector, or an absolute amount', () => {
    expect(gradeRatio('dpo', 39, bench([1])).grade).toBeNull();
    expect(gradeRatio('fcf', 30, bench([1, 2, 3, 4, 5])).grade).toBeNull();
    expect(gradeRatio('currentRatio', null, bench([1, 2, 3, 4])).grade).toBeNull();
  });
  it('every reference band is monotonic', () => {
    for (const [id, b] of Object.entries(REFERENCE_BANDS)) {
      const s = b.better === 'lower' ? [...b.cuts].sort((x, y) => x - y) : [...b.cuts].sort((x, y) => y - x);
      expect(b.cuts, id).toEqual(s);
    }
  });
});

describe('buildBenchmarks', () => {
  it('groups companies by sector and collects applied ratios', () => {
    const b = buildBenchmarks([fixture('industrial'), fixture('industrial'), fixture('bank')]);
    expect(b.industrial.n).toBe(2);
    expect(b.industrial.ratios.currentRatio).toHaveLength(2);
    expect(b.bank.ratios.nplRatio[0]).toBeCloseTo(0.0625, 6);
    expect(b.bank.ratios.currentRatio).toBeUndefined();
  });
  it('accepts compact benchmark rows {sector, ratios}', () => {
    const b = buildBenchmarks([{ sector: 'services', ratios: { roa: 0.05 } }, { sector: 'services', ratios: { roa: 0.07 } }]);
    expect(b.services.ratios.roa).toEqual([0.05, 0.07]);
  });
});
