import { describe, it, expect } from 'vitest';
import { fixture } from '../helpers.js';
import { runIntegrity } from '../../src/engine/integrity.js';

const byId = (r, id, year = 2024) => r.checks.find((c) => c.id === id && c.year === year);

describe('runIntegrity', () => {
  it('fixture passes every check for both years', () => {
    const r = runIntegrity(fixture('industrial'));
    expect(r.ok).toBe(true);
    const ids = new Set(r.checks.map((c) => c.id));
    for (const id of ['balance', 'currentAssetsSum', 'currentLiabilitiesSum', 'liabilitiesSum', 'equitySum', 'grossProfit', 'cashRoll', 'cashTie']) {
      expect(ids.has(id)).toBe(true);
    }
    expect(r.checks.every((c) => c.ok)).toBe(true);
  });

  it('passes within rounding tolerance (diff 2)', () => {
    const d = fixture('industrial');
    d.years['2024'].bs.totalAssets = 2002;
    d.years['2024'].bs.otherNonCurrentAssets = 202; // keep the asset side self-consistent
    const r = runIntegrity(d);
    expect(byId(r, 'balance').ok).toBe(true);
    expect(byId(r, 'balance').diff).toBe(2);
  });

  it('fails beyond tolerance (diff 10)', () => {
    const d = fixture('industrial');
    d.years['2024'].bs.totalAssets = 2010;
    const r = runIntegrity(d);
    expect(r.ok).toBe(false);
    expect(byId(r, 'balance').ok).toBe(false);
    expect(byId(r, 'balance').diff).toBe(10);
  });

  it('skips (does not fail) checks whose inputs are absent', () => {
    const d = fixture('industrial');
    d.years['2024'].cf = { cfo: 150 };
    const r = runIntegrity(d);
    expect(byId(r, 'cashRoll')).toBeUndefined();
    expect(r.ok).toBe(true);
  });

  it('bank fixture runs balance and equity checks only where applicable', () => {
    const r = runIntegrity(fixture('bank'));
    expect(r.ok).toBe(true);
    expect(byId(r, 'balance').ok).toBe(true);
    expect(byId(r, 'grossProfit')).toBeUndefined();
  });
});
