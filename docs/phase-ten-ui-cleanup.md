# Phase 10: UI cleanup

## Design grid

Only the Choose a design grid receives a bounded scrolling area. Design cards retain equal heights, the step heading remains outside the scrolling region, and the selected card keeps its accent state and checkmark. The largest real Hyperion Design group contains six options: it fits in two rows at desktop and tablet widths, while the third row scrolls inside the grid at 390 and 320 px. Choose a sign retains its page-flow grid and Show more behavior.

## Size contrast

The fixed nine-size matrix and its source-derived order are unchanged. Available sizes now use a white surface, dark navy text, a stronger blue-grey border and a light shadow. Unavailable sizes remain visible with a darker grey surface, muted readable text and native disabled semantics. Selected sizes retain the pale accent fill, orange-red border and checkmark.

## Removed UI and copy

The provisional Product Range component and stylesheet were removed from the rendered application and source tree. Its main-page import, header destination and scroll anchor were removed, leaving no empty section or broken link.

The Hero lookup paragraph, configurator subtitle and visible configuration-status helper line were removed. Essential titles, labels, errors and screen-reader progression status remain.

The footer navigation was removed. The footer now contains the Hyperion/DLV corporate identity, factual corporate names, localized Tax code, Address, Phone / WhatsApp / Zalo and Email labels, plus `© 2026 DLV Corporation. All rights reserved.` in consistent casing. Its corporate facts remain sourced from the Handypad reference.

## Validation

Automated validation covers the real six-design group, conditional Design overflow, selected-card visibility, fixed Size ordering, computed available/disabled/selected contrast, removal of Product Range and footer navigation, microcopy removal and horizontal overflow.

Responsive browser QA runs at 1440, 1280, 1024, 768, 390 and 320 px in English and Vietnamese. Screenshot patterns are:

- `phase-ten-design-{width}-{en|vi}.png`
- `phase-ten-size-{width}-{en|vi}.png`
- `phase-ten-footer-{width}-{en|vi}.png`

The existing search, Barcode presentation, Sign/Design/Size/Edition resolution, Add to Cart, sticky Order Summary and mobile order-panel regression suites remain enabled.

## Chat continuation refinement

The available Size state was given a stronger white/high-contrast surface and border while unavailable sizes use a darker neutral grey surface and muted readable text. This makes valid choices easier to identify at desktop glance without implying stock status. Footer contact text now uses normal (non-italic) styling and the Hyperion/DLV heading has tighter balanced typography; factual contact data is unchanged.
