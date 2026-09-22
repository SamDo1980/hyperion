import { expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { formatPrice } from '../src/lib/storefront.js';

const mapping = JSON.parse(await readFile(new URL('../src/data/configurator.json', import.meta.url)));

export async function runPhaseFourteenEditionChecks(page, products, width, lang, shot) {
  const root = page.locator('#find-your-sign'), purchase = root.locator('.edition-purchase');
  const currency = lang === 'vi' ? 'VND' : 'USD', measurements = [];
  // Existing catalogue images: square, vertical, horizontal and long-arrow signage.
  for (const code of ['334139', '334480', '334401', '334426']) {
    const product = products.find(p => p.impa_code === code && p.edition === 'Standard');
    const attrs = { ...product, ...mapping.families.find(f => f.product_family_id === product.product_family_id) };
    if (await root.locator('.configurator-reset').isEnabled()) await root.locator('.configurator-reset').click();
    await root.locator(`[data-group="${product.customer_category_id}"]`).click();
    for (let i = 0; i < 10; i++) {
      const active = root.locator('.configuration-steps .configuration-step[data-state="current"]');
      if (!await active.count()) break;
      const key = await active.getAttribute('data-field');
      const target = active.locator(`[data-value=${JSON.stringify(attrs[key])}]`);
      while (!await target.isVisible()) await active.locator('.step-show-more').click();
      await target.click();
    }
    let previousGeometry;
    for (const edition of ['Standard', 'Outdoor']) {
      const sku = products.find(p => p.product_family_id === product.product_family_id && p.edition === edition);
      await purchase.locator(`[data-value="${edition}"]`).click();
      await expect(purchase.locator('[data-sku]')).toHaveAttribute('data-sku', sku.id);
      await expect(purchase.locator('.result-reference')).toContainText(sku.barcode);
      await expect(purchase.locator('.result-impa')).toContainText(sku.impa_code);
      await expect(purchase.locator('.dimensions')).toContainText(sku.dimensions_display);
      await expect(purchase.locator('.result-price strong')).toHaveText(formatPrice(sku.prices[currency], currency));
      await expect(purchase.locator('.selection-subtotal')).toHaveCount(0);
      expect(await purchase.innerText()).not.toMatch(/internal reference|mã nội bộ/i);
      expect(await purchase.locator('.attribute-options').innerText()).not.toMatch(/[$₫]/);
      await expect.poll(() => purchase.locator('img').evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
      const geometry = await purchase.evaluate(el => {
        const box = node => { const r = node.getBoundingClientRect(); return { x:r.x, y:r.y, width:r.width, height:r.height }; };
        const preview = el.querySelector('.product-image'), image = preview.querySelector('img'), details = el.querySelector('.edition-details');
        const quantity = el.querySelector('.quantity-stepper'), options = [...el.querySelectorAll('.attribute-option')];
        return { preview:box(preview), details:box(details), fit:getComputedStyle(image).objectFit,
          columns:getComputedStyle(el.querySelector('.edition-identity')).gridTemplateColumns.split(' ').length,
          natural:[image.naturalWidth,image.naturalHeight], quantity:box(quantity),
          segments:[...quantity.children].map(box), add:box(el.querySelector('.add-to-cart')), options:options.map(box),
          overflowing:el.scrollWidth > el.clientWidth, mainWidth:el.closest('.shopping-main').clientWidth };
      });
      expect(geometry.fit).toBe('contain'); expect(geometry.preview.height).toBeGreaterThanOrEqual(220);
      expect(geometry.preview.width).toBeGreaterThan(160); expect(geometry.overflowing).toBe(false);
      expect(geometry.columns).toBe(geometry.mainWidth > 620 ? 2 : 1);
      if (geometry.columns === 2) expect(geometry.details.x).toBeGreaterThan(geometry.preview.x + geometry.preview.width);
      else expect(geometry.details.y).toBeGreaterThanOrEqual(geometry.preview.y + geometry.preview.height);
      expect(geometry.options[0].y).toBe(geometry.options[1].y);
      expect(geometry.segments).toHaveLength(3);
      expect(Math.abs(geometry.quantity.width - geometry.segments.reduce((n,s) => n + s.width, 0))).toBeLessThanOrEqual(2);
      expect(geometry.add.height).toBeGreaterThanOrEqual(44);
      if (previousGeometry) expect([geometry.preview.height,geometry.details.height,geometry.add.width,geometry.add.height]).toEqual(previousGeometry);
      previousGeometry = [geometry.preview.height,geometry.details.height,geometry.add.width,geometry.add.height];
      await purchase.getByRole('spinbutton').fill('2');
      const before = await page.evaluate(id => JSON.parse(localStorage.getItem('hyperion.cart.v1')).items.find(i => i.id === id)?.quantity ?? 0, sku.id);
      await purchase.locator('.add-to-cart').click();
      expect(await page.evaluate(id => JSON.parse(localStorage.getItem('hyperion.cart.v1')).items.find(i => i.id === id).quantity, sku.id)).toBe(before + 2);
      await shot(`simulation-edition-${code}-${edition.toLowerCase()}-${width}-${lang}`,purchase);
      measurements.push({ code, edition, ...geometry });
    }
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  return measurements;
}
