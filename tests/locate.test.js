import { describe, it, expect } from 'vitest';
import { keepRange } from '../worker/locate.js';

const loc = (o) => ({ totalPages: 97, auditorFrom: 57, auditorTo: 60, balanceSheetPage: 61, incomeStatementPage: 62, cashFlowPage: 65,
  statementsFrom: 61, statementsTo: 65, notesFrom: 66, notesTo: 96, ...o });

describe('keepRange (page finder answer → pages to send)', () => {
  it('keeps the auditor report through the end of the notes, with a page of margin', () => {
    expect(keepRange(loc(), 97)).toEqual({ from: 56, to: 97 });
  });
  it('keeps 8 more pages before the statements when the auditor report was not found', () => {
    expect(keepRange(loc({ auditorFrom: null, auditorTo: null }), 97)).toEqual({ from: 52, to: 97 });
  });
  it('keeps everything to the end when the notes were not found', () => {
    expect(keepRange(loc({ notesFrom: null, notesTo: null }), 97).to).toBe(97);
  });
  it('refuses to cut without a located balance sheet or with impossible pages', () => {
    expect(keepRange(loc({ balanceSheetPage: null }), 97)).toBeNull();
    expect(keepRange(loc({ balanceSheetPage: 140 }), 97)).toBeNull();
    expect(keepRange(loc({ incomeStatementPage: null, cashFlowPage: null }), 97)).toBeNull();
    expect(keepRange(null, 97)).toBeNull();
  });
  it('covers an auditor report placed after the statements', () => {
    expect(keepRange(loc({ auditorFrom: 98, auditorTo: 99 }), 100)).toEqual({ from: 60, to: 100 });
  });
});
