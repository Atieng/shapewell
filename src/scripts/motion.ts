// Motion system: Lenis, slide-ins, page-load intro, typed labels.

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger, SplitText);

export const reducedMotion = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

let lenis: Lenis | null = null;
export const getLenis = () => lenis;

export function initLenis() {
  if (lenis || reducedMotion()) return;
  lenis = new Lenis({ anchors: { offset: -64 }, autoRaf: false, lerp: 0.12 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis?.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

export function scrollToEl(el: HTMLElement) {
  if (lenis) lenis.scrollTo(el, { offset: -64 });
  else el.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
}

export function stopScroll(stop: boolean) {
  if (!lenis) return;
  if (stop) lenis.stop();
  else lenis.start();
}

const FROM: Record<string, gsap.TweenVars> = {
  left: { x: -80 },
  right: { x: 80 },
  up: { y: 50 },
};

/**
 * Elements with data-slide="left|right|up" slide in once when they reach 85 %
 * of the viewport. Siblings that enter together are staggered by 0.12 s.
 */
export function initSlideIns() {
  if (reducedMotion()) return;
  const els = gsap.utils.toArray<HTMLElement>('[data-slide]:not([data-slid])');
  // read all positions first, then write, so the browser lays out once
  const limit = window.innerHeight * 0.85;
  const below = els.filter((el) => el.getBoundingClientRect().top > limit);
  below.forEach((el) => gsap.set(el, { ...FROM[el.dataset.slide || 'up'], opacity: 0 }));
  ScrollTrigger.batch(below, {
    start: 'top 85%',
    once: true,
    onEnter: (batch) => {
      (batch as HTMLElement[]).forEach((el, i) => {
        el.dataset.slid = '';
        gsap.to(el, { x: 0, y: 0, opacity: 1, duration: 0.9, ease: 'power3.out', delay: i * 0.12, clearProps: 'transform' });
      });
    },
  });
}

/**
 * Mono labels type in letter by letter over 0.4 s when they enter. The font is
 * monospaced, so a stepped clip-path reveals exactly one character per step.
 */
export function initTypedLabels() {
  if (reducedMotion()) return;
  const els = gsap.utils.toArray<HTMLElement>('[data-type]');
  const limit = window.innerHeight * 0.9;
  const below = els.filter((el) => el.getBoundingClientRect().top > limit);
  below.forEach((el) => {
    const n = Math.max(1, (el.textContent || '').length);
    gsap.set(el, { clipPath: 'inset(0 100% 0 0)' });
    ScrollTrigger.create({
      trigger: el,
      start: 'top 90%',
      once: true,
      onEnter: () =>
        gsap.to(el, { clipPath: 'inset(0 0% 0 0)', duration: 0.4, ease: `steps(${n})`, clearProps: 'clipPath' }),
    });
  });
}

/** Run below-the-fold setup when the main thread is free. */
export function whenIdle(fn: () => void) {
  const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
  if (ric) ric(fn, { timeout: 600 });
  else setTimeout(fn, 200);
}

/** Swoosh on every logo draws in over 0.7 s on first load. */
export function drawSwoosh() {
  if (reducedMotion()) return;
  document.querySelectorAll<SVGPathElement>('[data-swoosh]').forEach((p) => {
    const len = p.getTotalLength();
    gsap.fromTo(p, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 0.7, ease: 'power2.out', delay: 0.2 });
  });
}

let firstLoad = true;
export function heroIntro() {
  if (reducedMotion()) return;
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  if (firstLoad) tl.from('[data-nav]', { y: -24, opacity: 0, duration: 0.6 }, 0);
  firstLoad = false;

  const h1 = document.querySelector<HTMLElement>('[data-hero-h1]');
  if (h1) {
    const split = SplitText.create(h1, { type: 'lines', mask: 'lines', linesClass: 'line' });
    tl.from(split.lines, { yPercent: 105, duration: 0.9, stagger: 0.1 }, 0.1);
  }
  const frames = gsap.utils.toArray<HTMLElement>('[data-hero-frame]');
  frames.forEach((f, i) => {
    const img = f.querySelector('img');
    tl.fromTo(f, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 0.9, ease: 'power3.inOut' }, 0.25 + i * 0.18);
    if (img) tl.fromTo(img, { scale: 1.06 }, { scale: 1, duration: 1.4 }, 0.25 + i * 0.18);
  });
  tl.from('[data-hero-fade]', { y: 20, opacity: 0, duration: 0.7, stagger: 0.08 }, 0.5);
}

export function refreshAfterAssets() {
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
  const imgs = [...document.images].filter((i) => !i.complete);
  let left = imgs.length;
  imgs.forEach((i) =>
    i.addEventListener(
      'load',
      () => {
        if (--left === 0) ScrollTrigger.refresh();
      },
      { once: true },
    ),
  );
  window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
}

export function killScrollTriggers() {
  ScrollTrigger.getAll().forEach((t) => t.kill());
}
