/**
 * Discrete rail through the exhibition: forward/back move one stop; jumpTo goes to an exhibit.
 * Pure state; the scene animates the camera between stop positions.
 */
export function createRail(stops) {
  let i = 0;
  const clamp = (n) => Math.max(0, Math.min(stops.length - 1, n));
  return {
    get index() { return i; },
    get stop() { return stops[i]; },
    get t() { return stops.length > 1 ? i / (stops.length - 1) : 0; },
    step(dir) { i = clamp(i + dir); return stops[i]; },
    jumpTo(evidenceId) { const k = stops.findIndex((s) => s.evidenceId === evidenceId); if (k >= 0) i = k; return stops[i]; },
    jumpToHall(hallId) { const k = stops.findIndex((s) => s.hallId === hallId); if (k >= 0) i = k; return stops[i]; },
    atEnd() { return i === stops.length - 1; },
  };
}

/** Keyboard map → rail action names (RTL-aware: ArrowLeft goes forward in a right-to-left reading). */
export function keyAction(key) {
  switch (key) {
    case 'ArrowUp': case 'w': case 'W': case 'ArrowLeft': case 'PageDown': return 'forward';
    case 'ArrowDown': case 's': case 'S': case 'ArrowRight': case 'PageUp': return 'back';
    case 'Enter': case ' ': return 'open';
    case 'Escape': return 'close';
    case 'Home': return 'start';
    case 'End': return 'verdict';
    default: return null;
  }
}
