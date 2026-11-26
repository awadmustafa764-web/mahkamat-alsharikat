/** Case cover with the verdict. Temporary until the exhibition (Plan 2 Tasks 5–9) replaces it. */
export function mount(el, ctx) {
  const r = ctx.payload?.result;
  if (!r) return ctx.go('landing');
  const c = r.case, d = r.data, v = c.rating.verdict;
  el.tabIndex = -1;
  el.innerHTML = `
    <article class="folio folio--read">
      <div class="folio-rules" aria-hidden="true"></div>
      <h1 class="read-title">قضية ${d.meta.nameAr}</h1>
      <div class="read-body">
        ${r.verifiedMatch ? '<p class="pencil-note">هذا الملف مطابق لتقرير دققناه بنداً بنداً مسبقاً، فعُرضت أرقامه المدققة فوراً.</p>' : ''}
        ${r.problems?.length ? `<p class="drop-status">${r.problems.join(' ')}</p>` : ''}
        <p>السنة المالية <bdi class="n">${d.meta.years[0]}</bdi> · المدقق ${d.disclosures.auditor.firm || 'غير مذكور'}</p>
        <p class="verdict-line">الحكم: <strong>${v.labelAr}</strong>. ${v.reasonAr}</p>
        <h2 class="sub">أسئلة للإدارة</h2>
        <ol class="questions">${c.questions.map((q) => `<li>${q}</li>`).join('')}</ol>
        <p class="pencil-note">قاعة الأدلة تُبنى الآن؛ هذه صفحة الغلاف المؤقتة.</p>
        <p class="disclaimer">${c.disclaimer}</p>
      </div>
      <p class="folio-foot"><a href="#landing" data-back>العودة إلى السجل</a></p>
    </article>`;
  el.querySelector('[data-back]').addEventListener('click', (e) => { e.preventDefault(); ctx.go('landing'); });
}
