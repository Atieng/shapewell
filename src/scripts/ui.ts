// Small page widgets: nav, mobile menu, copy buttons, read more, forms.

import { runCta } from './reshape';
import { scrollToEl } from './motion';

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
    else if (t.closest('[data-mobile-menu] a, [data-mobile-menu] button')) toggleMenu(false);

    const copy = t.closest<HTMLButtonElement>('[data-copy]');
    if (copy) copyFrom(copy);

    const more = t.closest<HTMLElement>('.more-btn');
    if (more) {
      const box = more.closest('.collapsible');
      box?.classList.add('is-open');
      more.setAttribute('aria-expanded', 'true');
    }
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
  bindEarlyAccess();
}
