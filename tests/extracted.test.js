import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { toCompanyData } from '../src/app/extracted.js';
import { validateCompany, runIntegrity, analyze } from '../src/engine/index.js';
import { EXTRACTION_SCHEMA, BS_KEYS, IS_KEYS, CF_KEYS } from '../worker/schema.js';
import { SECTOR_KEYS } from '../src/engine/schema.js';

/** Turn a verified company file back into what Gemini would return, then convert it forward again. */
function asExtraction(d) {
  const years = d.meta.years.map((year) => {
    const y = d.years[String(year)];
    const blk = (b, keys) => Object.fromEntries(keys.map((k) => [k, b?.[k] ? { v: b[k].v, page: b[k].src.page } : null]));
    return { year, bs: blk(y.bs, BS_KEYS), is: blk(y.is, IS_KEYS), cf: blk(y.cf, CF_KEYS),
      shares: y.shares ? { v: y.shares.v ?? y.shares, page: y.shares.src?.page ?? 1 } : null,
      capitalAdequacy: y.capitalAdequacy ? { v: y.capitalAdequacy.v, page: y.capitalAdequacy.src.page } : null };
  });
  const a = d.disclosures.auditor;
  return {
    meta: { ...d.meta, isAnnualAudited: true },
    years,
    disclosures: { ...d.disclosures, notesIncluded: true, auditor: { ...a, emphasis: a.emphasis?.present ? { quote: a.emphasis.quote, page: a.emphasis.page } : null } },
  };
}

describe('extraction schema covers every engine key', () => {
  it('all sector keys exist in the schema', () => {
    for (const k of Object.values(SECTOR_KEYS)) for (const [stmt, list] of Object.entries({ ...k.required })) {
      const keys = { bs: BS_KEYS, is: IS_KEYS, cf: CF_KEYS }[stmt];
      for (const key of list) expect(keys, `${stmt}.${key}`).toContain(key);
    }
    expect(EXTRACTION_SCHEMA.required).toEqual(['meta', 'years', 'disclosures']);
  });
});

describe('toCompanyData', () => {
  for (const name of ['aziza', 'bop', 'insurer', 'paltel', 'distressed']) {
    it(`round-trips ${name} into a valid, balanced case`, () => {
      const d = JSON.parse(readFileSync(new URL(`../data/companies/${name}.json`, import.meta.url), 'utf8'));
      const c = toCompanyData(asExtraction(d), `${name}.pdf`);
      expect(validateCompany(c).errors).toEqual([]);
      expect(runIntegrity(c).ok).toBe(true);
      expect(analyze(c, {}).rating.verdict.labelAr.length).toBeGreaterThan(2);
    });
  }
  it('drops null lines and keeps pages', () => {
    const c = toCompanyData({ meta: { sector: 'services', years: [2025, 2024] }, years: [{ year: 2025, bs: { cash: { v: 5, page: 9 }, inventory: null }, is: {}, cf: {} }], disclosures: { auditor: { opinion: 'qualified', goingConcern: 'none', kams: [] } } });
    expect(c.years['2025'].bs).toEqual({ cash: { v: 5, src: { page: 9, doc: 'upload' } } });
    expect(c.disclosures.auditor.opinion).toBe('qualified');
  });
});
