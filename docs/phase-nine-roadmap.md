# Phase 9: purchasing roadmap and product browsing

## Customer-facing codes and counts

Search rows, Design cards, the Edition purchase card and Product Range cards display Barcode. Internal Reference stays in the source data and search index. Order Summary retains its compact IMPA metadata. Source names remain intact in data; original-name tooltips were removed from Search to avoid exposing embedded internal codes.

Hero catalogue totals, category family counts and generic option counts were removed. Search match counts and saved-order product/unit counts remain because they describe the current interaction.

## Configurator

Category, Sign, Design, Size and Edition have persistent containers. Prerequisite steps unlock those containers; completed steps remain expanded. A known singleton Design route omits that unnecessary step. Size still requires an explicit click, and Edition and purchase controls remain together in the main column. Changing an upstream choice re-locks invalid downstream steps without replacing their container nodes.

The follow-up layout correction replaces reserved-height blank panels with compact, disabled locked placeholders (target 64–88 px). Active and completed steps now share the same neutral border, surface and geometry. The current step badge provides emphasis, and selected options retain their accent border, pale background and checkmark.

The Sign grid uses normal page flow, equal-height cards, source thumbnails and two-line titles. It has four columns above 1350 px, three at medium widths, and two below 641 px. There is no internal vertical scrollbar. Twelve choices appear initially; Show more reveals another twelve. Filtering resets the batch, and the selected option remains visible even when outside the batch or filter. Grid, filter and batch state persist across downstream selections. Natural page growth on unlocking replaces the earlier oversized space reservation; vertical step order and container identity remain stable.

Selection-state updates retain the Sign/Design legend, filter input, grid and card DOM nodes whenever available options are unchanged. Selection only updates state attributes and checkmark visibility. The optional Completed legend label was removed to prevent heading reflow. Locked placeholders retain their separate compact presentation. `browser-step-stability.js` compares document-coordinate bounds, grid columns/gaps, frame styling and DOM identity before selection, after selection and after switching options at all six widths in EN/VI. Screenshots use `stable-step-before-{width}-{en|vi}.png` and `stable-step-after-{width}-{en|vi}.png`.

The step-state fix passed 29/29 unit tests, production build and the full production-preview browser suite. All 12 width/language stability comparisons passed with identical measured geometry and no JavaScript errors or local request failures. The workbook and four runtime data files remain byte-for-byte unchanged.

## Product Range and navigation

The overview uses the existing five customer categories and representative source images. View products reveals real SKU cards in batches of six. View in product lookup searches that exact Barcode in the transactional Search interface. No PDF placeholder or invented product is present.

Header and footer link to Product Range, Lookup, Configure and Contact. Narrow layouts use a keyboard-operable header menu with Escape support; language controls and Lookup remain available. The header has no Cart button.

## Footer reference

The footer adapts the supplied Handypad screenshot `references/screenshots/6.png`: navy/warm-gradient shell, corporate identity on the left, grouped contact details on the right, orange labels, muted copy and a copyright row. Columns stack on mobile. Corporate names, tax number, address, phone and email are transcribed from that reference into `src/data/corporate.js`; product wording is Hyperion-specific.

The available `handypad-landing.zip` could not be read as a valid archive, and `handypad-V70.zip` was absent. The supplied screenshot provided the visual and factual reference instead.

## Validation

The automated suite covers all 308 reachable SKUs, preserved source fields, explicit Size, locked prerequisites, real Barcode resolution, cart merging and currency values. Browser checks cover EN/VI at 1440, 1280, 1024, 768, 390 and 320 px, including grid columns, card overlap, locked heights, Show more/filtering, persistent containers, navigation, range images and footer links. Existing search, sticky summary, mobile summary and cart regression checks remain in the production-preview suite.

Screenshot patterns in `test-results/`:

- `phase-nine-sign-grid-{width}-{en|vi}.png`
- `phase-nine-locked-{width}-{en|vi}.png`
- `phase-nine-roadmap-{width}-{en|vi}.png`
- `phase-nine-range-{width}-{en|vi}.png`
- `phase-nine-footer-{width}-{en|vi}.png`

Final validation passed: 28/28 automated tests, production build, and the complete production-preview browser suite. All six widths passed in EN and VI. Locked placeholders measured 76 px; grid checks found no overlap or internal scrolling, and page checks found no horizontal overflow. Browser runtime errors and local request failures were empty. The only remote failure was the deliberately aborted image used to verify fallback handling. Results are recorded in `test-results/browser-report.json`.

SHA-256 comparison with the Phase 8 baseline confirmed the workbook and all four generated product/taxonomy JSON files remain unchanged. The workbook's existing Telephone taxonomy REVIEW flag remains untouched. No new product-data issue was introduced.
