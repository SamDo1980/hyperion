# HYPERION marine safety signs

Vite, modular vanilla JavaScript and CSS; static deployment to Cloudflare Pages. Search and the configurator share one cart and Order Summary, followed by Contact & Shipping and Payment. EN/VI checkout preserves source prices. Real payment providers remain external dependencies; simulation mode allows complete UI review without creating a confirmed payment. See [Phase 12](docs/phase-twelve-production-ux.md) for the checkout architecture.

Phase 7 added a continuous navy Order Summary with inset SKU rows and a compressed Search interface; current behavior and QA are documented in the Phase 12 report.

Phase 8 standardizes Design selection, requires explicit Size confirmation, combines Edition and purchase controls, and enlarges Search thumbnails. See [the Phase 8 report](docs/phase-eight-configurator.md).

Phase 9 adds Barcode presentation, compact locked roadmap steps, a responsive Sign grid with Show more, Product Range browsing and the adapted Handypad footer. See [the Phase 9 report](docs/phase-nine-roadmap.md).

Phase 10 removes the provisional Product Range, bounds large Design grids, increases Size availability contrast, simplifies the footer and removes redundant interface copy. See [the Phase 10 report](docs/phase-ten-ui-cleanup.md).

Phase 16 completes top-down checkout gating, approved Bank Transfer details/copy actions, the Handypad-style language control, CONTACT SALES with validated enquiry modal, the approved favicon, and fixed deposits of US$5 (EN/USD) / 130,000 ₫ (VI/VND). See [the Phase 16 report](docs/phase-sixteen-checkout-flow-contact.md).

For a concise source-of-truth map, see [Collaborator Guide](docs/COLLABORATOR_GUIDE.md).


## Catalogue download

The customer-facing catalogue is stored at `public/assets/hyperion-catalogue-en.pdf`. Both EN and VI interfaces use this same PDF. The header `CATALOGUE` link and the `View Catalogue` CTA in the Sign Construction section download it as `HYPERION-Marine-Safety-Signs-Catalogue.pdf`.

## Run and build

Use Node 22.12+:

```sh
npm ci
npm run dev
npm run build
npm run preview
```

Cloudflare Pages: `npm run build`, output `dist`, Node 24. Include the workbook in build inputs; deploy only `dist`. XLSX tooling and audit files are not loaded in the browser.

## Product master and generation

Only `references/Hyperion_Product_Master.xlsx` is accepted. Missing sources, overrides, broken relationships and failing workbook QA stop generation; there is no old-workbook or JSON fallback.

- Config and QA Report establish identity, currencies and review flags.
- SKU Master supplies all 308 sellable records, with barcode identity.
- Master Index supplies 154 families and their Standard/Outdoor pairs.
- Taxonomy Map, Category Summary and Catalogue Index are cross-checked against the actual products.
- Raw Source is audit-only, retained in `data/source-workbook.json` alongside all other worksheet fields.

Original names/descriptions and normalized display names remain separate and unchanged. Direction, Size and Size Display come directly from the normalized columns. EN uses Sales Price USD; VI uses Sales Price VND. No browser conversion or inventory inference occurs. SKU-specific Vietnamese wording is preserved even where it differs from the family row.

| Category | IMPA | Families | SKUs |
| --- | ---: | ---: | ---: |
| Lifesaving Signs (LSS/LSA) | 70 | 70 | 140 |
| Means of Escape Signs (MES) | 53 | 57 | 114 |
| Emergency Equipment Signs (EES) | 16 | 16 | 32 |
| Mandatory Signs (MSS) | 10 | 10 | 20 |
| General Shipboard / Port & Leisure Signs | 1 | 1 | 2 |
| Total | 150 | 154 | 308 |

The retired classification generator and cached analysis have been removed. The application uses Customer Category and Product Concept directly, without semantic aliases or inferred direction. Historical phase reports describe earlier implementations, not the current master.

## Code responsibilities

| Files | Responsibility |
| --- | --- |
| `scripts/build-products-data.js` | Single-source generation |
| `scripts/lib/master-workbook.js` | Schema, QA, identity, counts and relationship validation |
| `scripts/lib/customer-taxonomy.js` | Source categories, concepts and branch definitions |
| `src/data/products.json`, `families.json`, `taxonomy.json`, `configurator.json` | Generated runtime data |
| `data/source-workbook.json`, `product-data-report.json` | Full audit snapshot, review flags and source wording differences |
| `src/configurator/filter-engine.js`, `progressive-flow.js` | Existing candidate engine and progressive selection controller |
| `src/components/configurator-step.js`, `product-configurator.js` | Expanded selectors, filters and exact-SKU purchase block |
| `src/components/order-summary.js`, `order-row.js` | Saved order, desktop sticky card and mobile sheet |
| `src/cart/cart-store.js`, `order-totals.js` | Shared barcode cart, quantity persistence and currency totals |
| `src/components/product-search.js`, `src/lib/search-presentation.js` | Independent compact lookup and safe shared-family presentation |

## Selection and purchase contracts

Category > Sign > visual Design when multiple families remain > explicit Size > Edition and purchase. Direction stays in normalized data and design metadata, without a separate selector. A singleton Design may skip; Size always requires confirmation; a singleton Edition may auto-select. The progressive controller owns this UI policy without changing generated taxonomy.

Completed selectors remain expanded with selected styling/checkmarks. Inline filters stay visible and preserve their query. Earlier selections recompute candidates, remove incompatible choices and retain valid downstream values. Reset clears selections and inline filters. An unresolved required step cannot expose a purchase action.

The final numbered Edition card owns product identity, edition buttons, source price, quantity, subtotal and Add to Cart. Edition changes update the same card and button in place, preserve quantity and resolve a real barcode. Search semantics, family grouping, eight-SKU batching and Show more remain unchanged. Search thumbnails use contained artwork at 68/60/52 px on desktop/tablet/mobile.

`cart.add(idOrProduct, quantity)` resolves canonical data by barcode. Same barcode merges quantity; different barcodes remain distinct even when internal references overlap. `setQuantity` edits existing rows, `remove` deletes them. Persisted IDs and quantities are revalidated on reload/language change. Source prices determine totals in currency minor units.

Order Summary subscribes to the shared cart and checkout state. Navy header/footer, orange top border, exact thumbnails and light alternating rows provide hierarchy. Distinct SKU count, total units and totals update with additions, quantity edits and removal. Amount due now becomes primary after an amount choice. Desktop sticking spans Lookup through Payment and stops before the footer, with an internally scrolling item list. Mobile uses the fixed bottom bar and keyboard-accessible dialog. Lookup and configurator share the same cart.

## Source review

IMPA 334153 Telephone remains in Emergency Equipment Signs with the workbook's Medium confidence and REVIEW flag. Known English source conflicts use the workbook's normalized decisions without reinterpretation. Some source Vietnamese descriptions/concepts differ between editions or family rows; these remain verbatim and are recorded in `data/product-data-report.json`. Concepts with several family-level Vietnamese labels display all supplied labels rather than inventing a translation.

The named Handypad V70 archive is absent. The supplied Handypad Order Summary and numbered screenshots provide the design reference for hierarchy and sticky behavior.

## Validation

```sh
npm test
npm run build
npm run test:browser -- --preview
```

Browser tests use installed Chrome and a dedicated Vite server on port 5174. A restricted Windows environment may require permission to launch Vite/Chrome. Unit tests can alternatively run after data generation with `node --test --test-isolation=none tests/catalogue.test.js tests/configurator.test.js`.

The current automated suite covers workbook preservation, corrupted-master rejection, category counts, all 308 reachable barcodes, valid downstream retention, explicit Size confirmation, unified designs, singleton Edition behavior, source direction/size/price, search semantics and cart editing/persistence. Browser coverage includes the five categories, expanded selectors, main purchase placement, shared additions, zebra rows, counts/totals, long-cart scrolling, sticky boundaries, mobile dialog and EN/VI at 1440/1280/1024/768/390/320. Results and screenshots are written to ignored `test-results/` only after a successful production-preview run.
