// The studio drawer, the live meters, the toast and the vibe-variant boxes.

import { signals, liveHover, elapsed, summarise, resetSignals } from './signals';
import { engine, evidence, setProfile, setPaused, resetEngine, PROFILES, PROFILE_NAMES, type Profile } from './profiles';
import { SHAPES, applyShape, currentShape, type Shape } from './reshape';
import { match, type Variant } from './vibe';
import { saveRun, saveVariant, storageAvailable } from './library';
import { stopScroll } from './motion';

const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel);
const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => [...root.querySelectorAll<T>(sel)];

let lastPrompt = '';
let lastVariant: Variant | null = null;

/* ---------- Meters ---------- */

const s1 = (ms: number) => `${(ms / 1000).toFixed(1)} s`;

function meterRows() {
  return [
    { key: 'speed', label: 'Scroll speed', value: `${Math.round(signals.scrollSpeed)} px/s`, ratio: signals.scrollSpeed / 3000 },
    { key: 'depth', label: 'Deepest point', value: `${Math.round(signals.maxDepth * 100)} %`, ratio: signals.maxDepth },
    { key: 'code', label: 'Code: hover / in view', value: `${s1(liveHover('code'))} / ${s1(signals.dwell.code)}`, ratio: (liveHover('code') + signals.dwell.code * 0.3) / 15000 },
    { key: 'pricing', label: 'Pricing: hover / in view', value: `${s1(liveHover('pricing'))} / ${s1(signals.dwell.pricing)}`, ratio: (liveHover('pricing') + signals.dwell.pricing * 0.3) / 15000 },
    {
      key: 'reading',
      label: 'Explain, FAQ, limits in view',
      value: s1(signals.dwell.explain + signals.dwell.faq + signals.dwell.limits),
      ratio: (signals.dwell.explain + signals.dwell.faq + signals.dwell.limits) / 60000,
    },
    { key: 'toggle', label: 'Billing toggle', value: `${signals.billingToggles}x`, ratio: signals.billingToggles / 4 },
    { key: 'device', label: 'Device', value: signals.coarse ? 'Touch' : 'Mouse or trackpad', ratio: -1 },
  ];
}

function renderMeters(root: HTMLElement) {
  const rows = meterRows();
  if (!root.dataset.built) {
    root.dataset.built = '1';
    root.innerHTML = rows
      .map(
        (r) => `<div class="meter" data-m="${r.key}">
          <div class="meter-top"><span class="meter-label">${r.label}</span><span class="meter-val mono"></span></div>
          ${r.ratio >= 0 ? '<div class="meter-track" aria-hidden="true"><span class="meter-fill"></span></div>' : ''}
        </div>`,
      )
      .join('');
  }
  rows.forEach((r) => {
    const row = $(`[data-m="${r.key}"]`, root);
    if (!row) return;
    $('.meter-val', row)!.textContent = r.value;
    const fill = $('.meter-fill', row);
    if (fill) fill.style.transform = `scaleX(${Math.max(0.01, Math.min(1, r.ratio))})`;
  });
}

function renderScores(root: HTMLElement) {
  const max = Math.max(4, ...PROFILES.map((p) => engine.scores[p]));
  if (!root.dataset.built) {
    root.dataset.built = '1';
    root.innerHTML = PROFILES.map(
      (p) => `<div class="score" data-p="${p}">
        <div class="meter-top"><span class="meter-label">${PROFILE_NAMES[p]}</span><span class="meter-val mono"></span></div>
        <div class="meter-track" aria-hidden="true"><span class="meter-fill"></span></div>
      </div>`,
    ).join('');
  }
  PROFILES.forEach((p) => {
    const row = $(`[data-p="${p}"]`, root)!;
    const win = engine.profile === p;
    row.classList.toggle('is-winner', win);
    $('.meter-val', row)!.textContent = `${engine.scores[p].toFixed(1)}${win ? ' · active' : ''}`;
    $<HTMLElement>('.meter-fill', row)!.style.transform = `scaleX(${Math.max(0.01, engine.scores[p] / max)})`;
  });
}

function profileText() {
  const s = currentShape();
  if (s === 'mobile') return 'Mobile-short variant';
  return PROFILE_NAMES[s];
}

function statusText() {
  if (engine.paused) return engine.privacySignal ? 'Paused: your browser asks not to be tracked' : 'Paused';
  if (engine.source === 'replay') return 'Replaying';
  if (engine.source === 'variant') return 'Previewing a variant';
  const left = Math.max(0, 8 - elapsed() / 1000);
  if (left > 0) return `Watching. First decision in ${Math.ceil(left)} s`;
  return 'Adapting';
}

export function reasons(): string[] {
  const s = currentShape();
  const out: string[] = [];
  if (engine.source === 'replay' && s !== 'default') {
    out.push(`You chose "Replay as ${PROFILE_NAMES[s as Profile]}" in the studio, so the page shows that shape until you reset.`);
  } else if (engine.source === 'variant') {
    out.push(`You previewed the ${lastVariant?.name ?? 'variant'}${lastPrompt ? ` from "${lastPrompt}"` : ''}.`);
  } else if (s === 'default') {
    const top = [...PROFILES].sort((a, b) => engine.scores[b] - engine.scores[a]);
    out.push(
      engine.scores[top[0]] < 3
        ? 'Not enough signal yet. Shapewell waits for a clear pattern before changing anything.'
        : `${PROFILE_NAMES[top[0]]} leads with ${engine.scores[top[0]].toFixed(1)}, but not by 25 % over ${PROFILE_NAMES[top[1]]} (${engine.scores[top[1]].toFixed(1)}), so the page stays as it is.`,
    );
  } else if (s !== 'mobile') {
    evidence(s as Profile)
      .slice(0, 3)
      .forEach((r) => out.push(r.text));
  }
  SHAPES[s].layout.forEach((l) => out.push(l));
  if (s !== 'default') out.push(`Sub-headline now reads: "${SHAPES[s].sub}"`, `Main button now says "${SHAPES[s].cta}".`);
  return out;
}

function renderReasons(root: HTMLElement) {
  const items = reasons();
  const html = items.map((t) => `<li>${escapeHtml(t)}</li>`).join('');
  if (root.dataset.html !== html) {
    root.dataset.html = html;
    root.innerHTML = html;
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

function renderAll() {
  $$('[data-meters]').forEach(renderMeters);
  $$('[data-scores]').forEach(renderScores);
  $$('[data-reasons]').forEach(renderReasons);
  $$('[data-current-profile]').forEach((el) => (el.textContent = profileText()));
  $$('[data-engine-status]').forEach((el) => (el.textContent = statusText()));
  const s = currentShape();
  $$('[data-reader]').forEach((el) => el.classList.toggle('is-you', el.dataset.reader === s));
  $$<HTMLButtonElement>('[data-replay]').forEach((b) => b.setAttribute('aria-pressed', String(engine.source === 'replay' && b.dataset.replay === s)));
  $$('[data-pause]').forEach((b) => b.setAttribute('aria-checked', String(engine.paused)));
  $$('[data-privacy-note]').forEach((n) => (n.hidden = !engine.privacySignal));
}

/* ---------- Drawer ---------- */

let lastFocus: HTMLElement | null = null;
const studio = () => $('#studio');
const isDocked = () => document.documentElement.classList.contains('studio-docked');

export function openStudio() {
  const el = studio();
  if (!el || el.classList.contains('is-open')) return;
  lastFocus = document.activeElement as HTMLElement;
  el.hidden = false;
  requestAnimationFrame(() => el.classList.add('is-open'));
  el.setAttribute('aria-modal', String(!isDocked()));
  if (!isDocked()) {
    $('#studio-backdrop')!.hidden = false;
    stopScroll(true);
    document.documentElement.classList.add('studio-lock');
  }
  $$('[data-open-studio]').forEach((b) => b.setAttribute('aria-expanded', 'true'));
  renderAll();
  if (!isDocked()) setTimeout(() => $<HTMLElement>('[data-close-studio]', el)?.focus(), 50);
}

export function closeStudio() {
  const el = studio();
  if (!el || !el.classList.contains('is-open')) return;
  el.classList.remove('is-open');
  $('#studio-backdrop')!.hidden = true;
  stopScroll(false);
  document.documentElement.classList.remove('studio-lock', 'studio-docked');
  $$('[data-open-studio]').forEach((b) => b.setAttribute('aria-expanded', 'false'));
  setTimeout(() => {
    if (!el.classList.contains('is-open')) el.hidden = true;
  }, 400);
  const back = lastFocus && lastFocus !== document.body && !el.contains(lastFocus) ? lastFocus : $('[data-open-studio]');
  back?.focus?.();
}

function trapFocus(e: KeyboardEvent) {
  const el = studio();
  if (!el?.classList.contains('is-open') || isDocked() || e.key !== 'Tab') return;
  const items = $$<HTMLElement>(
    'a[href], button:not([disabled]), input:not([disabled]), textarea, [tabindex]:not([tabindex="-1"])',
    el,
  ).filter((n) => n.offsetParent !== null);
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (!el.contains(document.activeElement)) {
    e.preventDefault();
    first.focus();
  } else if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

function onKey(e: KeyboardEvent) {
  const t = e.target as HTMLElement;
  const typing = t.closest('input, textarea, select, [contenteditable="true"]');
  if (e.key === 'Escape') {
    if (studio()?.classList.contains('is-open')) closeStudio();
    return;
  }
  if (!typing && !e.metaKey && !e.ctrlKey && !e.altKey && (e.key === 'k' || e.key === 'K')) {
    e.preventDefault();
    if (studio()?.classList.contains('is-open')) closeStudio();
    else openStudio();
  }
  trapFocus(e);
}

/* ---------- Toast ---------- */

let toastTimer: number | undefined;
export function toast(text: string, withWhy = false) {
  const el = $('#toast');
  if (!el) return;
  $('[data-toast-text]', el)!.textContent = text;
  $('[data-toast-why]', el)!.hidden = !withWhy;
  el.hidden = false;
  requestAnimationFrame(() => el.classList.add('is-on'));
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(hideToast, 7000);
}
function hideToast() {
  const el = $('#toast');
  if (!el) return;
  el.classList.remove('is-on');
  setTimeout(() => {
    if (!el.classList.contains('is-on')) el.hidden = true;
  }, 300);
}

/* ---------- Actions ---------- */

function replay(p: Profile) {
  setProfile(p, 'replay');
}

function reset() {
  resetSignals();
  resetEngine();
  lastVariant = null;
  setProfile('default', 'auto');
  // allow automatic adapting again right away after the warm-up
  engine.lockedUntil = 0;
  renderAll();
  flash('[data-save-status]', 'Reset. Signals cleared and the page is back to default.');
}

function flash(sel: string, text: string) {
  $$(sel).forEach((el) => {
    el.textContent = text;
  });
}

function saveThisRun() {
  saveRun({
    profile: currentShape(),
    page: location.pathname,
    summary: summarise(),
    reasons: reasons(),
  });
  flash(
    '[data-save-status]',
    storageAvailable() ? 'Saved to your library on this device.' : 'Saved for this visit only. Your browser blocks storage.',
  );
}

/* ---------- Vibe boxes ---------- */

function renderRule(box: HTMLElement, v: Variant | null) {
  const out = $('[data-vibe-out]', box)!;
  const status = $('[data-vibe-status]', box)!;
  if (!v) {
    out.hidden = true;
    status.textContent = "I couldn't match that to a demo variant. Try one of the examples.";
    return;
  }
  status.textContent = `Matched to the ${v.name}.`;
  out.hidden = false;
  $('[data-rule-when]', out)!.textContent = v.rule.when;
  $('[data-rule-show]', out)!.textContent = v.rule.show;
  $('[data-rule-copy]', out)!.textContent = v.rule.copy;
  $('[data-rule-button]', out)!.textContent = v.rule.button;
  $('[data-rule-name]', out)!.textContent = v.name;
  const saved = $('[data-vibe-saved]', box);
  if (saved) saved.textContent = '';
}

function bindVibe(box: HTMLElement) {
  if (box.dataset.bound) return;
  box.dataset.bound = '1';
  const form = $<HTMLFormElement>('form', box)!;
  const input = $<HTMLTextAreaElement>('textarea', box)!;
  let matched: Variant | null = null;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) {
      $('[data-vibe-status]', box)!.textContent = 'Describe who the variant is for, or pick an example.';
      input.focus();
      return;
    }
    matched = match(text);
    lastPrompt = text;
    renderRule(box, matched);
  });
  $$<HTMLButtonElement>('[data-example]', box).forEach((chip) =>
    chip.addEventListener('click', () => {
      input.value = chip.dataset.example || chip.textContent || '';
      form.requestSubmit();
    }),
  );
  $('[data-vibe-preview]', box)?.addEventListener('click', () => {
    if (!matched) return;
    lastVariant = matched;
    setProfile(matched.id, 'variant');
    toast(`Previewing the ${matched.name}. Reset in the studio to go back.`, true);
  });
  $('[data-vibe-save]', box)?.addEventListener('click', () => {
    if (!matched) return;
    saveVariant({ profile: matched.id, prompt: lastPrompt, rule: matched.rule });
    $('[data-vibe-saved]', box)!.textContent = storageAvailable()
      ? 'Variant saved to your library.'
      : 'Saved for this visit only. Your browser blocks storage.';
  });
}

/* ---------- Wiring ---------- */

let wired = false;

/** Global listeners, once per visit. */
export function initStudio() {
  if (wired) return;
  wired = true;
  document.addEventListener('keydown', onKey);
  document.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    if (t.closest('[data-open-studio]')) {
      e.preventDefault();
      openStudio();
    } else if (t.closest('[data-close-studio]') || t.closest('#studio-backdrop')) {
      closeStudio();
    } else if (t.closest('[data-toast-why]')) {
      hideToast();
      openStudio();
    } else if (t.closest('[data-toast-close]')) {
      hideToast();
    } else if (t.closest('[data-replay]')) {
      replay(t.closest<HTMLElement>('[data-replay]')!.dataset.replay as Profile);
    } else if (t.closest('[data-reset]')) {
      reset();
    } else if (t.closest('[data-pause]')) {
      setPaused(!engine.paused);
      renderAll();
    } else if (t.closest('[data-save-run]')) {
      saveThisRun();
    }
  });
  document.addEventListener('shapewell:open-studio', openStudio);
  document.addEventListener('shapewell:toast', (e) => toast((e as CustomEvent).detail.text));
  document.addEventListener('shapewell:scores', renderAll);
  document.addEventListener('shapewell:shape', () => renderAll());
  window.setInterval(() => {
    if (studio()?.classList.contains('is-open') || $('[data-meters]')) renderAll();
  }, 500);
}

/** Per page: bind the boxes on this page and apply the current shape. */
export function pageStudio() {
  $$('[data-vibe]').forEach(bindVibe);
  renderAll();
}

export function onShapeChanged(shape: Shape, prev: Shape, source: string) {
  if (shape !== 'default' && source === 'auto') toast("This page adapted to how you're reading it.", true);
  if (shape === 'default' && prev !== 'default' && source === 'auto') toast('The page went back to its default shape.', true);
  applyShape(shape);
}

