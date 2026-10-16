// Behaviour signals, kept in memory only. Nothing here is sent anywhere.

export type SignalKind = 'code' | 'pricing' | 'explain' | 'faq' | 'limits';
export const KINDS: SignalKind[] = ['code', 'pricing', 'explain', 'faq', 'limits'];

type PerKind = Record<SignalKind, number>;
const zero = (): PerKind => ({ code: 0, pricing: 0, explain: 0, faq: 0, limits: 0 });

export interface Signals {
  startedAt: number;
  /** Rolling average of scroll speed while scrolling, px/s */
  scrollSpeed: number;
  /** Deepest point reached, 0..1 */
  maxDepth: number;
  /** Time each kind of section sat in the middle band of the viewport, ms */
  dwell: PerKind;
  /** Hover time over signal elements, counted only past 1.2 s, ms */
  hover: PerKind;
  clicks: PerKind;
  billingToggles: number;
  installTabs: number;
  jumpedToPricing: number;
  coarse: boolean;
}

const HOVER_MIN = 1200;
const SPEED_WINDOW = 12;

export const signals: Signals = fresh();

function fresh(): Signals {
  return {
    startedAt: performance.now(),
    scrollSpeed: 0,
    maxDepth: 0,
    dwell: zero(),
    hover: zero(),
    clicks: zero(),
    billingToggles: 0,
    installTabs: 0,
    jumpedToPricing: 0,
    coarse: typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches,
  };
}

export function resetSignals() {
  Object.assign(signals, fresh());
  hoverStart.clear();
}

export function elapsed() {
  return performance.now() - signals.startedAt;
}

/** Hover time including an ongoing hover that has passed the threshold. */
export function liveHover(kind: SignalKind) {
  let ms = signals.hover[kind];
  const now = performance.now();
  hoverStart.forEach((t, el) => {
    if (el.dataset.signal === kind && now - t > HOVER_MIN) ms += now - t;
  });
  return ms;
}

const visible = new Set<HTMLElement>();
const hoverStart = new Map<HTMLElement, number>();
let observer: IntersectionObserver | null = null;
let started = false;
let lastY = 0;
let movedPx = 0;
const speedSamples: number[] = [];

function onScroll() {
  const y = window.scrollY;
  movedPx += Math.abs(y - lastY);
  lastY = y;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  if (max > 0) signals.maxDepth = Math.max(signals.maxDepth, Math.min(1, y / max));
}

const TICK = 250;
function tick() {
  if (document.visibilityState !== 'visible') return;
  // scroll speed: only average the ticks where the reader actually scrolled
  if (movedPx > 2) {
    speedSamples.push(movedPx / (TICK / 1000));
    if (speedSamples.length > SPEED_WINDOW) speedSamples.shift();
    signals.scrollSpeed = speedSamples.reduce((a, b) => a + b, 0) / speedSamples.length;
  }
  movedPx = 0;
  visible.forEach((el) => {
    const k = el.dataset.signal as SignalKind;
    if (k in signals.dwell) signals.dwell[k] += TICK;
  });
}

function onPointerOver(e: PointerEvent) {
  if (e.pointerType === 'touch') return;
  const el = (e.target as Element).closest<HTMLElement>('[data-signal]');
  if (el && !hoverStart.has(el)) hoverStart.set(el, performance.now());
}
function onPointerOut(e: PointerEvent) {
  const el = (e.target as Element).closest<HTMLElement>('[data-signal]');
  if (!el) return;
  const to = e.relatedTarget as Node | null;
  if (to && el.contains(to)) return;
  const t = hoverStart.get(el);
  hoverStart.delete(el);
  if (t === undefined) return;
  const ms = performance.now() - t;
  const k = el.dataset.signal as SignalKind;
  if (ms > HOVER_MIN && k in signals.hover) signals.hover[k] += ms;
}

function onClick(e: MouseEvent) {
  const target = e.target as Element;
  const el = target.closest<HTMLElement>('[data-signal]');
  if (el) {
    const k = el.dataset.signal as SignalKind;
    if (k in signals.clicks) signals.clicks[k]++;
  }
  if (target.closest('[data-install-tab], [data-copy]')) signals.installTabs++;
  const a = target.closest('a');
  if (a && /#pricing$/.test(a.getAttribute('href') || '')) signals.jumpedToPricing++;
}

export function noteBillingToggle() {
  signals.billingToggles++;
}

/** Call on every page load: re-observes the signal elements of the new page. */
export function bindSignals() {
  if (!started) {
    started = true;
    lastY = window.scrollY;
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('pointerover', onPointerOver);
    document.addEventListener('pointerout', onPointerOut);
    document.addEventListener('click', onClick, true);
    setInterval(tick, TICK);
  }
  observer?.disconnect();
  visible.clear();
  hoverStart.clear();
  lastY = window.scrollY;
  observer = new IntersectionObserver(
    (entries) => {
      for (const en of entries) {
        const el = en.target as HTMLElement;
        if (en.isIntersecting) visible.add(el);
        else visible.delete(el);
      }
    },
    { rootMargin: '-30% 0px -30% 0px', threshold: 0 },
  );
  document.querySelectorAll<HTMLElement>('[data-signal]').forEach((el) => observer!.observe(el));
}

/** A small serialisable summary, used when saving a run. */
export function summarise() {
  const r = (n: number) => Math.round(n / 100) / 10;
  return {
    seconds: Math.round(elapsed() / 1000),
    scrollSpeed: Math.round(signals.scrollSpeed),
    maxDepth: Math.round(signals.maxDepth * 100),
    dwellSeconds: Object.fromEntries(KINDS.map((k) => [k, r(signals.dwell[k])])),
    hoverSeconds: Object.fromEntries(KINDS.map((k) => [k, r(liveHover(k))])),
    clicks: { ...signals.clicks },
    billingToggles: signals.billingToggles,
    device: signals.coarse ? 'touch' : 'pointer',
  };
}
