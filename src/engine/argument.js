import { fmt } from './texts.js';
import { RATIOS } from './ratios/index.js';

/**
 * Plain-language headline for one piece of evidence: what it means for an investor, in one sentence.
 * Numbers follow the words; the formula stays in the card's "how it was computed".
 */
export function headline(ev) {
  const def = RATIOS[ev.id];
  const b = ev.benchmark;
  const v = ev.value;
  if (def && typeof v === 'number') {
    const u = def.unitAr;
    const m = b?.basis === 'sector' ? b.median : null;
    const pos = b?.grade ? (['A', 'B'].includes(b.grade) ? 'good' : ['D', 'E'].includes(b.grade) ? 'bad' : 'mid') : null;
    const cmp = m !== null && m !== undefined ? `، ووسيط القطاع ${fmt(m, u)}` : '';
    const custom = HEADLINES[ev.id]?.(v, m);
    if (custom) return custom;
    const word = pos === 'good' ? 'أفضل من أغلب شركات قطاعها' : pos === 'bad' ? 'أضعف من أغلب شركات قطاعها' : 'في مستوى قطاعها';
    return `${def.labelAr} ${fmt(v, u)}: ${word}${cmp}.`;
  }
  if (ev.id === 'piotroski') return `نجحت الشركة في ${v} من 9 اختبارات للقوة المالية.`;
  if (ev.id === 'altman') return { safe: 'مؤشر التعثر في المنطقة الآمنة؛ لا خطر إفلاس ظاهر في الأرقام.', grey: 'مؤشر التعثر في المنطقة الرمادية؛ ليست آمنة تماماً.', distress: 'مؤشر التعثر في منطقة الخطر.' }[ev.zone];
  if (ev.prosecutionAr && ev.id.match(/Outpace|Down|low|high|nonRecurring|implied/)) return ev.prosecutionAr;
  if (ev.id === 'qualifiedOpinion') return 'المدقق تحفّظ على القوائم: هناك أمر جوهري لم يستطع التحقق منه.';
  if (ev.id === 'adverseOpinion') return 'المدقق يرى أن القوائم لا تعرض الوضع المالي بعدالة.';
  if (ev.id === 'disclaimerOpinion') return 'المدقق امتنع عن إبداء رأيه في القوائم.';
  if (ev.id === 'goingConcern') return 'المدقق يشك في قدرة الشركة على الاستمرار.';
  if (ev.id === 'emphasis') return 'المدقق لفت الانتباه إلى أمر يجب أن تعرفه قبل القرار.';
  if (ev.id === 'auditorOpinion') return 'رأي المدقق نظيف: القوائم تعرض الوضع المالي بعدالة.';
  if (ev.id.startsWith('kam-')) return `ركّز المدقق على: ${ev.titleAr.replace('أمر تدقيق رئيسي: ', '')}.`;
  return ev.titleAr;
}

const per100 = (x) => fmt(Math.abs(x) * 100, '');
const vs = (m, f) => (m === null || m === undefined ? '' : `، ووسيط القطاع ${f(m)}`);
/** Templates get the value v and the sector median m (raw numbers) so both are phrased in the same unit. */
const HEADLINES = {
  currentRatio: (v, m) => `لكل دينار التزامات قصيرة يقابله ${v.toFixed(2)} دينار أصول متداولة${vs(m, (x) => x.toFixed(2))}.`,
  quickRatio: (v, m) => `بدون بيع المخزون، لكل دينار التزامات قصيرة ${v.toFixed(2)} دينار يمكن تحويله لنقد بسرعة${vs(m, (x) => x.toFixed(2))}.`,
  dso: (v, m) => `تحصّل الشركة ثمن مبيعاتها الآجلة خلال ${Math.round(v)} يوماً${vs(m, (x) => `${Math.round(x)} يوماً`)}.`,
  dio: (v, m) => `يبقى المخزون ${Math.round(v)} يوماً قبل أن يُباع${vs(m, (x) => `${Math.round(x)} يوماً`)}.`,
  ccc: (v, m) => `تنتظر الشركة ${Math.round(v)} يوماً بين دفع ثمن البضاعة وتحصيل ثمن بيعها${vs(m, (x) => `${Math.round(x)} يوماً`)}.`,
  grossMargin: (v, m) => `يبقى لها ${fmt(v, '%')} من كل دينار مبيعات بعد تكلفة البضاعة${vs(m, (x) => fmt(x, '%'))}.`,
  operatingMargin: (v, m) => (v < 0 ? 'نشاط الشركة الأساسي يخسر قبل الفوائد والضرائب.' : `يبقى لها ${fmt(v, '%')} من كل دينار مبيعات بعد مصاريف التشغيل${vs(m, (x) => fmt(x, '%'))}.`),
  netMargin: (v, m) => (v < 0 ? `تخسر الشركة ${fmt(-v, '%')} من كل دينار مبيعات.` : `يصل للمالكين ${fmt(v, '%')} من كل دينار مبيعات${vs(m, (x) => fmt(x, '%'))}.`),
  roe: (v, m) => (v < 0 ? `خسرت أموال المساهمين ${per100(v)} من كل 100 هذه السنة.` : `كل 100 من أموال المساهمين ربحت ${per100(v)}${vs(m, per100)}.`),
  bankRoe: (v, m) => (v < 0 ? 'أموال مساهمي البنك حققت خسارة هذه السنة.' : `كل 100 من أموال مساهمي البنك ربحت ${per100(v)}${vs(m, per100)}.`),
  insRoe: (v, m) => (v < 0 ? 'أموال المساهمين حققت خسارة هذه السنة.' : `كل 100 من أموال المساهمين ربحت ${per100(v)}${vs(m, per100)}.`),
  roa: (v, m) => (v < 0 ? `خسرت الشركة ${per100(v)} من كل 100 من أصولها هذه السنة.` : `كل 100 من أصول الشركة ولّدت ${per100(v)} ربحاً${vs(m, per100)}.`),
  bankRoa: (v, m) => `كل 100 من أصول البنك ولّدت ${per100(v)} ربحاً${vs(m, per100)}.`,
  debtToEquity: (v, m) => `لكل دينار من أموال المالكين ${v.toFixed(2)} دينار من أموال الغير${vs(m, (x) => x.toFixed(2))}.`,
  debtRatio: (v, m) => `الديون والالتزامات تموّل ${fmt(v, '%')} من أصول الشركة${vs(m, (x) => fmt(x, '%'))}.`,
  netDebtToEbitda: (v, m) => (v < 0 ? 'لدى الشركة نقد أكثر من ديونها؛ لا عبء دَين صافٍ.' : `تحتاج الشركة ${v.toFixed(1)} سنة من ربحها التشغيلي لسداد صافي ديونها${vs(m, (x) => `${x.toFixed(1)} سنة`)}.`),
  interestCoverage: (v, m) => `الربح التشغيلي يغطي مصاريف الفوائد ${v.toFixed(1)} مرة${vs(m, (x) => `${x.toFixed(1)} مرة`)}.`,
  cfoToNi: (v) => (v >= 1 ? `الربح يتحول إلى نقد فعلي: كل دينار ربح جاء معه ${v.toFixed(2)} دينار نقداً.` : `جزء من الربح لم يتحول إلى نقد: كل دينار ربح جاء معه ${v.toFixed(2)} دينار فقط.`),
  nplRatio: (v, m) => `${fmt(v, '%')} من قروض البنك متعثرة${vs(m, (x) => fmt(x, '%'))}.`,
  nplCoverage: (v, m) => `المخصصات تغطي ${fmt(v, '%')} من القروض المتعثرة${vs(m, (x) => fmt(x, '%'))}.`,
  capitalAdequacy: (v) => `كفاية رأس المال ${fmt(v, '%')}، والحد الرقابي الأدنى عادة 12–13%.`,
  loanToDeposit: (v, m) => `أقرض البنك ${fmt(v, '%')} من ودائع عملائه${vs(m, (x) => fmt(x, '%'))}.`,
  costToIncome: (v, m) => `تذهب ${fmt(v, '%')} من دخل البنك إلى مصاريف التشغيل${vs(m, (x) => fmt(x, '%'))}.`,
  nimProxy: (v, m) => `هامش الفائدة الصافي ${fmt(v, '%')} من الأصول${vs(m, (x) => fmt(x, '%'))}.`,
  combinedRatio: (v) => (v >= 1 ? `نشاط التأمين وحده خاسر: النسبة المجمعة ${fmt(v, '%')}، والربح يأتي من الاستثمار.` : v > 0.95 ? `نشاط التأمين بالكاد رابح: النسبة المجمعة ${fmt(v, '%')}، فالهامش أمام أي خسارة إضافية ضيق.` : `نشاط التأمين وحده رابح: النسبة المجمعة ${fmt(v, '%')}.`),
  insServiceMargin: (v, m) => `يبقى من كل 100 من إيرادات التأمين ${per100(v)} ربحاً تأمينياً${vs(m, per100)}.`,
  equityToAssets: (v, m) => `أموال المالكين تموّل ${fmt(v, '%')} من الأصول${vs(m, (x) => fmt(x, '%'))}.`,
};

const SEV = { alert: 2, watch: 1, info: 0 };
/** Weight of a piece of evidence in the argument: how far from neutral its grade is, plus how loud its warning is. */
const weightOf = (e) => (e.benchmark?.points !== undefined && e.benchmark?.points !== null ? Math.abs(e.benchmark.points - 2) : 0) + SEV[e.severity ?? 'info'];

const AUDIT_ALERTS = new Set(['qualifiedOpinion', 'adverseOpinion', 'disclaimerOpinion', 'goingConcern', 'emphasis']);

/**
 * Split the case into the argument a visitor needs: the strongest evidence for investing, against it, and what they must know.
 * Everything else goes to the archive; nothing is dropped.
 */
export function buildArgument(caseObj, { max = 5 } = {}) {
  const all = Object.values(caseObj.halls).flat().filter((e) => e.id !== 'sectorProfile');
  for (const e of all) { e.headlineAr = headline(e); e.weight = weightOf(e); }
  const mustKnow = all.filter((e) => AUDIT_ALERTS.has(e.id) || (e.id === 'altman' && e.zone === 'distress'));
  if (!mustKnow.length) { const op = all.find((e) => e.id === 'auditorOpinion'); if (op) mustKnow.push(op); }
  mustKnow.push(...all.filter((e) => e.id.startsWith('kam-')).slice(0, 2));
  const taken = new Set(mustKnow.map((e) => e.id));
  const graded = all.filter((e) => !taken.has(e.id) && e.axis);
  const against = graded.filter((e) => e.severity !== 'info' || (e.benchmark?.points ?? 2) <= 1).sort((a, b) => b.weight - a.weight).slice(0, max);
  against.forEach((e) => taken.add(e.id));
  const forIt = graded.filter((e) => !taken.has(e.id) && (e.benchmark?.points ?? 0) >= 3).sort((a, b) => b.weight - a.weight).slice(0, max);
  forIt.forEach((e) => taken.add(e.id));
  const archive = all.filter((e) => !taken.has(e.id));
  return { for: forIt, against, mustKnow, archive };
}
