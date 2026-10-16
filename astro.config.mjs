// @ts-check
import { defineConfig } from 'astro/config';
import icon from 'astro-icon';

// https://astro.build/config
export default defineConfig({
  site: 'https://shapewell.lybuilds.workers.dev',
  output: 'static',
  integrations: [
    icon({
      include: {
        lucide: ['*'],
        logos: ['cloudflare-icon', 'astro-icon', 'gsap', 'chrome'],
      },
    }),
  ],
});
