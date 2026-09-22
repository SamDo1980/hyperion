# HYPERION selective marine visual layer

This repository keeps the Phase 16 checkout/search/configurator implementation as the functional source of truth.

## Non-negotiable rule

The approved Hyperion screenshots are **visual references only**. They do not authorize removing or disabling an existing element, CTA, workflow step, data field, validation rule, search behavior, cart behavior, checkout behavior, locale control, or responsive interaction.

If a functional element exists in the Phase 16 baseline but is absent from a mockup, **keep the element and style it to fit the approved marine concept**. In particular, the desktop `CONTACT SALES` CTA remains part of the header.

## Scope of this pass

Only visual treatment was migrated:

- pale sky header background
- blue-hour ship-deck hero background
- pale blue-white page surface
- marine navy / sky-blue / Handyman red palette
- cleaner technical cards, borders and shadows
- unified red selected-state treatment
- short/tall marine Order Summary backgrounds
- marine footer background
- existing modals and non-mockup CTAs visually harmonized instead of removed

No product data, pricing, IMPA/barcode data, wording, EN/VI content, selection logic, cart logic, deposit/payment logic, validation, sticky-summary behavior, or information architecture was intentionally changed.

## Asset ownership

Theme assets live in `src/assets/theme/`. Approved screenshots are retained in `references/marine-theme/` for visual QA.

## Styling ownership

`src/styles/marine-theme.css` is imported last from `src/main.js`. Keep future marine visual overrides there unless the change is genuinely component-specific. Do not use the theme layer to rewrite workflow logic.
