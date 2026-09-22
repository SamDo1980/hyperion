# Header / Sign Construction / Footer update

This pass is intentionally narrow. It does not change product, configurator, cart, checkout, or pricing logic.

## Header
Desktop/menu link order is:
1. PRODUCT LOOKUP -> `#product-query`
2. ORDER -> `#find-your-sign`
3. CATALOGUE -> downloads `public/assets/hyperion-catalogue.pdf`

`PRODUCT LOOKUP` and `ORDER` use smooth scrolling. The existing CONTACT SALES CTA remains unchanged.

When the PDF is ready, place it at:
`public/assets/hyperion-catalogue.pdf`

For the static quick preview, also copy the same file to:
`quick-preview/assets/hyperion-catalogue.pdf`

## Sign Construction
The product visual is the transparent PNG at:
`src/assets/sign-construction/sign-construction-visual.png`

## Footer
The tagline `Clear signs. Safer operations.` appears directly under `HYPERION by DLV Corporation`.
