# Phase 11: order completion

This records Phase 11. Current summary placement, availability rules and customer-copy refinements are documented in [Phase 12](phase-twelve-production-ux.md).

## Payment UI revision — supplied Handypad references

Step 7 now presents full payment and deposit as two price cards, with pale backgrounds, red selected borders, concise descriptions and a sales handoff note. Three method cards show Card (with the supplied Visa/Mastercard images), ZaloPay and Bank Transfer. Amount cards stack on mobile, and prices move below descriptions in narrow containers. Method selection currently shows no payment-action button or backend-configuration message. The existing action hook is available for the backend developer and only becomes visible after a real service is configured. The payment breakdown remains in the existing desktop/mobile Order Summary, with the selected due-now amount highlighted; the duplicate breakdown between the choices was removed. Product totals, deposit caps, shipping TBD, VND configuration requirements and service-confirmed payment behavior are unchanged.

The supplied icons are copied unchanged to `public/assets/visa.png` and `public/assets/mastercard.png`. The Mastercard source includes its original checkerboard/watermark. This revision updates `src/components/order-completion.js`, `src/styles/checkout.css`, `src/lib/locale.js`, `tests/browser-checkout.js`, this document, and the generated production/quick-preview bundles. The checkout browser checks cover both layouts, all six widths, EN/VI, image loading and totals; the service/UI state checks also pass.

Contact & Shipping and Payment extend the existing configurator and shared multi-SKU cart. Both containers exist on initial render. They use the existing locked/current/complete presentation, stay expanded when complete, and retain editable controls. Step numbers follow the active route, including routes without Design.

## Shipping and persistence

The first cart item unlocks contact/shipping. Full name, email, phone/WhatsApp, address, city/province and country are required; company is optional. Whitespace-only fields fail validation. Email requires an address and dotted domain. Phone accepts a leading `+`, spaces, parentheses, hyphens and dots, with 7–15 digits. This checks plausible international format, not telephone ownership. Errors appear after leaving a field and update while editing.

The form uses two columns at desktop/tablet widths and one below 768px. Controls are at least 44px high. All new strings have English and Vietnamese translations.

`hyperion.order-draft.v1` persists only allowlisted customer/shipping fields and payment choices. The existing cart store continues restoring real barcode identities and quantities against the current catalogue. Contact fields survive product edits, cart changes, language navigation and reload. Storage denial falls back to session memory. No card entry fields, card numbers, CVV or provider secrets exist here.

## Payment amounts and summary

- USD deposit: `min(5, merchandiseSubtotal)`; remaining product balance: `max(0, merchandiseSubtotal - dueNow)`.
- Full payment: current merchandise subtotal; remaining product balance: zero.
- Calculations use minor units. USD and VND product prices remain the source catalogue values; no exchange conversion exists.
- `src/checkout/config.js` exposes `depositVND: null`. Finance must supply an approved fixed integer VND amount. Until then, the US$5 deposit option remains visible, VND due-now/remaining show “Configuration required”, and deposit submission is disabled. Full VND payment remains selectable.
- Shipping always reads “To be confirmed” and is excluded from payable amounts. This phase has no shipping-quote integration.
- The existing merchandise total and item rows remain in the summary. A payment footer adds shipping, due now and remaining balance. Mobile retains its bottom bar and modal sheet; a known selected amount uses the explicit “Amount due now” label.

## Service contract

`createPaymentService()` is a real HTTP adapter, disabled until `apiBase` is configured (prefer a same-origin path such as `/api/checkout`). It returns no simulated transactions. Configure actual provider and bank details on the backend. The browser never receives provider secrets.

| Responsibility                | Request                                                                             | Required response      |
| ----------------------------- | ----------------------------------------------------------------------------------- | ---------------------- |
| `createOrderDraft`            | `POST {apiBase}/orders`, `{draft, idempotencyKey}`                                  | `{orderId}`            |
| `createPayment`               | `POST {apiBase}/orders/{orderId}/payments`, `{payment, idempotencyKey}`             | Payment response below |
| `getPaymentStatus`            | `GET {apiBase}/orders/{orderId}/payments/{transactionId}`                           | Payment response below |
| `submitBankTransferReference` | `POST {apiBase}/orders/{orderId}/payments/{transactionId}/reference`, `{reference}` | Payment response below |

The backend must validate quantities/SKUs, reprice against its trusted catalogue, enforce currency/deposit rules, bind order ownership to its session, enforce idempotency, and confirm payments using verified provider responses/webhooks. A browser payload is never payment authority. Any repricing discrepancy must be returned for customer review rather than silently charging a different amount. Configure same-origin session/CSRF protection before enabling production payments.

Payment response:

```js
{
  orderId, transactionId, currency, amountDueNow,
  status, // pending | awaiting_confirmation | confirmed | failed
  amountPaid, // required and equal to amountDueNow for confirmed
  checkoutURL, // optional HTTPS provider-hosted payment URL
  bank: { // optional, supplied by trusted backend only
    accountName, bankName, accountNumber,
    transferContent, vietQRImageURL // optional HTTPS QR image
  }
}
```

The frontend verifies the order, transaction (when known), currency, amount and allowed status before accepting a response. Only `confirmed` plus the matching paid amount displays “Deposit received” or “Payment received”. These states include order reference, amount paid, method, deposit balance when applicable, and shipping to be confirmed separately. Hosted card/ZaloPay checkout opens through the returned secure link; no raw card data enters the application. Bank references never constitute confirmation on their own.

The UI exposes loading, pending, failed, configuration and network-error states. A network error keeps an existing transaction pending because its outcome is unknown. Explicit failed payments may be retried. Requests time out after 20 seconds. Repeated clicks are gated and retries reuse the same idempotency key when the outcome is unknown.

`hyperion.payment-attempt.v1` keeps an idempotency key, backend references and an exact draft fingerprint for return/reload recovery. Saved status is never trusted: restored transactions become pending and offer “Check payment status”. Changes to cart, contact or payment choices invalidate the current client attempt, and late responses cannot confirm the changed draft. This does not cancel an already created provider transaction; the backend must retain that transaction against its original order and reconcile it independently.

## Order and sales handoff

The normalized order contains `orderId`, `currency`, `items`, `customer`, `shipping`, `merchandiseSubtotal`, and `payment`. Items contain `barcode`, `impa`, `displayName`, `size`, `edition`, `quantity`, `unitPrice`, and `lineSubtotal`. Internal Reference is excluded. Payment contains the amount option, configured deposit, due now, remaining product balance, method, status, transaction ID and confirmed amount paid.

`hyperion:order-captured` and `hyperion:payment-confirmed` CustomEvents carry a snapshot of this payload. They are frontend integration hooks, not proof of email delivery or durable sales notifications. The future backend should store the order and dispatch idempotent customer confirmation, sales notification and CRM events after its own verified transitions. No Odoo integration is included.

## Validation

Run `npm test`, `npm run build`, `npm run test:checkout:browser`, `npm run test:checkout:service`, and `node tests/browser.js --preview`. The checkout browser script uses production preview on port 5175 and local Chrome. Existing browser regressions use port 5174. The service/UI integration harness uses port 5177 and test-only intercepted HTTP responses. Test service doubles are confined to tests; shipped code has no mock gateway.

Checkout screenshots and machine-readable results are written to `test-results/phase-eleven/`. Screenshot names:

- `shipping-payment-locked.png`, `shipping-active-payment-locked.png`, `shipping-completed.png`
- `deposit-selected.png`, `full-selected.png`, `summary-deposit.png`, `summary-full.png`
- `method-card.png`, `method-zalopay.png`, `method-bank_transfer.png`
- `shipping-{width}-{en|vi}.png`, `payment-{width}-{en|vi}.png` at 1440, 1280, 1024, 768, 390 and 320
- `mobile-summary-{390|320}-{en|vi}.png`

Remaining external dependencies: real order/payment endpoints, verified card/ZaloPay provider integration, approved VND deposit, real corporate bank/VietQR data, and backend email/CRM delivery. Until configured, the storefront captures payment choices without displaying a payment-action button or backend-configuration message and cannot claim that funds were received.

## Verified results — 18 September 2026

- 46 unit/data/configurator/checkout tests passed, including 17 new checkout tests covering all requested validation categories.
- Production build and the relative-path quick-preview build passed.
- Production checkout browser QA passed at 1440, 1280, 1024, 768, 390 and 320, in both EN and VI: 38 screenshots, no JavaScript errors, no failed local paths, no horizontal overflow, and tap targets at least 44px high. Results: `test-results/phase-eleven/report.json`.
- Service/UI integration passed for loading, pending, mismatched confirmation, confirmed deposit, confirmed full product payment, failed retry, and bank awaiting-confirmation/reference submission. Results: `test-results/phase-eleven/service-report.json`. These are contract tests, not live provider transactions.
- The existing production browser regression suite passed for search, all configurator branches, fixed-size matrix, stable steps, shared cart, sticky/mobile summary, footer and localization. Results: `test-results/browser-report.json`. Its single remote image failure is the deliberate image-fallback test.
- `OPEN_UI_FAST.html` was checked through a local static server at its nested `/quick-preview/index.html` location: logo/data paths, real-SKU add, shipping unlock, language switch and mobile width passed.
- Master spreadsheet and generated catalogue/data hashes remain unchanged.

## Files changed

New implementation: `src/checkout/config.js`, `src/checkout/order-draft.js`, `src/checkout/checkout-store.js`, `src/checkout/payment-service.js`, `src/components/order-completion.js`, `src/styles/checkout.css`.

Integration updates: `src/main.js`, `src/components/product-configurator.js`, `src/components/order-summary.js`, `src/lib/locale.js`, `src/components/header.js`. The header change makes the existing logo path respect the build base so the nested quick preview remains self-contained; branding is unchanged.

Tests/tooling: `package.json`, `tests/checkout.test.js`, `tests/browser-checkout.js`, `tests/browser-checkout-service.js`, `tests/browser-phase-nine.js`, `tests/browser-configurator.js`. The last two only scope existing product-step checks to the product area, because checkout adds two more step containers.

Documentation: `docs/phase-eleven-checkout.md`. Generated review artifacts: `quick-preview/index.html` and its refreshed hashed JS/CSS/data assets; `dist/` and `test-results/` are ignored build/QA outputs. Local Node/npm tooling is isolated in ignored `.tools/`; dependency versions and `package-lock.json` were not changed.
