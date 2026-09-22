# Collaborator guide

## Source of truth

- `index.html` is the canonical app entry.
- `src/` is application source.
- `references/Hyperion_Product_Master.xlsx` is the only product master accepted by the data generator.
- `quick-preview/` and `dist/` are generated outputs; do not edit them as source.
- `AGENTS.md` contains workspace rules for coding agents.

## Fast preview

On Windows, double-click `START_PREVIEW.bat`. It serves the generated `quick-preview/` locally and opens the launcher. No global Node/npm installation is required for this static preview.

For development with Node 22.12+:

```sh
npm ci
npm run dev
```

Regenerate the static preview after source changes:

```sh
npm run build:static-preview
```

## Main folders

- `src/components/` — UI components.
- `src/checkout/` — checkout state, payment amounts, payment service contract, countries and bank-transfer config.
- `src/cart/` — shared cart and totals.
- `src/configurator/` — progressive SKU selection.
- `src/contact/` — Contact Sales validation.
- `src/data/` — generated browser catalogue data.
- `src/styles/` — design tokens and component styles.
- `scripts/` — workbook/data and static-preview generation.
- `tests/` — catalogue, configurator, checkout, security and phase regression tests.
- `docs/` — phase reports and implementation notes.

## Customer-facing copy principle

- Keep customer-facing UI decision-focused: show only information needed to understand state or take the next action.
- Do not expose developer/debug labels such as `SIMULATION`, implementation notes, raw errors, or comments about test fixtures in customer UI.
- Internal simulation/test state may remain in code and QA, but it must not be presented as customer-facing explanatory copy.
- Do not add copy that merely repeats what the surrounding control already makes obvious.

## Current checkout business rules

- EN uses USD prices; VI uses VND prices.
- Fixed deposit: **US$5** for EN/USD (`depositUSD: 5`).
- Fixed deposit: **130,000 ₫** for VI/VND (`depositVND: 130000`).
- If merchandise subtotal is lower than the fixed deposit, deposit due equals the merchandise subtotal.
- Both currency-specific deposit options are selectable. No FX conversion is performed between the two fixed values.
- Shipping remains `To be confirmed` and is not added to product payment totals.
- Payment confirmation must come from a trusted backend/provider response; simulation never creates a confirmed payment.

## Checkout progression

- Product Lookup and Configurator both add exact Barcode SKUs to the same cart.
- `Contact & Shipping` unlocks only after at least one cart item exists.
- `Payment` unlocks only when the cart is non-empty and required shipping/contact fields validate.
- Removing the final cart item relocks Shipping and Payment without destroying the saved shipping draft.

## Verification

```sh
npm test
npm run build:static-preview
```

Run `npm run build` on a clean platform-native `npm ci` installation before production deployment.


## Contextual Order Summary CTA

The sticky Order Summary contains a contextual conversion CTA whenever the order contains at least one SKU and the customer is currently outside the next required checkout step.

- If Contact & Shipping is incomplete, the CTA is `ORDER` / `ĐẶT HÀNG` and scrolls to `#contact-shipping`.
- Once Contact & Shipping is valid, the CTA becomes `PAY NOW` / `THANH TOÁN NGAY` and scrolls to `#order-payment`.
- The CTA hides while the customer is actually viewing the relevant target step, and reappears after they scroll away.
- The CTA must never be shown for an empty order and must derive its target from checkout state rather than current configurator state.

This behavior is intended to keep the next checkout action visible without duplicating controls inside the step currently being edited.

## Selective marine theme rule

The current marine pass is visual-only. See `docs/MARINE_THEME.md`. Approved mockups must never be interpreted as permission to delete an existing functional element. `CONTACT SALES`, checkout CTAs, search/cart interactions, EN/VI, validation, and contextual Order Summary navigation remain functional source requirements even where a reference screenshot does not show them.
