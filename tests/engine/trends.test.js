import { describe, it, expect } from 'vitest';
import { fixture } from '../helpers.js';
import { horizontalVertical, findAnomalies } from '../../src/engine/trends.js';

describe('horizontalVertical', () => {
  it('computes change and share for each line', () => {
    const rows = horizontalVertical(fixture('industrial'));
    const rec = rows.find((r) => r.stmt === 'bs' && r.key === 'receivables');
    expect(rec.change).toBeCloseTo(0.5, 6);
    expect(rec.share).toBeCloseTo(0.15, 6);
    const cogs = rows.find((r) => r.stmt === 'is' && r.key === 'cogs');
    expect(cogs.share).toBeCloseTo(0.7, 6);
  });
});

describe('findAnomalies', () => {
  const a = findAnomalies(fixture('industrial'));
  const get = (stmt, key) => a.find((x) => x.stmt === stmt && x.key === key);

  it('flags material large changes with the right severity', () => {
    expect(get('bs', 'receivables').severity).toBe('alert');
    expect(get('bs', 'inventory').severity).toBe('watch');
    expect(get('bs', 'otherNonCurrentLiabilities').severity).toBe('alert');
    expect(get('is', 'operatingIncome').severity).toBe('watch');
    expect(get('is', 'netIncome').severity).toBe('watch');
  });

  it('ignores immaterial items and totals', () => {
    expect(get('is', 'tax')).toBeUndefined();
    expect(get('bs', 'otherCurrentAssets')).toBeUndefined();
    expect(get('bs', 'totalAssets')).toBeUndefined();
    expect(get('is', 'pbt')).toBeUndefined();
  });

  it('a sign flip is an alert', () => {
    const d = fixture('industrial');
    d.years['2024'].is.netIncome = -200;
    expect(findAnomalies(d).find((x) => x.key === 'netIncome').severity).toBe('alert');
  });

  it('every anomaly has an Arabic label', () => {
    for (const x of a) expect(x.labelAr.length).toBeGreaterThan(2);
  });
});
