# Client Presentation Website Customisation Prompt

Copy this prompt into an AI coding agent, then replace the bracketed placeholders.

```text
You are customising an existing presentation website for one individual client.

Goal: create a polished client-specific mock-up that keeps the current website structure, responsive layout, interactions, animation timing, and technical behaviour unchanged. Change only client-facing visual content and presentation data.

## Client brief

- Business name: Moonlight Nails and Spa
- Short descriptor/tagline: Nail Salon
- Industry: Nail Salon
- Location: Carlow, Ireland
- Brand personality: Luxury-Calm
- Primary colour: white
- Accent colour: gold
- Light/background colour: light grey
- Main contact telephone: 089 255 5370
- Main contact email: Moonlightnailspa@yahoo.com
- Website/social URLs: facebook: https://www.facebook.com/p/Moonlight-nail-spa-100065363355123/ instagram : https://www.instagram.com/moonlight_nail_spa
- Opening hours: mon-fri 9:00-19:00 sat: 10:00-18:00
- Booking CTA label: [E.G. BOOK A CONSULTATION]

## Content to replace

1. Replace every visible business name, logo text/initial, tagline, contact detail, address, opening hour, and social URL with the client brief.
2. Replace all placeholder photos, video clips, gallery items, and image alt text with the supplied client media. Preserve the current image aspect ratios, crop treatment, lazy loading, and animation behaviour.
3. Replace service names, descriptions, durations, and prices with the client’s offering. Keep the existing number of cards and card layout unless the brief explicitly requests otherwise. If fewer services are supplied, use believable presentation placeholders clearly marked as editable.
4. Replace reviews, customer names, gallery captions, about copy, location copy, booking copy, and final CTA copy with client-appropriate presentation content.
5. Update the palette, decorative accents, buttons, borders, overlays, and typography only within the client’s stated visual direction. Maintain adequate contrast and preserve the existing design system’s hierarchy.

## Non-negotiable rules

- Do not change page section order, HTML structure, responsive breakpoints, navigation behaviour, booking flow, scroll effects, hero animation, gallery movement, or modal interaction.
- Do not remove performance behaviour such as lazy loading, reduced-motion support, deferred scripts, or media optimisation.
- Do not add a new framework, package, database, payment provider, analytics tool, or external integration.
- Do not claim that the mock-up performs real bookings, sends messages, accepts payments, or uses real customer data. Keep demo notices where applicable.
- Do not use copyrighted client media unless it has been supplied or explicitly approved. Use clearly labelled placeholders when assets are missing.
- Preserve accessibility: meaningful alt text, visible focus states, semantic headings, readable contrast, and accessible button/link labels.

## Required output

1. Apply only the requested content and visual customisation changes.
2. Provide a concise change log grouped as:
   - Brand and contact details
   - Services and pricing
   - Media and gallery
   - Copy and calls to action
   - Visual palette
3. List any missing client assets or decisions as `Needs client input`.
4. Confirm that structure, animations, responsive layout, and demo booking behaviour were preserved.

## Media inventory supplied by client

- Logo: just do text
- Hero image/video: [PATH OR URL]
- About image: [PATH OR URL]
- Service background videos: [PATH OR URLS]
- Gallery images: [PATH OR URLS]
- Map/location image, if required: [PATH OR URL]
```

## Suggested use

For a fast mock-up, provide the client brief plus at least a logo, one hero asset, three gallery images, service list, and contact details. The agent should leave any unsupplied fields visibly editable rather than inventing real-world facts.
