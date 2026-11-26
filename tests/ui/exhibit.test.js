import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildLayout } from '../../src/exhibit/layout.js';
import { createRail, keyAction } from '../../src/exhibit/rail.js';
import { analyze, benchmarksFromFile, HALLS } from '../../src/engine/index.js';

const bench = benchmarksFromFile(JSON.parse(readFileSync(new URL('../../data/pex-benchmark.json', import.meta.url), 'utf8')));
const load = (n) => analyze(JSON.parse(readFileSync(new URL(`../../data/companies/${n}.json`, import.meta.url), 'utf8')), bench);

describe('buildLayout', () => {
  it('keeps every hall in order plus the verdict hall, and marks empty ones', () => {
    const c = load('bop');
    const L = buildLayout(c);
    expect(L.halls.map((h) => h.id)).toEqual([...HALLS, 'verdict']);
    for (const h of L.halls) if (h.id !== 'verdict') expect(h.empty).toBe(h.slots.length === 0);
  });
  it('places the surprise as the last exhibit before the verdict', () => {
    const c = load('distressed');
    const L = buildLayout(c);
    const exhibits = L.stops.filter((s) => s.evidenceId);
    expect(exhibits.at(-1).evidenceId).toBe(c.surprise.id);
    expect(L.stops.at(-1).hallId).toBe('verdict');
  });
  it('every evidence appears exactly once and halls advance along −z', () => {
    const c = load('aziza');
    const L = buildLayout(c);
    const ids = L.stops.filter((s) => s.evidenceId).map((s) => s.evidenceId);
    expect(new Set(ids).size).toBe(ids.length);
    for (let i = 1; i < L.halls.length; i++) expect(L.halls[i].z0).toBeLessThan(L.halls[i - 1].z0);
  });
});

describe('rail + keyboard', () => {
  it('keyboard map moves rail and opens nearest evidence', () => {
    const L = buildLayout(load('aziza'));
    const rail = createRail(L.stops);
    expect(keyAction('ArrowUp')).toBe('forward');
    expect(keyAction('s')).toBe('back');
    expect(keyAction('Enter')).toBe('open');
    rail.step(1); rail.step(1);
    expect(rail.index).toBe(2);
    rail.step(-5);
    expect(rail.index).toBe(0);
    rail.jumpToHall('verdict');
    expect(rail.atEnd()).toBe(true);
    expect(rail.t).toBe(1);
  });
});
