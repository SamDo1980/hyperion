# UI polish pass

This pass intentionally keeps the existing Phase 16 structure and business logic intact. It only adjusts the requested presentation details.

## Changed

- Sign Construction: borderless visual panel; wider copy column so desktop feature headings stay on one line.
- Configurator: consistent vertical gap between Step 1 and Step 2.
- Checkout: all numbered step badges use the same square shape, including Payment.
- Order Summary: `Remove` sits at the top-right of each SKU card instead of beside the price.
- Order Summary SKU cards: semi-transparent surfaces preserve readability while allowing the marine background to remain visible.
- Order Summary CTA: uses a controlled ease-in-out scroll animation with a sticky-header offset when moving to Contact & Shipping or Payment.

## Not changed

Product data, search, configurator logic, cart calculations, deposit/payment rules, Contact Sales, validation rules, checkout locking, bilingual content, and existing Phase 16 functionality were not redesigned in this pass.

## Preview references

See `docs/previews/` for the focused desktop regression screenshots produced for this pass.
