import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { validateCompany, runIntegrity, analyze, benchmarksFromFile } from '../src/engine/index.js';

const dir = new URL('../data/companies/', import.meta.url);
const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
const bench = benchmarksFromFile(JSON.parse(readFileSync(new URL('../data/pex-benchmark.json', import.meta.url), 'utf8')));

describe('verified showcase companies', () => {
  it('there are showcase companies to test', () => expect(files.length).toBeGreaterThanOrEqual(4));

  for (const f of files) {
    describe(f, () => {
      const d = JSON.parse(readFileSync(new URL(f, dir), 'utf8'));
      it('is valid and passes integrity', () => {
        expect(validateCompany(d).errors).toEqual([]);
        expect(runIntegrity(d).ok).toBe(true);
      });
      it('every line has a source page', () => {
        for (const yd of Object.values(d.years)) for (const stmt of ['bs', 'is', 'cf']) for (const [k, l] of Object.entries(yd[stmt] ?? {})) {
          expect(typeof l === 'object' && Number.isInteger(l.src?.page), `${f} ${stmt}.${k}`).toBe(true);
        }
      });
      it('analyzes against the PEX benchmark without throwing', () => {
        const c = analyze(d, bench);
        expect(c.questions).toHaveLength(3);
      });
    });
  }

  it('the distressed company (when present) is flagged', () => {
    if (!files.includes('distressed.json')) return;
    const c = analyze(JSON.parse(readFileSync(new URL('distressed.json', dir), 'utf8')), bench);
    expect(c.surprise !== null || ['تحت المراقبة', 'ضعيف'].includes(c.rating.label)).toBe(true);
  });
});
