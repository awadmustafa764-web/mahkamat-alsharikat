import { docket } from '../app/cases.js';

/** Temporary case cover until Plan 2 Task 4 (envelope, pinned cover, loading game) lands. */
export function mount(el, ctx) {
  const entry = docket().find((e) => e.id === ctx.payload.caseId);
  if (!entry) return ctx.go('landing');
  const c = entry.case;
  el.tabIndex = -1;
  el.innerHTML = `
    <article class="folio folio--read">
      <div class="folio-rules" aria-hidden="true"></div>
      <h1 class="read-title">قضية ${entry.docket.nameAr}</h1>
      <div class="read-body">
        <p>${entry.docket.legalNameAr} · قطاع ${entry.docket.sectorAr} · السنة المالية <bdi class="n">${entry.docket.fy}</bdi> · المدقق ${entry.docket.auditor}</p>
        <p>القانون المطبّق: <bdi class="n">${c.sectorRule.applied.length}</bdi> مقياساً لهذا القطاع، واستُبعد <bdi class="n">${c.sectorRule.excluded.length}</bdi> مع أسبابها. فحص سلامة القراءة: ${c.integrity.ok ? 'متوازن' : 'غير متوازن'}.</p>
        <p class="pencil-note">قاعة الأدلة تُبنى الآن؛ هذه صفحة الغلاف المؤقتة.</p>
      </div>
      <p class="folio-foot"><a href="#landing" data-back>العودة إلى السجل</a></p>
    </article>`;
  el.querySelector('[data-back]').addEventListener('click', (e) => { e.preventDefault(); ctx.go('landing'); });
}
