// Waiting game for the reading stage: catch income-statement entries in the ledger column while the reader works.
// Drawn on canvas in the «ورق الأستاذ» identity; sounds are synthesised (Web Audio), so there are no assets to load.

const C = { paper: '#E3EBD8', deep: '#D6E1C8', rule: '#7FA58E', ink: '#1F3B4D', soft: '#3A5566', red: '#C2272D', pencil: '#6E6E68', eraser: '#E9B8B0' };
const HAND = "'Aref Ruqaa', serif";
const FIG = "'IBM Plex Sans Arabic', sans-serif";

// Every entry is a real income-statement line; an expense is written in brackets, as on a statement.
const ENTRIES = [
  { kind: 'rev', labels: ['مبيعات', 'إيراد خدمات', 'إيراد عمولات'], value: 100, weight: 42, speed: [95, 145] },
  { kind: 'exp', labels: ['مصاريف إدارية', 'مصروف فوائد', 'مخصص ديون مشكوك فيها', 'مصروف إهلاك'], value: -150, weight: 30, speed: [110, 165] },
  { kind: 'inv', labels: ['إيراد استثمارات', 'توزيعات مقبوضة'], value: 250, weight: 19, speed: [120, 175] },
  { kind: 'gain', labels: ['ربح بيع أصل'], value: 400, weight: 9, speed: [140, 195] },
];

const amount = (v) => (v < 0 ? `(${Math.abs(v).toLocaleString('en-US')})` : v.toLocaleString('en-US'));

export function mountWaitGame(host, { reducedMotion = false } = {}) {
  host.innerHTML = `
    <div class="wg-head">
      <h2 class="wg-title">بينما يقرأ القارئ</h2>
      <p class="wg-lede">التقط الإيرادات والمكاسب في عمود الدفتر، واترك المصاريف تمرّ. الرصيد في الأسفل هو صافي ربحك.</p>
    </div>
    <div class="wg-board">
      <canvas class="wg-canvas" tabindex="0" aria-label="لعبة الانتظار: حرّك العمود بالسهمين أو بالسحب"></canvas>
      <div class="wg-cover">
        <button type="button" class="wg-start">ابدأ اللعب</button>
        <p class="wg-hint">بالسحب أو بالسهمين ← →</p>
      </div>
    </div>
    <dl class="wg-sheet" aria-live="off">
      <div><dt>الإيرادات والمكاسب</dt><dd class="wg-in">0</dd></div>
      <div><dt>المصاريف</dt><dd class="wg-out">0</dd></div>
      <div class="wg-net"><dt>صافي الربح</dt><dd class="wg-score">0</dd></div>
      <div class="wg-bestrow"><dt>أعلى صافي ربح</dt><dd class="wg-best">0</dd></div>
    </dl>
    <div class="wg-tools">
      <button type="button" class="wg-pause" hidden>إيقاف مؤقت</button>
      <button type="button" class="wg-mute" aria-pressed="false">كتم الصوت</button>
    </div>`;

  const canvas = host.querySelector('.wg-canvas');
  const ctx = canvas.getContext('2d');
  const cover = host.querySelector('.wg-cover');
  const startBtn = host.querySelector('.wg-start');
  const pauseBtn = host.querySelector('.wg-pause');
  const muteBtn = host.querySelector('.wg-mute');
  const out = { in: host.querySelector('.wg-in'), out: host.querySelector('.wg-out'), score: host.querySelector('.wg-score'), best: host.querySelector('.wg-best') };

  let W = 360, H = 320, running = false, paused = false, over = false, muted = false, raf = 0, last = 0, spawnT = 0;
  let income = 0, costs = 0, net = 0, best = 0;
  let items = [], marks = [], ticks = [];
  const keys = { left: false, right: false };
  const col = { x: 180, w: 96, h: 30, flash: 0, flashGood: true };

  try { best = parseInt(localStorage.getItem('mahkamat-wait-best') ?? '0', 10) || 0; } catch { best = 0; }
  out.best.textContent = amount(best);

  // ---- sound -----------------------------------------------------------------------------------------------------
  let audio = null;
  const ensureAudio = () => {
    if (muted) return null;
    try {
      audio ??= new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume().catch(() => {});
    } catch { audio = null; }
    return audio;
  };
  const tone = (freqFrom, freqTo, dur, type, gain) => {
    const a = ensureAudio(); if (!a) return;
    const t = a.currentTime, o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(freqFrom, t); o.frequency.exponentialRampToValueAtTime(freqTo, t + dur * 0.8);
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
  };
  const soundFor = (e) => (e.value < 0 ? tone(210, 120, 0.2, 'triangle', 0.08) : tone(e.value >= 400 ? 660 : e.value >= 250 ? 560 : 470, e.value >= 400 ? 990 : 760, 0.16, 'sine', 0.09));

  // ---- layout -----------------------------------------------------------------------------------------------------
  const resize = () => {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const prev = W;
    W = Math.max(240, r.width); H = Math.max(240, r.height);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    col.w = Math.min(120, Math.max(84, W * 0.24));
    col.x = clampX((col.x / prev) * W);
    draw();
  };
  const clampX = (x) => Math.max(col.w / 2 + 6, Math.min(W - col.w / 2 - 6, x));
  const colY = () => H - 26;

  // ---- entries ----------------------------------------------------------------------------------------------------
  const pick = () => {
    let roll = Math.random() * ENTRIES.reduce((s, e) => s + e.weight, 0);
    for (const e of ENTRIES) { roll -= e.weight; if (roll <= 0) return e; }
    return ENTRIES[0];
  };
  const spawn = () => {
    const e = pick();
    const label = e.labels[Math.floor(Math.random() * e.labels.length)];
    ctx.font = `700 15px ${HAND}`;
    const w = Math.max(78, ctx.measureText(label).width + 26);
    items.push({ e, label, w, h: 40, x: w / 2 + 6 + Math.random() * Math.max(10, W - w - 12), y: -24, vy: e.speed[0] + Math.random() * (e.speed[1] - e.speed[0]), tilt: (Math.random() - 0.5) * 0.06 });
  };

  const book = (it) => {
    const v = it.e.value;
    net += v;
    if (v >= 0) income += v; else costs += -v;
    out.in.textContent = amount(income);
    out.out.textContent = costs ? amount(-costs) : '0';
    out.score.textContent = amount(net);
    out.score.classList.toggle('is-loss', net < 0);
    if (net > best) {
      best = net; out.best.textContent = amount(best);
      try { localStorage.setItem('mahkamat-wait-best', String(best)); } catch { /* private mode: keep it for this visit */ }
    }
    marks.push({ x: it.x, y: colY() - 30, text: `${it.label} ${amount(v)}`, bad: v < 0, life: 0.9 });
    col.flash = 0.2; col.flashGood = v >= 0;
    soundFor(it.e);
  };

  // ---- loop -------------------------------------------------------------------------------------------------------
  const update = (dt) => {
    const speed = W * 1.05;
    if (keys.left) col.x -= speed * dt;
    if (keys.right) col.x += speed * dt;
    col.x = clampX(col.x);
    col.flash = Math.max(0, col.flash - dt);

    spawnT += dt;
    if (spawnT >= 0.95) { spawnT = 0; spawn(); }

    const top = colY() - col.h / 2;
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      it.y += it.vy * dt;
      const hitX = Math.abs(it.x - col.x) <= col.w / 2 + it.w / 2 - 10;
      const hitY = it.y + it.h / 2 >= top && it.y - it.h / 2 <= top + col.h;
      if (hitX && hitY) { book(it); items.splice(i, 1); continue; }
      if (it.y - it.h > H) {
        // An expense that slipped past is a small win: a tick in the margin.
        if (it.e.value < 0) ticks.push({ x: it.x, life: 0.6 });
        items.splice(i, 1);
      }
    }
    for (let i = marks.length - 1; i >= 0; i--) { marks[i].y -= 34 * dt; marks[i].life -= dt; if (marks[i].life <= 0) marks.splice(i, 1); }
    for (let i = ticks.length - 1; i >= 0; i--) { ticks[i].life -= dt; if (ticks[i].life <= 0) ticks.splice(i, 1); }
  };

  const drawPaper = () => {
    ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(127,165,142,0.45)'; ctx.lineWidth = 1;
    for (let y = 28; y < H; y += 28) { ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); ctx.stroke(); }
    // the ledger's red margin line on the right (RTL), as on a real sheet
    ctx.strokeStyle = 'rgba(194,39,45,0.35)';
    ctx.beginPath(); ctx.moveTo(W - 30.5, 0); ctx.lineTo(W - 30.5, H); ctx.stroke();
  };

  const drawEntry = (it) => {
    const bad = it.e.value < 0;
    ctx.save();
    ctx.translate(it.x, it.y); ctx.rotate(it.tilt);
    ctx.fillStyle = bad ? '#F2E4DF' : '#F4F7EF';
    ctx.strokeStyle = bad ? C.eraser : C.rule; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.rect(-it.w / 2, -it.h / 2, it.w, it.h); ctx.fill(); ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = bad ? C.pencil : C.ink;
    ctx.font = `700 15px ${HAND}`; ctx.fillText(it.label, 0, -7);
    ctx.font = `600 12px ${FIG}`; ctx.fillStyle = bad ? C.pencil : C.soft;
    ctx.fillText(amount(it.e.value), 0, 11);
    ctx.restore();
  };

  const drawColumn = () => {
    const y = colY(), l = col.x - col.w / 2, t = y - col.h / 2;
    ctx.save();
    ctx.fillStyle = col.flash > 0 ? (col.flashGood ? '#D6E1C8' : '#F1D7D1') : '#EEF3E6';
    ctx.fillRect(l, t, col.w, col.h);
    ctx.strokeStyle = C.ink; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(l, t); ctx.lineTo(l, t + col.h); ctx.moveTo(l + col.w, t); ctx.lineTo(l + col.w, t + col.h); ctx.stroke();
    // the total's double rule in closing red: this column is where the profit is closed
    ctx.strokeStyle = C.red; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(l, t + col.h - 4); ctx.lineTo(l + col.w, t + col.h - 4); ctx.moveTo(l, t + col.h); ctx.lineTo(l + col.w, t + col.h); ctx.stroke();
    ctx.fillStyle = C.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `700 14px ${FIG}`;
    ctx.fillText(amount(net), col.x, y - 2);
    ctx.restore();
  };

  const draw = () => {
    drawPaper();
    items.forEach(drawEntry);
    ticks.forEach((k) => { ctx.globalAlpha = Math.max(0, k.life / 0.6); ctx.fillStyle = C.rule; ctx.font = `700 16px ${FIG}`; ctx.textAlign = 'center'; ctx.fillText('✓', k.x, H - 6); ctx.globalAlpha = 1; });
    drawColumn();
    marks.forEach((m) => {
      ctx.globalAlpha = Math.max(0, m.life / 0.9);
      ctx.font = `700 14px ${HAND}`; ctx.textAlign = 'center'; ctx.fillStyle = m.bad ? C.red : C.ink;
      ctx.fillText(m.text, m.x, m.y);
      ctx.globalAlpha = 1;
    });
  };

  const loop = (ts) => {
    if (!last) last = ts;
    const dt = Math.min(0.05, (ts - last) / 1000); last = ts;
    if (running && !paused && !over) update(dt);
    draw();
    raf = running && !over ? requestAnimationFrame(loop) : 0;
  };

  const start = () => {
    ensureAudio();
    running = true; paused = false; cover.hidden = true; pauseBtn.hidden = false;
    canvas.focus({ preventScroll: true });
    last = 0; spawn();
    if (!raf) raf = requestAnimationFrame(loop);
  };

  // ---- input ------------------------------------------------------------------------------------------------------
  const toX = (clientX) => { const r = canvas.getBoundingClientRect(); col.x = clampX(clientX - r.left); };
  let dragging = false;
  canvas.addEventListener('pointerdown', (e) => { if (!running || paused || over) return; dragging = true; canvas.setPointerCapture?.(e.pointerId); toX(e.clientX); });
  canvas.addEventListener('pointermove', (e) => { if ((dragging || e.pointerType === 'mouse') && running && !paused && !over) toX(e.clientX); });
  const stopDrag = () => { dragging = false; };
  canvas.addEventListener('pointerup', stopDrag); canvas.addEventListener('pointercancel', stopDrag);
  // Arrows act only while the board has focus, so the page still scrolls normally everywhere else.
  canvas.addEventListener('keydown', (e) => {
    if (!running || over) return;
    if (e.key === 'ArrowLeft') { keys.left = true; e.preventDefault(); }
    if (e.key === 'ArrowRight') { keys.right = true; e.preventDefault(); }
    if (e.key === ' ' || e.key === 'Escape') { togglePause(); e.preventDefault(); }
  });
  canvas.addEventListener('keyup', (e) => { if (e.key === 'ArrowLeft') keys.left = false; if (e.key === 'ArrowRight') keys.right = false; });
  canvas.addEventListener('blur', () => { keys.left = keys.right = false; });

  const togglePause = () => {
    if (!running || over) return;
    paused = !paused; keys.left = keys.right = false;
    pauseBtn.textContent = paused ? 'متابعة اللعب' : 'إيقاف مؤقت';
  };
  startBtn.addEventListener('click', start);
  pauseBtn.addEventListener('click', togglePause);
  muteBtn.addEventListener('click', () => { muted = !muted; muteBtn.textContent = muted ? 'تشغيل الصوت' : 'كتم الصوت'; muteBtn.setAttribute('aria-pressed', String(muted)); });
  // A hidden tab pauses the game instead of letting entries pile up.
  const onHide = () => { if (document.hidden && running && !paused && !over) togglePause(); };
  document.addEventListener('visibilitychange', onHide);
  const ro = new ResizeObserver(resize); ro.observe(canvas);
  if (reducedMotion) host.classList.add('is-reduced');
  resize();

  return {
    /** The reading is done: close the books and say so on the board, without taking the visitor away. */
    finish(message) {
      over = true; keys.left = keys.right = false; pauseBtn.hidden = true;
      draw();
      cover.hidden = false;
      cover.innerHTML = `<p class="wg-done">${message}</p><p class="wg-final">صافي ربحك أثناء الانتظار: <bdi class="n">${amount(net)}</bdi></p>`;
      if (running) tone(523, 784, 0.35, 'triangle', 0.08);
    },
    destroy() { cancelAnimationFrame(raf); ro.disconnect(); document.removeEventListener('visibilitychange', onHide); audio?.close?.().catch(() => {}); },
  };
}
