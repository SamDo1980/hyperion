# Phase 14 — UI density and Edition purchase polish

## Status on handoff

The uploaded workspace already contained the core Phase 14 implementation in progress. The two-column Edition purchase component, compact vertical payment methods, simplified deposit copy, Order Summary hierarchy, simulation badge, simplified pending copy and VietQR cleanup were already present in source. What remained was final visual tuning of the Edition card, documentation/preview regeneration and final verification.

## A. Choose Edition

The final numbered Edition step is a mini product-detail configurator rather than the older tall form block.

- Wide layouts use two columns: a large contained product preview on the left and product identity/purchase controls on the right.
- Product identity keeps the approved order: short product name, IMPA, Barcode and Size.
- Standard / Outdoor stay as two side-by-side buttons. Price is **not** duplicated inside the edition buttons.
- Unit price and the exact three-segment quantity stepper share the purchase area. Add to Cart is a compact action beneath the price side on wide layouts and becomes full-width on narrow layouts.
- Product art uses `object-fit: contain` and a transparent preview surface so square, vertical and long horizontal signs are not cropped or stretched.
- Below the checkout-column breakpoint the component stacks into preview → product information → Edition → purchase controls.

No product data, barcode resolution, source price or cart behavior was changed.

## B. Payment method density

Phase 13's one-method-per-row architecture is retained. Rows are 72–84 px in the current responsive QA contract, keep stable geometry when selected and use the existing red/orange selected outline/background.

Redundant `Available` and `Selected` copy is not shown for enabled methods. A secondary status is reserved for genuinely unavailable methods. Method name and approved local logos stay on one clean baseline.

## C. Payment amount and Order Summary

Payment remains a decision-only area. The full financial breakdown is not repeated on the left.

- Deposit copy is reduced to `Deposit` plus the actual deposit value and the concise `Fixed deposit` / `Up to US$5` helper where applicable.
- `Pay in full` keeps `Full product amount, excluding shipping`.
- Order Summary remains the authoritative financial view and contains no `Payment option / Lựa chọn thanh toán` row.
- After a payment amount is chosen, `Amount due now` stays the primary number. Merchandise subtotal, Shipping fee and Remaining balance remain normal readable body-size information.

## D. Payment modal cleanup

The shared Card / ZaloPay / VietQR modal architecture and Phase 13 security boundary are preserved.

- Simulation uses the compact `SIMULATION / MÔ PHỎNG` badge instead of a repeated explanatory sentence.
- Card and ZaloPay pending states use one concise `Waiting for payment confirmation` message.
- Pending Card submission keeps the fields read-only and disables duplicate Pay submission.
- VietQR no longer repeats `Payment method`, `Amount due now`, per-row `Simulation only` text or an internal `View bank transfer details` CTA after the modal is already open.
- Bank simulation continues to use a deliberately non-payable QR placeholder; trusted live bank data can only come from the service response.

Simulation still stops at `pending` / `awaiting_confirmation`. It never creates a trusted confirmation or customer-facing payment-success state.

## E. Preserved Phase 13 behavior

Unchanged and re-used:

- Contact & Shipping inline validation.
- Searchable Country combobox and `countryCode` persistence.
- International phone/address support.
- Search copy that does not expose Internal Reference.
- Compact `Added to order / Đã thêm vào đơn hàng` toast.
- Shared barcode cart, sticky desktop Order Summary and mobile bottom summary.
- Payment-response verification, idempotency and stale-response guards.

## F. Verification

Source-level automated suite: `npm test`.

Builds:

```sh
npm run build
npm run build:quick-preview
```

Phase 14 responsive/browser contract:

```sh
npm run test:phase14:browser
```

The Phase 14 browser runner reuses the full Phase 13 checkout matrix and adds Edition checks for representative square, vertical, horizontal and long-arrow products in Standard and Outdoor editions at 1440, 1280, 1024, 768, 390 and 320 px in EN/VI.

The final handoff environment completed all 55 unit/data/security checks and regenerated the browser-native `quick-preview/`. Focused Chromium smoke checks passed at 1440, 768, 390 and 320 px with no JavaScript errors or horizontal overflow; the current Payment, Edition and VietQR modal flows were also exercised directly from that preview. The full 12-case Phase 14 Playwright matrix remains in the repo and now supports the static preview server, but the long matrix exceeded this sandbox execution window before completion. The uploaded `node_modules/` were Windows-specific, so an optimized Vite production bundle could not be rebuilt under Linux without downloading the Linux Rolldown optional binding; no source-code failure was involved. Run `npm ci && npm run build` on the normal workstation/CI environment for the optimized production bundle.

## G. Preview

`quick-preview/` is regenerated from current source. `OPEN_UI_FAST.html` remains the launcher and `src/` remains the only source of truth. See `README-QUICK-PREVIEW.md`.
