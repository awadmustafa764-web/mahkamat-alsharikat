import { analyze, benchmarksFromFile } from '../engine/index.js';
import benchmarkFile from '../../data/pex-benchmark.json';

const files = import.meta.glob('../../data/companies/*.json', { eager: true, import: 'default' });

export const SECTOR_AR = { industrial: 'صناعة', services: 'خدمات', bank: 'بنوك', insurance: 'تأمين', investment: 'استثمار' };

/** Marginal note the clerk writes in red beside a case, from the auditor's report. */
const MARGIN_NOTE = {
  disclaimerOpinion: 'امتنع المدقق عن الرأي',
  adverseOpinion: 'رأي معاكس',
  goingConcern: 'شكّ في الاستمرارية',
  qualifiedOpinion: 'تحفّظ المدقق',
  emphasis: 'فقرة لفت انتباه',
  altman: 'منطقة تعثّر',
};

/** Short names for the docket line; the full legal name appears on the case cover. */
const SHORT_NAME = {
  aziza: 'دواجن فلسطين', paltel: 'مجموعة الاتصالات الفلسطينية', insurer: 'التأمين الوطنية',
  bop: 'بنك فلسطين', distressed: 'فلسطين للاستثمار العقاري',
};
const auditorShort = (firm = '') => (/إرنست|Ernst/i.test(firm) ? 'إرنست ويونغ' : /HLB/i.test(firm) ? 'HLB فلسطين' : firm);

/** Docket order: the clean cases first, the gravest last. */
const ORDER = ['aziza', 'paltel', 'insurer', 'bop', 'distressed'];

export const benchmarks = benchmarksFromFile(benchmarkFile);

let cache = null;
/** @returns {{id, data, case, docket:{nameAr, sectorAr, auditor, fy, note, caseNo}}[]} */
export function docket() {
  if (cache) return cache;
  const entries = Object.entries(files).map(([path, data]) => ({ id: path.split('/').pop().replace('.json', ''), data }));
  entries.sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));
  cache = entries.map(({ id, data }, i) => {
    const c = analyze(data, benchmarks);
    return {
      id, data, case: c,
      docket: {
        nameAr: SHORT_NAME[id] ?? data.meta.nameAr,
        legalNameAr: data.meta.nameAr,
        ticker: data.meta.ticker,
        sectorAr: SECTOR_AR[data.meta.sector],
        auditor: auditorShort(data.disclosures?.auditor?.firm),
        fy: data.meta.years[0],
        note: c.surprise ? MARGIN_NOTE[c.surprise.id] ?? null : null,
        caseNo: `${data.meta.years[0]}/${String(i + 1).padStart(2, '0')}`,
      },
    };
  });
  return cache;
}
