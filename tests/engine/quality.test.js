import { describe, it, expect } from 'vitest';
import { fixture } from '../helpers.js';
import { redFlags, sloanAccrual } from '../../src/engine/quality.js';

describe('redFlags (industrial fixture)', () => {
  const ids = redFlags(fixture('industrial')).map((f) => f.id);
  it('raises the expected flags', () => {
    expect(ids).toEqual(expect.arrayContaining(['niUpCfoDown', 'receivablesOutpaceRevenue', 'inventoryOutpaceCogs', 'lowCfoToNi']));
  });
  it('does not raise flags that are not warranted', () => {
    expect(ids).not.toContain('highAccruals');
    expect(ids).not.toContain('impliedInterestRate');
    expect(ids).not.toContain('nonRecurringShare');
  });
  it('sloan accrual uses average total assets', () => {
    expect(sloanAccrual(fixture('industrial'))).toBeCloseTo(0.0263158, 6);
  });
  it('each flag carries Arabic text and inputs', () => {
    for (const f of redFlags(fixture('industrial'))) {
      expect(f.labelAr.length).toBeGreaterThan(5);
      expect(f.detailAr.length).toBeGreaterThan(5);
      expect(Array.isArray(f.inputs)).toBe(true);
    }
  });
});

describe('redFlags edge cases', () => {
  it('high accruals and non-recurring share', () => {
    const d = fixture('industrial');
    d.years['2024'].cf.cfo = -20;              // (200 - -20) / 1900 = 0.1158 > 0.10
    d.years['2024'].is.nonRecurring = 80;      // 80/200 = 0.4 > 0.30
    const ids = redFlags(d).map((f) => f.id);
    expect(ids).toContain('highAccruals');
    expect(ids).toContain('nonRecurringShare');
  });
  it('implied interest rate outside 2%-20% when debt is material', () => {
    const d = fixture('industrial');
    d.years['2024'].is.interestExpense = 5;    // 5/500 = 1%
    expect(redFlags(d).map((f) => f.id)).toContain('impliedInterestRate');
  });
  it('no flags crash on a bank', () => {
    expect(() => redFlags(fixture('bank'))).not.toThrow();
  });
});
