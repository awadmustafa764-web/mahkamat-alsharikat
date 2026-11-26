/**
 * Convert the Worker's extraction JSON into CompanyData for the engine.
 * Null lines are dropped (the engine treats them as missing), pages become src.page, doc = 'upload'.
 */
export function toCompanyData(x, fileName = 'upload.pdf') {
  const doc = 'upload';
  const line = (l) => (l && typeof l.v === 'number' && Number.isFinite(l.v) ? { v: l.v, src: { page: l.page, doc } } : null);
  const block = (b = {}) => Object.fromEntries(Object.entries(b).map(([k, l]) => [k, line(l)]).filter(([, l]) => l));
  const years = {};
  for (const y of x.years ?? []) {
    years[String(y.year)] = { bs: block(y.bs), is: block(y.is), cf: block(y.cf) };
    const sh = line(y.shares); if (sh) years[String(y.year)].shares = sh;
    const ca = line(y.capitalAdequacy); if (ca) years[String(y.year)].capitalAdequacy = ca;
  }
  const yrs = (x.meta?.years?.length >= 2 ? x.meta.years : (x.years ?? []).map((y) => y.year)).slice().sort((a, b) => b - a).slice(0, 2);
  const a = x.disclosures?.auditor ?? {};
  return {
    meta: {
      id: 'upload', nameAr: x.meta?.nameAr ?? fileName, nameEn: x.meta?.nameEn ?? '', ticker: x.meta?.ticker ?? '',
      exchange: '', sector: x.meta?.sector, activityAr: x.meta?.activityAr ?? '', currency: x.meta?.currency ?? '',
      unit: x.meta?.unit ?? '1', consolidated: !!x.meta?.consolidated, framework: x.meta?.framework ?? 'IFRS', years: yrs,
      isAnnualAudited: x.meta?.isAnnualAudited !== false, source: { fileName, notesIncluded: !!x.disclosures?.notesIncluded },
    },
    years,
    disclosures: {
      auditor: {
        opinion: a.opinion ?? 'unmodified', firm: a.firm ?? '',
        emphasis: a.emphasis ? { present: true, quote: a.emphasis.quote, page: a.emphasis.page } : null,
        goingConcern: a.goingConcern ?? 'none', goingConcernQuote: a.goingConcernQuote?.quote, goingConcernPage: a.goingConcernQuote?.page,
        kams: (a.kams ?? []).map((k) => ({ title: k.title ?? '', quote: k.quote, page: k.page })),
      },
      relatedParties: x.disclosures?.relatedParties ?? [], contingencies: x.disclosures?.contingencies ?? [],
      subsequentEvents: x.disclosures?.subsequentEvents ?? [], policyChanges: x.disclosures?.policyChanges ?? [],
    },
  };
}
