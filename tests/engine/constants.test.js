import { describe, it, expect } from 'vitest';
import { DISCLAIMER, RATING_LABELS, HALLS, tol } from '../../src/engine/constants.js';

describe('constants', () => {
  it('tolerance is max(2, 0.05% of total)', () => {
    expect(tol(100)).toBe(2);
    expect(tol(1_000_000)).toBe(500);
    expect(tol(-1_000_000)).toBe(500);
  });

  it('disclaimer is the exact fixed string', () => {
    expect(DISCLAIMER).toBe('حكم تعليمي مبني على القوائم المالية المنشورة وحدها؛ لا يأخذ سعر السهم أو التقييم السوقي في الحساب.');
  });

  it('has 7 halls and 4 rating labels', () => {
    expect(HALLS).toEqual(['intro', 'profitability', 'liquidity', 'solvency', 'efficiency', 'quality', 'disclosures']);
    expect(RATING_LABELS).toEqual(['قوي', 'مستقر', 'تحت المراقبة', 'ضعيف']);
  });
});
