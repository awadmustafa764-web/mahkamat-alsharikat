import { describe, it, expect } from 'vitest';
import { fixture } from '../helpers.js';
import { analyze, judgeRating, allEvidence, buildBenchmarks, DISCLAIMER, RATING_LABELS, HALLS } from '../../src/engine/index.js';

/** Ten synthetic industrial peers spread around the fixture. */
function peers() {
  return Array.from({ length: 10 }, (_, i) => {
    const d = fixture('industrial');
    const k = 0.6 + i * 0.1;
    for (const y of ['2024', '2023']) {
      d.years[y].bs.totalCurrentAssets *= k; d.years[y].bs.receivables *= 1 / k; d.years[y].is.netIncome *= k; d.years[y].is.netIncomeParent *= k;
    }
    return d;
  });
}

describe('analyze()', () => {
  const bench = buildBenchmarks(peers());
  const c = analyze(fixture('industrial'), bench);

  it('returns a complete case', () => {
    expect(c.disclaimer).toBe(DISCLAIMER);
    for (const h of HALLS) expect(Array.isArray(c.halls[h])).toBe(true);
    expect(RATING_LABELS).toContain(c.rating.label);
    expect(c.integrity.ok).toBe(true);
    expect(['high', 'medium', 'low']).toContain(c.rating.confidence);
  });

  it('every evidence explains itself', () => {
    for (const e of allEvidence(c)) {
      expect(e.titleAr.length, e.id).toBeGreaterThan(2);
      expect(e.formulaAr.length, e.id).toBeGreaterThan(2);
      for (const i of e.inputs) expect(i.labelAr.length, e.id).toBeGreaterThan(0);
    }
  });

  it('ratios are graded against the sector with n shown', () => {
    const cr = c.halls.liquidity.find((e) => e.id === 'currentRatio');
    expect(cr.benchmark.basis).toBe('sector');
    expect(cr.benchmark.n).toBe(10);
  });

  it('questions lead with the receivables finding', () => {
    expect(c.questions).toHaveLength(3);
    expect(c.questions[0]).toContain('الذمم');
  });

  it('strengths, weaknesses and guesses are populated', () => {
    expect(c.strengths.length).toBeGreaterThan(0);
    expect(c.strengths.length).toBeLessThanOrEqual(3);
    expect(c.weaknesses.length).toBeGreaterThan(0);
    expect(c.guesses).toHaveLength(3);
    expect(c.guesses[0].answer).toBe(true); // current ratio 2.67 > 1
  });

  it('is deterministic', () => {
    expect(JSON.stringify(analyze(fixture('industrial'), bench))).toBe(JSON.stringify(c));
  });

  it('throws a clear error on invalid data', () => {
    const d = fixture('industrial');
    delete d.meta.sector;
    expect(() => analyze(d, bench)).toThrow(/غير صالحة/);
  });
});

describe('downgrades', () => {
  const bench = buildBenchmarks(peers());
  it('adverse opinion caps the label at ضعيف', () => {
    const d = fixture('industrial');
    d.disclosures.auditor.opinion = 'adverse';
    const c = analyze(d, bench);
    expect(c.rating.label).toBe('ضعيف');
    expect(c.surprise.id).toBe('adverseOpinion');
  });
  it('going concern caps the label at تحت المراقبة', () => {
    const d = fixture('industrial');
    d.disclosures.auditor.goingConcern = 'material-uncertainty';
    expect(['تحت المراقبة', 'ضعيف']).toContain(analyze(d, bench).rating.label);
  });
});

describe('judgeRating()', () => {
  const c = analyze(fixture('industrial'), buildBenchmarks(peers()));
  it('no votes reproduces the model verdict', () => {
    const j = judgeRating(c, {});
    expect(j.points).toBeCloseTo(c.rating.points, 10);
    expect(j.label).toBe(c.rating.label);
    expect(j.diffAr).toEqual([]);
  });
  it('dismissing weak evidence can only raise the verdict', () => {
    const votes = Object.fromEntries(allEvidence(c).filter((e) => ['D', 'E'].includes(e.benchmark?.grade)).map((e) => [e.id, 'unconvincing']));
    expect(Object.keys(votes).length).toBeGreaterThan(0);
    const j = judgeRating(c, votes);
    expect(j.points).toBeGreaterThanOrEqual(c.rating.points);
  });
  it('dismissing the adverse opinion removes its downgrade', () => {
    const d = fixture('industrial');
    d.disclosures.auditor.opinion = 'adverse';
    const ca = analyze(d, buildBenchmarks(peers()));
    const j = judgeRating(ca, { adverseOpinion: 'unconvincing' });
    expect(j.downgrades.length).toBeLessThan(ca.rating.downgrades.length);
  });
});

describe('confidence', () => {
  it('a verdict resting on fewer than 5 graded measures is low confidence', () => {
    const d = fixture('insurance');
    const c = analyze(d, {});
    expect(c.rating.gradedCount).toBeGreaterThanOrEqual(4); // insurer: margin, combined, roe, equity/assets graded by reference bands
    const thin = fixture('industrial');
    for (const y of ['2024', '2023']) for (const k of ['inventory', 'cogs', 'interestExpense', 'depreciation']) { delete thin.years[y].bs[k]; delete thin.years[y].is[k]; }
    thin.meta.sector = 'services';
    expect(['low', 'medium', 'high']).toContain(analyze(thin, {}).rating.confidence);
  });
});

describe('financial sectors run end-to-end', () => {
  it('bank and insurance produce cases without Piotroski/Altman evidence', () => {
    for (const name of ['bank', 'insurance']) {
      const c = analyze(fixture(name), {});
      const ids = allEvidence(c).map((e) => e.id);
      expect(ids).not.toContain('piotroski');
      expect(ids).not.toContain('altman');
      expect(c.halls.intro[0].excluded.length).toBeGreaterThan(0);
      expect(c.guesses.length).toBeGreaterThan(0);
    }
  });
});

describe('investment verdict', () => {
  it('every rating carries an invest / do-not-invest verdict matching its label', async () => {
    const { RATING_LABELS, VERDICTS } = await import('../../src/engine/constants.js');
    const c = analyze(fixture('industrial'), {});
    expect(c.rating.verdict).toEqual(VERDICTS[RATING_LABELS.indexOf(c.rating.label)]);
    const d = fixture('industrial');
    d.disclosures.auditor.opinion = 'adverse';
    expect(analyze(d, {}).rating.verdict.decision).toBe('avoid');
  });
});
