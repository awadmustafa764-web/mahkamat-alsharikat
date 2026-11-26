import { describe, it, expect } from 'vitest';
import { fixture } from '../helpers.js';
import { validateCompany } from '../../src/engine/schema.js';
import { val, src, safeDiv, growth, cur, prior } from '../../src/engine/get.js';

describe('validateCompany', () => {
  it('accepts the industrial, bank and insurance fixtures', () => {
    for (const name of ['industrial', 'bank', 'insurance']) {
      const r = validateCompany(fixture(name));
      expect(r.errors).toEqual([]);
      expect(r.ok).toBe(true);
    }
  });

  it('rejects a company without a sector', () => {
    const d = fixture('industrial');
    delete d.meta.sector;
    const r = validateCompany(d);
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toContain('sector');
  });

  it('rejects an unknown sector and fewer than two years', () => {
    const d = fixture('industrial');
    d.meta.sector = 'casino';
    d.meta.years = [2024];
    const r = validateCompany(d);
    expect(r.ok).toBe(false);
    expect(r.errors.length).toBe(2);
  });

  it('a services company without inventory is valid and reports it missing', () => {
    const d = fixture('industrial');
    d.meta.sector = 'services';
    delete d.years['2024'].bs.inventory;
    const r = validateCompany(d);
    expect(r.ok).toBe(true);
    expect(r.missing).toContain('2024.bs.inventory');
  });

  it('an industrial company missing a required total is invalid', () => {
    const d = fixture('industrial');
    delete d.years['2023'].bs.totalAssets;
    const r = validateCompany(d);
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toContain('2023.bs.totalAssets');
  });
});

describe('accessors', () => {
  it('reads plain numbers and {v, src} lines', () => {
    const d = fixture('industrial');
    d.years['2024'].bs.cash = { v: 200, src: { page: 7, doc: 'annual-2024' } };
    expect(val(d, 2024, 'bs', 'cash')).toBe(200);
    expect(src(d, 2024, 'bs', 'cash')).toEqual({ page: 7, doc: 'annual-2024' });
    expect(val(d, 2024, 'bs', 'receivables')).toBe(300);
    expect(src(d, 2024, 'bs', 'receivables')).toBeNull();
    expect(val(d, 2024, 'bs', 'nope')).toBeNull();
    expect(cur(d)).toBe(2024);
    expect(prior(d)).toBe(2023);
  });

  it('safeDiv and growth guard against bad denominators', () => {
    expect(safeDiv(1, 0)).toEqual({ value: null, reason: 'المقام صفر' });
    expect(safeDiv(1, null)).toEqual({ value: null, reason: 'بيانات ناقصة' });
    expect(safeDiv(3, 4)).toEqual({ value: 0.75 });
    expect(growth(150, 100)).toBe(0.5);
    expect(growth(5, 0)).toBeNull();
    expect(growth(-50, -100)).toBe(0.5);
  });
});
