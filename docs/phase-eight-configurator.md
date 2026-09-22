# Phase 8 — consistent configurator and larger Search thumbnails

## A. Configurator standardization

Before: Category → Sign → optional Direction/wording → optional Size → optional Design → Edition → separate selected-product panel.

Now: Category → Sign → Design (when multiple families remain) → explicit Size → Edition and purchase.

Direction remains unchanged in normalized data and can appear in design metadata. It no longer creates a customer-facing step. The progressive controller owns the shopping-step policy; generated taxonomy and concepts are unchanged. The existing candidate engine continues to filter actual products.

Every concept's displayed family count matches its complete Design option count. Lifeboat exposes five real family cards together; Line Throwing Appliance exposes two. Cards retain source thumbnails, display labels, IMPA and reference, with dimensions and source direction to distinguish otherwise similar families. No families are merged or fabricated.

Size always appears, including the single-size case, and requires a click before Edition can appear. Previously confirmed sizes can remain selected after an upstream edit only when still valid, as requested. A singleton Design can skip; a singleton Edition can auto-select. Changing to a design with a different size clears the incompatible size and blocks purchase until confirmation. Completed grids, filters, checkmarks and one-click switching remain.

## B. Final purchase card

Added `src/components/edition-purchase.js`. One numbered Choose edition fieldset contains the current product identity, edition buttons, source unit price, quantity, subtotal and Add to Cart. The standalone Your selected sign panel is removed from the rendered UI.

Before Edition selection the card shows real family product information, asks for the edition-specific reference/price, and disables purchasing. Once resolved, it displays the canonical SKU's image, localized name, IMPA, dimensions, reference and source price. Standard/Outdoor switching updates those fields in place; the final card, quantity input and Add button are retained. Quantity persists and subtotal updates immediately. Submission checks the current resolver barcode before calling the unchanged shared cart API.

Desktop and mobile use the same component. The compact two-column price/quantity and subtotal/Add layout fits down to 320 px. In the tested edition-switch case, button position and card height remain unchanged. Mobile Order Summary and its saved-cart-only purpose are untouched.

## C. Search thumbnails

- Desktop, 1024 px and above: 68 × 68 px.
- Tablet, 701–1023 px: 60 × 60 px.
- Mobile, up to 700 px: 52 × 52 px.

Applied to individual results and shared family thumbnails. Existing `object-fit: contain` centers square and wide signs without cropping. Row padding was not increased. Broad-search measurements: approximately 99 px maximum row height at desktop/tablet widths, 153 px at 390 and 172 px at 320. Bounded result regions remain 520 px desktop/tablet and 500 px mobile. Matching, family grouping, batching, Show more and cart integration are unchanged.

## D. Validation

- 27/27 automated unit tests pass.
- Production build passes.
- Production-preview browser suite passes at 1440, 1280, 1024, 768, 390 and 320 px, including EN/VI regression checks.
- Exhaustive traversal still reaches all 308 real barcodes.
- All concepts are checked for family count versus Design options and explicit Size confirmation.
- Tested Lifeboat, Line Throwing Appliance, Emergency Eye Wash, multiple-size Straight Arrow families, normalized direction variants and each category.
- Verified no standalone Direction selector or selected-sign panel, exact edition identity/reference/image/price/subtotal, retained quantity and stable card/Add DOM identity.
- Existing shared-cart merge/removal/quantity/totals, persistent selectors, compact Search, long-order scrolling, sticky boundaries and mobile summary tests pass.
- No JavaScript errors, broken local requests or horizontal overflow. The reported remote image failure is the deliberate fallback test.
- SHA-256 checks confirm no changes to the master workbook, four runtime data files, Order Summary component or Order Summary stylesheet.

Screenshots under `test-results/`:

- `phase-eight-lifeboat-designs.png`
- `phase-eight-line-throwing-designs.png`
- `phase-eight-size-unselected.png`
- `phase-eight-size-selected.png`
- `phase-eight-edition-standard.png`
- `phase-eight-edition-outdoor.png`
- `phase-eight-final-390.png`
- `phase-eight-final-320.png`
- `phase-eight-search-334152-1440.png` — square sign
- `phase-eight-search-334480-1440.png` — wide sign
- `phase-eight-search-334152-390.png`
- `phase-eight-search-334480-390.png`

Existing six-width EN/VI configurator, Search and Order Summary screenshots were regenerated. Machine evidence is in `browser-report.json` and `phase-eight-source-hashes.json`.

Changed: progressive controller, configurator/selector presentation, new Edition/purchase component, purchase and Search-result CSS, two locale strings, unit/browser tests and documentation. No master, taxonomy, identity, Search semantics, cart calculations, header, Order Summary or additional site features were changed. No unresolved Phase 8 regressions were found.
