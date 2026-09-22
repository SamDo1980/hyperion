---
name: IMO Signs Project Rules
description: Core rules for the IMO safety signs website.
applyTo: "**"
---

# IMO Signs Project Rules

## Application source and generated files

- `index.html` is the only source application entry.
- `src/` is the source of truth for the application.
- Never edit `dist/` as source; it is generated production output.
- Never edit `quick-preview/` as source; it is a generated static preview.
- `OPEN_UI_FAST.html` is only a launcher for the generated preview.
- Generated build/preview files must be regenerated from source.
- Do not treat generated preview/build files as source of truth.

- Treat the manufacturer product dataset as the single source of truth.
- Never invent SKUs, IMPA codes, ISSA codes, dimensions, materials, categories, certifications, or product availability.
- If product information is missing, report it as missing instead of guessing.
- Do not modify unrelated files.
- Preserve existing branding and wording unless explicitly requested.
- Product filtering must only return products that actually exist in the catalogue.
- Progressive selectors must disable combinations that produce zero valid SKUs.
- Prefer data-driven product logic instead of hardcoding individual SKUs.
- After making changes, check for JavaScript errors, broken paths, responsive issues, and regressions.

## Hyperion product-data rules

- The provided Hyperion spreadsheet is the commercial source of truth.
- Never invent SKUs, IMPA codes, dimensions, pricing, product names, editions, certifications or product claims.
- Never silently rewrite the original English or Vietnamese product names.
- Customer-facing short names must be stored separately from original names.
- Every purchasable configuration must resolve to a real SKU in the supplied dataset.
- UI filtering/configuration must only expose combinations that exist in the dataset.
