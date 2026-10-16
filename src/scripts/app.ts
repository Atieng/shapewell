// Entry point. Runs once; page-level setup re-runs on every Astro page load.

import { bindSignals } from './signals';
import { engine, onProfileChange, startScoring } from './profiles';
import { applyShape, currentShape, renumber } from './reshape';
import { initStudio, pageStudio, onShapeChanged, openStudio, closeStudio } from './studio';
import { initUiOnce, initUiPage } from './ui';
import {
  initLenis,
  initSlideIns,
  initTypedLabels,
  heroIntro,
  drawSwoosh,
  refreshAfterAssets,
  killScrollTriggers,
  getLenis,
} from './motion';

let firstLoad = true;

onProfileChange((next, prev) => onShapeChanged(next, prev, engine.source));

function onPageLoad() {
  initLenis();
  initUiOnce();
  initStudio();
  startScoring();

  bindSignals();
  initUiPage();
  pageStudio();

  // the new page starts in whatever shape the visitor is in, without animation
  if (currentShape() !== 'default') applyShape(currentShape(), { animate: false });
  else renumber();

  if (document.body.dataset.studioDocked !== undefined && matchMedia('(min-width: 1100px)').matches) {
    document.documentElement.classList.add('studio-docked');
    openStudio();
  }

  heroIntro();
  initSlideIns();
  initTypedLabels();
  if (firstLoad) drawSwoosh();
  firstLoad = false;
  refreshAfterAssets();
}

document.addEventListener('astro:page-load', onPageLoad);
document.addEventListener('astro:before-swap', () => {
  closeStudio();
  killScrollTriggers();
});
document.addEventListener('astro:after-swap', () => {
  const lenis = getLenis();
  if (!lenis) return;
  lenis.resize();
  if (!location.hash) lenis.scrollTo(0, { immediate: true, force: true });
});
