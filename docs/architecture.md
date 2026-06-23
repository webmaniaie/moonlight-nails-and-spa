# The Nail Studio — Frontend Architecture & AI Handoff

## Purpose

This document describes the current one-page Nail Studio website, the recommended path to a faster backend-ready frontend, and precise prompts for safely modernising each visual section later.

The current site is a standalone HTML document with a deliberately art-directed layout, a scroll-pinned 3D hero, GSAP interactions, a booking demo, service videos, and a scroll-driven gallery. Preserve its visual output and interaction timing during any migration.

## Recommended frontend framework

Use **Astro with TypeScript** for the next implementation phase.

Why Astro is the best fit for this site:

- Most of the page is content-led and should ship as fast static HTML and CSS.
- The expensive interactive areas can remain isolated: 3D hero, smooth scrolling, scroll-triggered reveals, gallery rails, and booking flow.
- It supports server/API endpoints later, so booking, services, gallery media, reviews, and studio details can move to a real backend without rebuilding the page shell.
- It avoids turning the entire page into a large client-side React application. Use React only if a future component truly benefits from it.

Authoritative references: [Astro islands](https://docs.astro.build/en/concepts/islands/) and [Astro API endpoints](https://docs.astro.build/en/guides/endpoints/).

## Current dependency inventory

The original static file currently has no `package.json`; these are browser-loaded dependencies:

| Dependency | Current source | Responsibility | Migration decision |
| --- | --- | --- | --- |
| Cormorant Garamond + Inter | Google Fonts | Display typography and UI copy | Self-host or keep with `font-display: swap`; preload only the weights used above the fold. |
| Three.js r134 | cdnjs | 3D bottle, brush, nail, particles in hero | Install `three`; load only inside the Hero 3D island. Upgrade separately after visual regression testing. |
| GSAP 3.12.5 + ScrollTrigger | cdnjs | Hero pinning, menu word reveal, section reveals | Install `gsap`; register ScrollTrigger only in the interactive motion module. |
| Lenis 1.1.13 | unpkg | Smooth scrolling and anchor scrolling | Install `lenis`; initialize once after first paint, respecting reduced-motion preference. |
| Native browser APIs | Built in | Canvas, IntersectionObserver, modal, booking UI | Keep dependency-free. |

### Recommended Astro dependencies

Install during the migration, not in the current static delivery:

```bash
npm create astro@latest nail-studio
npm install three gsap lenis zod
npm install -D typescript @astrojs/check
```

When server-rendered booking is introduced, choose the deployment adapter that matches the host. For a Node deployment:

```bash
npm install @astrojs/node
```

Optional additions only when needed:

- `@astrojs/sitemap` for production SEO sitemap generation.
- A database client matching the selected backend (for example, Prisma or a platform client). Do not choose this until hosting and data ownership are known.

## Target project structure

```text
nail-studio/
├── public/
│   ├── images/
│   └── videos/
├── src/
│   ├── components/
│   │   ├── layout/          # Nav, footer, shared section heading
│   │   ├── sections/        # Hero, About, Services, Gallery, Reviews, Booking, Location, CTA
│   │   └── islands/         # Hero3D, ScrollMotion, GalleryRail, BookingModal
│   ├── content/             # Static fallback data and CMS mappings
│   ├── lib/
│   │   ├── api/             # Typed backend clients only
│   │   ├── contracts.ts     # Booking, service, review and gallery types
│   │   └── motion.ts        # GSAP/Lenis lifecycle helpers
│   ├── pages/
│   │   ├── index.astro
│   │   └── api/             # Future API endpoints / proxy routes
│   └── styles/
│       ├── tokens.css
│       └── site.css
├── astro.config.mjs
└── package.json
```

## Performance plan — visual output must remain unchanged

1. Move the inline CSS to a cacheable stylesheet and the large inline JavaScript to deferred ES modules.
2. Keep static HTML server-rendered; load only the interactive modules required for each section.
3. Bundle Three.js, GSAP and Lenis through Astro/Vite rather than parser-blocking CDN script tags.
4. Delay service-video network requests until the services section is within a generous viewport margin. Preserve the same videos and overlay.
5. Create responsive WebP/AVIF image variants while keeping the current image crop, aspect ratio, and image order.
6. Keep the hero image high priority; lazy-load About and Gallery imagery.
7. Preserve `prefers-reduced-motion` fallbacks and pause off-screen animations/canvas work.
8. Do visual regression screenshots at desktop and mobile before replacing the source page.

## Backend boundary

The booking modal is currently a client-only demonstration. Keep its selection flow unchanged, but route its final confirmation through a typed API client when the backend exists.

Suggested contracts:

```ts
type BookingRequest = {
  date: string;
  time: string;
  serviceId: string;
  specialistId: string;
  customer: { name: string; phone: string; email: string };
};

type BookingResponse = {
  bookingId: string;
  status: 'confirmed' | 'pending';
};
```

Suggested endpoints:

- `GET /api/services`
- `GET /api/gallery`
- `GET /api/reviews`
- `GET /api/studio`
- `POST /api/bookings`

All service names, prices, specialists, opening hours, reviews, gallery images, and contact details should move from hard-coded page data into `src/content/` first, then a CMS or database behind these endpoints. Never expose payment keys, database credentials, or private staff data in browser code.

## Site map and focused upgrade prompts

Use one prompt at a time. Each prompt deliberately protects the existing palette, typography, section order, and motion language unless the requested change explicitly says otherwise.

### 1. Fixed navigation

**Current role:** Logo/wordmark, desktop anchors, social links, booking button, and responsive mobile panel.

**Prompt:**

```text
Modernise only the fixed navigation of The Nail Studio. Preserve its porcelain background, champagne accent colour, Cormorant Garamond wordmark, existing anchor labels, Book Now action, and mobile menu behaviour. Improve accessibility, keyboard focus, scroll-state clarity, and responsive spacing without changing any other section, page order, visual identity, or booking flow.
```

### 2. Hero

**Current role:** Full-viewport introduction with the 3D bottle/brush/nail animation, hero photo, title, CTAs, open-status line, and scroll hint.

**Prompt:**

```text
Refine only The Nail Studio hero. Keep the existing 3D bottle, brush, nail choreography, hero image reveal, title text, call-to-action labels, porcelain/champagne palette, and scroll-pinned behaviour. Improve loading strategy, WebGL resilience, accessibility, and mobile framing without changing the animation story, visual style, section height, or downstream sections.
```

### 3. About

**Current role:** Studio story, craft statistics, manicure photograph, and promise badge.

**Prompt:**

```text
Improve only the About section of The Nail Studio. Preserve the two-column editorial composition, existing copy hierarchy, three statistics, manicure image, promise badge, porcelain palette, and gentle reveal. Enhance readability, semantic structure, responsive layout, and image performance without changing content order or the rest of the website.
```

### 4. Services

**Current role:** Service menu over three muted treatment videos, with word reveal and animated service icons/cards.

**Prompt:**

```text
Modernise only the Services section of The Nail Studio. Preserve all eight service names, descriptions, prices, champagne translucent cards, white video veil, current video assets, and scroll-driven word/icon reveal. Improve video lazy loading, text contrast, keyboard accessibility, and small-screen behaviour without changing the palette, card grid logic, animation intent, or any other section.
```

### 5. Gallery

**Current role:** Two full-width nail-photo rails moving only while the visitor scrolls.

**Prompt:**

```text
Refine only the Gallery section of The Nail Studio. Preserve the two full-width opposing image rails, the existing nail images and captions, non-overlapping card lanes, and the rule that photos move only during user scrolling and stay still at rest. Improve image loading, touch support, reduced-motion fallback, and caption accessibility without changing the design language or affecting surrounding sections.
```

### 6. Reviews

**Current role:** Three customer-review cards with star ratings and citations.

**Prompt:**

```text
Improve only the Reviews section of The Nail Studio. Preserve the three-card editorial layout, champagne stars, quote-forward typography, existing review copy, and porcelain/greige palette. Enhance semantics, responsive stacking, and future CMS data mapping without changing any other part of the page.
```

### 7. Booking preview section

**Current role:** Booking explainer, feature list, and miniature calendar visual above the global booking modal.

**Prompt:**

```text
Modernise only the Booking preview section of The Nail Studio. Preserve the two-column layout, booking feature list, calendar visual, CTA behaviour, palette, and typography. Prepare its data and calls to action for a future POST /api/bookings endpoint without changing the current visual flow or touching the booking modal implementation.
```

### 8. Location and hours

**Current role:** Map placeholder, address, telephone/email links, and opening-hours table.

**Prompt:**

```text
Improve only the Location and hours section of The Nail Studio. Preserve the current map area, contact affordances, opening-hours table, warm palette, and responsive layout. Make the location data easy to replace from a CMS or backend, improve map accessibility and link semantics, and do not alter the rest of the page.
```

### 9. Final booking CTA

**Current role:** Dark closing section with warm radial glow and booking/contact buttons.

**Prompt:**

```text
Refine only the final booking call-to-action of The Nail Studio. Preserve the ink background, champagne glow, headline scale, existing action labels, and visual relationship to the footer. Improve conversion clarity and accessibility without changing the design system, earlier sections, or booking mechanics.
```

### 10. Footer

**Current role:** Brand, social links, studio details, and copyright.

**Prompt:**

```text
Modernise only The Nail Studio footer. Preserve its dark ink palette, centered brand treatment, social links, studio detail line, and compact hierarchy. Improve semantic navigation, link accessibility, and CMS-ready content mapping without changing preceding sections or the visual language.
```

### 11. Global booking modal

**Current role:** Five-step client-side booking demonstrator for date, time, service, specialist, and confirmation.

**Prompt:**

```text
Upgrade only The Nail Studio booking modal. Preserve its five steps, visual styling, keyboard-friendly dialog behaviour, current validation, and graceful demo experience. Replace only the final demo confirmation with a typed POST /api/bookings integration, add pending/error/success handling, and never expose secrets or alter the main page layout.
```

## Migration acceptance checklist

- Desktop and mobile screenshots match the existing page before optimisation.
- Hero 3D and scroll choreography still run smoothly.
- The Services word/icon reveal and Gallery scroll-only movement behave exactly as described.
- All images and video overlays retain their crop, colour, and contrast.
- Booking modal selection flow works without a backend, then uses the typed endpoint when one is added.
- Lighthouse and network checks confirm that noncritical media and JavaScript no longer block initial content.
