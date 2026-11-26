/** Which ratios apply to each sector, and why the others are excluded. */

const MODELS_EXCLUDED = [
  { id: 'piotroski', reasonAr: 'مؤشر Piotroski صُمم للشركات غير المالية؛ بنوده (نسبة التداول، مجمل الربح، دوران الأصول) لا معنى لها هنا.' },
  { id: 'altman', reasonAr: 'نموذج Altman صُمم لقياس تعثر الشركات غير المالية، ولا يصلح لهيكل ميزانية المؤسسات المالية.' },
];

const NONFIN = ['currentRatio', 'quickRatio', 'cashRatio', 'dso', 'dpo', 'assetTurnover', 'grossMargin', 'operatingMargin', 'netMargin',
  'ebitdaMargin', 'roa', 'roe', 'debtToEquity', 'debtRatio', 'interestCoverage', 'netDebtToEbitda', 'cfoToNi', 'fcf', 'payoutRatio', 'bvps'];

export const SECTOR_RULES = {
  industrial: { applied: [...NONFIN, 'dio', 'ccc'], excluded: [] },
  services: {
    applied: NONFIN,
    excluded: [
      { id: 'dio', reasonAr: 'لا يوجد مخزون جوهري لدى شركات الخدمات، فمتوسط بقاء المخزون لا يقيس شيئاً.' },
      { id: 'ccc', reasonAr: 'دورة التحويل النقدي تعتمد على المخزون، وهو غير جوهري لشركات الخدمات.' },
    ],
  },
  investment: {
    applied: ['roa', 'roe', 'debtRatio', 'debtToEquity', 'payoutRatio', 'bvps', 'cfoToNi'],
    excluded: [
      { id: 'grossMargin', reasonAr: 'دخل الشركات الاستثمارية والقابضة من التوزيعات وتغيرات القيمة العادلة، لا من مبيعات لها تكلفة.' },
      { id: 'operatingMargin', reasonAr: 'هوامش التشغيل لا تنطبق على شركة دخلها استثماري.' },
      { id: 'dio', reasonAr: 'لا مخزون لدى الشركات الاستثمارية.' },
      { id: 'piotroski', reasonAr: 'بنود Piotroski (مجمل الربح ودوران الأصول) لا تنطبق على شركة دخلها من الاستثمارات.' },
      { id: 'altman', reasonAr: 'نموذج Altman يقيس تعثر الشركات التشغيلية، والشركات القابضة لا تصنّف أصولها بنفس الطريقة غالباً.' },
    ],
  },
  bank: {
    applied: ['bankRoa', 'bankRoe', 'nimProxy', 'costToIncome', 'nplRatio', 'nplCoverage', 'loanToDeposit', 'capitalAdequacy'],
    excluded: [
      { id: 'currentRatio', reasonAr: 'البنك لا يصنّف أصوله وخصومه إلى متداولة وغير متداولة، والودائع مادته الخام لا دَين تشغيلي.' },
      { id: 'dio', reasonAr: 'لا مخزون لدى البنوك.' },
      { id: 'debtToEquity', reasonAr: 'الودائع تُضخّم المديونية بطبيعة عمل البنك، فالنسبة تبدو مخيفة دائماً بلا معنى؛ البديل هو كفاية رأس المال.' },
      { id: 'grossMargin', reasonAr: 'لا يوجد مبيعات وتكلفة مبيعات في قائمة دخل البنك.' },
      ...MODELS_EXCLUDED,
    ],
  },
  insurance: {
    applied: ['insServiceMargin', 'combinedRatio', 'investmentYield', 'insRoe', 'equityToAssets'],
    excluded: [
      { id: 'grossMargin', reasonAr: 'لا يوجد هامش مجمل ربح في قوائم IFRS 17؛ البديل هو هامش نتيجة خدمة التأمين.' },
      { id: 'currentRatio', reasonAr: 'شركات التأمين لا تعرض ميزانية مصنفة إلى متداول وغير متداول عادةً.' },
      { id: 'dio', reasonAr: 'لا مخزون لدى شركات التأمين.' },
      ...MODELS_EXCLUDED,
    ],
  },
};

/** @returns {{applied:string[], excluded:{id,reasonAr}[]}} */
export function rulesFor(sector) {
  const r = SECTOR_RULES[sector];
  if (!r) throw new Error(`قطاع غير معروف: ${sector}`);
  return r;
}
