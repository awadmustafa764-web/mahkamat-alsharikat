import { describe, it, expect } from 'vitest';
import { fixture } from '../helpers.js';
import { disclosureEvidence, pickSurprise } from '../../src/engine/disclosures.js';

describe('disclosureEvidence', () => {
  it('turns KAMs into info evidence with quote and page, and states the opinion', () => {
    const ev = disclosureEvidence(fixture('industrial'));
    const kams = ev.filter((e) => e.id.startsWith('kam-'));
    expect(kams).toHaveLength(1);
    expect(kams[0].severity).toBe('info');
    expect(kams[0].page).toBe(12);
    expect(kams[0].quote.length).toBeGreaterThan(10);
    expect(ev.find((e) => e.id === 'auditorOpinion').severity).toBe('info');
    expect(ev.every((e) => e.hall === 'disclosures')).toBe(true);
  });

  it('material related-party balances are watch evidence', () => {
    const d = fixture('industrial');
    d.disclosures.relatedParties = [{ party: 'الشركة الأم', nature: 'مبيعات', amount: 150, page: 30 }, { party: 'شركة شقيقة', nature: 'خدمات', amount: 20, page: 30 }];
    const rp = disclosureEvidence(d).filter((e) => e.id.startsWith('relatedParty-'));
    expect(rp.map((e) => e.severity)).toEqual(['watch', 'info']);   // 150/2000 = 7.5% ≥ 5%, 20/2000 = 1%
  });
});

describe('pickSurprise', () => {
  it('no surprise for a clean report', () => {
    const d = fixture('industrial');
    expect(pickSurprise(d, disclosureEvidence(d))).toBeNull();
  });
  it('going concern beats emphasis of matter', () => {
    const d = fixture('industrial');
    d.disclosures.auditor.goingConcern = 'material-uncertainty';
    d.disclosures.auditor.emphasis = { present: true, quote: 'نلفت الانتباه إلى الإيضاح 2.', page: 5 };
    expect(pickSurprise(d, disclosureEvidence(d)).id).toBe('goingConcern');
  });
  it('a qualified opinion alone is the surprise', () => {
    const d = fixture('industrial');
    d.disclosures.auditor.opinion = 'qualified';
    const s = pickSurprise(d, disclosureEvidence(d));
    expect(s.id).toBe('qualifiedOpinion');
    expect(s.severity).toBe('alert');
  });
  it('altman distress evidence is the surprise when the audit report is clean', () => {
    const d = fixture('industrial');
    const ev = [...disclosureEvidence(d), { id: 'altman', severity: 'alert', zone: 'distress', hall: 'solvency' }];
    expect(pickSurprise(d, ev).id).toBe('altman');
  });
});

describe('missing auditor report', () => {
  it('is never shown as a clean opinion', () => {
    const d = fixture('industrial');
    d.disclosures.auditor.opinion = 'not-found';
    const ev = disclosureEvidence(d);
    expect(ev.find((e) => e.id === 'auditorOpinion')).toBeUndefined();
    const e = ev.find((x) => x.id === 'noAuditReport');
    expect(e.severity).toBe('watch');
  });
});
