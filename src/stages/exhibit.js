import { gsap } from 'gsap';
import { buildLayout, HALL_TITLES } from '../exhibit/layout.js';
import { createRail, keyAction } from '../exhibit/rail.js';
import { createScene, webglAvailable } from '../exhibit/scene.js';
import { judgeRating, allEvidence, fmt, RATING_LABELS } from '../engine/index.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const num = (v) => (v === null || v === undefined ? '—' : typeof v === 'number' ? (Math.abs(v) >= 100 ? Math.round(v).toLocaleString('en-US') : +v.toFixed(4)) : esc(v));

const figure = (v, unit) => `<bdi class="n" dir="ltr">${esc(fmt(v, unit))}</bdi>`;

function valueHtml(ev) {
  if (typeof ev.value === 'number' && ev.unitAr !== undefined) {
    return `${figure(ev.value, ev.unitAr)}${typeof ev.priorValue === 'number' ? ` <span class="prior">السنة السابقة ${figure(ev.priorValue, ev.unitAr)}</span>` : ''}`;
  }
  return esc(ev.displayAr);
}

function benchText(b, unit) {
  if (!b?.grade) return '';
  if (b.basis === 'sector') return `مقارنة بوسيط القطاع ${figure(b.median, unit)} (عدد الشركات ${b.n}، الترتيب المئوي ${Math.round(b.percentile)}).`;
  if (b.basis === 'reference') return 'مقارنة بالحدود المرجعية المعتادة؛ عينة القطاع أصغر من أربع شركات.';
  if (b.basis === 'model') return 'درجة النموذج الأكاديمي نفسه.';
  return 'قاعدة ثابتة معلنة.';
}

export function cardHtml(ev, vote) {
  const inputs = (ev.inputs ?? []).map((i) => `<li><span>${esc(i.labelAr)}</span><bdi class="n">${num(i.value)}</bdi>${i.src?.page ? `<span class="src">ص <bdi class="n">${i.src.page}</bdi></span>` : ''}${i.reasonAr ? `<p class="reason">${esc(i.reasonAr)}</p>` : ''}</li>`).join('');
  return `
    <p class="card-hall">${esc(HALL_TITLES[ev.hall] ?? '')}</p>
    <h2 class="card-title">${esc(ev.titleAr)}</h2>
    ${ev.displayAr || typeof ev.value === 'number' ? `<p class="card-value ${ev.severity === 'alert' ? 'is-alert' : ''}">${valueHtml(ev)}</p>` : ''}
    ${ev.benchmark?.grade ? `<p class="card-grade">الدرجة <span>${ev.benchmark.grade}</span> · ${benchText(ev.benchmark, ev.unitAr)}</p>` : ''}
    ${ev.quote ? `<blockquote class="card-quote">${esc(ev.quote)}${ev.page ? `<footer>ص <bdi class="n">${ev.page}</bdi></footer>` : ''}</blockquote>` : ''}
    ${ev.meaningAr ? `<p class="card-meaning">${esc(ev.meaningAr)}</p>` : ''}
    ${ev.prosecutionAr ? `<p class="card-pro"><strong>الادعاء:</strong> ${esc(ev.prosecutionAr)}</p>` : ''}
    ${ev.defenseAr ? `<p class="card-def"><strong>الدفاع:</strong> ${esc(ev.defenseAr)}</p>` : ''}
    <details class="card-calc"><summary>كيف حُسب</summary>
      <p class="formula">${esc(ev.formulaAr)}</p>${ev.basisAr ? `<p class="basis">${esc(ev.basisAr)}</p>` : ''}
      ${inputs ? `<ul class="inputs">${inputs}</ul>` : ''}
    </details>
    <div class="card-vote" role="group" aria-label="حكمك على هذا الدليل">
      <button type="button" data-vote="convincing" aria-pressed="${vote === 'convincing'}">مقنع</button>
      <button type="button" data-vote="unconvincing" aria-pressed="${vote === 'unconvincing'}">غير مقنع</button>
    </div>`;
}

export function mount(el, ctx) {
  const r = ctx.payload?.result;
  if (!r) return ctx.go('landing');
  const c = r.case;
  const layout = buildLayout(c);
  const rail = createRail(layout.stops);
  const votes = {};
  const byId = new Map(allEvidence(c).map((e) => [e.id, e]));
  if (c.surprise) byId.set(c.surprise.id, c.surprise);

  el.tabIndex = -1;
  el.innerHTML = `
    <div class="exhibit">
      <div class="exhibit-canvas" aria-hidden="true"></div>
      <header class="hud">
        <span class="hud-case">${esc(r.data.meta.nameAr)}</span>
        <span class="hud-hall" aria-live="polite"></span>
        <span class="hud-progress"><span></span></span>
      </header>
      <aside class="card" hidden tabindex="-1" aria-live="polite"></aside>
      <nav class="controls" aria-label="التنقل في المعرض">
        <button type="button" data-act="back">السابق</button>
        <button type="button" data-act="open">افتح الدليل</button>
        <button type="button" data-act="forward">التالي</button>
        <button type="button" data-act="verdict">إلى قاعة الحكم</button>
        <span class="keys">الأسهم أو W/S للتنقل · Enter لفتح الدليل · Esc للإغلاق</span>
      </nav>
      <div class="list2d" hidden></div>
    </div>`;

  const host = el.querySelector('.exhibit-canvas');
  const card = el.querySelector('.card');
  const hudHall = el.querySelector('.hud-hall');
  const prog = el.querySelector('.hud-progress span');
  let scene = null;

  const judge = () => judgeRating(c, votes);
  const finish = () => ctx.go('verdict', { result: r, votes: { ...votes }, judge: judge() });

  function showCard(id) {
    const ev = byId.get(id); if (!ev) return;
    card.innerHTML = cardHtml(ev, votes[id]);
    card.hidden = false;
    if (!ctx.reducedMotion) gsap.fromTo(card, { clipPath: 'inset(0% 0% 0% 100%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.64, ease: 'power3.out', clearProps: 'clipPath' });
    card.querySelectorAll('[data-vote]').forEach((b) => b.addEventListener('click', () => {
      votes[id] = votes[id] === b.dataset.vote ? undefined : b.dataset.vote;
      if (!votes[id]) delete votes[id];
      card.querySelectorAll('[data-vote]').forEach((x) => x.setAttribute('aria-pressed', String(votes[id] === x.dataset.vote)));
      scene?.markVote(id, votes[id]);
      scene?.setTilt(RATING_LABELS.indexOf(judge().label));
      if (votes[id] === 'convincing' && !ctx.reducedMotion) gsap.fromTo(b, { scale: 1.12 }, { scale: 1, duration: 0.24, ease: 'back.out(1.6)' });
    }));
    if (ev.severity === 'alert' && !ctx.reducedMotion) gsap.fromTo(card.querySelector('.card-value'), { x: -2 }, { x: 2, duration: 0.06, repeat: 5, yoyo: true, clearProps: 'x' });
    card.focus({ preventScroll: true });
  }
  const hideCard = () => { card.hidden = true; };

  function update() {
    const s = rail.stop;
    hudHall.textContent = HALL_TITLES[s.hallId];
    prog.style.transform = `scaleX(${rail.t})`;
    scene?.goTo(s);
    // keep the card on the opposite side of the slip being looked at
    card.classList.toggle('card--far', (s.target?.[0] ?? 0) > 0);
    if (s.evidenceId) showCard(s.evidenceId); else hideCard();
    if (s.hallId === 'verdict') {
      hideCard();
      scene?.setTilt(RATING_LABELS.indexOf(judge().label));
      el.querySelector('[data-act="verdict"]').textContent = 'اقرأ صك الحكم';
    }
  }

  function act(a) {
    if (a === 'forward') { if (rail.atEnd()) return finish(); rail.step(1); }
    else if (a === 'back') rail.step(-1);
    else if (a === 'open') { if (rail.stop.evidenceId) return showCard(rail.stop.evidenceId); if (rail.stop.hallId === 'verdict') return finish(); rail.step(1); }
    else if (a === 'close') return hideCard();
    else if (a === 'start') rail.jumpToHall('intro');
    else if (a === 'verdict') { if (rail.stop.hallId === 'verdict') return finish(); rail.jumpToHall('verdict'); }
    update();
  }

  el.querySelector('.controls').addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (b) act(b.dataset.act); });
  const onKey = (e) => {
    if (e.target.closest?.('details, summary')) return;
    const a = keyAction(e.key); if (!a) return;
    if ((a === 'open') && e.target.closest?.('button')) return; // let buttons handle Enter/Space
    e.preventDefault(); act(a);
  };
  window.addEventListener('keydown', onKey);

  const fallback = () => {
    scene?.dispose(); scene = null; host.remove();
    const list = el.querySelector('.list2d');
    list.hidden = false;
    list.innerHTML = layout.halls.filter((h) => h.id !== 'verdict').map((h) => `<section><h2>${h.titleAr}</h2>${h.empty ? '<p class="pencil-note">لا أدلة في هذه القاعة لهذا القطاع.</p>' : h.slots.map((s) => `<article class="card card--flat" data-ev="${s.evidenceId}">${cardHtml(byId.get(s.evidenceId))}</article>`).join('')}</section>`).join('');
    list.querySelectorAll('[data-ev]').forEach((a) => a.querySelectorAll('[data-vote]').forEach((b) => b.addEventListener('click', () => {
      votes[a.dataset.ev] = b.dataset.vote; a.querySelectorAll('[data-vote]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    })));
    el.querySelector('.controls').innerHTML = '<button type="button" data-act="verdict">اقرأ صك الحكم</button>';
    rail.jumpToHall('verdict');
  };

  if (webglAvailable()) {
    try {
      scene = createScene(host, layout, c, { reducedMotion: ctx.reducedMotion, onPick: (id) => { rail.jumpTo(id); update(); } });
      host.addEventListener('exhibit:lost', fallback, { once: true });
      scene.setTilt(RATING_LABELS.indexOf(c.rating.label));
    } catch { fallback(); }
  } else fallback();
  if (scene) update();

  return { unmount() { window.removeEventListener('keydown', onKey); scene?.dispose(); } };
}
