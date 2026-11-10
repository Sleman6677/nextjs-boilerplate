---
name: Serag Lashes
description: Kohl world — stone ground, kohl ink, one copper accent; the lash shown on the eye.
colors:
  stone: "#eeeeeb"
  stone-2: "#e1e1dd"
  kohl: "#1c1d1f"
  kohl-2: "#28292b"
  copper: "#c2501b"
  copper-deep: "#a8441a"
  muted: "#5c5e62"
  line: "#1c1d1f2e"
  on-kohl-muted: "#c4c4bf"
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
  button-primary:
    backgroundColor: "{colors.copper}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "14px 32px"
    height: "56px"
  button-primary-hover:
    backgroundColor: "{colors.copper-deep}"
  button-ink:
    backgroundColor: "{colors.kohl}"
    textColor: "{colors.stone}"
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

Lashes are chosen the way kohl is applied: on the eye, in one deliberate stroke. The ground is
stone, type and lines are kohl ink, and copper (the kohl jar) is spent only on the primary action
and active states. The page shows the lash on the eye first and names its real attributes with
leader-line call-outs. It refuses both the pink-nude beauty template and its black-and-gold opposite.
Arabic leads (right to left); Hebrew and English follow the same system.

## Colors

- **Stone** `#eeeeeb` is the page; **stone-2** `#e1e1dd` holds product and hero frames.
- **Kohl** `#1c1d1f` is all text, hairlines (`line`, 18% kohl) and the one dark band per page
  (the lash-map band, the footer). On kohl, secondary text is `#c4c4bf`.
- **Copper** `#c2501b` is the primary action (white text, 4.6:1), the call-out dots and perk icons.
  Never body text, never a large field except the gift card.
- Muted text `#5c5e62` (5.9:1 on stone). Sale prices use `copper-deep`.

## Typography

One quiet sans in two weights per script: Albert Sans (Latin), Readex Pro (Arabic), Heebo (Hebrew).
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

- Do show the lash on the eye before anything else; replace the drawn lash with the owner's real
  model photograph when it arrives, keeping the call-outs.
- Do keep copper to one primary action per screen.
- Don't add eyebrow labels above headings, gradient text, glows, carousels or scroll-triggered fades.
- Don't put captions under pictures; product name and price live in the copy column.
- Don't invent attributes for call-outs (no lengths or occasions the catalog does not hold).
