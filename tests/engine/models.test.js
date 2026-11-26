import { describe, it, expect } from 'vitest';
import { fixture } from '../helpers.js';
import { piotroski, altmanZpp, dupont } from '../../src/engine/models.js';

describe('Piotroski F-Score (Piotroski 2000)', () => {
  const p = piotroski(fixture('industrial'));
  it('scores 8 of 9 with only the accrual signal failing', () => {
    expect(p.score).toBe(8);
    expect(p.signals).toHaveLength(9);
    expect(p.signals.filter((s) => !s.pass).map((s) => s.id)).toEqual(['accrual']);
    expect(p.approximation).toBe(false);
  });
  it('signal values follow the paper definitions', () => {
    const s = Object.fromEntries(p.signals.map((x) => [x.id, x]));
    expect(s.roa.value).toBeCloseTo(200 / 1800, 6);           // NI / beginning TA
    expect(s.cfo.value).toBeCloseTo(150 / 1800, 6);
    expect(s.deltaRoa.value).toBeCloseTo(200 / 1800 - 140 / 1700, 6);
    expect(s.deltaLever.value).toBeCloseTo(400 / 1900 - 450 / 1750, 6); // LTD / average TA
    expect(s.deltaTurn.value).toBeCloseTo(2000 / 1800 - 1800 / 1700, 6);
  });
  it('falls back to year-end assets when beginning assets missing', () => {
    const d = fixture('industrial');
    delete d.priorPriorTotalAssets;
    const q = piotroski(d);
    expect(q.approximation).toBe(true);
    expect(typeof q.score).toBe('number');
  });
  it('is excluded for banks and insurers', () => {
    expect(piotroski(fixture('bank')).excludedReason.length).toBeGreaterThan(10);
    expect(piotroski(fixture('insurance')).score).toBeNull();
  });
});

describe("Altman Z'' (Altman 1995, non-manufacturing / emerging markets)", () => {
  it('computes Z, the four ratios, zone and EM score', () => {
    const z = altmanZpp(fixture('industrial'), 2024);
    expect(z.x1).toBeCloseTo(0.25, 6);
    expect(z.x2).toBeCloseTo(0.25, 6);
    expect(z.x3).toBeCloseTo(0.15, 6);
    expect(z.x4).toBeCloseTo(1.5, 6);
    expect(z.z).toBeCloseTo(5.038, 3);
    expect(z.zone).toBe('safe');
    expect(z.emScore).toBeCloseTo(8.288, 3);
  });
  it('zones at the published cut-offs 1.10 and 2.60', () => {
    const d = fixture('industrial');
    d.years['2024'].bs.retainedEarnings = -1500; // X2 = -0.75 → Z = 5.038 - 3.26 = 1.778 → grey
    expect(altmanZpp(d, 2024).zone).toBe('grey');
    d.years['2024'].bs.retainedEarnings = -1800; // X2 = -0.9 → Z = 1.289 → grey
    d.years['2024'].is.operatingIncome = 0;      // X3 = 0 → Z = 0.281 → distress
    expect(altmanZpp(d, 2024).zone).toBe('distress');
  });
  it('is excluded for banks', () => {
    expect(altmanZpp(fixture('bank'), 2024).excludedReason.length).toBeGreaterThan(10);
  });
});

describe('DuPont (3-step, year-end)', () => {
  it('multiplies back to ROE', () => {
    const r = dupont(fixture('industrial'), 2024);
    expect(r.netMargin).toBeCloseTo(0.1, 6);
    expect(r.assetTurnover).toBeCloseTo(1, 6);
    expect(r.equityMultiplier).toBeCloseTo(1.666667, 5);
    expect(r.roe).toBeCloseTo(0.166667, 5);
  });
});
