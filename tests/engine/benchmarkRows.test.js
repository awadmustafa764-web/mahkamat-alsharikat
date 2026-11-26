import { describe, it, expect } from 'vitest';
import { benchmarksFromFile } from '../../src/engine/benchmarkRows.js';

describe('benchmarksFromFile', () => {
  it('computes peer ratios from compact rows using the engine definitions', () => {
    const b = benchmarksFromFile({ rows: [
      { ticker: 'A', sector: 'industrial', year: 2025, bs: { totalCurrentAssets: 200, totalCurrentLiabilities: 100, totalAssets: 500, totalLiabilities: 250, totalEquity: 250 }, is: { revenue: 400, netIncome: 40 } },
      { ticker: 'B', sector: 'industrial', year: 2024, bs: { totalCurrentAssets: 150, totalCurrentLiabilities: 100, totalAssets: 400 }, is: { revenue: 300, netIncome: 15 } },
      { ticker: 'C', sector: 'bank', year: 2025, bs: { npl: 5, grossLoans: 100, totalAssets: 1000, totalEquity: 100 }, is: { netIncome: 12, netInterestIncome: 30 } },
    ] });
    expect(b.industrial.n).toBe(2);
    expect(b.industrial.ratios.currentRatio).toEqual([2, 1.5]);
    expect(b.industrial.ratios.netMargin).toEqual([0.1, 0.05]);
    expect(b.industrial.ratios.debtToEquity).toEqual([1]);
    expect(b.bank.ratios.nplRatio).toEqual([0.05]);
  });
});
