import { gsap } from 'gsap';
import { docket } from '../app/cases.js';
import { analyzeUpload } from '../app/upload.js';
import { RATIOS } from '../engine/index.js';
import { fmt } from '../engine/texts.js';

const STEPS = [
  ['send', 'إرسال الملف إلى قارئ القوائم'],
  ['read', 'قراءة القوائم والإيضاحات وتقرير المدقق'],
  ['check', 'فحص سلامة القراءة'],
  ['analyze', 'تحديد القطاع وحساب ما يناسبه'],
];

/** Asked before the sector is known; answered from the case if the measure applies to its sector. */
const GUESSES = [
  { id: 'currentRatio', q: 'هل أصولها المتداولة أكبر من التزاماتها المتداولة؟', test: (v) => v > 1 },
  { id: 'netMargin', q: 'هل يبقى لها أكثر من 10 قروش ربحاً صافياً من كل دينار مبيعات؟', test: (v) => v > 0.1 },
  { id: 'debtToEquity', q: 'هل ديونها أكبر من أموال مالكيها؟', test: (v) => v > 1 },
];

/** Await an animation but never longer than its duration + 1s (throttled frames must not block the flow). */
const settle = (tween) => Promise.race([tween, new Promise((r) => setTimeout(() => { tween.progress(1); r(); }, (tween.duration() + 1) * 1000))]);

export function mount(el, ctx) {
  const { caseId, file } = ctx.payload ?? {};
  const known = caseId ? docket().find((e) => e.id === caseId) : null;
  if (!known && !file) return ctx.go('landing');
  // A preloaded case knows its sector, so it gets that sector's own questions; an upload starts with the general set.
  const QS = known
    ? known.case.guesses.map((g) => ({ id: g.evidenceId, q: g.questionAr.replace(/^برأيك:\s*/, ''), test: () => g.answer }))
    : GUESSES;

  el.tabIndex = -1;
  el.innerHTML = `
    <div class="folio reading">
      <div class="folio-rules" aria-hidden="true"></div>
      <h1 class="read-title">${known ? `قضية ${known.docket.nameAr}` : 'قراءة الملف'}</h1>
      <p class="pencil-note">${known ? 'قوائم مدققة محمّلة مسبقاً' : file.name}</p>

      <div class="reading-grid">
        <ol class="steps" aria-label="مراحل القراءة">${STEPS.map(([id, t]) => `<li data-step="${id}">${t}</li>`).join('')}</ol>

        <section class="guess" aria-label="خمّن قبل أن ترى">
          <h2 class="guess-title">خمّن قبل أن ترى</h2>
          <p class="guess-lede">اكتب تخمينك بالرصاص؛ الجواب يُكتب بالحبر حين تنتهي القراءة.</p>
          <ol class="guess-list">${QS.map((g) => `
            <li data-guess="${g.id}">
              <p class="guess-q">${g.q}</p>
              <div class="guess-a" role="group" aria-label="${g.q}">
                <button type="button" data-v="yes">نعم</button><button type="button" data-v="no">لا</button>
              </div>
              <p class="guess-truth" aria-live="polite"></p>
            </li>`).join('')}</ol>
        </section>
      </div>

      <div class="balance" aria-hidden="true">
        <div class="col col-a"><span class="col-h">الأصول</span><span class="col-v">—</span></div>
        <div class="equals"><span></span><span></span></div>
        <div class="col col-l"><span class="col-h">الخصوم وحقوق الملكية</span><span class="col-v">—</span></div>
      </div>
      <p class="drop-status" role="status"></p>
      <button type="button" class="enter drop-action" hidden>افتح قاعة الأدلة</button>
      <p class="folio-foot"><a href="#landing" data-back>العودة إلى السجل</a></p>
    </div>`;

  el.querySelector('[data-back]').addEventListener('click', (e) => { e.preventDefault(); ctx.go('landing'); });

  const guesses = {};
  el.querySelectorAll('.guess-a').forEach((g) => g.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    g.querySelectorAll('button').forEach((x) => x.classList.toggle('is-picked', x === b));
    guesses[g.closest('li').dataset.guess] = b.dataset.v === 'yes';
  }));

  const mark = (id) => {
    let past = true;
    for (const li of el.querySelectorAll('[data-step]')) {
      if (li.dataset.step === id) { li.classList.add('is-now'); past = false; } else if (past) { li.classList.replace('is-now', 'is-done') || li.classList.add('is-done'); }
    }
  };

  const status = el.querySelector('.drop-status');
  const wait = (ms) => new Promise((r) => setTimeout(r, ctx.reducedMotion ? 0 : ms));

  const run = async () => {
    if (known) {
      // Preloaded: replay the real checks at a readable pace so the visitor still sees what was verified.
      for (const s of STEPS.map((x) => x[0])) { mark(s); await wait(1600); }
      return { data: known.data, case: known.case, integrity: known.case.integrity, problems: [] };
    }
    return analyzeUpload(file, mark);
  };

  run().then(async (r) => {
    el.querySelectorAll('[data-step]').forEach((li) => { li.classList.remove('is-now'); li.classList.add('is-done'); });
    if (!r.case) { status.textContent = r.problems.join(' '); return; }
    const c = r.case, y = r.data.meta.years[0];

    // Reveal the guesses in ink.
    for (const g of QS) {
      const li = el.querySelector(`[data-guess="${g.id}"] .guess-truth`);
      const applies = c.sectorRule.applied.includes(g.id);
      const v = applies ? RATIOS[g.id].compute(r.data, y).value : null;
      if (v === null) { li.textContent = 'لا يُقاس بهذا في قطاع الشركة، وستعرف لماذا في قاعة التعريف.'; continue; }
      const truth = g.test(v);
      const mine = guesses[g.id];
      li.innerHTML = `${truth ? 'نعم' : 'لا'} — ${fmt(v, RATIOS[g.id].unitAr)}${mine === undefined ? '' : mine === truth ? '. أصبت.' : '. لم تُصب.'}`;
      li.classList.add(mine === undefined ? 'is-ink' : mine === truth ? 'is-right' : 'is-wrong');
    }

    // Balance: assets vs liabilities + equity from the integrity check, then the "=" when they agree.
    const bal = r.integrity.checks.find((x) => x.id === 'balance' && x.year === y);
    if (bal) {
      const unit = r.data.meta.unit === '1000' ? ' (بالآلاف)' : '';
      const [a, l] = [el.querySelector('.col-a .col-v'), el.querySelector('.col-l .col-v')];
      const counter = { a: 0, l: 0 };
      await settle(gsap.to(counter, { a: bal.expected, l: bal.actual, duration: ctx.reducedMotion ? 0 : 0.96, ease: 'expo.out',
        onUpdate: () => { a.textContent = Math.round(counter.a).toLocaleString('en-US') + unit; l.textContent = Math.round(counter.l).toLocaleString('en-US') + unit; } }));
      if (bal.ok) await settle(gsap.to(el.querySelectorAll('.equals span'), { scaleX: 1, duration: ctx.reducedMotion ? 0 : 0.64, stagger: 0.16, ease: 'power3.out' }));
      else status.textContent = `الأصول لا تساوي الخصوم وحقوق الملكية بفرق ${bal.diff.toLocaleString('en-US')}؛ راجع الأرقام قبل الاعتماد على الحكم.`;
    }
    // The visitor decides when to enter; never pull them away mid-guess.
    const enter = el.querySelector('.enter');
    enter.hidden = false;
    enter.focus({ preventScroll: true });
    enter.addEventListener('click', () => ctx.go('exhibit', { result: { data: r.data, case: c, verifiedMatch: r.verifiedMatch, problems: r.problems, guesses } }), { once: true });
  }).catch((e) => { status.textContent = e.message; });
}
