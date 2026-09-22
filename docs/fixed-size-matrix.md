# Fixed size option matrix

The configurator derives its canonical size list from the complete normalized product master. It sorts by area, then width and height, retaining the exact source display labels. The resulting order is:

1. 100 × 100 mm
2. 75 × 150 mm
3. 75 × 250 mm
4. 100 × 200 mm
5. 150 × 150 mm
6. 100 × 300 mm
7. 150 × 300 mm
8. 150 × 400 mm
9. 300 × 300 mm

Before prerequisites resolve, Size retains the compact locked placeholder. Once unlocked, all nine buttons appear in a fixed three-column desktop or two-column mobile grid. The same button nodes persist across Sign/Design changes; only disabled, selected and accessibility states update. Unavailable labels stay readable with native disabled semantics, `aria-disabled`, and a localized availability tooltip. Checkmarks reserve their own space to prevent selection-induced resizing.

The existing selection engine remains authoritative: a valid selected size survives upstream changes; an invalid size clears and requires a new explicit click. No alternate size is automatically selected. The dataset, filtering engine, Barcode identity, pricing and cart logic are unchanged.

Implementation: `src/configurator/size-options.js`, `src/components/size-matrix.js`, integrated into `product-configurator.js`, with scoped styles and EN/VI tooltip copy.

Validation includes canonical ordering independent of source-row order; disabled-size rejection for every real SKU; browser checks for fixed DOM nodes, fixed relative button positions and matrix height; available/disabled behavior; invalid selection clearing; and valid selection preservation. Responsive checks run at 1440, 1280, 1024, 768, 390 and 320 px in EN and VI.

Screenshots: `test-results/size-matrix-{width}-{en|vi}.png`.

Results: 29/29 unit tests passed, production build passed, and the full production-preview browser suite passed with no JavaScript errors or local request failures. The additional cross-design preservation check also passed at all six widths in both languages. Reports: `test-results/browser-report.json` and `test-results/size-matrix-report.json`.
