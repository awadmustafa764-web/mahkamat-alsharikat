/**
 * Minimal stage router. Each stage module exports mount(el, ctx) -> { unmount?, transitionOut?(to) => Promise }.
 * One stage is mounted at a time; the outgoing stage may play its exit before the next mounts.
 */
export function createStages(root, stages, ctx = {}) {
  let current = null; // { name, el, api }

  async function go(name, payload = {}) {
    const def = stages[name];
    if (!def) throw new Error(`unknown stage: ${name}`);
    if (current?.api?.transitionOut && !ctx.reducedMotion) await current.api.transitionOut(name, payload);
    current?.api?.unmount?.();
    current?.el.remove();
    const el = document.createElement('section');
    el.className = `stage stage--${name}`;
    el.dataset.stage = name;
    root.append(el);
    const api = (await def.mount(el, { ...ctx, payload, go })) ?? {};
    current = { name, el, api };
    if (ctx.history !== false) history.pushState({ stage: name, payload }, '', `#${name}`);
    el.focus?.({ preventScroll: true });
    return api;
  }

  window.addEventListener('popstate', (e) => {
    const s = e.state?.stage;
    if (s && stages[s] && s !== current?.name) { ctx.history = false; go(s, e.state.payload).finally(() => { ctx.history = true; }); }
  });

  return { go, get current() { return current?.name ?? null; } };
}
