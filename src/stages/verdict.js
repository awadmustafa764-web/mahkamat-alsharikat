import { gsap } from 'gsap';
import { AXIS_LABELS } from '../engine/index.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** The closing deed: one printable A4 page. */
export function deedHtml(r, judge) {
  const c = r.case, m = r.data.meta, model = c.rating;
  const axes = Object.entries(model.axes).map(([k, a]) => `<tr><th>${AXIS_LABELS[k]}</th><td>${a.grade}</td><td>${judge?.axes?.[k]?.grade ?? a.grade}</td></tr>`).join('');
  const list = (xs) => xs.map((e) => `<li>${esc(e.titleAr)}: ${esc(e.displayAr)}</li>`).join('');
  const today = new Intl.DateTimeFormat('ar-EG-u-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  return `
    <article class="deed" aria-labelledby="deed-title">
      <header class="deed-head">
        <p class="deed-kind">صك حكم · محكمة الشركات</p>
        <h1 id="deed-title">${esc(m.nameAr)}</h1>
        <p class="deed-meta">السنة المالية <bdi class="n">${m.years[0]}</bdi> · المدقق ${esc(r.data.disclosures.auditor.firm || 'غير مذكور')} · ${today}</p>
      </header>
      <section class="deed-verdicts">
        <div><p class="deed-label">حكم النموذج</p><p class="deed-verdict">${esc(model.verdict.labelAr)}</p><p class="deed-reason">${esc(model.verdict.reasonAr)}</p></div>
        <div><p class="deed-label">حكمك أنت</p><p class="deed-verdict deed-verdict--judge">${esc((judge ?? model).verdict.labelAr)}</p>
          ${judge?.diffAr?.length ? `<ul class="deed-diff">${judge.diffAr.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>` : '<p class="deed-reason">اتفقت مع النموذج.</p>'}</div>
      </section>
      <span class="deed-rule" aria-hidden="true"></span>
      <table class="deed-axes"><thead><tr><th>المحور</th><th>النموذج</th><th>أنت</th></tr></thead><tbody>${axes}</tbody></table>
      <section class="deed-cols">
        <div><h2>أقوى ما معها</h2><ol>${list(c.strengths)}</ol></div>
        <div><h2>أثقل ما ضدها</h2><ol>${list(c.weaknesses)}</ol></div>
      </section>
      <section><h2>أسئلة للإدارة</h2><ol>${c.questions.map((q) => `<li>${esc(q)}</li>`).join('')}</ol></section>
      ${model.downgrades.length ? `<section><h2>ما خفّض الحكم</h2><ul>${model.downgrades.map((d) => `<li>${esc(d)}</li>`).join('')}</ul></section>` : ''}
      <p class="deed-confidence">ثقة النتيجة: ${{ high: 'عالية', medium: 'متوسطة', low: 'منخفضة' }[model.confidence]}${r.verifiedMatch ? ' · أرقام مدققة بنداً بنداً' : ''}</p>
      <p class="disclaimer">${esc(c.disclaimer)}</p>
    </article>`;
}

export function mount(el, ctx) {
  const { result: r, judge } = ctx.payload ?? {};
  if (!r) return ctx.go('landing');
  el.tabIndex = -1;
  el.innerHTML = `<div class="folio folio--read verdict-page"><div class="folio-rules" aria-hidden="true"></div>${deedHtml(r, judge)}
    <p class="deed-actions"><button type="button" class="drop-action" data-print>طباعة الصك أو حفظه PDF</button>
    <a href="#landing" data-back>قضية جديدة</a></p></div>`;
  el.querySelector('[data-print]').addEventListener('click', () => window.print());
  el.querySelector('[data-back]').addEventListener('click', (e) => { e.preventDefault(); ctx.go('landing'); });
  if (!ctx.reducedMotion) {
    gsap.fromTo(el.querySelector('.deed'), { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, ease: 'power3.out', clearProps: 'clipPath' });
    gsap.fromTo(el.querySelector('.deed-rule'), { scaleX: 0 }, { scaleX: 1, duration: 1.1, delay: 0.9, ease: 'power2.inOut' });
  }
}
