// Scores the three reading profiles from the in-memory signals.

import { signals, elapsed, liveHover } from './signals';

export type Profile = 'builder' | 'buyer' | 'researcher';
export type ProfileOrDefault = Profile | 'default';
/** Profiles plus the vibe-only mobile-short variant. */
export type Active = ProfileOrDefault | 'mobile';
export const PROFILES: Profile[] = ['builder', 'buyer', 'researcher'];
export const PROFILE_NAMES: Record<ProfileOrDefault, string> = {
  builder: 'Builder',
  buyer: 'Buyer',
  researcher: 'Researcher',
  default: 'Default',
};

const WARMUP = 8000;
const EVERY = 2000;
const LOCK = 20000;
const LEAD = 1.25;
const MIN_SCORE = 3;
const FAST_SCROLL = 1400; // px/s
const SLOW_SCROLL = 500; // px/s

export interface Reason {
  text: string;
  weight: number;
}

export type Scores = Record<Profile, number>;

export interface EngineState {
  profile: Active;
  scores: Scores;
  /** 'auto' when scoring chose it, 'replay' when forced from the studio, 'variant' for a vibe variant */
  source: 'auto' | 'replay' | 'variant';
  lockedUntil: number;
  paused: boolean;
  privacySignal: boolean;
  history: { at: number; profile: Active }[];
}

const privacySignal =
  typeof navigator !== 'undefined' &&
  ((navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true ||
    navigator.doNotTrack === '1' ||
    (window as Window & { doNotTrack?: string }).doNotTrack === '1');

export const engine: EngineState = {
  profile: 'default',
  scores: { builder: 0, buyer: 0, researcher: 0 },
  source: 'auto',
  lockedUntil: 0,
  paused: privacySignal,
  privacySignal,
  history: [],
};

const s1 = (ms: number) => (ms / 1000).toFixed(1);

/** Plain-language evidence for each profile, strongest first. */
export function evidence(p: Profile): Reason[] {
  const out: Reason[] = [];
  const add = (weight: number, text: string) => weight > 0 && out.push({ weight, text });
  if (p === 'builder') {
    const h = liveHover('code');
    add(h / 1000, `You rested on the code block for ${s1(h)} s, so install moved up.`);
    add(signals.clicks.code * 2, `You clicked in the install section ${signals.clicks.code} time${signals.clicks.code === 1 ? '' : 's'}.`);
    add(signals.installTabs * 2, `You used the copy button or install tab ${signals.installTabs} time${signals.installTabs === 1 ? '' : 's'}.`);
    if (signals.scrollSpeed > FAST_SCROLL)
      add(Math.min(4, (signals.scrollSpeed - FAST_SCROLL) / 400), `You scroll fast (about ${Math.round(signals.scrollSpeed)} px/s), so long paragraphs were shortened.`);
    add(signals.dwell.code / 1000 * 0.3, `The install section was in view for ${s1(signals.dwell.code)} s.`);
  }
  if (p === 'buyer') {
    const h = liveHover('pricing');
    add(h / 1000, `You rested on pricing for ${s1(h)} s, so plans moved up.`);
    add(signals.billingToggles * 2.5, `You flipped the monthly/yearly toggle ${signals.billingToggles} time${signals.billingToggles === 1 ? '' : 's'}.`);
    add(signals.jumpedToPricing * 3, `You jumped straight to pricing from a link.`);
    add(signals.clicks.pricing * 1.5, `You clicked in the pricing section ${signals.clicks.pricing} time${signals.clicks.pricing === 1 ? '' : 's'}.`);
    add(signals.dwell.pricing / 1000 * 0.3, `Pricing was in view for ${s1(signals.dwell.pricing)} s.`);
  }
  if (p === 'researcher') {
    const reading = signals.dwell.explain + signals.dwell.faq + signals.dwell.limits;
    add(reading / 1000 * 0.25, `You spent ${s1(reading)} s on explanations, the FAQ and honest limits.`);
    const h = liveHover('explain') + liveHover('faq') + liveHover('limits');
    add(h / 1000, `You rested on explanatory text for ${s1(h)} s.`);
    add((signals.clicks.faq + signals.clicks.limits + signals.clicks.explain) * 1.5, `You opened or clicked ${signals.clicks.faq + signals.clicks.limits + signals.clicks.explain} explanation or FAQ item${signals.clicks.faq + signals.clicks.limits + signals.clicks.explain === 1 ? '' : 's'}.`);
    if (signals.scrollSpeed > 0 && signals.scrollSpeed < SLOW_SCROLL && elapsed() > WARMUP)
      add(Math.min(3, elapsed() / 20000), `You scroll slowly (about ${Math.round(signals.scrollSpeed)} px/s), so the reading column widened.`);
  }
  return out.sort((a, b) => b.weight - a.weight);
}

export function score(): Scores {
  const sum = (p: Profile) => evidence(p).reduce((a, r) => a + r.weight, 0);
  return { builder: sum('builder'), buyer: sum('buyer'), researcher: sum('researcher') };
}

/** Top profile only if it leads the runner-up by at least 25 %. */
export function pick(scores: Scores): ProfileOrDefault {
  const ranked = [...PROFILES].sort((a, b) => scores[b] - scores[a]);
  const [top, second] = ranked;
  if (scores[top] < MIN_SCORE) return 'default';
  if (scores[top] < scores[second] * LEAD) return 'default';
  return top;
}

type Listener = (next: Active, prev: Active) => void;
const listeners = new Set<Listener>();
export function onProfileChange(fn: Listener) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function setProfile(next: Active, source: EngineState['source']) {
  const prev = engine.profile;
  engine.source = source;
  engine.lockedUntil = performance.now() + LOCK;
  if (next === prev && source === 'auto') return;
  engine.profile = next;
  engine.history.push({ at: Date.now(), profile: next });
  listeners.forEach((fn) => fn(next, prev));
}

export function setPaused(paused: boolean) {
  engine.paused = paused;
  document.dispatchEvent(new CustomEvent('shapewell:paused', { detail: paused }));
}

let timer: number | undefined;
export function startScoring() {
  if (timer) return;
  timer = window.setInterval(() => {
    engine.scores = score();
    document.dispatchEvent(new CustomEvent('shapewell:scores'));
    if (engine.paused || elapsed() < WARMUP) return;
    // a replay or a previewed variant holds until the visitor resets
    if (engine.source !== 'auto') return;
    if (performance.now() < engine.lockedUntil) return;
    const next = pick(engine.scores);
    if (next !== engine.profile) setProfile(next, 'auto');
  }, EVERY);
}

export function resetEngine() {
  engine.scores = { builder: 0, buyer: 0, researcher: 0 };
  engine.lockedUntil = 0;
  engine.source = 'auto';
}
