/** Arabic labels for every line key (used in evidence inputs and anomaly cards). */
export const LABELS = {
  bs: {
    cash: 'النقد وما في حكمه', receivables: 'الذمم المدينة', inventory: 'المخزون', otherCurrentAssets: 'أصول متداولة أخرى',
    totalCurrentAssets: 'مجموع الأصول المتداولة', ppeNet: 'الممتلكات والآلات والمعدات (بالصافي)', otherNonCurrentAssets: 'أصول غير متداولة أخرى',
    totalAssets: 'مجموع الأصول', payables: 'الذمم الدائنة', shortTermDebt: 'قروض وتسهيلات قصيرة الأجل',
    otherCurrentLiabilities: 'خصوم متداولة أخرى', totalCurrentLiabilities: 'مجموع الخصوم المتداولة', longTermDebt: 'قروض طويلة الأجل',
    otherNonCurrentLiabilities: 'خصوم غير متداولة أخرى', totalLiabilities: 'مجموع الخصوم', equityParent: 'حقوق مساهمي الشركة الأم',
    nci: 'حقوق غير المسيطرين', totalEquity: 'مجموع حقوق الملكية', retainedEarnings: 'الأرباح المدورة',
    grossLoans: 'إجمالي القروض والتسهيلات', allowanceLoans: 'مخصص الخسائر الائتمانية المتوقعة', netLoans: 'صافي القروض والتسهيلات',
    npl: 'القروض غير العاملة', deposits: 'ودائع العملاء', totalInvestments: 'مجموع الاستثمارات',
  },
  is: {
    revenue: 'الإيرادات', cogs: 'تكلفة المبيعات', grossProfit: 'مجمل الربح', sga: 'المصاريف الإدارية والبيعية', operatingIncome: 'الربح التشغيلي',
    depreciation: 'الاستهلاكات والإطفاءات', interestExpense: 'مصاريف التمويل', pbt: 'الربح قبل الضريبة', tax: 'ضريبة الدخل',
    netIncome: 'صافي الربح', netIncomeParent: 'صافي الربح العائد لمساهمي الشركة الأم', nonRecurring: 'بنود غير متكررة',
    netInterestIncome: 'صافي إيرادات الفوائد', nonInterestIncome: 'إيرادات غير الفوائد', operatingExpenses: 'المصاريف التشغيلية',
    provisionExpense: 'مصروف مخصص الخسائر الائتمانية', insuranceRevenue: 'إيرادات التأمين', insuranceServiceExpenses: 'مصاريف خدمة التأمين',
    netReinsuranceResult: 'صافي نتيجة إعادة التأمين', insuranceServiceResult: 'نتيجة خدمة التأمين', investmentIncome: 'دخل الاستثمار',
    fairValueGains: 'أرباح التغير في القيمة العادلة',
  },
  cf: {
    cfo: 'صافي التدفق النقدي من الأنشطة التشغيلية', capex: 'شراء ممتلكات وآلات ومعدات', cfi: 'صافي التدفق من الأنشطة الاستثمارية',
    cff: 'صافي التدفق من الأنشطة التمويلية', dividendsPaid: 'توزيعات أرباح مدفوعة', netChangeCash: 'صافي التغير في النقد',
    cashBegin: 'النقد أول المدة', cashEnd: 'النقد آخر المدة', fxEffect: 'أثر فروقات العملة',
  },
  top: { capitalAdequacy: 'نسبة كفاية رأس المال (من الإيضاحات)', shares: 'عدد الأسهم' },
};

export const label = (stmt, key) => LABELS[stmt]?.[key] ?? key;
