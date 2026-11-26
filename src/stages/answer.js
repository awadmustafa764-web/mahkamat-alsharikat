import { gsap } from 'gsap';
import { RATING_LABELS } from '../engine/index.js';
import { SECTOR_AR } from '../app/cases.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** The answer in five seconds: verdict, why, and the strongest points on each side. */
export function mount(el, ctx) {
  const r = ctx.payload?.result;
  if (!r) return ctx.go('landing');
  const c = r.case, v = c.rating.verdict, a = c.argument;
  const negative = RATING_LABELS.indexOf(c.rating.label) >= 2;
  const against = [...a.mustKnow.filter((e) => e.severity === 'alert'), ...a.against].slice(0, 3);
  const forIt = a.for.slice(0, 3);
  const li = (xs, empty) => (xs.length ? xs.map((e) => `<li>${esc(e.headlineAr)}</li>`).join('') : `<li class="none">${empty}</li>`);

  el.tabIndex = -1;
  el.innerHTML = `
    <div class="folio answer">
      <div class="folio-rules" aria-hidden="true"></div>
      <p class="answer-case">${esc(r.data.meta.nameAr)} · السنة المالية <bdi class="n">${r.data.meta.years[0]}</bdi> · قطاع ${SECTOR_AR[r.data.meta.sector] ?? ''}</p>
      <h1 class="answer-verdict ${negative ? 'is-no' : 'is-yes'}"><span class="ink-write">${esc(v.labelAr)}</span></h1>
      <span class="answer-rule" aria-hidden="true"></span>
      <p class="answer-reason">${esc(v.reasonAr)}</p>

      <div class="answer-sides">
        <section class="side side--against"><h2>ضدها</h2><ol>${li(against, 'لا أدلة جوهرية ضدها في هذه القوائم.')}</ol></section>
        <section class="side side--for"><h2>معها</h2><ol>${li(forIt, 'لا شيء يستحق الذكر في صالحها هذه السنة.')}</ol></section>
      </div>

      <p class="answer-note">قيست بـ <bdi class="n">${c.sectorRule.applied.length}</bdi> مقياساً تناسب قطاعها، واستُبعد <bdi class="n">${c.sectorRule.excluded.length}</bdi> لا تصلح له. ثقة النتيجة: ${{ high: 'عالية', medium: 'متوسطة', low: 'منخفضة' }[c.rating.confidence]}.</p>

      <div class="answer-actions">
        <button type="button" class="drop-action" data-go="exhibit">افحص الأدلة بنفسك</button>
        <button type="button" class="link" data-go="verdict">اقرأ الصك مباشرة</button>
        <a href="#landing" data-back>قضية أخرى</a>
      </div>
      <p class="disclaimer">${esc(c.disclaimer)}</p>
    </div>`;

  el.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => ctx.go(b.dataset.go, { result: r })));
  el.querySelector('[data-back]').addEventListener('click', (e) => { e.preventDefault(); ctx.go('landing'); });

  if (!ctx.reducedMotion && document.visibilityState === 'visible') {
    const tl = gsap.timeline();
    tl.fromTo(el.querySelector('.ink-write'), { clipPath: 'inset(0% 0% 0% 100%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, ease: 'power1.inOut', clearProps: 'clipPath' })
      .fromTo(el.querySelector('.answer-rule'), { scaleX: 0 }, { scaleX: 1, duration: 0.9, ease: 'power2.inOut' }, '-=0.2')
      .fromTo(el.querySelectorAll('.side li, .answer-reason'), { opacity: 0, filter: 'blur(3px)' }, { opacity: 1, filter: 'blur(0px)', clearProps: 'filter', duration: 0.48, stagger: 0.08, ease: 'expo.out' }, '-=0.4');
    setTimeout(() => tl.progress(1), (tl.duration() + 1.5) * 1000);
  }
}
