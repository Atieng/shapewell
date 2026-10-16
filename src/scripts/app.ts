// Entry point. Runs once; page-level setup re-runs on every Astro page load.

import { bindSignals } from './signals';
import { engine, onProfileChange, startScoring } from './profiles';
import { applyShape, currentShape } from './reshape';
import { initPanel, pagePanel, onShapeChanged, closePanel } from './panel';
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
  whenIdle,
} from './motion';

let firstLoad = true;

onProfileChange((next, prev) => onShapeChanged(next, prev, engine.source));

function onPageLoad() {
  initLenis();
  initUiOnce();
  initPanel();
  startScoring();

  bindSignals();
  initUiPage();
  pagePanel();

  // the new page starts in whatever shape the visitor is in, without animation
  if (currentShape() !== 'default') applyShape(currentShape(), { animate: false });

  heroIntro();
  if (firstLoad) drawSwoosh();
  firstLoad = false;
  whenIdle(() => {
    initSlideIns();
    initTypedLabels();
    refreshAfterAssets();
  });
}

document.addEventListener('astro:page-load', onPageLoad);
document.addEventListener('astro:before-swap', () => {
  closePanel();
  killScrollTriggers();
});
document.addEventListener('astro:after-swap', () => {
  const lenis = getLenis();
  if (!lenis) return;
  lenis.resize();
  if (!location.hash) lenis.scrollTo(0, { immediate: true, force: true });
});
