import * as THREE from 'three';
import { gsap } from 'gsap';
import { GEOM } from './layout.js';
import { fmt } from '../engine/texts.js';

const C = { paper: '#E3EBD8', paperDeep: '#D2DDC3', rule: '#7FA58E', ink: '#1F3B4D', red: '#C2272D', pencil: '#6E6E68', brass: '#A8844E' };

export function webglAvailable() {
  try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); } catch { return false; }
}

/* ---------------- textures drawn on canvas (no generated imagery) ---------------- */

function ledgerTexture(repeatX) {
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 1024;
  const g = cv.getContext('2d');
  g.fillStyle = C.paper; g.fillRect(0, 0, 1024, 1024);
  // fibres
  for (let i = 0; i < 2600; i++) {
    g.strokeStyle = `rgba(31,59,77,${Math.random() * 0.05})`; g.lineWidth = Math.random() * 1.2;
    const x = Math.random() * 1024, y = Math.random() * 1024, l = 4 + Math.random() * 18, a = Math.random() * Math.PI;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
  // horizontal ledger rules
  g.strokeStyle = 'rgba(127,165,142,0.55)'; g.lineWidth = 2;
  for (let y = 40; y < 1024; y += 48) { g.beginPath(); g.moveTo(0, y); g.lineTo(1024, y); g.stroke(); }
  // column rules + red double margin
  g.strokeStyle = 'rgba(127,165,142,0.8)';
  for (const x of [220, 520, 760]) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 1024); g.stroke(); }
  g.strokeStyle = 'rgba(194,39,45,0.75)'; g.lineWidth = 2.5;
  for (const x of [930, 942]) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 1024); g.stroke(); }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeatX, 1); t.anisotropy = 8;
  return t;
}

function wrapLines(g, text, maxW) {
  const words = String(text).split(' '); const lines = []; let line = '';
  for (const w of words) { const test = line ? `${line} ${w}` : w; if (g.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test; }
  if (line) lines.push(line);
  return lines;
}

function slipCanvas(ev, vote) {
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 700;
  const g = cv.getContext('2d');
  g.fillStyle = '#F4F7EF'; g.fillRect(0, 0, 1024, 700);
  g.strokeStyle = 'rgba(127,165,142,0.45)'; g.lineWidth = 2;
  for (let y = 150; y < 700; y += 64) { g.beginPath(); g.moveTo(40, y); g.lineTo(984, y); g.stroke(); }
  g.direction = 'rtl'; g.textAlign = 'right'; g.fillStyle = C.ink;
  g.font = '700 64px "Aref Ruqaa"';
  wrapLines(g, ev.titleAr, 900).slice(0, 2).forEach((l, i) => g.fillText(l, 970, 110 + i * 74));
  g.fillStyle = ev.severity === 'alert' ? C.red : C.ink;
  if (typeof ev.value === 'number' && ev.unitAr !== undefined) {
    // figures are drawn left-to-right so "%" and parentheses stay where an accountant expects them
    g.direction = 'ltr'; g.textAlign = 'right';
    g.font = '500 92px "IBM Plex Sans Arabic"'; g.fillText(fmt(ev.value, ev.unitAr), 970, 360);
    if (typeof ev.priorValue === 'number') { g.font = '400 40px "IBM Plex Sans Arabic"'; g.fillStyle = C.pencil; g.fillText(fmt(ev.priorValue, ev.unitAr), 970, 430); }
    g.direction = 'rtl';
  } else {
    g.font = '500 46px "IBM Plex Sans Arabic"';
    wrapLines(g, ev.displayAr || '', 900).slice(0, 3).forEach((l, i) => g.fillText(l, 970, 330 + i * 64));
  }
  if (ev.benchmark?.grade) {
    g.font = '700 120px "Aref Ruqaa"'; g.textAlign = 'left'; g.fillStyle = ev.benchmark.grade >= 'D' ? C.red : C.ink;
    g.fillText(ev.benchmark.grade, 60, 640);
  }
  if (vote === 'convincing') { // ink tick
    g.strokeStyle = C.ink; g.lineWidth = 14; g.lineCap = 'round';
    g.beginPath(); g.moveTo(780, 560); g.lineTo(830, 620); g.lineTo(950, 480); g.stroke();
  } else if (vote === 'unconvincing') { // red strike
    g.strokeStyle = C.red; g.lineWidth = 10; g.lineCap = 'round';
    g.beginPath(); g.moveTo(60, 620); g.lineTo(980, 90); g.stroke();
  }
  return cv;
}

function labelTexture(text, { w = 2048, h = 300, size = 150, color = C.ink, font = 'Aref Ruqaa' } = {}) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const g = cv.getContext('2d');
  g.direction = 'rtl'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = color;
  g.font = `700 ${size}px "${font}"`; g.fillText(text, w / 2, h / 2);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/* ---------------- procedural brass balance ---------------- */

function brassScale() {
  const brass = new THREE.MeshStandardMaterial({ color: C.brass, metalness: 0.85, roughness: 0.38 });
  const dark = new THREE.MeshStandardMaterial({ color: '#2B3A33', metalness: 0.2, roughness: 0.8 });
  const root = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.9, 0.18, 48), dark); base.position.y = 0.09; base.castShadow = true;
  const step = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.55, 0.14, 48), brass); step.position.y = 0.25;
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 2.3, 24), brass); pillar.position.y = 1.45; pillar.castShadow = true;
  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.11, 24, 16), brass); finial.position.y = 2.68;
  const beam = new THREE.Group(); beam.position.y = 2.55;
  const bar = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.07, 0.07), brass); bar.castShadow = true; beam.add(bar);
  const needle = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.45, 12), brass); needle.position.y = 0.26; beam.add(needle);
  const pans = [];
  for (const side of [1, -1]) {
    const hang = new THREE.Group(); hang.position.x = side * 1.25; beam.add(hang);
    const pan = new THREE.Group(); pan.position.y = -1.05; hang.add(pan);
    const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.3, 0.07, 40, 1, true), brass); dish.material.side = THREE.DoubleSide; dish.castShadow = true;
    const floor = new THREE.Mesh(new THREE.CircleGeometry(0.3, 40), brass); floor.rotation.x = -Math.PI / 2; floor.position.y = -0.03;
    pan.add(dish, floor);
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2;
      const pts = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(Math.cos(a) * 0.4, -1.03, Math.sin(a) * 0.4)];
      hang.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: '#7A6036' })));
    }
    pans.push(hang);
  }
  root.add(base, step, pillar, finial, beam);
  return { root, beam, pans };
}

/* ---------------- scene ---------------- */

export function createScene(canvasHost, layout, caseObj, { reducedMotion, onPick }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  canvasHost.append(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(C.paperDeep);
  scene.fog = new THREE.Fog(C.paperDeep, 9, 34);

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
  const look = new THREE.Vector3();

  scene.add(new THREE.HemisphereLight('#F4F7EF', '#9DB59F', 1.35));
  const key = new THREE.DirectionalLight('#FFF6E6', 1.6);
  key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.camera.near = 1; key.shadow.camera.far = 40;
  key.shadow.camera.left = -8; key.shadow.camera.right = 8; key.shadow.camera.top = 8; key.shadow.camera.bottom = -8;
  scene.add(key, key.target);

  // corridor: walls are giant ledger pages, folded at every slot
  const { halfWidth: W } = GEOM;
  const len = layout.length + 10;
  const wallMat = new THREE.MeshStandardMaterial({ map: ledgerTexture(len / 4.2), roughness: 0.95 });
  for (const side of [1, -1]) {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(len, 4.6), wallMat);
    wall.position.set(side * (W + 0.25), 2.3, -len / 2 + 6);
    wall.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    wall.receiveShadow = true; scene.add(wall);
  }
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W * 2 + 1, len), new THREE.MeshStandardMaterial({ color: '#C9D6BA', roughness: 1 }));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -len / 2 + 6); floor.receiveShadow = true; scene.add(floor);
  // folds: thin vertical ribs where pages meet
  const ribMat = new THREE.MeshStandardMaterial({ color: '#CBD8BD', roughness: 0.9 });
  for (let z = 2; z > -len + 6; z -= GEOM.slotGap) {
    for (const side of [1, -1]) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.12, 4.6, 0.05), ribMat);
      rib.position.set(side * (W + 0.18), 2.3, z); rib.castShadow = true; scene.add(rib);
    }
  }

  // hall plaques hanging across the corridor
  for (const h of layout.halls) {
    const plaque = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 0.68), new THREE.MeshBasicMaterial({ map: labelTexture(h.titleAr), transparent: true }));
    plaque.position.set(0, 3.55, h.z0 - 0.4); scene.add(plaque);
    if (h.empty) {
      const note = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.35), new THREE.MeshBasicMaterial({ map: labelTexture('لا أدلة في هذه القاعة لهذا القطاع', { size: 90, color: C.pencil, font: 'Noto Naskh Arabic' }), transparent: true }));
      note.position.set(0, 1.7, h.z0 - 2); scene.add(note);
    }
  }

  // evidence slips pinned to the walls
  const byId = new Map(Object.values(caseObj.halls).flat().map((e) => [e.id, e]));
  if (caseObj.surprise) byId.set(caseObj.surprise.id, caseObj.surprise);
  const slips = new Map();
  const pickables = [];
  for (const h of layout.halls) for (const s of h.slots) {
    const ev = byId.get(s.evidenceId); if (!ev) continue;
    const tex = new THREE.CanvasTexture(slipCanvas(ev)); tex.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.75, 1.2), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92 }));
    const [x, y, z] = s.position;
    mesh.position.set(x > 0 ? x - 0.02 : x + 0.02, y + 0.15, z);
    mesh.rotation.y = x > 0 ? -Math.PI / 2 : Math.PI / 2;
    mesh.rotation.z = ((z * 7.3) % 1) * 0.06 - 0.03; // slightly crooked, like real slips
    mesh.castShadow = true; mesh.userData.evidenceId = ev.id;
    const pin = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), new THREE.MeshStandardMaterial({ color: ev.severity === 'alert' ? C.red : ev.severity === 'watch' ? C.pencil : C.brass, metalness: 0.5, roughness: 0.4 }));
    pin.position.set(0, 0.5, 0.03); mesh.add(pin);
    scene.add(mesh); slips.set(ev.id, { mesh, tex, ev }); pickables.push(mesh);
  }

  // verdict hall: the balance and its two pans' labels
  const vh = layout.halls.at(-1);
  const scale = brassScale();
  scale.root.position.set(0, 0, vh.z0 - 6);
  scene.add(scale.root);
  for (const [side, text, color] of [[1, 'استثمر', C.ink], [-1, 'لا تستثمر', C.red]]) {
    const l = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.25), new THREE.MeshBasicMaterial({ map: labelTexture(text, { size: 160, color }), transparent: true }));
    l.position.set(side * 1.25, 0.55, vh.z0 - 5.2); scene.add(l);
  }
  key.position.set(2, 7, 4); key.target.position.set(0, 0, 0);

  /* camera */
  const first = layout.stops[0];
  camera.position.set(...first.position); look.set(...first.target);
  const mouse = { x: 0, y: 0 };
  const onMove = (e) => { const r = renderer.domElement.getBoundingClientRect(); mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1; mouse.y = ((e.clientY - r.top) / r.height) * 2 - 1; };
  renderer.domElement.addEventListener('pointermove', onMove);

  const ray = new THREE.Raycaster(); const ndc = new THREE.Vector2();
  const onClick = (e) => {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(pickables, false)[0];
    if (hit) onPick?.(hit.object.userData.evidenceId);
  };
  renderer.domElement.addEventListener('click', onClick);

  function goTo(stop) {
    key.position.set(stop.position[0] + 2, 7, stop.position[2] + 3); key.target.position.set(stop.target[0], 0, stop.target[2]);
    const d = reducedMotion ? 0 : 1.28;
    gsap.to(camera.position, { x: stop.position[0], y: stop.position[1], z: stop.position[2], duration: d, ease: 'power3.inOut' });
    gsap.to(look, { x: stop.target[0], y: stop.target[1], z: stop.target[2], duration: d, ease: 'power3.inOut' });
  }

  let tiltNow = 0;
  function setTilt(verdictIndex) {
    // Follows the final verdict (after audit downgrades): استثمر → … → لا تستثمر.
    const target = [0.24, 0.09, -0.09, -0.24][verdictIndex] ?? 0;
    if (Math.abs(target - tiltNow) < 1e-4) return;
    tiltNow = target;
    gsap.to(scale.beam.rotation, { z: -target, duration: reducedMotion ? 0 : 2.2, ease: 'elastic.out(1, 0.32)' });
    for (const p of scale.pans) gsap.to(p.rotation, { z: target, duration: reducedMotion ? 0 : 2.2, ease: 'elastic.out(1, 0.32)' });
  }

  function markVote(evidenceId, vote) {
    const s = slips.get(evidenceId); if (!s) return;
    s.tex.image = slipCanvas(s.ev, vote); s.tex.needsUpdate = true;
  }

  function resize() {
    const w = canvasHost.clientWidth || window.innerWidth, h = canvasHost.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  resize();
  const ro = new ResizeObserver(resize); ro.observe(canvasHost);

  let raf = 0, running = true;
  const tmp = new THREE.Vector3();
  const tick = () => {
    if (!running) return;
    raf = requestAnimationFrame(tick);
    // bounded look-around: ±25° yaw, ±10° pitch
    tmp.copy(look);
    const yaw = -mouse.x * 0.44, pitch = -mouse.y * 0.17;
    const dir = tmp.sub(camera.position);
    dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
    dir.y += pitch * dir.length();
    camera.lookAt(camera.position.clone().add(dir));
    renderer.render(scene, camera);
  };
  const onVis = () => { if (document.hidden) { running = false; cancelAnimationFrame(raf); } else if (!running) { running = true; tick(); } };
  document.addEventListener('visibilitychange', onVis);
  renderer.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); running = false; canvasHost.dispatchEvent(new CustomEvent('exhibit:lost')); });
  tick();

  return {
    goTo, setTilt, markVote, resize,
    dispose() {
      running = false; cancelAnimationFrame(raf); ro.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      renderer.domElement.removeEventListener('pointermove', onMove);
      renderer.domElement.removeEventListener('click', onClick);
      scene.traverse((o) => { o.geometry?.dispose?.(); const m = o.material; (Array.isArray(m) ? m : m ? [m] : []).forEach((x) => { x.map?.dispose?.(); x.dispose?.(); }); });
      renderer.dispose(); renderer.domElement.remove();
    },
  };
}
