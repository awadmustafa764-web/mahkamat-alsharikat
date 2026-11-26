import { ratio } from './build.js';

const B = (k, s, dflt) => ['bs', k, s, dflt];
const I = (k, s, dflt) => ['is', k, s, dflt];

/** Bank ratios. */
export const BANK = [
  ratio({ id: 'bankRoa', hall: 'profitability', axis: 'profitability', labelAr: 'العائد على الأصول', unitAr: '%',
    formulaAr: 'صافي الربح ÷ مجموع الأصول', num: [I('netIncome')], den: [B('totalAssets')], guard: 'positive' }),
  ratio({ id: 'bankRoe', hall: 'profitability', axis: 'profitability', labelAr: 'العائد على حقوق الملكية', unitAr: '%',
    formulaAr: 'صافي الربح ÷ مجموع حقوق الملكية', num: [I('netIncome')], den: [B('totalEquity')], guard: 'equity' }),
  ratio({ id: 'nimProxy', hall: 'profitability', axis: 'profitability', labelAr: 'صافي هامش الفائدة (إلى إجمالي الأصول)', unitAr: '%',
    formulaAr: 'صافي إيرادات الفوائد ÷ مجموع الأصول', num: [I('netInterestIncome')], den: [B('totalAssets')], guard: 'positive' }),
  ratio({ id: 'costToIncome', hall: 'efficiency', axis: 'efficiency', labelAr: 'نسبة التكلفة إلى الدخل', unitAr: '%', better: 'lower',
    formulaAr: 'المصاريف التشغيلية ÷ (صافي إيرادات الفوائد + إيرادات غير الفوائد)',
    num: [I('operatingExpenses')], den: [I('netInterestIncome'), I('nonInterestIncome', 1, 0)], guard: 'positive' }),
  ratio({ id: 'nplRatio', hall: 'quality', axis: 'quality', labelAr: 'نسبة القروض غير العاملة', unitAr: '%', better: 'lower',
    formulaAr: 'القروض غير العاملة ÷ إجمالي القروض', num: [B('npl')], den: [B('grossLoans')], guard: 'positive' }),
  ratio({ id: 'nplCoverage', hall: 'quality', axis: 'quality', labelAr: 'نسبة تغطية القروض غير العاملة', unitAr: '%',
    formulaAr: 'مخصص الخسائر الائتمانية ÷ القروض غير العاملة', num: [B('allowanceLoans')], den: [B('npl')] }),
  ratio({ id: 'loanToDeposit', hall: 'liquidity', axis: 'liquidity', labelAr: 'نسبة القروض إلى الودائع', unitAr: '%', better: 'lower',
    formulaAr: 'صافي القروض ÷ ودائع العملاء', num: [B('netLoans')], den: [B('deposits')], guard: 'positive' }),
  ratio({ id: 'capitalAdequacy', hall: 'solvency', axis: 'solvency', labelAr: 'نسبة كفاية رأس المال', unitAr: '%',
    formulaAr: 'كما أفصح عنها البنك في الإيضاحات (رأس المال التنظيمي ÷ الأصول المرجحة بالمخاطر)', num: [['top', 'capitalAdequacy']] }),
];

/** Insurance ratios on IFRS 17 lines. */
export const INSURANCE = [
  ratio({ id: 'insServiceMargin', hall: 'profitability', axis: 'profitability', labelAr: 'هامش نتيجة خدمة التأمين', unitAr: '%',
    formulaAr: 'نتيجة خدمة التأمين ÷ إيرادات التأمين (IFRS 17)', num: [I('insuranceServiceResult')], den: [I('insuranceRevenue')], guard: 'positive' }),
  ratio({ id: 'combinedRatio', hall: 'profitability', axis: 'profitability', labelAr: 'النسبة المجمعة (IFRS 17)', unitAr: '%', better: 'lower',
    formulaAr: '1 − (نتيجة خدمة التأمين ÷ إيرادات التأمين)، أي (مصاريف الخدمة + صافي كلفة إعادة التأمين) ÷ إيرادات التأمين',
    num: [I('insuranceRevenue'), I('insuranceServiceResult', -1)], den: [I('insuranceRevenue')], guard: 'positive' }),
  ratio({ id: 'investmentYield', hall: 'profitability', axis: null, labelAr: 'عائد الاستثمار', unitAr: '%',
    formulaAr: 'دخل الاستثمار ÷ مجموع الاستثمارات', num: [I('investmentIncome')], den: [B('totalInvestments')], guard: 'positive' }),
  ratio({ id: 'insRoe', hall: 'profitability', axis: 'profitability', labelAr: 'العائد على حقوق الملكية', unitAr: '%',
    formulaAr: 'صافي الربح ÷ مجموع حقوق الملكية', num: [I('netIncome')], den: [B('totalEquity')], guard: 'equity' }),
  ratio({ id: 'equityToAssets', hall: 'solvency', axis: 'solvency', labelAr: 'حقوق الملكية إلى الأصول', unitAr: '%',
    formulaAr: 'مجموع حقوق الملكية ÷ مجموع الأصول', num: [B('totalEquity')], den: [B('totalAssets')], guard: 'positive' }),
];
