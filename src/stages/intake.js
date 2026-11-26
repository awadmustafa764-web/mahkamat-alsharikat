import { docket } from '../app/cases.js';
import { analyzeUpload } from '../app/upload.js';

const STEPS = [
  ['send', 'إرسال الملف إلى قارئ القوائم'],
  ['read', 'قراءة القوائم الأربع والإيضاحات وتقرير المدقق'],
  ['check', 'فحص سلامة القراءة: الأصول = الخصوم + حقوق الملكية'],
  ['analyze', 'تحديد القطاع وحساب ما يناسبه'],
];

function coverHtml(c, d) {
  const v = c.rating.verdict;
  return `
    <p>${d.meta.nameAr} · السنة المالية <bdi class="n">${d.meta.years[0]}</bdi> · المدقق ${d.disclosures.auditor.firm || 'غير مذكور'}</p>
    <p>القانون المطبّق: <bdi class="n">${c.sectorRule.applied.length}</bdi> مقياساً لهذا القطاع، واستُبعد <bdi class="n">${c.sectorRule.excluded.length}</bdi> مع أسبابها. فحص سلامة القراءة: ${c.integrity.ok ? 'متوازن' : 'غير متوازن'}.</p>
    <p class="verdict-line">الحكم: <strong>${v.labelAr}</strong>. ${v.reasonAr}</p>
    <ol class="questions">${c.questions.map((q) => `<li>${q}</li>`).join('')}</ol>
    <p class="pencil-note">قاعة الأدلة تُبنى الآن؛ هذه صفحة الغلاف المؤقتة.</p>`;
}

export function mount(el, ctx) {
  el.tabIndex = -1;
  el.innerHTML = `
    <article class="folio folio--read">
      <div class="folio-rules" aria-hidden="true"></div>
      <h1 class="read-title"></h1>
      <div class="read-body"></div>
      <p class="folio-foot"><a href="#landing" data-back>العودة إلى السجل</a></p>
    </article>`;
  const title = el.querySelector('.read-title');
  const body = el.querySelector('.read-body');
  el.querySelector('[data-back]').addEventListener('click', (e) => { e.preventDefault(); ctx.go('landing'); });

  const { caseId, file } = ctx.payload ?? {};
  if (caseId) {
    const entry = docket().find((e) => e.id === caseId);
    if (!entry) return ctx.go('landing');
    title.textContent = `قضية ${entry.docket.nameAr}`;
    body.innerHTML = coverHtml(entry.case, entry.data);
    return;
  }
  if (!file) return ctx.go('landing');

  title.textContent = 'قراءة الملف';
  body.innerHTML = `<p class="pencil-note">${file.name}</p><ol class="steps">${STEPS.map(([id, t]) => `<li data-step="${id}">${t}</li>`).join('')}</ol><p class="drop-status" role="status"></p>`;
  const mark = (id) => {
    let past = true;
    for (const li of body.querySelectorAll('[data-step]')) {
      if (li.dataset.step === id) { li.classList.add('is-now'); past = false; } else if (past) { li.classList.remove('is-now'); li.classList.add('is-done'); }
    }
  };
  analyzeUpload(file, mark).then((r) => {
    if (!r.case) {
      body.querySelector('.drop-status').textContent = r.problems.join(' ');
      return;
    }
    title.textContent = `قضية ${r.data.meta.nameAr}`;
    const failed = r.integrity.checks.filter((c) => !c.ok && !c.soft);
    body.innerHTML = (r.verifiedMatch ? '<p class="pencil-note">هذا الملف مطابق لتقرير دققناه بنداً بنداً مسبقاً، فعُرضت أرقامه المدققة فوراً.</p>' : '') + (failed.length
      ? `<p class="drop-status">تنبيه: ${failed.length} من فحوصات سلامة القراءة لم تتطابق (${failed.map((c) => c.labelAr).join('، ')}). راجع الأرقام قبل الاعتماد على الحكم.</p>`
      : '') + (r.problems.length ? `<p class="drop-status">${r.problems.join(' ')}</p>` : '') + coverHtml(r.case, r.data);
  }).catch((e) => { body.querySelector('.drop-status').textContent = e.message; });
}
