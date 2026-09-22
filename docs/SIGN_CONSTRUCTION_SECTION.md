# Sign Construction section

This marketing section is intentionally isolated from the Phase 16 commerce flow.

## Files
- `src/components/sign-construction.js` — semantic DOM and copy for the section.
- `src/styles/sign-construction.css` — styles scoped to `.sign-construction` only.
- `src/assets/sign-construction/sign-construction-bg.png` — approved light marine background.
- `src/assets/sign-construction/sign-construction-visual.png` — approved layered sign visual; includes the required Handyman logo.
- `references/sign-construction-mockup.png` — approved visual reference supplied for implementation.

## Placement
`src/main.js` inserts `createSignConstructionSection()` directly after `createHero()` and before the existing shopping workflow.

## Maintenance rule
Do not move configurator, search, cart, checkout, or order-summary code into this component. If the section changes later, edit this component/CSS only so the existing storefront logic remains easy for collaborators to trace.
