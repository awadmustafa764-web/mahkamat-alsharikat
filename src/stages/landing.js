import { gsap } from 'gsap';
import { docket } from '../app/cases.js';

const COLS = ['البيان', 'القطاع', 'مدقّق الحسابات', 'السنة المالية', 'رقم القضية'];

function row(entry) {
  const d = entry.docket;
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'docket-line';
  b.dataset.case = entry.id;
  b.setAttribute('aria-label', `افتح قضية ${d.nameAr}، قطاع ${d.sectorAr}، السنة المالية ${d.fy}${d.note ? `، ملاحظة: ${d.note}` : ''}`);
  b.innerHTML = `
    <span class="c c-name">${d.nameAr}<span class="ticker"><bdi class="n">${d.ticker}</bdi></span></span>
    <span class="c c-sector">${d.sectorAr}</span>
    <span class="c c-auditor">${d.auditor}</span>
    <span class="c c-fy"><bdi class="n">${d.fy}</bdi></span>
    <span class="c c-no"><bdi class="n">${d.caseNo}</bdi></span>
    ${d.note ? `<span class="margin-note" aria-hidden="true">${d.note}</span>` : ''}
    <span class="close-rule" aria-hidden="true"></span>`;
  return b;
}

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
        <h1 class="folio-title"><span class="ink-write">من يحاكم الأرقام؟</span></h1>
        <p class="folio-lede">هذا سجلّ محكمة الشركات. كل قضية فيه قوائم مالية مدقّقة لشركة مدرجة في بورصة فلسطين، تُعرض أدلتها حسب قطاعها، وأنت من يحكم عليها.</p>
      </header>
      <div class="docket" role="table" aria-label="جدول القضايا">
        <div class="docket-cols" role="row">${COLS.map((c) => `<span class="c" role="columnheader">${c}</span>`).join('')}</div>
        <div class="docket-body" role="rowgroup"></div>
      </div>
      <p class="docket-new"><span class="pencil">قضية جديدة من ملف إفصاحات تُرفعه بنفسك</span> <span class="pencil-note">تُفتح هذه الخانة في المرحلة القادمة</span></p>
      <footer class="folio-foot">
        <a href="#method" data-go="method">كيف تأكّدنا من الأرقام</a>
        <a href="#limits" data-go="limits">ما لا يستطيع النموذج قوله</a>
      </footer>
    </div>`;

  const body = el.querySelector('.docket-body');
  for (const e of docket()) body.append(row(e));

  el.querySelectorAll('[data-go]').forEach((a) => a.addEventListener('click', (ev) => { ev.preventDefault(); ctx.go(a.dataset.go); }));

  let chosen = null;
  body.addEventListener('click', (ev) => {
    const line = ev.target.closest('.docket-line');
    if (!line || chosen) return;
    chosen = line;
    ctx.go('intake', { caseId: line.dataset.case });
  });

  if (!ctx.reducedMotion && document.visibilityState === 'visible') {
    // RTL: the pen moves right → left, so content is uncovered from the right edge (left inset shrinks to 0).
    const hidden = 'inset(0% 0% 0% 100%)', shown = 'inset(0% 0% 0% 0%)';
    const wipe = (targets, vars, pos) => tl.fromTo(targets, { clipPath: hidden }, { clipPath: shown, clearProps: 'clipPath', ...vars }, pos);
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    wipe(el.querySelector('.folio-rules'), { duration: 1.1, ease: 'power2.inOut' });
    wipe(el.querySelector('.ink-write'), { duration: 1.28, ease: 'power1.inOut' }, '-=0.32');
    tl.fromTo(el.querySelector('.folio-lede'), { opacity: 0, filter: 'blur(3px)' }, { opacity: 1, filter: 'blur(0px)', clearProps: 'filter', duration: 0.64 }, '-=0.4');
    wipe(el.querySelectorAll('.docket-cols .c, .docket-line'), { duration: 0.64, stagger: 0.08 }, '-=0.3');
    tl.fromTo(el.querySelectorAll('.margin-note'), { opacity: 0, rotate: -9, scale: 1.08 }, { opacity: 1, rotate: -4, scale: 1, duration: 0.24, ease: 'back.out(1.6)', stagger: 0.16 }, '-=0.1');
    // Content must never stay hidden: if frames are throttled (background tab, slow device), finish the entrance.
    const guard = setTimeout(() => tl.progress(1), (tl.duration() + 1.5) * 1000);
    tl.eventCallback('onComplete', () => clearTimeout(guard));
    document.addEventListener('visibilitychange', () => document.hidden && tl.progress(1), { once: true });
  }

  return {
    async transitionOut() {
      if (!chosen) return;
      const rule = chosen.querySelector('.close-rule');
      await gsap.timeline()
        .to(rule, { scaleX: 1, duration: 0.64, ease: 'power3.out' })
        .to(el.querySelector('.folio'), { clipPath: 'inset(0 0 100% 0)', duration: 0.72, ease: 'power3.in' }, '+=0.24');
    },
  };
}
