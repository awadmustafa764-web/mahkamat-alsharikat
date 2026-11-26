import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { HyperFormula } from 'hyperformula';
import { fixture } from './helpers.js';
import { buildCrosscheck } from '../excel/crosscheck.js';
import { RATIOS } from '../src/engine/ratios/index.js';
import { piotroski, altmanZpp } from '../src/engine/models.js';
import { cur } from '../src/engine/get.js';

function evaluate(d) {
  const { data, calc, checks } = buildCrosscheck(d);
  const hf = HyperFormula.buildFromSheets({ Data: data, Calc: calc }, { licenseKey: 'gpl-v3' });
  const calcId = hf.getSheetId('Calc');
  return Object.fromEntries(checks.map((c) => [c.id, hf.getCellValue({ sheet: calcId, row: c.row - 1, col: 1 })]));
}

function engineValues(d) {
  const y = cur(d);
  const out = {};
  for (const id of Object.keys(RATIOS)) {
    try { out[id] = RATIOS[id].compute(d, y).value; } catch { /* ratio not applicable */ }
  }
  const p = piotroski(d);
  out.piotroski = p.score;
  for (const s of p.signals) out[`p_${s.id}`] = s.pass ? 1 : 0;
  const z = altmanZpp(d, y);
  Object.assign(out, { x1: z.x1, x2: z.x2, x3: z.x3, x4: z.x4, altmanZpp: z.z });
  return out;
}

function compare(d) {
  const xl = evaluate(d);
  const en = engineValues(d);
  const ids = Object.keys(xl);
  expect(ids.length).toBeGreaterThan(20);
  for (const id of ids) {
    expect(typeof xl[id], `${id} evaluated to ${JSON.stringify(xl[id])}`).toBe('number');
    expect(en[id], id).not.toBeNull();
    expect(xl[id], id).toBeCloseTo(en[id], 6);
  }
}

describe('independent Excel cross-check', () => {
  it('Excel formulas reproduce every engine value for the fixture', () => compare(fixture('industrial')));

  const aziza = new URL('../data/companies/aziza.json', import.meta.url);
  it.runIf(existsSync(aziza))('Excel formulas reproduce every engine value for Aziza', () => {
    compare(JSON.parse(readFileSync(aziza, 'utf8')));
  });
});
