import { gsap } from 'gsap';
import { docket } from '../app/cases.js';

/**
 * Upload-first landing: the visitor brings a company's financial statements (PDF).
 * Preloaded audited companies are a secondary "try an example" line, for demos without internet.
 */
export function mount(el, ctx) {
  const today = new Intl.DateTimeFormat('ar-EG-u-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  el.tabIndex = -1;
  el.innerHTML = `
    <div class="folio" role="document">
      <div class="folio-rules" aria-hidden="true"></div>
      <aside class="folio-margin" aria-label="هامش السجل">
        <span class="folio-no">صحيفة <bdi class="n">1</bdi></span>
        <span class="folio-date">${today}</span>
      </aside>
      <header class="folio-head">
        <h1 class="folio-title"><span class="ink-write">هل تستثمر فيها؟</span></h1>
        <p class="folio-lede">ارفع القوائم المالية لأي شركة. نقرأها، نعرف قطاعها، نحسب ما يناسب قطاعها من نسب ونماذج، ونفحص تقرير المدقق، ثم نعرض الأدلة أمامك ونصدر الحكم: استثمر أو لا تستثمر، ولماذا.</p>
      </header>

      <label class="intake-drop" for="file">
        <input id="file" type="file" accept="application/pdf,.pdf" class="visually-hidden" />
        <span class="drop-line drop-line--ink">ضع هنا ملف القوائم المالية</span>
        <span class="drop-line drop-line--pencil">ملف PDF للتقرير السنوي أو القوائم المدققة مع الإيضاحات، بالعربية أو الإنجليزية</span>
        <span class="drop-action">اختر الملف</span>
        <span class="close-rule" aria-hidden="true"></span>
      </label>
      <p class="drop-status" role="status" aria-live="polite"></p>

      <div class="examples">
        <p class="examples-head">أو جرّب شركة جاهزة من بورصة فلسطين، قوائمها المدققة لسنة <bdi class="n">2025</bdi> محمّلة مسبقاً:</p>
        <ul class="examples-list"></ul>
      </div>

      <footer class="folio-foot">
        <a href="#method" data-go="method">كيف تأكّدنا من الأرقام</a>
        <a href="#limits" data-go="limits">ما لا يستطيع النموذج قوله</a>
      </footer>
    </div>`;

  const list = el.querySelector('.examples-list');
  for (const e of docket()) {
    const li = document.createElement('li');
    li.innerHTML = `<button type="button" class="example" data-case="${e.id}">${e.docket.nameAr}<span class="ticker"><bdi class="n">${e.docket.ticker}</bdi></span></button>`;
    list.append(li);
  }

  el.querySelectorAll('[data-go]').forEach((a) => a.addEventListener('click', (ev) => { ev.preventDefault(); ctx.go(a.dataset.go); }));

  let leaving = false;
  list.addEventListener('click', (ev) => {
    const b = ev.target.closest('.example');
    if (!b || leaving) return;
    leaving = true;
    ctx.go('intake', { caseId: b.dataset.case });
  });

  const drop = el.querySelector('.intake-drop');
  const input = el.querySelector('#file');
  const status = el.querySelector('.drop-status');
  const accept = (file) => {
    if (!file) return;
    if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') { status.textContent = 'هذا ليس ملف PDF. اختر ملف القوائم المالية بصيغة PDF.'; return; }
    if (file.size > 25 * 1024 * 1024) { status.textContent = 'الملف أكبر من 25 ميغابايت. ارفع ملف القوائم المالية والإيضاحات فقط.'; return; }
    if (leaving) return;
    leaving = true;
    ctx.go('intake', { file });
  };
  input.addEventListener('change', () => accept(input.files[0]));
  ['dragenter', 'dragover'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add('is-over'); }));
  ['dragleave', 'drop'].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove('is-over'); }));
  drop.addEventListener('drop', (e) => accept(e.dataTransfer.files[0]));

  if (!ctx.reducedMotion && document.visibilityState === 'visible') {
    const hidden = 'inset(0% 0% 0% 100%)', shown = 'inset(0% 0% 0% 0%)';
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    const wipe = (t, vars, pos) => tl.fromTo(t, { clipPath: hidden }, { clipPath: shown, clearProps: 'clipPath', ...vars }, pos);
    wipe(el.querySelector('.folio-rules'), { duration: 1.1, ease: 'power2.inOut' });
    wipe(el.querySelector('.ink-write'), { duration: 1.28, ease: 'power1.inOut' }, '-=0.32');
    tl.fromTo(el.querySelector('.folio-lede'), { opacity: 0, filter: 'blur(3px)' }, { opacity: 1, filter: 'blur(0px)', clearProps: 'filter', duration: 0.64 }, '-=0.4');
    wipe(drop, { duration: 0.64 }, '-=0.3');
    wipe(el.querySelector('.examples'), { duration: 0.64 }, '-=0.4');
    const guard = setTimeout(() => tl.progress(1), (tl.duration() + 1.5) * 1000);
    tl.eventCallback('onComplete', () => clearTimeout(guard));
  }

  return {
    async transitionOut() {
      await gsap.timeline()
        .to(drop.querySelector('.close-rule'), { scaleX: 1, duration: 0.64, ease: 'power3.out' })
        .to(el.querySelector('.folio'), { clipPath: 'inset(0 0 100% 0)', duration: 0.72, ease: 'power3.in' }, '+=0.16');
    },
  };
}
