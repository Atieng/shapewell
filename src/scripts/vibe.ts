// "Vibe-coded variants": match a plain-English description to one of four presets.
// The demo uses keyword scoring. In the product, AI writes the rules.

import { SHAPES, type Shape } from './reshape';

export interface Rule {
  when: string;
  show: string;
  copy: string;
  button: string;
}
export interface Variant {
  id: Exclude<Shape, 'default'>;
  name: string;
  rule: Rule;
}

const WORDS: Record<Variant['id'], string[]> = {
  buyer: ['pricing', 'price', 'prices', 'cost', 'costs', 'plan', 'plans', 'buy', 'buyer', 'cheap', 'budget', 'paying'],
  builder: ['code', 'install', 'developer', 'developers', 'dev', 'devs', 'snippet', 'api', 'engineer', 'engineers', 'script'],
  researcher: ['explain', 'privacy', 'how', 'why', 'understand', 'research', 'details', 'careful', 'trust', 'learn'],
  mobile: ['mobile', 'phone', 'phones', 'short', 'shorter', 'small', 'screen', 'touch', 'quick'],
};

const RULES: Record<Variant['id'], Variant> = {
  buyer: {
    id: 'buyer',
    name: 'Buyer variant',
    rule: {
      when: 'Visitor rests on pricing, flips the billing toggle or jumps to pricing',
      show: SHAPES.buyer.layout.join(' '),
      copy: SHAPES.buyer.sub,
      button: SHAPES.buyer.cta,
    },
  },
  builder: {
    id: 'builder',
    name: 'Builder variant',
    rule: {
      when: 'Visitor rests on code, clicks the install tab or scrolls fast',
      show: SHAPES.builder.layout.join(' '),
      copy: SHAPES.builder.sub,
      button: SHAPES.builder.cta,
    },
  },
  researcher: {
    id: 'researcher',
    name: 'Researcher variant',
    rule: {
      when: 'Visitor scrolls slowly and lingers on explanations, FAQ or limits',
      show: SHAPES.researcher.layout.join(' '),
      copy: SHAPES.researcher.sub,
      button: SHAPES.researcher.cta,
    },
  },
  mobile: {
    id: 'mobile',
    name: 'Mobile-short variant',
    rule: {
      when: 'Visitor is on a touch device (pointer: coarse)',
      show: SHAPES.mobile.layout.join(' '),
      copy: SHAPES.mobile.sub,
      button: SHAPES.mobile.cta,
    },
  },
};

export const EXAMPLES = [
  'For people who look at pricing, show the price first, shorten the hero and make the button say Start free.',
  'When a developer is reading, put the install code first and keep the copy short.',
  'For careful readers, explain how it works and what happens to their privacy.',
  'On a phone, keep the hero short and pin the main button to the bottom.',
];

export function match(text: string): Variant | null {
  const words = text.toLowerCase().match(/[a-z]+/g) || [];
  let best: Variant['id'] | null = null;
  let bestScore = 0;
  (Object.keys(WORDS) as Variant['id'][]).forEach((id) => {
    const score = words.filter((w) => WORDS[id].includes(w)).length;
    if (score > bestScore) {
      best = id;
      bestScore = score;
    }
  });
  return best ? RULES[best] : null;
}
