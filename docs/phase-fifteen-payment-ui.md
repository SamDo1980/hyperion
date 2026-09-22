# Phase 15 — Payment cards and method rows

Status: complete.

## Changes

Payment amount cards now contain only a title and the current amount. Both cards use the same left-aligned layout, 12px title/amount spacing, 20px padding and a 112px minimum height. Helper descriptions, including the small-order deposit helper, are removed. The selected red border/tint remains. The unavailable VND deposit stays disabled, with an em dash instead of an invented amount and a localized accessible availability label.

Each method row now has four distinct areas: radio indicator, rounded neutral icon tile, method name and right-aligned official brand marks. Card uses a card icon, ZaloPay a wallet icon and Bank Transfer a bank icon. Existing supplied logo assets are reused. Rows measure 80px across the audited matrix. Narrow layouts reduce tile/logo size and allow the bank label to wrap while preserving the right logo alignment. Available/Selected captions remain absent; unavailable live methods retain useful status text.

CTA selection/click behavior is unchanged. No shipping, country, simulation, modal, payment calculation, summary, edition, catalogue or search logic was changed.

## Verification

- 26 payment, validation and security tests passed.
- Service/UI integration browser checks passed: pending, invalid response, confirmed deposit/full test fixtures, failed retry and awaiting bank confirmation.
- Responsive payment audit passed at 1440, 1280, 1024, 768, 390 and 320px, in EN and VI: 12 cases, 116 screenshots, no JavaScript errors and no simulation payment requests.
- Assertions cover absent descriptions, aligned/equal-height amount cards, icon/label/logo order, right logo alignment, stable selected row geometry, disabled VND deposit, method-specific CTAs, modal behavior and no horizontal overflow.
- Production and relative quick-preview builds passed.
- OPEN_UI_FAST launcher/static-preview smoke test passed, including local assets, real-SKU add, shipping unlock, EN/VI and mobile.

Screenshot/report manifest: `test-results/phase-fifteen/report.json`.

Representative screenshots:

- `simulation-payment-1440-en.png`
- `simulation-payment-768-vi.png`
- `simulation-payment-390-en.png`
- `simulation-payment-320-vi.png`
- `production-live-capability-unavailable.png`

All `simulation-*` evidence uses the existing simulation mode and test inputs. Production/live-capability and backend-error fixtures are labelled separately. No live transaction was performed or enabled.

## Modified files

- `src/components/order-completion.js` — amount-card contents and method-row markup only.
- `src/styles/checkout.css` — scoped amount-card/method-row styling.
- `src/lib/dom.js` — neutral card icon added to the existing icon helper.
- `tests/browser-phase-thirteen.js` — updated presentation assertions and Phase 15 audit output; existing flow assertions retained.
- `package.json` — `test:phase15:browser` command.
- `docs/phase-fifteen-payment-ui.md` — this report.

Generated from source: `dist/`, `quick-preview/` and test reports/screenshots. Phase 14 reports remain historical evidence for the former presentation.
