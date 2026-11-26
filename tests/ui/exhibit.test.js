import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildLayout, ARG_HALLS } from '../../src/exhibit/layout.js';
import { createRail, keyAction } from '../../src/exhibit/rail.js';
import { analyze, benchmarksFromFile } from '../../src/engine/index.js';

const bench = benchmarksFromFile(JSON.parse(readFileSync(new URL('../../data/pex-benchmark.json', import.meta.url), 'utf8')));
const load = (n) => analyze(JSON.parse(readFileSync(new URL(`../../data/companies/${n}.json`, import.meta.url), 'utf8')), bench);

describe('buildLayout (argument halls)', () => {
  it('has the three argument halls then the verdict, and marks empty ones', () => {
    const L = buildLayout(load('distressed'));
    expect(L.halls.map((h) => h.id)).toEqual([...ARG_HALLS, 'verdict']);
    expect(L.halls.find((h) => h.id === 'for').empty).toBe(true); // nothing in its favour
  });
  it('shows at most 5 exhibits per side, everything else stays in the archive', () => {
    for (const n of ['aziza', 'paltel', 'bop', 'insurer', 'distressed']) {
      const c = load(n);
      const L = buildLayout(c);
      for (const h of L.halls) expect(h.slots.length).toBeLessThanOrEqual(5);
      const shown = L.stops.filter((s) => s.evidenceId).length;
      const total = Object.values(c.halls).flat().filter((e) => e.id !== 'sectorProfile').length;
      expect(shown + c.argument.archive.length).toBe(total);
    }
  });
  it('every exhibit appears once; for/against stops carry their side', () => {
    const L = buildLayout(load('aziza'));
    const ids = L.stops.filter((s) => s.evidenceId).map((s) => s.evidenceId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(L.stops.filter((s) => s.hallId === 'for' && s.evidenceId).every((s) => s.side === 'for')).toBe(true);
    expect(L.stops.filter((s) => s.hallId === 'against' && s.evidenceId).every((s) => s.side === 'against')).toBe(true);
  });
});

describe('rail + keyboard', () => {
  it('keyboard map moves rail and reaches the verdict', () => {
    const rail = createRail(buildLayout(load('aziza')).stops);
    expect(keyAction('ArrowUp')).toBe('forward');
    expect(keyAction('s')).toBe('back');
    expect(keyAction('Enter')).toBe('open');
    rail.step(1); rail.step(1);
    expect(rail.index).toBe(2);
    rail.step(-5);
    expect(rail.index).toBe(0);
    rail.jumpToHall('verdict');
    expect(rail.atEnd()).toBe(true);
  });
});
