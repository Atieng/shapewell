Read this whole brief before writing code. First reply with a short build
plan (files, components, packages, order), then start building immediately
without waiting. Build in two phases: phase 1 = setup, tokens, layout, motion
system, nav, hero, sections 3-8 and the studio; phase 2 = sections 9-13,
footer, /sample, /library, /privacy, 404. Run the build after each phase and
fix all errors. Keep your messages short.

You are a senior front-end engineer and a product designer with strong taste.
Build "Shapewell", a front-end-only marketing site with a REAL working
adaptive demo. Everything runs in the browser: no backend, no database, no
AI service.

=== 1. PRODUCT ===
Shapewell is a small script teams add to their website. It reads behaviour
signals in the visitor's browser (scroll speed and depth, hover dwell,
clicks, device) and reshapes the page for that one person: a different
sub-headline, section order, layout and call-to-action. Teams can also
describe variants in plain English and Shapewell turns them into rules
("vibe-coded variants"). Signals stay in the browser.
Problem: websites are built for an imaginary average visitor; A/B tests find
the best average, never the best page for the person reading.
Audience: growth/marketing leads, front-end developers, small-team founders.
Goal: the visitor sees this page adapt to THEM, opens the studio to see why,
then joins early access.

=== 2. HOUSE STANDARD (must have all) ===
A working tool on the page; a sample anyone can explore without signing up;
a saved library in localStorage; honest limits said plainly; the real tech
stack shown; a 3-step workflow; use cases with exclusions; pricing with a
billing toggle and a free tier; a trust-focused FAQ; a founder section; one
short closing call-to-action; "Open studio" button with keyboard shortcut K;
a mobile bottom bar (Home, Studio, Library, Pricing). NO fake testimonials,
customer logos or user counts. Every claim must be true for this demo.

=== 3. THE WORKING STUDIO (the core, build it properly) ===
Modules in src/scripts: signals.ts, profiles.ts, reshape.ts, vibe.ts,
studio.ts, library.ts, motion.ts.
- signals.ts: record in memory scroll speed (px/s, rolling avg), max depth,
  dwell per section (IntersectionObserver + hover > 1.2s on elements with
  data-signal="code|pricing|explain|faq|limits"), clicks on those elements,
  billing toggle use, device (pointer: coarse).
- profiles.ts: score three profiles every 2s after the first 8s:
  Builder (code hover/clicks, fast scroll, install tab), Buyer (pricing
  hover, toggle use, jump to pricing), Researcher (slow scroll, long dwell
  on explain/faq/limits). Pick the top one only if it leads by >= 25%,
  else stay "default". Lock a profile for 20s before switching again.
- reshape.ts: per profile change (a) hero sub-headline, (b) order of
  sections 6, 7 and 8 using GSAP Flip, (c) primary button text:
    Builder: "Copy the snippet"; sub: "Three lines, 4 kB, no cookies.
      Your page adapts in the browser."; install section first.
    Buyer: "Start free"; sub: "Free for your first site. Pay only when it
      lifts your conversions."; pricing preview first.
    Researcher: "See how it decides"; sub: "Every change comes with a
      reason, and nothing leaves the visitor's browser."; how-it-works first.
    Default: button "Watch it adapt to you"; sub: "Shapewell reads how each
      visitor moves through your page and reshapes it for them, in real time."
  Changed text cross-fades with a short cobalt underline sweep. Show a
  toast: "This page adapted to how you're reading it." with "See why".
- studio.ts: drawer from the right (bottom sheet under 640px), opened by the
  nav button, key K, or the toast. Shows live signal meters, three profile
  score bars with the winner marked, "Why this changed" plain-language
  reasons with numbers (e.g. "You rested on the code block for 3.4 s, so
  install moved up."), "Replay as" Builder/Buyer/Researcher buttons, "Reset
  to default", a "Pause adapting" switch, and "Save this run". Esc closes.
  Focus is trapped inside while open; accessible labels on everything.
- library.ts: saved runs in localStorage key "shapewell_runs" (try/catch,
  works if storage is blocked): date, profile, signal summary. /library page
  lists them with Delete, Restore (undo for 10s after delete) and Download
  as JSON; friendly empty state with a link to the studio.
- Respect Do Not Track / Global Privacy Control: adaptation paused by
  default, with a note in the studio. Respect prefers-reduced-motion.
- BIGGER LAYOUT REBUILDS (reshape.ts): besides the copy, CTA and section
  order, each profile changes the page's SHAPE, animated with GSAP Flip:
    Builder: compact density (smaller spacing), install code block
      expanded and first, marketing paragraphs collapsed to one-line
      summaries with "Read more".
    Buyer: pricing cards enlarge and move up, a short plan comparison
      table opens, long paragraphs collapse.
    Researcher: reading column widens (max 76ch), explanations and honest
      limits expand, the first two FAQ items open.
  The studio's "Why this changed" lists every layout change.
- VIBE-CODED VARIANTS (vibe.ts + studio): a "Describe a variant" text box
  (also on the homepage, section 6b) with 4 example prompts as clickable
  chips, e.g. "For people who look at pricing, show the price first,
  shorten the hero and make the button say Start free." On submit, match
  the text to the closest of 4 preset variants with simple keyword
  scoring (pricing/price/cost -> Buyer variant; code/install/developer ->
  Builder; explain/privacy/how -> Researcher; mobile/phone/short ->
  Mobile-short variant: shorter hero, sticky bottom CTA). Show the
  generated rule as a readable card with a mono label "GENERATED RULE":
  WHEN (signal), SHOW (layout changes), COPY (new sub-headline), BUTTON
  (text). Buttons: "Preview on this page" (applies it), "Save variant"
  (stored in localStorage with the runs, listed on /library). If nothing
  matches, say "I couldn't match that to a demo variant. Try one of the
  examples." Honest note under the box: "This demo uses preset examples.
  In the product, AI writes the rules from your description."

=== 4. PAGE SECTIONS (home) ===
1 NAV sticky: logo, How it works, Use cases, Pricing, FAQ, Founder, Your
  experiments; "Open studio" button with a small "K" hint. Blurred
  background after 40px. Mobile: hamburger + bottom bar.
2 HERO: two columns. Left: mono label "BUILT FOR THE PERSON READING /
  NOT THE AVERAGE VISITOR" (first part cobalt, rest slate). H1 in Archivo
  capitals "YOUR WEBSITE, SHAPED FOR WHOEVER IS READING IT." with "WHOEVER IS
  READING IT." in cobalt. Sub-headline = profile text (Manrope, graphite).
  Buttons: solid cobalt primary (profile text, white text), graphite-outline
  "Explore a sample" -> /sample. Right: a framed collage of 3 photos
  (hero-1.jpg person reading on a laptop, large; hero-2.jpg phone in hand;
  hero-3.jpg small team at a screen), each with a mono caption "FIG. 01 -
  READING ON A LAPTOP" etc. On mobile the collage sits below the text as
  one large + two small. Min height 80vh.
3 BUILT-WITH: real logos (iconify logos set): Cloudflare, Astro, GSAP,
  Web Vitals/Chrome. Caption "Built with".
4 LIVE PREVIEW: large card "What we've noticed so far": live meters and the
  current profile, button "Open studio". data-signal="explain".
4b WHO'S READING (new photo strip): "THREE PEOPLE. ONE PAGE." Three framed
  portraits (reader-1..3.jpg) labelled BUILDER / BUYER / RESEARCHER in mono,
  each with one line: "Wants the code, fast.", "Wants the price, clearly.",
  "Wants to understand it first." The card matching the visitor's current
  profile gets a cobalt top border and "THIS IS YOU" mono tag.
5 WORKFLOW: "From one page for everyone to one page for each person."
  Observe, Decide, Reshape: each step has a framed photo (step-1..3.jpg), a
  mono index "01 / OBSERVE" and one short paragraph.
6 FEATURE: "Every change comes with a reason." Mockup of the studio's
  "Why this changed" list. data-signal="explain".
6b VIBE-CODED VARIANTS: "DESCRIBE IT. SHAPEWELL BUILDS IT." Mono label
  "PLAIN ENGLISH IN / PAGE VARIANT OUT". A framed panel with the "Describe a
  variant" box, example chips, the generated rule card and "Preview on this
  page". Short copy: "Tell Shapewell who you're designing for in a
  sentence. It turns that into a rule and a layout, and you can preview it
  right here." data-signal="explain".
7 USE CASES: "Where it helps, and where it shouldn't." Cards, each with a
  framed photo (usecase-1..3.jpg): Landing pages, Pricing pages, Docs home
  pages. Note: "Not for checkout, legal or
  medical pages. Those should be the same for everyone."
8 INSTALL: "Three lines, no cookies." Code block (JetBrains Mono, graphite background, paper text) with a
  copy button: <script src="https://cdn.shapewell.dev/v1.js" defer
  data-site="your-site-id"></script>. Facts: 4 kB, no cookies, works with
  any site. data-signal="code".
9 HONEST LIMITS: "What Shapewell won't do." Rules can guess wrong, so
  changes are small and reversible; never changes prices or hides
  information; never uses personal data; signals stay in the browser and
  are cleared when the tab closes. data-signal="limits".
10 PRICING: "Pay for results, not page views." Monthly/Yearly toggle
  (yearly -20%, prices animate). Starter $0 (1 site, 10k visits/mo, studio,
  no card). Growth $19/mo (5 sites, 100k visits, saved runs export,
  priority email). Scale: custom (unlimited sites, SSO, SLA). Buttons:
  "Start free", "Join early access", "Talk to us" -> #early-access.
  data-signal="pricing".
11 FAQ accordion: Is this tracking me? Does it slow my site down? Does
  Google see a different page? (no: search engines and first paint get the
  default page) Do I need a cookie banner? Is it accessible? What if it
  guesses wrong? 2-3 sentence honest answers. data-signal="faq".
12 FOUNDER: "Built by someone tired of average pages." Photo
  (src/assets/images/founder.jpg; if missing, a framed square placeholder
  with initials), name "[Your name]", role "[Your role]", two sentences
  "[Your story]", LinkedIn link "#". Leave clear placeholders.
13 CLOSING + FOOTER: id="early-access". "Stop designing for the average
  visitor." Email field + "Join early access" (validate; success: "You're on
  the list. We'll email you when Shapewell opens."). Footer on graphite (#16181D), text paper/slate:
  small logo + "shapewell" + tagline "Pages that fit the person reading
  them."; four link columns in sentence case: Product (How it works,
  Pricing, Sample, Your experiments), Trust (Privacy -> /privacy, Honest
  limits, Accessibility, Security), Company (Founder, Contact, Blog,
  Careers), Resources (Docs, Install guide, Changelog, Status); bottom bar
  "(c) 2026 Shapewell", Privacy, Terms; "Runs on Cloudflare". No social
  icons, no emoji, no giant wordmark.

=== 5. OTHER PAGES ===
/sample: fictional coffee-equipment shop "Kettle & Grind": a product page
(pour-over kettle) with photos (download 3 from Unsplash into
src/assets/images/sample-*.jpg), price $89, specs, reviews summary, FAQ.
It adapts with the same engine (Builder -> specs first, Buyer -> price
and delivery first, Researcher -> brewing guide first). Studio open by
default beside it on desktop. Banner: "This is a demo shop."
/library: saved runs (see studio).
/privacy: H1 "What Shapewell sees, and what it never does." Sections: what
signals are read; where they live (memory, cleared on tab close unless you
save a run); what is never collected (names, emails, IP-based location,
personal data); what never adapts (prices, checkout, legal pages); Do Not
Track and GPC; how to pause or reset; contact privacy@shapewell.dev.
"Last updated 15 October 2026". "On this page" links.
404: logo + "This page took a shape we didn't expect." + "Back to home".

=== 6. BRAND: THE TECH LOOK IN SHAPEWELL'S OWN COLOURS ===
The look is inspired by secondlifefix.com (technical, precise, "a tool,
not a brochure"): capital headlines, mono capital labels, square corners,
hairlines, framed captioned photos. Do NOT copy its colours, logo or layout.
Force the light theme: <meta name="color-scheme" content="light">, no
prefers-color-scheme styles.
CSS variables: --paper #F5F4F0 (page background); --white #FFFFFF (cards,
photo frames, studio drawer); --graphite #16181D (headlines, main text,
the dark install block and footer); --slate #5F6168 (secondary text,
second half of labels); --hairline #DCDAD4 (1px borders, dividers);
--cobalt #2F4BFF (the ONE accent: primary buttons with white text, the
key phrase in each headline, live/adapting signals, logo tile; hover
#2238D9). No other accent colours, no gradients.
Fonts via Fontsource:
- Archivo 800 for headlines: CAPITALS, letter-spacing -0.02em,
  line-height 0.95, clamp(38px, 6vw, 64px); one key phrase in cobalt.
- Manrope 400-600 for body (16px/1.6, max 68ch) and buttons (600,
  sentence case).
- JetBrains Mono 500 for labels, data, meters, captions and the code
  block: 11-12px CAPITALS, letter-spacing 0.14em, split colour (first
  phrase cobalt, rest slate), e.g. "OBSERVES. NEVER STORES."
Layout: square corners everywhere (radius 0-2px) on buttons, cards,
inputs, photos and the drawer; 1px hairline borders; each section opens
with a hairline and a mono index label like "01 / WORKFLOW"; numbered
labels only where they index real things; generous white space; 12-column
grid inside one container (max-width 1200px, padding 24px / 16px mobile).
No shadows, no glows.
Buttons: solid cobalt with white text, or 1px graphite outline with
graphite text; hover: background shifts, no scaling bounce.
PHOTOS (many, about 12-15, always clean): download from Unsplash or
Pexels into src/assets/images (hero-1..3, reader-1..3, step-1..3,
usecase-1..3, sample-1..3; founder.jpg is mine). Same mood for all:
candid, uncluttered, soft natural light, neutral backgrounds, people
focused on screens or whiteboards, an international and diverse mix.
Treatment: natural colour, filter: saturate(0.85) contrast(1.03); framed
with square corners, 1px hairline border and 8px white padding; mono
caption under each ("FIG. 02 - ..."). Never full-bleed with dark overlays.
Never iStock, Shutterstock, Getty or Google Images. Astro <Image />
(AVIF/WebP, lazy except the hero), meaningful alt text.
Logo: cobalt square tile with a white cursor and swoosh, plus the wordmark
"SHAPEWELL" in Archivo 800 capitals, graphite (paper on the footer). Use
in nav (32px tile), favicon, studio header, footer, 404, sample page and
OG image:
<svg viewBox="0 0 40 40"><rect width="40" height="40" rx="4" fill="#2F4BFF"/><path d="M12 8 L12 30 L17.5 25 L21.5 33.5 L25.5 31.7 L21.6 23.3 L29 23.3 Z" fill="#FFFFFF"/><path d="M27 10 C33 13 34 20 30.5 25" fill="none" stroke="#FFFFFF" stroke-width="2.6" stroke-linecap="round"/></svg>
On first load the swoosh draws in 0.7s.
Icons: astro-icon with @iconify-json/lucide (UI, 1.5 stroke) and
@iconify-json/logos (brand logos in full colour). No letter placeholders,
no emoji.
Open Graph image public/og-image.png 1200x630: paper background, logo
tile, headline in Archivo capitals with the cobalt phrase, one framed photo.

=== 7. MOTION ===
GSAP + ScrollTrigger + Flip + SplitText, Lenis smooth scroll, Astro View
Transitions. Page load: nav fades down, H1 line reveal, swoosh draw, hero
photo frames wipe in one after another (clip-path) while each photo
scales 1.06->1, buttons fade up. Mono labels type in letter by letter (0.4s).
Slide-ins on EVERY section including the footer and other pages, via
initSlideIns() with data-slide="left|right|up": x -80 / x 80 / y 50,
opacity 0->1, 0.9s power3.out, stagger 0.12, start "top 85%", once.
Two-column layouts: left from left, right from right. Card rows: first
left, middle up, last right. Lists and footer columns: up one by one.
Call on load and on 'astro:page-load'; ScrollTrigger.refresh() after fonts
and images load. Sections overflow-x: clip. Content visible without JS.
Reduced motion: no slide-ins, zoom, Flip or smooth scroll.

=== 8. RULES ===
Capitals only for headlines and mono labels; body, buttons, FAQ and
footer links in sentence case. No decorative numbering, no purple/blue
gradients, no glowing orbs, no sparkle icons, no shadows, no rounded pill
buttons, no identical card grids everywhere. International neutral names
only; no Kenyan names, places, currencies or services. USD.
Quality: semantic HTML, alt text, visible focus, WCAG AA, no horizontal
scroll at 360px, Lighthouse 95+, meta titles/descriptions on every page,
SVG + PNG favicon and apple-touch-icon.
Deploy: static output; wrangler.jsonc name "shapewell", assets ./dist. When
both phases are done and the build is clean, run `npm run deploy` and tell
me the live URL in one line.
