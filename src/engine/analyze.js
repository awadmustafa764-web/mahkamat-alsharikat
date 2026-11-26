import { validateCompany, SECTOR_KEYS } from './schema.js';
import { runIntegrity } from './integrity.js';
import { RATIOS } from './ratios/index.js';
import { rulesFor } from './sectors.js';
import { cur, prior } from './get.js';
import { findAnomalies } from './trends.js';
import { redFlags } from './quality.js';
import { piotroski, altmanZpp, dupont } from './models.js';
import { disclosureEvidence, pickSurprise } from './disclosures.js';
import { gradeRatio, POINTS } from './benchmarks.js';
import { aggregate, confidence } from './rating.js';
import { managementQuestions, guesses } from './questions.js';
import { makeEvidence } from './evidence.js';
import { MEANING, fmt } from './texts.js';
import { DISCLAIMER, HALLS } from './constants.js';

const sevFromGrade = (g) => (g === 'E' ? 'alert' : g === 'D' ? 'watch' : 'info');

function basisText(b) {
  if (!b || !b.grade) return '';
  return b.basis === 'sector' ? `وسيط القطاع ${b.median !== null ? b.median.toFixed(3) : ''} (عدد الشركات ${b.n})` : 'الحدود المرجعية المعتادة';
}

function ratioEvidence(d, id, bench) {
  const def = RATIOS[id];
  const y = cur(d), p = prior(d);
  const r = def.compute(d, y);
  if (r.value === null) return null;
  const rp = def.compute(d, p);
  const benchmark = gradeRatio(id, r.value, bench);
  const trend = rp.value === null ? null : r.value - rp.value;
  const improved = trend === null ? null : def.better === 'lower' ? trend < 0 : trend > 0;
  const weak = benchmark.grade === 'D' || benchmark.grade === 'E';
  const strong = benchmark.grade === 'A' || benchmark.grade === 'B';
  return makeEvidence({
    id, hall: def.hall, axis: def.axis, titleAr: def.labelAr, value: r.value, priorValue: rp.value, unitAr: def.unitAr,
    displayAr: `${fmt(r.value, def.unitAr)}${rp.value !== null ? ` (السنة السابقة ${fmt(rp.value, def.unitAr)})` : ''}`,
    formulaAr: def.formulaAr, basisAr: r.basisAr, inputs: r.inputs, benchmark: benchmark.grade ? benchmark : null,
    severity: sevFromGrade(benchmark.grade), meaningAr: MEANING[id] ?? '',
    prosecutionAr: weak ? `${def.labelAr} أضعف من ${basisText(benchmark)}.` : improved === false ? `${def.labelAr} تراجع عن السنة السابقة.` : '',
    defenseAr: strong ? `${def.labelAr} أفضل من ${basisText(benchmark)}.` : improved ? `${def.labelAr} تحسّن عن السنة السابقة.` : '',
  });
}

function modelEvidence(d) {
  const y = cur(d);
  const out = [];
  const pz = piotroski(d);
  if (pz.score !== null) {
    const grade = pz.score >= 8 ? 'A' : pz.score >= 6 ? 'B' : pz.score >= 4 ? 'C' : pz.score >= 2 ? 'D' : 'E';
    out.push(makeEvidence({ id: 'piotroski', hall: 'quality', axis: 'quality', titleAr: 'مؤشر Piotroski للقوة المالية', value: pz.score,
      displayAr: `${pz.score} من 9`, formulaAr: 'مجموع تسعة اختبارات نعم/لا (Piotroski 2000)',
      basisAr: pz.approximation ? 'أصول آخر المدة بدل أصول أول المدة (تقريب لعدم توفر سنة ثالثة)' : 'أصول أول المدة ومتوسط الأصول كما في الورقة الأصلية',
      inputs: pz.signals.map((s) => ({ labelAr: `${s.pass ? '✔' : '✘'} ${s.labelAr}`, value: s.value, src: null })),
      benchmark: { grade, points: POINTS[grade], basis: 'model', median: null, n: 0, percentile: null },
      severity: sevFromGrade(grade), meaningAr: MEANING.piotroski, signals: pz.signals, approximation: pz.approximation }));
  }
  const z = altmanZpp(d, y);
  if (z.z !== null && z.z !== undefined) {
    const grade = z.zone === 'safe' ? 'A' : z.zone === 'grey' ? 'C' : 'E';
    const zoneAr = { safe: 'منطقة آمنة', grey: 'منطقة رمادية', distress: 'منطقة تعثر' }[z.zone];
    out.push(makeEvidence({ id: 'altman', hall: 'solvency', axis: 'solvency', titleAr: 'مؤشر Altman Z″ للتعثر المالي', value: z.z, zone: z.zone,
      displayAr: `${z.z.toFixed(2)} — ${zoneAr}`, formulaAr: 'Z″ = 6.56×X1 + 3.26×X2 + 6.72×X3 + 1.05×X4 (Altman 1995، للشركات غير الصناعية والأسواق الناشئة)',
      basisAr: 'أرصدة آخر المدة؛ الحدود: أكبر من 2.60 آمن، أقل من 1.10 تعثر (ما يعادل 5.85 و4.35 في صيغة EM مع الثابت 3.25)',
      inputs: [['X1 رأس المال العامل ÷ الأصول', z.x1], ['X2 الأرباح المدورة ÷ الأصول', z.x2], ['X3 الربح التشغيلي ÷ الأصول', z.x3], ['X4 حقوق الملكية ÷ الخصوم', z.x4]]
        .map(([labelAr, value]) => ({ labelAr, value, src: null })),
      benchmark: { grade, points: POINTS[grade], basis: 'model', median: null, n: 0, percentile: null },
      severity: z.zone === 'distress' ? 'alert' : z.zone === 'grey' ? 'watch' : 'info', meaningAr: MEANING.altman }));
  }
  const dp = dupont(d, y);
  if (dp.roe !== null) {
    out.push(makeEvidence({ id: 'dupont', hall: 'profitability', axis: null, titleAr: 'تحليل DuPont للعائد على حقوق الملكية', value: dp.roe,
      displayAr: `${fmt(dp.netMargin, '%')} × ${dp.assetTurnover.toFixed(2)} × ${dp.equityMultiplier.toFixed(2)} = ${fmt(dp.roe, '%')}`,
      formulaAr: 'هامش صافي الربح × دوران الأصول × مضاعف حقوق الملكية', basisAr: 'أرصدة آخر المدة؛ على صافي الربح الكلي وحقوق الملكية الكلية',
      inputs: [['هامش صافي الربح', dp.netMargin], ['دوران الأصول', dp.assetTurnover], ['مضاعف حقوق الملكية', dp.equityMultiplier]].map(([labelAr, value]) => ({ labelAr, value, src: null })),
      meaningAr: MEANING.dupont }));
  }
  return out;
}

const flagEvidence = (f) => makeEvidence({ id: f.id, hall: 'quality', axis: 'quality', titleAr: f.labelAr, displayAr: f.detailAr,
  formulaAr: 'قاعدة ثابتة معلنة', basisAr: 'مقارنة السنة الحالية بالسابقة', inputs: f.inputs, severity: f.severity,
  benchmark: { grade: f.severity === 'alert' ? 'E' : 'D', points: f.severity === 'alert' ? 0 : 1, basis: 'rule', median: null, n: 0, percentile: null },
  prosecutionAr: f.detailAr });

const anomalyEvidence = (a) => makeEvidence({ id: `anomaly-${a.stmt}-${a.key}`, hall: 'quality', axis: null, titleAr: `تغيّر غير معتاد: ${a.labelAr}`,
  value: a.change, displayAr: `${a.change >= 0 ? '+' : ''}${(a.change * 100).toFixed(1)}% عن السنة السابقة، ويمثّل ${(a.share * 100).toFixed(1)}% من الأساس`,
  formulaAr: '(السنة الحالية − السابقة) ÷ |السابقة|', basisAr: 'تحليل أفقي ورأسي', severity: a.severity,
  inputs: [{ labelAr: `${a.labelAr} الحالية`, value: a.cur, src: a.src }, { labelAr: `${a.labelAr} السابقة`, value: a.prior, src: null }],
  meaningAr: 'بند تغيّر بنسبة كبيرة وحجمه مؤثر؛ يستحق السؤال عن السبب قبل الحكم.' });

/**
 * Turn CompanyData into a Case — the only object the exhibition consumes.
 * @param {object} d CompanyData
 * @param {object} benchmarks output of buildBenchmarks()
 */
export function analyze(d, benchmarks = {}) {
  const v = validateCompany(d);
  if (!v.ok) throw new Error(`بيانات الشركة غير صالحة: ${v.errors.join('، ')}`);
  const integrity = runIntegrity(d);
  const sector = d.meta.sector;
  const rule = rulesFor(sector);
  const bench = benchmarks[sector];

  const ratioEv = rule.applied.map((id) => ratioEvidence(d, id, bench)).filter(Boolean);
  const models = modelEvidence(d);
  const flags = redFlags(d);
  const anomalies = findAnomalies(d);
  const disc = disclosureEvidence(d);
  const intro = makeEvidence({ id: 'sectorProfile', hall: 'intro', titleAr: 'القانون المطبّق على هذا القطاع', displayAr: d.meta.activityAr ?? '',
    formulaAr: 'اختيار المقاييس حسب القطاع', inputs: rule.excluded.map((e) => ({ labelAr: `مستبعد: ${RATIOS[e.id]?.labelAr ?? e.id}`, value: null, src: null, reasonAr: e.reasonAr })),
    meaningAr: 'كل قطاع يُقاس بأدوات تناسب طبيعة عمله؛ تطبيق نسبة على القطاع الخطأ يعطي حكماً مضللاً.', applied: rule.applied, excluded: rule.excluded });

  const all = [intro, ...ratioEv, ...models, ...flags.map(flagEvidence), ...anomalies.map(anomalyEvidence), ...disc];
  const halls = Object.fromEntries(HALLS.map((h) => [h, all.filter((e) => e.hall === h)]));
  const surprise = pickSurprise(d, all);
  const agg = aggregate(all);

  const keys = SECTOR_KEYS[sector];
  const total = 2 * Object.values({ ...keys.required, ...keys.optional }).flat().length;
  const completeness = total ? 1 - v.missing.length / total : 1;

  const graded = all.filter((e) => e.benchmark?.points !== null && e.benchmark?.points !== undefined && e.axis);
  const strengths = graded.filter((e) => e.benchmark.points >= 3).sort((a, b) => b.benchmark.points - a.benchmark.points).slice(0, 3);
  const weaknesses = graded.filter((e) => e.benchmark.points <= 1).sort((a, b) => a.benchmark.points - b.benchmark.points).slice(0, 3);

  return {
    meta: d.meta, disclaimer: DISCLAIMER, integrity, sectorRule: rule, halls, surprise,
    models: { piotroski: piotroski(d), altman: altmanZpp(d, cur(d)), dupont: dupont(d, cur(d)) },
    anomalies, redFlags: flags,
    rating: { ...agg, confidence: confidence(integrity.ok, completeness), completeness },
    strengths, weaknesses,
    questions: managementQuestions(d, flags, anomalies),
    guesses: guesses(d),
  };
}
