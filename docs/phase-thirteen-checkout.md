# Phase 13 — payment UX, validation and checkout polish

## Audit and completion

The interrupted implementation already contained the decision-only Payment panel, vertical methods, simulation mode, modal shell, card validation, searchable Country field, shorter search copy and compact toast. Its 55 unit/data/security checks and service-contract browser checks passed. It had not completed the responsive modal audit, updated all former availability expectations, refreshed the quick preview or produced this report.

The continuation adds the complete Phase 13 browser audit, customer-safe error fixture, unobstructive toast positioning, responsive modal amount layout, updated regression expectations and this handoff. It also updates the ZaloPay image reference to the supplied `public/assets/Zalopay-logo.png` after the former WebP asset was replaced, with explicit decoded-image checks. Current verification results are recorded below.

## A. Payment information architecture

Payment contains the amount choices, method choices and method interaction. The repeated financial breakdown has been removed. The shared Order Summary remains the financial source: Estimated total before an amount choice, Amount due now afterward, then merchandise subtotal, shipping to be confirmed and remaining balance. It has no Payment option / Lựa chọn thanh toán row. Financial details use the existing 14px informational-copy token at every width, brighter labels and 12px row gaps; the primary amount remains larger.

Full payment reads “Full product amount, excluding shipping” with its Vietnamese equivalent. USD deposit remains capped at `min(5, merchandiseSubtotal)`. VND deposit still requires an approved amount; no exchange rate is calculated.

## B. Methods and mode

The three methods are equal-height, full-width vertical rows at every breakpoint, with a stable selected border/background and radio-like state indicator. The supplied local logos remain after their labels, following the earlier explicit logo-order request.

`src/checkout/config.js` explicitly selects `paymentMode: 'simulation'` for the current review build. All three UI flows are selectable in that mode. Simulation uses a separate, memory-only `simulationStatus`; it never invokes the live service, generates an order/transaction ID, emits a success event, writes a payment attempt, or changes the trusted order payment status to confirmed. Cart/contact/choice changes invalidate pending simulation work using the existing revision guard.

Setting `paymentMode: 'live'` restores the existing backend/capability gates. `apiBase`, per-method flags, provider secrets and bank configuration are not supplied by this work. Live response verification and idempotency remain in the original service/store path.

## C. Shared modals

All methods use a native modal dialog with navy styling, orange/red accent, live amount, scroll lock, keyboard focus containment, Escape/X/backdrop close and focus restoration. Closing clears raw card inputs. Amounts update from the same checkout state as Order Summary. An invalid shipping/cart state closes the modal.

- Card simulation validates number, expiry and CVV before entering loading/pending. Raw input never leaves the local modal. Live mode shows a provider-hosted checkout handoff, not raw local card fields.
- ZaloPay simulation displays its initial instructions, an explicitly simulated payment-window panel, then the returned/pending state with Reopen payment window. Closing/returning never means paid. The live flow uses only a validated HTTPS provider URL.
- VietQR shows QR area and bank details side by side, stacking on mobile. Simulation deliberately uses a labeled **non-payable QR placeholder** and “Simulation only” bank fields, not fabricated bank accounts or a payment QR. A real QR image and account fields are rendered only from the trusted service response. Status remains waiting for transfer confirmation.

## D. Validation and Country

Card validation covers required/numeric/plausible-length/Luhn checks, MM / YY formatting, valid month and unexpired year/month, and 3–4 numeric CVV characters. Errors start on blur or Pay, clear while correcting, and invalid submission focuses the first invalid field. No PAN/CVV/raw payload is stored in localStorage, sessionStorage, draft, events or service requests.

Shipping retains the existing seven fields and optional Company. Unicode names/localities and international address punctuation are accepted; obviously unusable punctuation-only values fail. Existing reasonable email and 7–15 digit international phone validation remain. Continue to payment shows field errors and focuses the first invalid input. Invalidating a required field locks Payment without clearing contact data.

Country is a local combobox/listbox with filtering, mouse selection, Arrow Up/Down, Enter and Escape. Only a selected known code/name pair is valid. The draft stores `countryCode` and the display name; legacy drafts with a matching known English name migrate to its code. Unmatched text stays invalid. Country names remain standardized English in both locales, as requested when no maintained Vietnamese mapping already exists.

The checked-in 249-entry country/territory list derives from Unicode CLDR [region validity](https://raw.githubusercontent.com/unicode-org/cldr/main/common/validity/region.xml) and [English territory names](https://raw.githubusercontent.com/unicode-org/cldr-json/main/cldr-json/cldr-localenames-full/main/en/territories.json), downloaded 20 September 2026. CLDR supplementary non-ISO entries AC, CP, CQ, DG, EA, IC, TA and XK are excluded. No runtime request or browser-generated translation is used. License: [UNICODE-LICENSE.txt](UNICODE-LICENSE.txt).

## E. Error handling

The modal has a form-level error area. Only allowlisted customer messages reach it; unknown codes map to “We couldn't start the payment. Please try again.” Database/provider response bodies, table names, stacks and raw exception strings never become field errors. The browser fixture injects an HTTP 500 containing the reported D1/SQLite wording and checks that only the generic customer message is visible.

## F. Search and toast

The placeholder and accessible search description now use “Search by IMPA, ISSA, barcode or product name” and its approved Vietnamese equivalent. Internal-reference lookup semantics are unchanged. Add feedback is “Added to order” / “Đã thêm vào đơn hàng”. The toast is compact, pointer-transparent and lasts 2.2 seconds. Placement avoids visible controls and the mobile summary; if every candidate overlaps, the live announcement remains accessible while the persistent summary supplies visible feedback.

## G. Production versus simulation evidence

The shipped review configuration is **simulation**, not live payment processing. Screenshots use explicit prefixes:

- `simulation-{toast|country|summary|payment|card|card-pending|zalopay-initial|zalopay-returned|vietqr}-{width}-{en|vi}.png` — actual review UI; no payment API calls.
- `production-live-capability-unavailable.png` — isolated harness using the real live-mode capability rules with no provider configured; fixture contact/product data, not a live transaction.
- `test-fixture-technical-error-sanitized.png` — intentional HTTP 500 fixture.
- `test-fixture-{available-method-selected|payment-pending|deposit-confirmed|full-confirmed|vnd-deposit-configured}-test.png` — isolated service-contract responses. Confirmed fixture screenshots are **not** simulation success or real receipts.

Artifacts live under `test-results/phase-thirteen/`. Existing checkout and shopping regression outputs remain in their usual locations; current checkout screenshots are prefixed `simulation-`.

## H. Verification and external dependencies

Commands: `npm test`, `npm run build`, `npm run build:quick-preview`, `npm run test:phase13:browser`, `npm run test:checkout:browser`, `npm run test:checkout:service`, and `node tests/browser.js --preview`.

The responsive matrix is 1440, 1280, 1024, 768, 390 and 320, each in EN/VI. Automated checks cover all three modals, country interaction/persistence, locking, exact current amount, summary typography, stable method rows, toast overlap, absence of raw errors, no simulation network payments, no simulated confirmation, and no horizontal overflow.

Real dependencies remain the order/payment backend, verified provider integrations, hosted secure card fields, trusted bank/VietQR details, approved VND deposit, and backend sales/email delivery. No live secrets, invented accounts, Odoo, inventory or shipping-rate integration were added.

### Verified results — 21 September 2026

- All 55 unit/catalogue/configurator/checkout/security checks passed.
- Final production and relative-path quick-preview builds passed. OPEN_UI_FAST launcher, nested assets, cart add, shipping unlock and language switch passed; the stale ZaloPay path is corrected.
- The final Phase 13 browser audit passed all 12 viewport/language combinations and generated 110 screenshots. It verified decoded payment logos, Country Arrow Up/Down/Enter/Escape, 14px summary details, modal amounts and keyboard close/focus restoration, no horizontal overflow and zero simulation payment requests. No JavaScript errors occurred. The sole HTTP 500 is the deliberate raw-error fixture.
- The service/UI contract harness passed loading, pending, failed retry, rejected mismatched confirmation, confirmed deposit/full payment and bank-reference behavior. Its five additional screenshots are explicitly test fixtures. Total Phase 13 evidence: 115 screenshots.
- Existing checkout and Phase 12 journeys passed on the production bundle, generating 38 checkout and 96 journey screenshots with simulation prefixes, no JavaScript errors and no broken local requests.
- The complete shopping regression suite passed Search, all configurator paths, fixed Size matrix, exact barcode cart merging/editing, sticky/mobile summary, footer and EN/VI. Its one remote image failure is the deliberate fallback test.
- All seven original workbook/catalogue/data hashes remain unchanged.

Retained reports: `test-results/phase-thirteen/report.json`, `test-results/phase-thirteen/verification-summary.json` and `test-results/phase-twelve/report.json`. All 115 Phase 13 screenshots are retained. Legacy `phase-eleven` reports and `browser-report.json` were absent at final workspace inventory; the successful command exits are recorded in the verification summary without reconstructing missing measurement reports. Their test commands regenerate those reports.

## Files changed

- Checkout: `src/checkout/config.js`, `checkout-store.js`, `order-draft.js`; new `card-validation.js`, `countries.js`.
- Components: `src/components/order-completion.js`, `product-search.js`, `search-result.js`, `edition-purchase.js`; new `country-select.js`, `payment-modal.js`.
- Presentation: `src/main.js`, `src/lib/locale.js`, `src/styles/checkout.css`, `src/styles/base.css`.
- Tests: `tests/checkout.test.js`, `browser-checkout.js`, `browser-checkout-service.js`, `browser-phase-twelve.js`, `browser-polish.js`; new `phase-thirteen.test.js`, `browser-phase-thirteen.js`; `package.json` scripts.
- Documentation: this report, Unicode license, historical-report pointers. Generated `dist/`, `quick-preview/` and QA artifacts are regenerated from source.

Master workbook, product catalogue, taxonomy, IDs, source prices, fixed Size values, search matching, shared cart/summary architecture, payment-response verifier and live idempotency algorithm are unchanged.
