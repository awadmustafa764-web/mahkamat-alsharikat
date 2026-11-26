# Plan 2 — Exhibition, Identity & Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Load `impeccable`, `build-awwwards-quality-sites`, `gsap-core`, `gsap-timeline`, `threejs-fundamentals`, `threejs-interaction` before the tasks that touch them. Steps use checkbox (`- [ ]`) syntax.

**Goal:** The four-stage experience (landing → case intake → loading/guess game → 3D exhibition → verdict deed) in the «ورق الأستاذ» identity, driven by the Plan-1 `Case`, working offline with the 5 preloaded companies. Live PDF upload is Plan 3; this plan stubs it behind the same interface.

**Architecture:** Vite static site, vanilla ES modules. A tiny stage router (`src/app/stages.js`) swaps full-screen DOM stages and owns transitions. The exhibition is one three.js scene (`src/exhibit/`) built from `Case.halls`; evidence cards are DOM overlays. All accounting comes from `src/engine` — the UI never computes a number.

**Tech Stack:** Vite 5, GSAP 3.13 (ScrollTrigger, CustomEase, DrawSVGPlugin), three.js r170, Lenis (landing only), pdf.js (cover page only, Plan 3 uses more), Vitest + happy-dom for UI logic tests.

**Spec:** `docs/superpowers/specs/2026-11-24-mahkamat-alsharikat-design.md` §5, §7, §8, §9.

## Global Constraints
- `dir="rtl"` `lang="ar"` on `<html>`; layout built RTL-first (no mirrored LTR CSS).
- Colour tokens exactly: `--paper #E3EBD8`, `--rule #7FA58E`, `--ink #1F3B4D`, `--close-red #C2272D` (totals, verdict, strike-through ONLY), `--pencil #6E6E68`, `--eraser #E9B8B0`. Text contrast ≥ WCAG AA.
- Fonts self-hosted in `public/fonts/` (woff2, subset Arabic+Latin digits): Aref Ruqaa (headings), Noto Naskh Arabic (body, line-height ≥ 1.7), IBM Plex Sans Arabic (numbers, `font-variant-numeric: tabular-nums`), Aref Ruqaa Ink (auditor notes, sparingly).
- Data numbers: Western digits via `fmt()` from the engine; negatives in accounting parentheses; numbers wrapped in `<bdi>`.
- Motion tokens: unit 80ms; micro 160, UI 320, reveal 640, stage 1280–1600ms; evidence reveal `power3.out`; counters 960ms `expo.out`; only the stamp/tick may overshoot: `back.out(1.6)` 240ms; transitions `CustomEase.create('ledger','M0,0 C0.7,0 0.2,1 1,1')`; anomaly shake 3× 2px 60ms.
- Banned (spec §7.5): purple gradients, neon, glassmorphism, identical cards, icon-library icons, emoji, fake counters, eyebrow labels, fade-up-everything, floating particles, spinners, typewriter text, elastic everywhere, magnetic buttons, scroll-jacking, bloom; copy: «اكتشف قوة»، «تجربة غامرة»، «رحلة»، «ليس فقط… بل»، exclamation marks، «عذراً! حدث خطأ»، «مدعوم بالذكاء الاصطناعي».
- `prefers-reduced-motion`: final states instantly; exhibition becomes click-to-jump. DPR cap 1.5; render loop pauses when tab hidden. Non-WebGL fallback: 2D evidence list with same content.
- Sound off by default; ≤ 6 clips, total < 120KB, CC0 or Web Audio synthesis.

## Review Focus
1. **Case with an empty hall** (e.g. bank has no efficiency evidence beyond one item; services has no inventory): hall still renders with its title and a one-line «لا أدلة في هذه القاعة لهذا القطاع» plaque, camera rail skips nothing. → Task 6 test `buildLayout keeps every hall, marks empty ones`.
2. **Very long Arabic titles/quotes** (KAM quotes ~40 words): card text wraps inside the card, no overflow, canvas textures not used for long text (DOM only). → Task 7 test `card clamps quote and shows page reference`.
3. **WebGL unavailable / context lost**: falls back to the 2D list without a blank screen. → Task 5 test `mountExhibit falls back when WebGL is missing`.
4. **Keyboard-only visitor**: Tab reaches every evidence and both verdict buttons; arrows/WASD move on the rail; Esc closes a card. → Task 6 test `keyboard map moves rail and opens nearest evidence`.
5. **Printing the deed on A4**: deed fits one page, red double rule visible, disclaimer present. → Task 9 test `deed markup contains disclaimer and both verdicts`.

---

## File Structure
```
index.html, vite.config.js (base: '/<repo>/')
public/fonts/*.woff2, public/sound/*.ogg, public/media/hero.mp4 (Plan 4), hero-poster.jpg
src/main.js                 boot, reduced-motion + WebGL detection
src/styles/tokens.css       colours, type scale, motion custom properties
src/styles/base.css         paper texture, ledger grid, print rules
src/app/stages.js           stage router + transition registry
src/app/caseSource.js       loadPreloaded(id) / analyzeUpload(file) (stub → Plan 3)
src/stages/landing.js       ruled page, pen-drawn title, CTA
src/stages/intake.js        envelope, pinned cover, sector confirm
src/stages/loading.js       real progress steps, columns, guess game, "=" hand-off
src/exhibit/scene.js        renderer, camera, lights, paper materials
src/exhibit/layout.js       buildLayout(case) -> halls, slots, rail spline (pure)
src/exhibit/controls.js     rail movement, look clamp, keyboard map (pure core)
src/exhibit/cards.js        DOM evidence card + verdict buttons
src/exhibit/scale.js        balance beam reacting to votes (judgeRating)
src/stages/verdict.js       verdict hall + printable deed
src/fallback/list2d.js      non-WebGL evidence list
src/motion/ease.js          CustomEase registration, shared timelines
src/sound/sfx.js            muted-by-default audio
tests/ui/*.test.js
```

### Task 1: Vite scaffold, tokens, fonts, base paper
- [ ] Add deps `vite gsap three lenis pdfjs-dist`, dev `happy-dom`; scripts `dev`, `build`, `preview`; vitest `environment: happy-dom` for `tests/ui`.
- [ ] `tokens.css` with the exact colours, type scale (clamp-based), motion vars; `base.css` with paper fibre (inline SVG noise, matte), ledger grid columns «البيان | مدين | دائن | الرصيد | الإحالة», print rules.
- [ ] Self-host the 4 fonts (download from Google Fonts CSS API at build time into `public/fonts`, subset).
- [ ] Test `tokens.css defines every colour token` (parse file, assert six hex values).
- [ ] Commit `feat(ui): vite scaffold, ledger tokens, fonts`.

### Task 2: Stage router + transitions
**Produces:** `createStages(root, {landing,intake,loading,exhibit,verdict})`, `go(name, payload)`, `onTransition(from,to,fn)`; each stage module exports `mount(el, ctx) -> {unmount, transitionOut?}`.
- [ ] Test: `go('intake')` unmounts landing, mounts intake, history state updated; reduced-motion → transitions resolve immediately.
- [ ] Commit.

### Task 3: Landing
- [ ] Pen draws the ledger rules (scaleX from right, stagger 80ms) then Aref Ruqaa title «من يحاكم الأرقام؟» via DrawSVG on outlined title paths (pre-generated SVG); two CTAs «قدّم القضية» (upload, disabled-with-note until Plan 3) and «القضايا الجاهزة» (5 cards as clipped paper slips, unequal sizes, slight rotation); links «كيف تأكدنا» and «ما لا يستطيع النموذج قوله» (static pages from Plan-1 docs).
- [ ] Hero video slot with poster + code fallback shader (fbm ink on paper) — video file arrives in Plan 4.
- [ ] Transition out: rules fold into an envelope (clip-path + rotationX).
- [ ] Test: CTAs exist, focusable, Arabic copy contains none of the banned phrases (shared `assertNoBannedCopy(el)` helper).

### Task 4: Intake + loading/guess game
**Consumes:** `caseSource.loadPreloaded(id)` → `{case, steps}`; `steps` = ordered `{id,labelAr}` the loader marks as they complete (preloaded: replayed with real computed checks, ~6s).
- [ ] Intake: envelope flap opens; cover image (pre-rendered PNG of page 1 for preloaded); stamp «مُستلَم» + timestamp; sector shown with confirm/change (change re-runs `analyze` with the chosen sector's rules only if valid).
- [ ] Loading: steps list (no spinner); numbers from `case.integrity` fly into two columns (assets | liabilities + equity) and count up; guess game from `case.guesses` — pencil answer stored in `ctx.guesses`.
- [ ] «=» moment: when both column totals are equal (integrity balance ok) draw "=", hand its two lines' screen coords to the exhibit (DOM→WebGL), dolly in 1600ms `ledger`.
- [ ] If `case.integrity.ok === false`: show the confirm table (expected vs actual, page) instead of proceeding.
- [ ] Tests: guesses rendered = `case.guesses.length`; integrity failure renders the table and blocks `go('exhibit')`.

### Task 5: Exhibition scene
- [ ] `mountExhibit(el, case, ctx)`: detect WebGL; on failure or `webglcontextlost` → `list2d`. Renderer DPR ≤ 1.5, sRGB, ACES tone-map, one soft key light + ambient, contact shadows (baked planes), matte paper walls made of giant folded ledger pages (procedural texture: rules + fibres), no bloom.
- [ ] Test (happy-dom, no WebGL): `mountExhibit falls back when WebGL is missing` → fallback list contains every evidence title.

### Task 6: Layout + rail controls (pure, fully tested)
**Produces:** `buildLayout(case) -> { halls:[{id,titleAr,empty,slots:[{evidenceId, position:[x,y,z], wall:'left'|'right'}]}], rail: [[x,y,z]...], stops:[{evidenceId,t}] }` — corridor along −z, halls in `HALLS` order then verdict; surprise placed last in disclosures hall; ≤ 6 slots per wall side, overflow extends the hall.
**Produces:** `createRail(stops) -> {t, step(dir), nearest(), jumpTo(id)}`; key map: ArrowUp/W forward, ArrowDown/S back, A/D and mouse look clamped ±25° yaw / ±10° pitch, Enter opens nearest card, Esc closes.
- [ ] Tests: `buildLayout keeps every hall, marks empty ones`; surprise is the final stop before verdict; `keyboard map moves rail and opens nearest evidence`; rail `t` stays in [0,1].

### Task 7: Evidence card + votes
- [ ] DOM card anchored to the exhibit (projected position), clip-path reveal from the right edge 640ms; shows title, `displayAr`, formula, basis, inputs with «ص <page>» source chips, benchmark («الوسيط … ، عدد الشركات n» or «حدود مرجعية»), meaning, prosecution/defence lines, guess reveal (pencil vs ink, eraser wipe), and two buttons «مقنع» (ink tick, stamp overshoot) / «غير مقنع» (red strike drawn 320ms).
- [ ] Anomaly cards shake once on reveal; surprise card arrives last with a pause (stillness principle).
- [ ] Tests: `card clamps quote and shows page reference`; voting calls `ctx.vote(id, value)` and updates `judgeRating`.

### Task 8: Balance beam
- [ ] Beam at corridor end tilts with `judgeRating(case, votes).points` vs model points (angle = clamp((judge − model) × 6°, −12°, 12°)); damped spring (3 decaying oscillations) on each vote.
- [ ] Test: angle function pure and clamped.

### Task 9: Verdict hall + printable deed
- [ ] Beam settles; deed sheet descends; red double rule drawn slowly under the label (DrawSVG 1100ms) + quill sound if enabled.
- [ ] Deed (A4, `@media print`): company, period, model label + 5 axis grades, judge label + `diffAr`, 3 strengths / 3 weaknesses with sources, 3 management questions, downgrades, confidence, DISCLAIMER, date. «طباعة / حفظ PDF» uses `window.print()`.
- [ ] Test: `deed markup contains disclaimer and both verdicts`.

### Task 10: Fallback list, reduced motion, sound, a11y pass
- [ ] `list2d` = same cards as a vertical ledger, same votes, same deed.
- [ ] Reduced-motion path verified; sound toggle (muted default) with 6 clips; focus order and aria labels in Arabic.
- [ ] Run the `impeccable` critique on every stage; fix all findings that touch the banned list or contrast.
- [ ] Commit `feat(ui): exhibition complete with fallback and accessibility`.
