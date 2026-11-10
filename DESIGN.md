---
name: Serag Lashes
description: Kohl world in the brand box colours — white ground, kohl ink, the box pink; the real box leads.
colors:
  stone: "#fcfcfc"
  stone-2: "#fde8ee"
  kohl: "#0a0a0a"
  kohl-2: "#171717"
  copper: "#f8a5b7"
  copper-deep: "#d9607d"
  muted: "#4d4d4d"
  line: "#0a0a0a1f"
  on-kohl-muted: "#bdbdbd"
typography:
  display:
    fontFamily: "Albert Sans, Readex Pro, Heebo, system-ui, sans-serif"
    fontSize: "5.5rem"
    fontWeight: 400
    lineHeight: 1.02
    letterSpacing: "-0.025em"
  heading:
    fontFamily: "Albert Sans, Readex Pro, Heebo, system-ui, sans-serif"
    fontSize: "3.75rem"
    fontWeight: 400
    lineHeight: 1.05
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Albert Sans, Readex Pro, Heebo, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.75
  label:
    fontFamily: "Albert Sans, Readex Pro, Heebo, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 500
rounded:
  sm: "8px"
  md: "12px"
  lg: "20px"
spacing:
  section: "112px"
  section-phone: "80px"
  gutter: "20px"
  gutter-wide: "32px"
components:
  wordmark:
    typography: "Cormorant Garamond 600, lowercase (the box lettering)"
  button-primary:
    backgroundColor: "{colors.kohl}"
    textColor: "{colors.stone}"
    rounded: "{rounded.sm}"
    padding: "14px 32px"
    height: "56px"
  button-primary-hover:
    backgroundColor: "#2a2a2a"
  button-ink:
    backgroundColor: "{colors.copper}"
    textColor: "{colors.kohl}"
    rounded: "{rounded.sm}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.kohl}"
    rounded: "{rounded.sm}"
  product-frame:
    backgroundColor: "{colors.stone-2}"
    rounded: "{rounded.md}"
  hero-frame:
    backgroundColor: "{colors.stone-2}"
    rounded: "{rounded.lg}"
  kohl-band:
    backgroundColor: "{colors.kohl}"
    textColor: "{colors.stone}"
---

## Overview

Lashes are chosen the way kohl is applied: on the eye, in one deliberate stroke. The colours come
from the real Serag Lashes box: a white ground (the photograph's own white, so the box sits on the
page without a frame), kohl-black ink for type, lines and the primary action, and the box's pink
`#f8a5b7` as the field colour (surfaces, the gift card, dots). The real box leads the first screen
with its four printed facts beside it. Arabic leads (right to left); Hebrew and English follow.

## Colors

- **White** `#fcfcfc` is the page (it matches the product photograph's background).
- **Kohl** `#0a0a0a`: all text, hairlines (`line`, 12% kohl), the primary button (white text) and
  the one dark band (the lash-map band, the footer). On kohl, secondary text is `#bdbdbd`.
- **Box pink** `#f8a5b7`: fields with kohl text (gift card, card lids, pink frames `#fde8ee`), fact
  dots. Never text on white; small marks on white use `#d9607d`.
- Muted text `#4d4d4d` (8.5:1, passes the 7:1 body rule). Sale prices `#b8325a`.

## Typography

One quiet sans in two weights per script: Albert Sans (Latin), Readex Pro (Arabic), Heebo (Hebrew).
The wordmark alone uses Cormorant Garamond 600 in lowercase, matching the lettering on the box.
Display and headings 400 with -2.5% tracking (none for Arabic and Hebrew, which would break
joins); labels and buttons 500; body 400 at 18px/1.75 for leads, 15–16px in UI. Sentence case.

## Layout

`max-w-7xl` container with 20px gutters (32px from 640px). Sections breathe at 112px (80px on
phones). The first screen is a two-column split on desktop (copy and action at the reading start,
the lash on the eye opposite) and stacks copy first on phones. Product grid: two columns on phones,
three from 1024px.

## Elevation & Depth

Flat. Depth comes from the stone-2 frames on stone and from the single kohl band; no shadows,
gradients or glows. Inset hairlines use `ring-1 ring-line` or a 1px kohl outline.

## Shapes

8px buttons and badges, 12px product frames and inner trays, 20px hero frame and kohl panels. Photos
are framed squarely inside these radii.

## Components

- **Kohl stroke** (`components/kohl.tsx`): a tapered SVG line that draws once from the reading
  start (`clip-path` reveal). On load under the hero headline; on hover/focus of a `.kohl-trigger`
  ancestor (product names, "See all" links, lash-map items). Static under reduced motion.
- **Lash call-outs**: copper dot, 1px kohl leader line, label (muted 12px) over value (16px/500),
  pinned to real attributes only (style, lash map). Absolute on the hero frame from 768px; a plain
  stacked list on phones.
- **Product card**: stone-2 frame (12px) with the box or photo, name (16px/500), kohl stroke on
  hover, "style · map" line, price, copper 44px add button (8px). No border, no glare.
- **Buttons**: primary copper; ink for secondary actions on stone; ghost = 1px kohl outline.
  Press scales to 0.97 in 160ms; hover changes colour only on real pointers.

## Do's and Don'ts

- Do lead with the real box photograph on white; add the owner's model photographs (the lash on
  the eye) when they arrive.
- Do keep one black primary action per screen; pink is a field, not a button colour on white.
- Don't add eyebrow labels above headings, gradient text, glows, carousels or scroll-triggered fades.
- Don't put captions under pictures; product name and price live in the copy column.
- Don't invent attributes for call-outs (no lengths or occasions the catalog does not hold).
