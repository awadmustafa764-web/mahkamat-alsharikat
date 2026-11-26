import { val, cur } from './get.js';
import { makeEvidence } from './evidence.js';

const OPINION = {
  unmodified: { id: 'auditorOpinion', titleAr: 'رأي المدقق: غير متحفظ', severity: 'info',
    meaningAr: 'المدقق يرى أن القوائم تعرض المركز المالي بعدالة من جميع النواحي الجوهرية.' },
  qualified: { id: 'qualifiedOpinion', titleAr: 'رأي المدقق: متحفظ', severity: 'alert',
    meaningAr: 'المدقق وجد أمراً جوهرياً واحداً على الأقل لا يتفق مع المعايير أو لم يتمكن من التحقق منه، لكنه ليس منتشراً في القوائم كلها.' },
  adverse: { id: 'adverseOpinion', titleAr: 'رأي المدقق: معاكس', severity: 'alert',
    meaningAr: 'المدقق يرى أن القوائم لا تعرض المركز المالي بعدالة؛ التحريف جوهري ومنتشر.' },
  disclaimer: { id: 'disclaimerOpinion', titleAr: 'المدقق امتنع عن إبداء الرأي', severity: 'alert',
    meaningAr: 'المدقق لم يحصل على أدلة كافية ليبدي أي رأي، وهذا أشد ما يمكن أن يرد في تقرير التدقيق.' },
};

/** Evidence items for the disclosures hall. */
export function disclosureEvidence(d) {
  const a = d.disclosures?.auditor ?? {};
  const revenue = val(d, cur(d), 'is', 'revenue') ?? val(d, cur(d), 'is', 'insuranceRevenue') ?? val(d, cur(d), 'is', 'netInterestIncome');
  const ev = [];
  const H = { hall: 'disclosures', axis: null };
  const op = OPINION[a.opinion] ?? OPINION.unmodified;
  ev.push(makeEvidence({ ...H, id: op.id, titleAr: op.titleAr, severity: op.severity, meaningAr: op.meaningAr,
    displayAr: a.firm ? `المدقق: ${a.firm}` : '', formulaAr: 'من تقرير مدقق الحسابات المستقل' }));
  if (a.goingConcern === 'material-uncertainty') {
    ev.push(makeEvidence({ ...H, id: 'goingConcern', titleAr: 'شك جوهري في قدرة الشركة على الاستمرار', severity: 'alert',
      meaningAr: 'المدقق نبّه إلى أحداث أو ظروف قد تثير شكاً جوهرياً حول قدرة الشركة على الاستمرار كمنشأة مستمرة.',
      formulaAr: 'من تقرير مدقق الحسابات المستقل', quote: a.goingConcernQuote, page: a.goingConcernPage }));
  }
  if (a.emphasis?.present) {
    ev.push(makeEvidence({ ...H, id: 'emphasis', titleAr: 'فقرة لفت انتباه في تقرير المدقق', severity: 'alert',
      meaningAr: 'المدقق لم يعدّل رأيه، لكنه أراد أن يلفت نظر القارئ إلى أمر مفصح عنه يراه أساسياً لفهم القوائم.',
      formulaAr: 'من تقرير مدقق الحسابات المستقل', quote: a.emphasis.quote, page: a.emphasis.page }));
  }
  (a.kams ?? []).forEach((k, i) => ev.push(makeEvidence({ ...H, id: `kam-${i}`, titleAr: `أمر تدقيق رئيسي: ${k.title}`, severity: 'info',
    meaningAr: 'بند رأى المدقق أنه الأكثر أهمية في تدقيق هذه السنة، غالباً لأنه يعتمد على تقديرات وأحكام الإدارة.',
    formulaAr: 'من تقرير مدقق الحسابات المستقل', quote: k.quote, page: k.page })));
  (d.disclosures?.relatedParties ?? []).forEach((r, i) => {
    const share = revenue && r.amount ? Math.abs(r.amount) / Math.abs(revenue) : null;
    ev.push(makeEvidence({ ...H, id: `relatedParty-${i}`, titleAr: `تعامل مع طرف ذي علاقة: ${r.party}`, value: r.amount ?? null,
      severity: share !== null && share >= 0.05 ? 'watch' : 'info', page: r.page,
      displayAr: share !== null ? `${(share * 100).toFixed(1)}% من الإيرادات` : '', formulaAr: 'المبلغ ÷ الإيرادات',
      meaningAr: `طبيعة التعامل: ${r.nature}. التعاملات الكبيرة مع أطراف ذات علاقة تستدعي السؤال: هل تمت بشروط السوق؟` }));
  });
  (d.disclosures?.contingencies ?? []).forEach((c, i) => ev.push(makeEvidence({ ...H, id: `contingency-${i}`, titleAr: 'التزام محتمل أو قضية',
    value: c.amount ?? null, severity: 'watch', quote: c.text, page: c.page, formulaAr: 'من إيضاح الالتزامات المحتملة',
    meaningAr: 'التزام قد يتحقق مستقبلاً حسب نتيجة حدث غير مؤكد، ولم يُسجَّل بالكامل في الميزانية.' })));
  (d.disclosures?.subsequentEvents ?? []).forEach((s, i) => ev.push(makeEvidence({ ...H, id: `subsequent-${i}`, titleAr: 'حدث لاحق لتاريخ القوائم',
    severity: 'info', quote: s.text, page: s.page, formulaAr: 'من إيضاح الأحداث اللاحقة',
    meaningAr: 'حدث وقع بعد نهاية السنة وقبل إصدار القوائم، وقد يغيّر قراءة الأرقام.' })));
  (d.disclosures?.policyChanges ?? []).forEach((p, i) => ev.push(makeEvidence({ ...H, id: `policyChange-${i}`, titleAr: 'تغيير في السياسات المحاسبية',
    severity: 'watch', quote: p.text, page: p.page, formulaAr: 'من إيضاح السياسات المحاسبية',
    meaningAr: 'تغيير السياسة قد يجعل المقارنة بين السنتين غير متجانسة، فيجب قراءة أثره قبل الحكم على التحسن أو التراجع.' })));
  return ev;
}

const PRIORITY = ['disclaimerOpinion', 'adverseOpinion', 'goingConcern', 'qualifiedOpinion', 'emphasis', 'altman'];

/** The single most serious hidden finding, revealed last in the exhibition. */
export function pickSurprise(d, evidence) {
  for (const id of PRIORITY) {
    const e = evidence.find((x) => x.id === id && x.severity === 'alert');
    if (e && (id !== 'altman' || e.zone === 'distress')) return e;
  }
  return null;
}
