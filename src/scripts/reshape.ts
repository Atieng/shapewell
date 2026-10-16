// Applies a profile (or a vibe-coded variant) to the page: copy, order and shape.

import { gsap } from 'gsap';
import { Flip } from 'gsap/Flip';
import type { Active } from './profiles';
import { reducedMotion } from './motion';

gsap.registerPlugin(Flip);

export type Shape = Active;

export interface ShapeDef {
  sub: string;
  cta: string;
  /** what the primary button does */
  action: 'copy' | 'pricing' | 'how' | 'studio';
  /** which block of the reorderable group goes first */
  first: 'builder' | 'buyer' | 'researcher' | null;
  layout: string[];
}

export const SHAPES: Record<Shape, ShapeDef> = {
  default: {
    sub: 'Shapewell reads how each visitor moves through your page and reshapes it for them, in real time.',
    cta: 'Watch it adapt to you',
    action: 'studio',
    first: null,
    layout: [],
  },
  builder: {
    sub: 'Three lines, 4 kB, no cookies. Your page adapts in the browser.',
    cta: 'Copy the snippet',
    action: 'copy',
    first: 'builder',
    layout: [
      'Install moved to the top of the middle sections.',
      'Spacing tightened to a compact density.',
      'The install block expanded to show framework snippets.',
      'Marketing paragraphs collapsed to one-line summaries with "Read more".',
    ],
  },
  buyer: {
    sub: 'Free for your first site. Pay only when it lifts your conversions.',
    cta: 'Start free',
    action: 'pricing',
    first: 'buyer',
    layout: [
      'A pricing preview moved to the top of the middle sections.',
      'Pricing cards grew larger.',
      'A short plan comparison table opened.',
      'Long paragraphs collapsed to one line with "Read more".',
    ],
  },
  researcher: {
    sub: "Every change comes with a reason, and nothing leaves the visitor's browser.",
    cta: 'See how it decides',
    action: 'how',
    first: 'researcher',
    layout: [
      'How it works moved to the top of the middle sections.',
      'The reading column widened to 76 characters.',
      'Explanations and honest limits expanded.',
      'The first two FAQ answers opened.',
    ],
  },
  mobile: {
    sub: 'A page that fits your phone and the person holding it.',
    cta: 'Start free',
    action: 'pricing',
    first: null,
    layout: ['The hero was shortened and its photos hidden.', 'A sticky call-to-action bar appeared at the bottom.'],
  },
};

let current: Shape = 'default';
export const currentShape = () => current;

const dataKey = (s: Shape) => s.charAt(0).toUpperCase() + s.slice(1);

function subFor(el: HTMLElement, s: Shape) {
  return el.dataset[`sub${dataKey(s)}`] ?? SHAPES[s].sub;
}
function ctaFor(el: HTMLElement, s: Shape) {
  return el.dataset[`cta${dataKey(s)}`] ?? SHAPES[s].cta;
}

function swapText(el: HTMLElement, text: string, animate: boolean) {
  const target = el.querySelector<HTMLElement>('[data-swap-text]') ?? el;
  if (target.textContent === text) return;
  if (!animate) {
    target.textContent = text;
    return;
  }
  const line = el.parentElement?.querySelector<HTMLElement>('.swap-line');
  const tl = gsap.timeline();
  tl.to(target, { opacity: 0, duration: 0.22, ease: 'power1.in' })
    .add(() => {
      target.textContent = text;
    })
    .to(target, { opacity: 1, duration: 0.35, ease: 'power1.out' });
  if (line) {
    tl.fromTo(line, { scaleX: 0, transformOrigin: 'left center' }, { scaleX: 1, duration: 0.45, ease: 'power3.out' }, 0.2).to(
      line,
      { scaleX: 0, transformOrigin: 'right center', duration: 0.45, ease: 'power3.in' },
      '+=0.6',
    );
  }
}

function reorder(shape: Shape) {
  const first = SHAPES[shape].first;
  document.querySelectorAll<HTMLElement>('[data-reorder]').forEach((group) => {
    const kids = [...group.children] as HTMLElement[];
    kids.sort((a, b) => Number(a.dataset.order) - Number(b.dataset.order));
    if (first) {
      const lead = kids.find((k) => (k.dataset.firstFor || '').split(' ').includes(first));
      if (lead) kids.splice(kids.indexOf(lead), 1), kids.unshift(lead);
    }
    kids.forEach((k) => group.appendChild(k));
  });
  renumber();
}

/** Section index labels follow the real order on the page. */
export function renumber() {
  let i = 0;
  document.querySelectorAll<HTMLElement>('[data-index] .c').forEach((c) => {
    if ((c.closest('[data-key]') as HTMLElement | null)?.hidden) return;
    if (c.closest('[data-key="pricing-preview"]') && current !== 'buyer') return;
    i++;
    c.textContent = String(i).padStart(2, '0');
  });
}

let openedFaq: HTMLDetailsElement[] = [];
function details(shape: Shape) {
  openedFaq.forEach((d) => (d.open = false));
  openedFaq = [];
  if (shape === 'researcher') {
    document.querySelectorAll<HTMLDetailsElement>('details[data-faq]').forEach((d, i) => {
      if (i < 2 && !d.open) {
        d.open = true;
        openedFaq.push(d);
      }
    });
  }
  document.querySelectorAll<HTMLDetailsElement>('details[data-open-for]').forEach((d) => {
    d.open = (d.dataset.openFor || '').split(' ').includes(shape);
  });
}

function setLayout(shape: Shape) {
  const html = document.documentElement;
  if (shape === 'default') html.removeAttribute('data-shape');
  else html.dataset.shape = shape;
}

/** Apply a shape to the current page. */
export function applyShape(shape: Shape, opts: { animate?: boolean } = {}) {
  const animate = opts.animate !== false && !reducedMotion();
  current = shape;

  document.querySelectorAll<HTMLElement>('[data-reshape="sub"]').forEach((el) => swapText(el, subFor(el, shape), animate));
  document.querySelectorAll<HTMLElement>('[data-reshape="cta"]').forEach((el) => {
    swapText(el, ctaFor(el, shape), animate);
    el.dataset.action = el.dataset[`action${dataKey(shape)}`] ?? SHAPES[shape].action;
  });

  const targets = gsap.utils.toArray<HTMLElement>('[data-reorder] > *, [data-flip]');
  const state = animate ? Flip.getState(targets) : null;

  setLayout(shape);
  reorder(shape);
  details(shape);

  if (state) {
    Flip.from(state, {
      duration: 0.8,
      ease: 'power3.inOut',
      nested: true,
      onEnter: (els) => gsap.fromTo(els, { opacity: 0 }, { opacity: 1, duration: 0.5 }),
    });
  }
  document.dispatchEvent(new CustomEvent('shapewell:shape', { detail: shape }));
}

/** What the primary button does in the current shape. */
export function runCta(el: HTMLElement) {
  const action = el.dataset.action as ShapeDef['action'];
  if (action === 'studio') {
    document.dispatchEvent(new CustomEvent('shapewell:open-studio'));
  } else if (action === 'copy') {
    const code = document.querySelector<HTMLElement>('[data-snippet]');
    if (code) navigator.clipboard?.writeText(code.textContent?.trim() || '').catch(() => {});
    scrollToId('install');
    document.dispatchEvent(new CustomEvent('shapewell:toast', { detail: { text: 'Snippet copied. It is a demo URL.' } }));
  } else if (action === 'pricing') {
    scrollToId('pricing');
  } else if (action === 'how') {
    scrollToId('how-it-decides');
  }
}

function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (el) {
    document.dispatchEvent(new CustomEvent('shapewell:scroll-to', { detail: el }));
  } else {
    location.href = `/#${id}`;
  }
}
