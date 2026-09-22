# Phase 16 — checkout gating, bank transfer, contact sales and favicon

Status: completed from a partially implemented Phase 16 archive.

## State found in the uploaded archive

The uploaded project had already implemented the core checkout gate in `checkout-store.js`: an empty order locked Contact & Shipping, and Payment required both an item and valid required shipping fields. `order-completion.js` also rendered the two steps as fixed visible containers and the existing checkout tests covered empty-cart locking, unlock after a real SKU, re-locking after invalid data and re-locking after final item removal.

The following Phase 16 work was still missing in that archive:

- Bank Transfer / VietQR still showed blank placeholders in simulation and had no approved DLV account data.
- Account-number and transfer-content copy actions did not exist.
- The header still used the older rectangular EN/VI buttons.
- CONTACT SALES and the contact modal did not exist.
- Contact-form validation/localization did not exist.
- The favicon still pointed at the header logo rather than `favicon.png`.
- `quick-preview/` was a stale generated build and did not include the requested Phase 16 work.
- The source also did not match the completed Phase 15 report for amount-card copy and four-area payment rows, so the approved Phase 15 presentation was restored while continuing Phase 16.

## Bank Transfer / VietQR

One browser-safe configuration source is now `src/checkout/bank-transfer-config.js`:

- Account name: `DLV CORPORATION`
- Account number: `54098995`
- Bank: `VPBank - Chi nhanh Trung Son`
- Transfer method: `VietQR / Bank Transfer`
- Transfer content: `DPS000005`

`DPS000004` is absent from active source. The simulation modal uses these approved details rather than dashes. The QR remains explicitly non-payable until a trusted VietQR image/generator is connected.

Two keyboard-accessible copy controls are included for account number and transfer content. They use the Clipboard API with a safe local fallback and concise EN/VI feedback (`Copied` / `Đã sao chép`).

## Checkout step locking

The existing data-driven gate was retained and its UI copy completed:

- Empty order → Contact & Shipping locked.
- Empty order → Payment locked with the item prerequisite message.
- Add a valid SKU from Product Lookup or Configurator → Contact & Shipping unlocks immediately.
- Payment unlocks only when all required Contact & Shipping values pass validation.
- Invalidating a required field re-locks Payment.
- Removing the final order item re-locks both downstream steps without deleting the saved Shipping draft.
- Configurator reset does not remove already-added cart lines.

The fixed-step containers remain visible while locked; existing `configuration-step[data-state='locked']` styling hides active content and shows the concise prerequisite instead of producing a layout jump.

## Header and language control

The EN/VI control is now one compact navy segmented capsule with a red active pill, matching the Handypad direction without changing the Hyperion header itself.

A new desktop `CONTACT SALES` / `LIÊN HỆ SALES` outline CTA sits with the language control. On narrow screens the same action moves into the existing header menu so it remains reachable without causing horizontal overflow.

Search query/group state remains in the URL. Cart and checkout draft remain in local storage. Configurator selections are additionally preserved in session storage so the language reload does not collapse a partially completed configuration.

## Contact Sales modal

`src/components/contact-sales.js` implements the Handypad-inspired modal with:

- Name *
- Phone / WhatsApp *
- Message (optional)
- SEND REQUEST / GỬI YÊU CẦU
- concise privacy note

Validation is shared from `src/contact/contact-sales-validation.js`:

- Unicode/international names are accepted.
- Phone presentation accepts `+`, spaces, parentheses, hyphens and dots with 7–15 normalized digits.
- Message is optional and capped at 1000 characters.
- Validation starts on blur, updates after a touched field changes and focuses the first invalid field on submit.

There is no real lead endpoint in the supplied project, so a validated submit deliberately reports preview mode rather than falsely claiming Sales received the enquiry. The modal is independent of cart/checkout state. Session draft and open state survive the EN/VI reload.

## Favicon

`references/favicon.png` is the approved source in this repo and `public/favicon.png` is the runtime copy. The canonical `index.html` now references `./favicon.png`; the generated static preview uses the same asset. The favicon was derived from the approved Handyman hammer mark already supplied with the project because the uploaded archive did not contain the requested `references/favicon.png` file.

## Phase 15 regression restoration

The uploaded source did not match its Phase 15 report. The following approved behavior has been restored:

- Payment amount cards show only title + amount, with no `Fixed deposit` or `Full product amount, excluding shipping` helper copy inside the cards.
- Payment method rows use four stable areas: radio, neutral icon tile, method label/status, right-aligned supplied brand logo(s).
- Available/Selected captions remain absent; only genuinely unavailable methods show status text.

## Preview

A source-derived static preview generator was added because the uploaded `node_modules` contains Windows Rolldown/Vite native bindings and cannot produce a Linux Vite build in this environment.

- `npm run build:static-preview` regenerates `quick-preview/` from `src/` without treating generated files as source.
- `START_PREVIEW.bat` launches `START_PREVIEW.ps1`, which starts a local Windows PowerShell HTTP server and opens `OPEN_UI_FAST.html`.
- `OPEN_UI_FAST.html` redirects to `quick-preview/index.html`.
- `dist/` in the delivered archive is refreshed from the same source-derived static output rather than leaving the stale uploaded build.

## Verification

- Data generation: PASS — 308 SKUs, 154 families, 150 IMPA codes.
- Automated tests: 60/60 PASS.
- New Phase 16 tests cover approved bank data, Contact Sales international validation, copy-control source wiring, favicon wiring and obsolete transfer-content removal.
- Every source and static-preview JavaScript file passes `node --check`.
- Static HTTP smoke checks return 200 for launcher, preview index, favicon, main module, Contact Sales module and bank config.
- `DPS000004` is absent from active source.
- A native Vite production build could not be executed in this Linux session because the uploaded Windows `node_modules` lacks Rolldown's Linux optional native binding. This is an environment/package-platform issue, not a source-code test failure; run `npm ci && npm run build` on the target machine to regenerate the optimized Vite `dist`.

## Approved deposit amounts

The storefront now uses explicit approved fixed deposit configuration in both currencies (`depositUSD: 5`, `depositVND: 130000`):

- EN / USD: **US$5**
- VI / VND: **130,000 ₫**
- For either currency, if merchandise subtotal is below the fixed deposit, the amount due is capped at the merchandise subtotal and the remaining product balance becomes zero.
- Both deposit options are selectable in the normal application UI.

No FX conversion is performed between the two fixed deposit amounts.

### Deposit amount patch — current rule

The approved VI/VND fixed deposit was updated from the earlier 125,000 ₫ value to **130,000 ₫**. The current runtime source of truth is `src/checkout/config.js`:

- `depositUSD: 5`
- `depositVND: 130000`
- Deposit due is `min(merchandise subtotal, configured fixed deposit)` for both currencies.
- Both deposit options remain selectable whenever checkout prerequisites are satisfied.

Focused checkout + Phase 16 regression tests after this patch: **27/27 PASS**.

## Post-Phase 16 payment density patch

The Payment step was visually tightened after review without changing any checkout logic:

- Payment amount cards: min-height reduced from 112px to 90px; padding reduced from 20px to 14px 18px; internal gap reduced from 12px to 8px.
- Payment method rows: min-height reduced from 80px to 68px; padding reduced from 12px 16px to 8px 14px.
- Payment method icon tiles: reduced from 44px to 40px to keep the row proportions balanced.
- At narrow container widths (≤460px), method rows use a 64px minimum height and 7px 10px padding, with 38px icon tiles.

This is a presentation-only change. Deposit logic, payment availability, selected states, logos, checkout locking and payment flow remain unchanged.

## Payment modal copy cleanup

Customer-facing payment modals no longer expose the internal `SIMULATION` badge or developer/test commentary. Card, ZaloPay and Bank Transfer keep the internal simulation state and payment-safety boundary, but the UI now presents only customer-relevant controls, amounts and status. The bank modal hides the QR preview area when no trusted QR is configured rather than displaying a developer-facing warning, and the simulated ZaloPay gateway uses brand/action UI without a simulation label.


## Follow-up: contextual Order Summary conversion CTA

The sticky Order Summary now exposes a single next-action CTA only when the customer is outside the step they need to complete next. With an item in the order and incomplete Shipping, `ORDER` / `ĐẶT HÀNG` scrolls to Contact & Shipping. Once Shipping is valid, the CTA changes to `PAY NOW` / `THANH TOÁN NGAY` and scrolls to Payment. The CTA hides while that target step is meaningfully visible and reappears when the customer scrolls away. Empty orders never show it.
