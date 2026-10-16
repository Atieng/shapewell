// Applies a profile (or a vibe-coded variant) to the page: copy, order and shape.

import { gsap } from 'gsap';
import type { Active } from './profiles';
import { reducedMotion } from './motion';

let flipMod: Promise<typeof import('gsap/Flip')> | null = null;
const loadFlip = () => (flipMod ??= import('gsap/Flip').then((m) => (gsap.registerPlugin(m.Flip), m)));

export type Shape = Active;

export interface ShapeDef {
  sub: string;
  cta: string;
  /** what the primary button does */
  action: 'copy' | 'join' | 'why' | 'live';
  /** which column of the reorderable group goes first */
  first: 'builder' | 'buyer' | 'researcher' | null;
  layout: string[];
}

export const SHAPES: Record<Shape, ShapeDef> = {
  default: {
    sub: 'Most websites are built once, for an average visitor. Shapewell rebuilds the layout, copy and button for each person, live, from how they hover, scroll and click.',
    cta: 'Watch it adapt to you',
    action: 'live',
    first: null,
    layout: [],
  },
  builder: {
    sub: 'One script tag, 4 kB, no cookies. The page rebuilds itself in the browser.',
    cta: 'Copy the snippet',
    action: 'copy',
    first: 'builder',
    layout: [
      'The Click column, with the install snippet, moved to the front.',
      'Spacing tightened to a compact layout.',
      'Long paragraphs collapsed to one line with "Read more".',
    ],
  },
  buyer: {
    sub: 'Free during early access. No card, no setup call.',
    cta: 'Join early access',
    action: 'join',
    first: 'buyer',
    layout: ['The Hover column, about pricing, moved to the front.', 'Long paragraphs collapsed to one line with "Read more".'],
  },
  researcher: {
    sub: "Every change comes with a reason you can read, and the signals never leave the visitor's browser.",
    cta: 'See how it decides',
    action: 'why',
    first: 'researcher',
    layout: ['The reading column widened to 76 characters.', 'Extra detail opened in the signal columns and the A/B comparison.'],
  },
  mobile: {
    sub: 'A page that fits your phone and the person holding it.',
    cta: 'Join early access',
    action: 'join',
    first: null,
    layout: ['The hero photos were hidden.', 'A "Join early access" button was pinned to the bottom of the screen.'],
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
}

function details(shape: Shape) {
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
export async function applyShape(shape: Shape, opts: { animate?: boolean } = {}) {
  const animate = opts.animate !== false && !reducedMotion();
  current = shape;

  document.querySelectorAll<HTMLElement>('[data-reshape="sub"]').forEach((el) => swapText(el, subFor(el, shape), animate));
  document.querySelectorAll<HTMLElement>('[data-reshape="cta"]').forEach((el) => {
    swapText(el, ctaFor(el, shape), animate);
    el.dataset.action = el.dataset[`action${dataKey(shape)}`] ?? SHAPES[shape].action;
  });

  const Flip = animate ? (await loadFlip()).Flip : null;
  const targets = gsap.utils.toArray<HTMLElement>('[data-reorder] > *, [data-flip]');
  const state = Flip ? Flip.getState(targets) : null;

  setLayout(shape);
  reorder(shape);
  details(shape);

  if (Flip && state) {
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
  if (action === 'why') {
    document.dispatchEvent(new CustomEvent('shapewell:open-why'));
  } else if (action === 'copy') {
    const code = document.querySelector<HTMLElement>('[data-snippet]');
    if (code) navigator.clipboard?.writeText(code.textContent?.trim() || '').catch(() => {});
    scrollToId('signals');
    document.dispatchEvent(new CustomEvent('shapewell:toast', { detail: { text: 'Snippet copied. It is a demo URL.' } }));
  } else if (action === 'join') {
    scrollToId('early-access');
  } else {
    scrollToId('live');
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
