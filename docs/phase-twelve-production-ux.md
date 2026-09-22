# Phase 12 — production checkout UX

This records Phase 12. Current payment modals, simulation mode, validation and country selection are documented in [Phase 13](phase-thirteen-checkout.md).

## Phase 11 carry-over

The app now has one editable HTML entry (`index.html`) and one application source tree (`src/`). `OPEN_UI_FAST.html` remains a redirect-only launcher. `quick-preview/index.html` and `dist/index.html` are generated outputs. AGENTS.md explicitly forbids treating those outputs as source. `QUICK_PREVIEW.html` was an obsolete embedded copy of the earlier application/catalogue; it was removed with the duplicate `OPEN_UI_FAST.txt` and `HOW_TO_PREVIEW.txt` instructions. The maintained quick-preview instructions live in `README-QUICK-PREVIEW.md`. Run `npm run build:quick-preview` to regenerate the static preview from source.

The quantity bug came from a 178px minimum-width purchase wrapper combined with `width: 100%` on a control whose three children occupied only 132px. The shared control now shrink-wraps exactly three fixed 44px segments, with a 1px outer border. Search, configurator and summary reuse the same control. Narrow content columns use a balanced two-by-two purchase layout; wider columns retain Unit price / Quantity / Subtotal / Add to Cart in one row.

The same Order Summary is mounted once by `main.js`, beside a shared shopping column containing Product Lookup, search results, configurator and checkout. It is sticky from Lookup through Payment at desktop/tablet widths and bounded by the shopping container before the footer. Below 768px its existing bottom bar/modal sheet remains available from Lookup onward. Search ADD changes the shared summary immediately without scrolling or creating another cart. Item-row styling and thumbnail/name/Size/Edition/IMPA content are preserved.

## Availability and payment UX

Production config remains `apiBase: null`, `depositVND: null`, with all three method flags false. Service capabilities require both an API base and an explicit true flag for each method. The store rejects unavailable method selections and excludes them from `canPay`; disabled UI is not the only guard. Invalid restored selections are cleared while contact and shipping data are preserved.

VND Deposit is visible but disabled with “Hiện chưa khả dụng” until finance supplies a positive integer `depositVND`. Full VND product payment remains an available amount choice even when no payment method is ready. An approved deposit automatically enables the choice and displays its actual VND value, capped at the product subtotal. There is no runtime exchange conversion. USD deposit remains `min(5, merchandiseSubtotal)`, and remaining balance stays nonnegative.

Configuration errors are mapped to concise customer availability wording. No customer-visible “Configuration required”, “Cần cấu hình”, or backend setup instructions remain. Unsupported methods show “Currently unavailable” / “Hiện chưa khả dụng”, cannot be selected, and show no action CTA. Available methods in the test harness retain selection, loading and method-specific actions. Production methods have not been artificially enabled.

Card retains the supplied local Visa/Mastercard marks on the same row as its name. ZaloPay has a neutral wallet icon; Bank Transfer / VietQR has a neutral bank icon. No external artwork or invented brand mark was introduced. Each card shows its availability/selection state.

The financial breakdown sits between the amount decision and method decision. In the Order Summary, Estimated total is primary before an amount choice. After a valid deposit/full choice, Amount due now becomes primary; merchandise subtotal, shipping TBD and remaining product balance are secondary. The mobile bar uses the explicit Amount due now label, and the expanded sheet keeps the same hierarchy.

The later copy-removal request is included: the Shipping fee / To be confirmed support row below the contact form and the two payment guidance lines were removed. Shipping TBD is retained where financially necessary: the payment breakdown, Order Summary and confirmation.

## Shipping, state and security

No fields or fixture defaults were added. A clean production session begins with blank customer/shipping fields. Optional company, international phone validation, email validation, local persistence and cart-change recalculation continue to work. Switching product/edition or modifying cart quantities does not clear customer input.

Phase 11 response validation, idempotency and stale-response handling are retained. Only a matching service-confirmed transaction and paid amount show Deposit received or Payment received. Pending has neutral status styling and never displays the green confirmation panel. Confirmation includes order reference, amount paid, method, shipping TBD and deposit balance where applicable. Payment/CRM/email credentials, bank details and fake live processing are not supplied.

## Test coverage and artifacts

`npm test` retains the catalogue/configurator/security tests and adds entry ownership, blank form, availability and approved VND-deposit cases. `npm run test:checkout:browser` runs the existing checkout checks plus `tests/browser-phase-twelve.js`, exercising Search buyer, Configurator buyer and multi-SKU buyer at 1440, 1280, 1024, 768, 390 and 320 in EN/VI. It verifies the single summary, no Search ADD scroll, exact three-segment geometry in all purchase contexts, financial hierarchy, disabled options, customer copy, persistence, no page overflow and footer boundaries.

`npm run test:checkout:service` uses test-only injected capabilities and intercepted HTTP responses for available-method selection, pending, failed retry, rejected mismatched confirmation, confirmed deposit/full payment and an approved VND-deposit fixture. The fixture amount is not production configuration. `node tests/browser.js --preview` retains the earlier search, fixed-size, configurator, cart and footer regressions; summary selectors now address its new shared parent.

Reports: `test-results/phase-twelve/report.json`, `test-results/phase-eleven/report.json`, `test-results/phase-eleven/service-report.json`, `test-results/browser-report.json`.

Phase 12 screenshot families under `test-results/phase-twelve/`:

- `lookup-empty-{width}-{lang}.png`, `search-added-{width}-{lang}.png`
- `quantity-{width}-{lang}.png`
- `shipping-blank-{width}-{lang}.png`, `shipping-restored-{width}-{lang}.png`
- `payment-full-{width}-{lang}.png`, `summary-full-{width}-{lang}.png` (VI also shows disabled Deposit)
- `payment-deposit-{width}-en.png`, `summary-deposit-{width}-en.png`
- `available-method-selected-test.png`, `payment-pending-test.png`, `deposit-confirmed-test.png`, `full-confirmed-test.png`, `vnd-deposit-configured-test.png`

Real external dependencies remain: approved VND deposit, order/payment backend, verified card/ZaloPay providers, trusted bank/VietQR details, and backend sales/email/CRM delivery.

## Source changes

- Entry ownership and instructions: `AGENTS.md`, `README.md`, `README-QUICK-PREVIEW.md`, `package.json`; removed `QUICK_PREVIEW.html`, `OPEN_UI_FAST.txt`, `HOW_TO_PREVIEW.txt`.
- Shared layout and hierarchy: `src/main.js`, `src/components/product-search.js`, `src/components/product-configurator.js`, `src/components/order-summary.js`.
- Checkout availability/presentation: `src/checkout/config.js`, `src/checkout/payment-service.js`, `src/checkout/checkout-store.js`, `src/components/order-completion.js`, `src/lib/dom.js`, `src/lib/locale.js`.
- Styling: `src/styles/product.css`, `src/styles/configurator-purchase.css`, `src/styles/configurator-steps.css`, `src/styles/search-results.css`, `src/styles/order-summary.css`, `src/styles/checkout.css`. The narrow tablet Design grid uses two columns so its source metadata stays within each card.
- Tests: `tests/checkout.test.js`, `tests/browser-checkout.js`, `tests/browser-checkout-service.js`, `tests/browser-phase-twelve.js`, `tests/browser-order-summary.js`, `tests/browser-polish.js`, `tests/browser-phase-ten.js`, `tests/browser-search-density.js`. Density assertions use the actual available column layout, since Search now shares desktop/tablet width with the summary.
- This report, a pointer from `docs/phase-eleven-checkout.md`, and regenerated build/preview outputs. Master workbook, product data, source prices and mapping values are unchanged.

## Verified results — 20 September 2026

- 50 automated unit/catalogue/configurator/checkout checks passed.
- Production and relative-path quick-preview builds passed.
- Production checkout plus Phase 12 journeys passed at six widths × EN/VI, with no JavaScript errors or failed local requests. The Phase 12 audit generated 96 journey screenshots; the existing checkout audit generated 38 additional screenshots.
- Service/UI integration passed, including rejected mismatched confirmations, pending, failed retry, confirmed deposit/full payment and configured VND deposit. Five additional screenshots explicitly use test-only service fixtures.
- OPEN_UI_FAST launcher, nested preview asset paths, cart add and language switching passed in Chrome.
- The complete existing production-browser regression suite passed: search, all configurator paths, fixed Size matrix, cart merging/editing, sticky/modal summary, footer and EN/VI. There were no JavaScript errors or failed local requests; the single remote image failure was the deliberate fallback test.
- All seven audited files, including the master workbook and generated catalogue/data files, retain their original hashes. No QA names, addresses, email addresses or fixture deposit values are present in production source.

## Revalidation of the repeated Phase 12 brief — 20 September 2026

The current implementation was inspected against the resubmitted brief after reading AGENTS.md and the Phase 11 document. No additional application-source changes were needed. The entry-point rules, three-part quantity controls, single shared summary, availability guards, customer copy, amount hierarchy and shipping persistence are present in source and covered by the rerun checks.

All 50 automated tests passed again. Both production and relative-path preview builds passed. Checkout journeys passed at all six requested widths in EN/VI, regenerating 96 Phase 12 journey screenshots and 38 existing checkout screenshots. The service harness passed and regenerated five test-only payment-state screenshots. The complete production browser regression suite and OPEN_UI_FAST launcher check also passed, with no JavaScript errors or broken local requests. The only remote image failure was intentionally induced by the fallback test. Workbook and catalogue hashes remain unchanged.

This revalidation updates this report and regenerates build/preview and QA artifacts only. Payment providers remain disabled in production until trusted backend capabilities are supplied; successful fixture transactions are not live payment integrations.
