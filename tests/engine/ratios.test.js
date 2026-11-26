import { describe, it, expect } from 'vitest';
import { fixture } from '../helpers.js';
import { RATIOS } from '../../src/engine/ratios/index.js';
import { rulesFor, SECTOR_RULES } from '../../src/engine/sectors.js';

const r = (id, d, year = 2024) => RATIOS[id].compute(d, year);

describe('common ratios (industrial fixture)', () => {
  const d = fixture('industrial');
  const cases = {
    currentRatio: 2.6667, quickRatio: 1.8333, cashRatio: 0.6667, dso: 54.75, dio: 65.1786, dpo: 39.1071, ccc: 80.8214,
    assetTurnover: 1, grossMargin: 0.3, operatingMargin: 0.15, netMargin: 0.1, ebitdaMargin: 0.2, roa: 0.1, roe: 0.165217,
    debtToEquity: 0.6667, debtRatio: 0.4, interestCoverage: 7.5, netDebtToEbitda: 0.75, cfoToNi: 0.75, fcf: 30,
  };
  for (const [id, expected] of Object.entries(cases)) {
    it(`${id} = ${expected}`, () => expect(r(id, d).value).toBeCloseTo(expected, 4));
  }
  it('prior-year values', () => {
    expect(r('currentRatio', d, 2023).value).toBeCloseTo(2.1667, 4);
    expect(r('dso', d, 2023).value).toBeCloseTo(40.5556, 4);
  });
  it('every ratio carries formula, basis and inputs', () => {
    const res = r('currentRatio', d);
    expect(RATIOS.currentRatio.formulaAr.length).toBeGreaterThan(0);
    expect(res.basisAr).toBe('أرصدة آخر المدة');
    expect(res.inputs.map((i) => i.value)).toEqual([800, 300]);
  });
});

describe('book value per share respects the reporting unit', () => {
  it('equity in thousands ÷ actual share count', () => {
    const d = fixture('industrial');           // unit "1000", equityParent 1150 → 1,150,000
    d.years['2024'].shares = 1_000_000;
    expect(r('bvps', d).value).toBeCloseTo(1.15, 6);
    d.meta.unit = '1';
    expect(r('bvps', d).value).toBeCloseTo(0.00115, 8);
  });
});

describe('bank and insurance ratios', () => {
  const b = fixture('bank');
  const n = fixture('insurance');
  it('bank', () => {
    expect(r('nplRatio', b).value).toBeCloseTo(0.0625, 6);
    expect(r('nplCoverage', b).value).toBeCloseTo(1, 6);
    expect(r('loanToDeposit', b).value).toBeCloseTo(0.75, 6);
    expect(r('costToIncome', b).value).toBeCloseTo(0.545455, 5);
    expect(r('nimProxy', b).value).toBeCloseTo(0.04, 6);
    expect(r('bankRoe', b).value).toBeCloseTo(0.15, 6);
    expect(r('bankRoa', b).value).toBeCloseTo(0.018, 6);
    expect(r('capitalAdequacy', b).value).toBeCloseTo(0.16, 6);
  });
  it('insurance (IFRS 17)', () => {
    expect(r('combinedRatio', n).value).toBeCloseTo(0.92, 6);
    expect(r('insServiceMargin', n).value).toBeCloseTo(0.08, 6);
    expect(r('investmentYield', n).value).toBeCloseTo(0.06, 6);
    expect(r('insRoe', n).value).toBeCloseTo(0.12, 6);
    expect(r('equityToAssets', n).value).toBeCloseTo(0.277778, 5);
  });
});

describe('review focus: bad inputs never produce NaN/Infinity', () => {
  it('returns null with reason when denominator missing or zero', () => {
    const d = fixture('industrial');
    d.years['2024'].is.interestExpense = 0;
    const res = r('interestCoverage', d);
    expect(res.value).toBeNull();
    expect(res.reason).toBe('المقام صفر');
    delete d.years['2024'].bs.inventory;
    expect(r('dio', d).value).toBeNull();
    expect(r('dio', d).reason).toBe('بيانات ناقصة');
  });
  it('negative equity yields null ROE and negativeEquity flag', () => {
    const d = fixture('industrial');
    d.years['2024'].bs.equityParent = -50;
    d.years['2024'].bs.totalEquity = -50;
    const roe = r('roe', d);
    expect(roe.value).toBeNull();
    expect(roe.flag).toBe('negativeEquity');
    expect(r('debtToEquity', d).value).toBeNull();
    expect(r('debtToEquity', d).flag).toBe('negativeEquity');
  });
  it('no ratio returns a non-finite number for any fixture', () => {
    for (const name of ['industrial', 'bank', 'insurance']) {
      const d = fixture(name);
      for (const id of rulesFor(d.meta.sector).applied) {
        const v = r(id, d).value;
        expect(v === null || Number.isFinite(v)).toBe(true);
      }
    }
  });
});

describe('sector rules', () => {
  it('bank excludes current ratio with a reason', () => {
    const ex = rulesFor('bank').excluded.find((e) => e.id === 'currentRatio');
    expect(ex.reasonAr.length).toBeGreaterThan(10);
  });
  it('no ratio is both applied and excluded; every applied id exists', () => {
    for (const [sector, rule] of Object.entries(SECTOR_RULES)) {
      const ex = new Set(rule.excluded.map((e) => e.id));
      for (const id of rule.applied) {
        expect(ex.has(id), `${sector}:${id}`).toBe(false);
        expect(RATIOS[id], `${sector}:${id}`).toBeDefined();
      }
    }
  });
  it('financial sectors exclude piotroski and altman', () => {
    for (const s of ['bank', 'insurance']) {
      const ids = rulesFor(s).excluded.map((e) => e.id);
      expect(ids).toContain('piotroski');
      expect(ids).toContain('altman');
    }
  });
});
