import { val, growth, cur, prior } from './get.js';
import { RATIOS } from './ratios/index.js';

const pct = (x) => `${(x * 100).toFixed(1)}%`;

const FLAG_ORDER = ['receivablesOutpaceRevenue', 'inventoryOutpaceCogs', 'niUpCfoDown', 'lowCfoToNi', 'highAccruals', 'nonRecurringShare', 'impliedInterestRate'];

function flagQuestion(d, id) {
  const g = (s, k) => growth(val(d, cur(d), s, k), val(d, prior(d), s, k));
  switch (id) {
    case 'receivablesOutpaceRevenue': return `لماذا نمت الذمم المدينة بنسبة ${pct(g('bs', 'receivables'))} بينما نمت الإيرادات ${pct(g('is', 'revenue'))} فقط؟ وهل تغيّرت شروط الائتمان الممنوحة للعملاء؟`;
    case 'inventoryOutpaceCogs': return `لماذا ارتفع المخزون ${pct(g('bs', 'inventory'))} مقابل ارتفاع تكلفة المبيعات ${pct(g('is', 'cogs'))}؟ هل فيه بضاعة بطيئة الحركة أو متقادمة؟`;
    case 'niUpCfoDown': return 'ارتفع صافي الربح وانخفض النقد التشغيلي في السنة نفسها؛ أين ذهب نقد هذا الربح؟';
    case 'lowCfoToNi': return 'ما الذي يمنع تحوّل الربح المعلن إلى نقد؟ وما خطة الإدارة لتحسين التحصيل؟';
    case 'highAccruals': return 'ما البنود غير النقدية الكبيرة التي رفعت الربح هذه السنة؟';
    case 'nonRecurringShare': return 'ما الربح المتوقع لو استُبعدت البنود غير المتكررة؟ وهل ستتكرر فعلاً؟';
    case 'impliedInterestRate': return 'مصاريف التمويل لا تتناسب مع حجم القروض المعروضة؛ هل هناك فوائد مرسملة أو قروض خلال السنة غير ظاهرة في الرصيد الختامي؟';
    default: return null;
  }
}

/** Three questions an analyst should put to management, in a fixed, explainable order. */
export function managementQuestions(d, redFlags, anomalies) {
  const qs = [];
  for (const id of FLAG_ORDER) if (redFlags.some((f) => f.id === id)) qs.push(flagQuestion(d, id));
  for (const sev of ['alert', 'watch']) {
    for (const a of anomalies.filter((x) => x.severity === sev)) {
      if (a.key === 'receivables' && qs.some((q) => q.includes('الذمم'))) continue;
      if (a.key === 'inventory' && qs.some((q) => q.includes('المخزون'))) continue;
      qs.push(`ما سبب تغيّر بند «${a.labelAr}» بنسبة ${pct(a.change)} مقارنة بالسنة السابقة؟`);
    }
  }
  while (qs.length < 3) qs.push('ما أهم المخاطر التي تتوقعها الإدارة للسنة القادمة، وكيف تنعكس على السيولة والربحية؟');
  return qs.slice(0, 3);
}

const GUESS_SETS = {
  nonfin: [
    ['currentRatio', 'برأيك: هل نسبة التداول أعلى من 1؟', (v) => v > 1],
    ['netMargin', 'برأيك: هل هامش صافي الربح أعلى من 10%؟', (v) => v > 0.1],
    ['debtToEquity', 'برأيك: هل خصوم الشركة أكبر من حقوق ملكيتها؟', (v) => v > 1],
  ],
  bank: [
    ['nplRatio', 'برأيك: هل القروض المتعثرة أكثر من 5% من القروض؟', (v) => v > 0.05],
    ['loanToDeposit', 'برأيك: هل أقرض البنك أكثر من 80% من ودائعه؟', (v) => v > 0.8],
    ['bankRoe', 'برأيك: هل العائد على حقوق الملكية أعلى من 10%؟', (v) => v > 0.1],
  ],
  insurance: [
    ['combinedRatio', 'برأيك: هل نشاط التأمين وحده رابح (النسبة المجمعة أقل من 100%)؟', (v) => v < 1],
    ['insRoe', 'برأيك: هل العائد على حقوق الملكية أعلى من 10%؟', (v) => v > 0.1],
    ['equityToAssets', 'برأيك: هل حقوق الملكية أكثر من ربع الأصول؟', (v) => v > 0.25],
  ],
  investment: [
    ['roe', 'برأيك: هل العائد على حقوق الملكية أعلى من 10%؟', (v) => v > 0.1],
    ['debtRatio', 'برأيك: هل الالتزامات أكثر من نصف الأصول؟', (v) => v > 0.5],
    ['payoutRatio', 'برأيك: هل وزّعت الشركة أكثر من نصف أرباحها؟', (v) => v > 0.5],
  ],
};

/** Three guesses for the loading-screen game; answers are revealed inside the exhibition. */
export function guesses(d) {
  const s = d.meta.sector;
  const set = GUESS_SETS[s] ?? GUESS_SETS.nonfin;
  return set.map(([id, questionAr, test]) => {
    const v = RATIOS[id].compute(d, cur(d)).value;
    return { id: `guess-${id}`, evidenceId: id, questionAr, answer: v === null ? null : test(v), value: v };
  }).filter((g) => g.answer !== null);
}
