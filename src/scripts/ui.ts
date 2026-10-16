// Small page widgets: nav, mobile menu, billing toggle, copy buttons, read more, forms.

import { gsap } from 'gsap';
import { noteBillingToggle } from './signals';
import { runCta } from './reshape';
import { reducedMotion, scrollToEl } from './motion';

const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => [...root.querySelectorAll<T>(sel)];

let wired = false;

export function initUiOnce() {
  if (wired) return;
  wired = true;
  window.addEventListener('scroll', navState, { passive: true });
  document.addEventListener('shapewell:scroll-to', (e) => scrollToEl((e as CustomEvent).detail));
  document.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const cta = t.closest<HTMLElement>('[data-reshape="cta"]');
    if (cta) {
      e.preventDefault();
      runCta(cta);
      return;
    }
    const menu = t.closest<HTMLElement>('[data-menu-toggle]');
    if (menu) toggleMenu();
    else if (t.closest('[data-mobile-menu] a')) toggleMenu(false);

    const copy = t.closest<HTMLButtonElement>('[data-copy]');
    if (copy) copyFrom(copy);

    const more = t.closest<HTMLElement>('.more-btn');
    if (more) {
      const box = more.closest('.collapsible');
      box?.classList.add('is-open');
      more.setAttribute('aria-expanded', 'true');
    }

    const tab = t.closest<HTMLButtonElement>('[data-install-tab]');
    if (tab) selectTab(tab);
  });
}

function navState() {
  document.querySelector('[data-nav]')?.classList.toggle('is-scrolled', window.scrollY > 40);
}

function toggleMenu(force?: boolean) {
  const btn = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  const panel = document.querySelector<HTMLElement>('[data-mobile-menu]');
  if (!btn || !panel) return;
  const open = force ?? btn.getAttribute('aria-expanded') !== 'true';
  btn.setAttribute('aria-expanded', String(open));
  panel.hidden = !open;
}

async function copyFrom(btn: HTMLButtonElement) {
  const src = document.getElementById(btn.dataset.copy || '');
  const text = src?.textContent?.trim() || '';
  const label = btn.querySelector('[data-copy-label]');
  try {
    await navigator.clipboard.writeText(text);
    if (label) label.textContent = 'Copied';
  } catch {
    if (label) label.textContent = 'Select and copy';
  }
  setTimeout(() => label && (label.textContent = 'Copy'), 2000);
}

function selectTab(tab: HTMLButtonElement) {
  const list = tab.closest('[role="tablist"]');
  if (!list) return;
  $$<HTMLButtonElement>('[role="tab"]', list).forEach((t) => {
    const on = t === tab;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
    const panel = document.getElementById(t.getAttribute('aria-controls') || '');
    if (panel) panel.hidden = !on;
    const copy = list.parentElement?.querySelector<HTMLElement>('[data-copy]');
    const code = panel?.querySelector('code');
    if (on && copy && code) copy.dataset.copy = code.id;
  });
}

function bindTabsKeys() {
  $$('[role="tablist"]').forEach((list) => {
    list.addEventListener('keydown', (e) => {
      const ev = e as KeyboardEvent;
      if (ev.key !== 'ArrowRight' && ev.key !== 'ArrowLeft') return;
      const tabs = $$<HTMLButtonElement>('[role="tab"]', list);
      const i = tabs.indexOf(document.activeElement as HTMLButtonElement);
      const next = tabs[(i + (ev.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      next.focus();
      selectTab(next);
    });
  });
}

function bindBilling() {
  $$<HTMLElement>('[data-billing]').forEach((group) => {
    const buttons = $$<HTMLButtonElement>('[data-period]', group);
    buttons.forEach((b) =>
      b.addEventListener('click', () => {
        const period = b.dataset.period!;
        if (b.getAttribute('aria-pressed') === 'true') return;
        buttons.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        noteBillingToggle();
        $$<HTMLElement>('[data-price]').forEach((p) => animatePrice(p, Number(p.dataset[period])));
        $$<HTMLElement>('[data-per]').forEach((p) => (p.textContent = p.dataset[period] || ''));
      }),
    );
  });
}

function animatePrice(el: HTMLElement, to: number) {
  const from = Number(el.textContent?.replace(/[^\d.]/g, '')) || 0;
  if (reducedMotion()) {
    el.textContent = `$${to}`;
    return;
  }
  const o = { v: from };
  gsap.to(o, {
    v: to,
    duration: 0.6,
    ease: 'power2.out',
    onUpdate: () => (el.textContent = `$${Math.round(o.v)}`),
  });
}

function bindEarlyAccess() {
  $$<HTMLFormElement>('[data-early-access]').forEach((form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = form.querySelector<HTMLInputElement>('input[type="email"]')!;
      const msg = form.querySelector<HTMLElement>('[data-form-msg]')!;
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.value.trim());
      input.setAttribute('aria-invalid', String(!ok));
      if (!ok) {
        msg.textContent = 'Please enter a valid email address, like name@company.com.';
        msg.classList.add('is-error');
        input.focus();
        return;
      }
      msg.classList.remove('is-error');
      msg.textContent = "You're on the list. We'll email you when Shapewell opens.";
      form.classList.add('is-done');
      input.value = '';
    });
  });
}

export function initUiPage() {
  navState();
  toggleMenu(false);
  bindTabsKeys();
  bindBilling();
  bindEarlyAccess();
}
