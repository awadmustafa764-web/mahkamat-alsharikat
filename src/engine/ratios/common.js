import { ratio } from './build.js';

const B = (k, s, dflt) => ['bs', k, s, dflt];
const I = (k, s, dflt) => ['is', k, s, dflt];
const C = (k, s, dflt) => ['cf', k, s, dflt];

/** Non-financial ratios (industrial, services, investment). Year-end balances. */
export const COMMON = [
  ratio({ id: 'currentRatio', hall: 'liquidity', axis: 'liquidity', labelAr: 'نسبة التداول', unitAr: 'مرة',
    formulaAr: 'الأصول المتداولة ÷ الخصوم المتداولة', num: [B('totalCurrentAssets')], den: [B('totalCurrentLiabilities')] }),
  ratio({ id: 'quickRatio', hall: 'liquidity', axis: 'liquidity', labelAr: 'نسبة السيولة السريعة', unitAr: 'مرة',
    formulaAr: '(الأصول المتداولة − المخزون) ÷ الخصوم المتداولة', num: [B('totalCurrentAssets'), B('inventory', -1, 0)], den: [B('totalCurrentLiabilities')] }),
  ratio({ id: 'cashRatio', hall: 'liquidity', axis: 'liquidity', labelAr: 'نسبة النقدية', unitAr: 'مرة',
    formulaAr: 'النقد وما في حكمه ÷ الخصوم المتداولة', num: [B('cash')], den: [B('totalCurrentLiabilities')] }),

  ratio({ id: 'dso', hall: 'efficiency', axis: 'efficiency', labelAr: 'متوسط فترة التحصيل', unitAr: 'يوم', better: 'lower',
    formulaAr: 'الذمم المدينة ÷ الإيرادات × 365', num: [B('receivables')], den: [I('revenue')], mult: 365, guard: 'positive' }),
  ratio({ id: 'dio', hall: 'efficiency', axis: 'efficiency', labelAr: 'متوسط فترة بقاء المخزون', unitAr: 'يوم', better: 'lower',
    formulaAr: 'المخزون ÷ تكلفة المبيعات × 365', num: [B('inventory')], den: [I('cogs')], mult: 365, guard: 'positive' }),
  ratio({ id: 'dpo', hall: 'efficiency', axis: null, labelAr: 'متوسط فترة السداد للموردين', unitAr: 'يوم', better: 'higher',
    formulaAr: 'الذمم الدائنة ÷ تكلفة المبيعات × 365', num: [B('payables')], den: [I('cogs')], mult: 365, guard: 'positive' }),
  {
    id: 'ccc', hall: 'efficiency', axis: 'efficiency', labelAr: 'دورة التحويل النقدي', unitAr: 'يوم', better: 'lower',
    formulaAr: 'فترة التحصيل + فترة بقاء المخزون − فترة السداد',
    compute(d, y) {
      const parts = ['dso', 'dio', 'dpo'].map((id) => COMMON_BY_ID[id].compute(d, y));
      const inputs = parts.flatMap((p) => p.inputs);
      if (parts.some((p) => p.value === null)) return { value: null, reason: 'بيانات ناقصة', inputs, basisAr: parts[0].basisAr };
      return { value: parts[0].value + parts[1].value - parts[2].value, inputs, basisAr: parts[0].basisAr };
    },
  },
  ratio({ id: 'assetTurnover', hall: 'efficiency', axis: 'efficiency', labelAr: 'معدل دوران الأصول', unitAr: 'مرة',
    formulaAr: 'الإيرادات ÷ مجموع الأصول', num: [I('revenue')], den: [B('totalAssets')], guard: 'positive' }),

  ratio({ id: 'grossMargin', hall: 'profitability', axis: 'profitability', labelAr: 'هامش مجمل الربح', unitAr: '%',
    formulaAr: '(الإيرادات − تكلفة المبيعات) ÷ الإيرادات', num: [I('revenue'), I('cogs', -1)], den: [I('revenue')], guard: 'positive' }),
  ratio({ id: 'operatingMargin', hall: 'profitability', axis: 'profitability', labelAr: 'هامش الربح التشغيلي', unitAr: '%',
    formulaAr: 'الربح التشغيلي ÷ الإيرادات', num: [I('operatingIncome')], den: [I('revenue')], guard: 'positive' }),
  ratio({ id: 'netMargin', hall: 'profitability', axis: 'profitability', labelAr: 'هامش صافي الربح', unitAr: '%',
    formulaAr: 'صافي الربح ÷ الإيرادات', num: [I('netIncome')], den: [I('revenue')], guard: 'positive' }),
  ratio({ id: 'ebitdaMargin', hall: 'profitability', axis: null, labelAr: 'هامش الربح قبل الفوائد والضرائب والاستهلاك', unitAr: '%',
    formulaAr: '(الربح التشغيلي + الاستهلاكات) ÷ الإيرادات', num: [I('operatingIncome'), I('depreciation')], den: [I('revenue')], guard: 'positive' }),
  ratio({ id: 'roa', hall: 'profitability', axis: 'profitability', labelAr: 'العائد على الأصول', unitAr: '%',
    formulaAr: 'صافي الربح ÷ مجموع الأصول', num: [I('netIncome')], den: [B('totalAssets')], guard: 'positive' }),
  ratio({ id: 'roe', hall: 'profitability', axis: 'profitability', labelAr: 'العائد على حقوق مساهمي الشركة الأم', unitAr: '%',
    formulaAr: 'صافي الربح العائد لمساهمي الأم ÷ حقوق مساهمي الأم', num: [I('netIncomeParent')], den: [B('equityParent')], guard: 'equity' }),

  ratio({ id: 'debtToEquity', hall: 'solvency', axis: 'solvency', labelAr: 'نسبة الخصوم إلى حقوق الملكية', unitAr: 'مرة', better: 'lower',
    formulaAr: 'مجموع الخصوم ÷ مجموع حقوق الملكية', num: [B('totalLiabilities')], den: [B('totalEquity')], guard: 'equity' }),
  ratio({ id: 'debtRatio', hall: 'solvency', axis: 'solvency', labelAr: 'نسبة المديونية', unitAr: '%', better: 'lower',
    formulaAr: 'مجموع الخصوم ÷ مجموع الأصول', num: [B('totalLiabilities')], den: [B('totalAssets')], guard: 'positive' }),
  ratio({ id: 'interestCoverage', hall: 'solvency', axis: 'solvency', labelAr: 'معدل تغطية الفوائد', unitAr: 'مرة',
    formulaAr: 'الربح التشغيلي ÷ مصاريف التمويل', num: [I('operatingIncome')], den: [I('interestExpense')] }),
  ratio({ id: 'netDebtToEbitda', hall: 'solvency', axis: 'solvency', labelAr: 'صافي الدين إلى الربح قبل الفوائد والضرائب والاستهلاك', unitAr: 'مرة', better: 'lower',
    formulaAr: '(القروض قصيرة الأجل + طويلة الأجل − النقد) ÷ (الربح التشغيلي + الاستهلاكات)',
    num: [B('shortTermDebt', 1, 0), B('longTermDebt', 1, 0), B('cash', -1)], den: [I('operatingIncome'), I('depreciation')], guard: 'positive' }),

  ratio({ id: 'cfoToNi', hall: 'quality', axis: 'quality', labelAr: 'التدفق التشغيلي إلى صافي الربح', unitAr: 'مرة',
    formulaAr: 'صافي التدفق النقدي التشغيلي ÷ صافي الربح', num: [C('cfo')], den: [I('netIncome')], guard: 'income' }),
  ratio({ id: 'fcf', hall: 'quality', axis: null, labelAr: 'التدفق النقدي الحر', absolute: true,
    formulaAr: 'صافي التدفق النقدي التشغيلي − شراء الممتلكات والمعدات', num: [C('cfo'), C('capex', -1)] }),

  ratio({ id: 'bvps', hall: 'intro', axis: null, labelAr: 'القيمة الدفترية للسهم', absolute: true, scaleByUnit: true,
    formulaAr: 'حقوق مساهمي الشركة الأم (بالوحدة الفعلية) ÷ عدد الأسهم', num: [B('equityParent')], den: [['top', 'shares']], guard: 'positive' }),
  ratio({ id: 'payoutRatio', hall: 'quality', axis: null, labelAr: 'نسبة توزيع الأرباح', unitAr: '%',
    formulaAr: 'توزيعات الأرباح المدفوعة ÷ صافي الربح', num: [C('dividendsPaid')], den: [I('netIncome')], guard: 'income' }),
];

export const COMMON_BY_ID = Object.fromEntries(COMMON.map((r) => [r.id, r]));
