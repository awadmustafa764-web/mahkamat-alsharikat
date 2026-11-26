import { describe, it, expect } from 'vitest';
import { pickPages } from '../src/app/trim.js';

const figures = Array.from({ length: 40 }, (_, i) => `${(i + 1) * 1234}`).join(' ');
const narrative = 'رسالة رئيس مجلس الإدارة نرحب بكم في اجتماع الهيئة العامة';
const pages = (n, fill) => Array.from({ length: n }, (_, i) => fill(i + 1));

describe('pickPages', () => {
  it('keeps the auditor report, statements and notes of a long annual report', () => {
    const t = pages(97, (p) => (p === 3 ? 'المحتويات تقرير مدقق الحسابات قائمة المركز المالي'
      : p === 56 ? 'تقرير مدقق الحسابات الخارجي القوائم المالية'
      : p >= 57 && p <= 60 ? '' // scanned auditor pages
      : p === 61 ? `شركة دواجن قائمة المر�ز المالي كما في ${figures}`
      : p > 61 ? `إيضاحات ${figures}` : narrative));
    expect(pickPages(t)).toEqual({ from: 56, to: 97 });
  });
  it('reads titles whose letters are spaced apart', () => {
    const t = pages(60, (p) => (p === 40 ? `ق ا ئ م ة ا ل م ر ك ز ا ل م ا ل ي ${figures}` : p > 40 ? figures : narrative));
    expect(pickPages(t).from).toBe(31); // no auditor marker: 9 pages kept before the balance sheet
  });
  it('falls back to the auditor divider when the statement titles are scrambled', () => {
    const t = pages(62, (p) => (p === 3 ? 'تقرير مدقق الحسابات' : p === 41 ? 'تقرير مدقق EY الحسابات' : p >= 44 ? `ش # $ ة ${figures}` : narrative));
    expect(pickPages(t)).toEqual({ from: 41, to: 62 });
  });
  it('keeps statements that were scanned as images at the end', () => {
    const t = pages(87, (p) => (p >= 57 ? '' : narrative));
    expect(pickPages(t)).toEqual({ from: 56, to: 87 });
  });
  it('sends short or statements-only files whole', () => {
    expect(pickPages(pages(12, () => figures))).toBeNull();
    expect(pickPages(pages(69, (p) => (p === 2 ? `قائمة المركز المالي ${figures}` : figures)))).toBeNull();
  });
});

import { shiftPages } from '../src/app/trim.js';
describe('shiftPages', () => {
  it('moves every cited page back to the original report', () => {
    const x = { years: [{ bs: { totalAssets: { v: 10, page: 6 }, cash: null } }], disclosures: { auditor: { kams: [{ quote: 'q', page: 2 }] } }, meta: { unit: '1' } };
    const y = shiftPages(x, 55);
    expect(y.years[0].bs.totalAssets).toEqual({ v: 10, page: 61 });
    expect(y.years[0].bs.cash).toBeNull();
    expect(y.disclosures.auditor.kams[0].page).toBe(57);
    expect(shiftPages(x, 0)).toBe(x);
  });
});

describe('pickPages with a summary balance sheet in the board report', () => {
  it('starts at the audited section, not at the earlier summary table', () => {
    const t = pages(62, (p) => (p === 25 ? `ملخص قائمة المركز المالي ${figures}`
      : p === 41 ? 'تقرير مدقق EY الحسابات القوائم المالية' : p >= 44 ? `قائمة المركز المالي ${figures}` : narrative));
    expect(pickPages(t)).toEqual({ from: 41, to: 62 });
  });
});

describe('pickPages with a scanned auditor report and balance sheet', () => {
  it('sends the whole file instead of cutting past the statements', () => {
    // JCC 2023: pages 1-26 scanned (board report, auditor, balance sheet), income statement on 27, notes from 31
    // that mention "بيان المركز المالي" in passing.
    const t = pages(69, (p) => (p <= 26 ? '' : p === 27 ? `- 6 - شركة سجاير القدس بيان ة الربح والخسار الموحد ${figures}`
      : p >= 31 ? `إيضاحات حول البيانات المالية تصنف الموجودات في بيان المركز المالي ${figures}` : figures));
    expect(pickPages(t)).toBeNull();
  });
});
