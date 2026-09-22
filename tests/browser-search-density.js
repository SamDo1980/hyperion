import { expect } from '@playwright/test';
import { groupSearchResults } from '../src/lib/search-presentation.js';

export async function runSearchDensityChecks(page, products, measurements) {
  const lookup = page.locator('.lookup');
  const grid = lookup.locator('.results-grid');
  async function search(query) {
    await page.locator('#product-query').fill(query);
    await lookup.locator('.search-submit').click();
  }
  const pair = groupSearchResults(products).find(group => group.shared).products;
  await page.setViewportSize({ width: 1440, height: 900 });
  await search(pair[0].impa_code);
  const family = lookup.locator(`[data-family="${pair[0].product_family_id}"]`);
  await expect(family).toBeVisible();
  for (const product of pair) {
    const card = family.locator(`[data-sku="${product.id}"]`);
    await expect(card).toBeVisible();
    await expect(card.locator('.edition')).toHaveText(product.edition);
    await card.locator('.add-to-cart').click();
  }
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('hyperion.cart.v1')).items);
  for (const product of pair) expect(stored.some(item => item.id === product.id)).toBe(true);
  // Broad query stays bounded, loads eight at a time, and keeps entered quantities.
  await search('IMPA 33');
  await expect(lookup.locator('.result-card')).toHaveCount(8);
  await expect(lookup.locator('.results-status')).toContainText('308 matching SKUs');
  const first = lookup.locator('.result-card').first();
  const id = await first.getAttribute('data-sku');
  await first.getByRole('spinbutton').fill('3');
  await lookup.locator('.load-more').click();
  await expect(lookup.locator('.result-card')).toHaveCount(16);
  await expect(lookup.locator(`[data-sku="${id}"]`).getByRole('spinbutton')).toHaveValue('3');
  for (const width of [1440, 1280, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await search('IMPA 33');
    await expect(lookup.locator('.result-card')).toHaveCount(8);
    await grid.scrollIntoViewIfNeeded();
    const size = await grid.evaluate(el => ({ height: el.getBoundingClientRect().height, scrollHeight: el.scrollHeight,
      rowHeights: [...el.querySelectorAll('.result-card')].map(row => row.getBoundingClientRect().height),
      stacked: getComputedStyle(el.querySelector('.result-card')).gridTemplateColumns.split(' ').length === 1,
      width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
    expect(size.height).toBeLessThanOrEqual(520);
    expect(size.scrollWidth).toBeLessThanOrEqual(width);
    for (const height of size.rowHeights) expect(height).toBeLessThan(size.stacked ? 220 : 150);
    await expect(page.locator('.site-header .header-lookup')).toBeVisible();
    measurements.push({ flow: 'compact search', ...size });
    await page.screenshot({ path: `test-results/phase-nine-search-density-${width}-en.png` });
    await page.getByRole('link', { name: 'Tiếng Việt', exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await lookup.locator('.results-grid').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/phase-nine-search-density-${width}-vi.png` });
    await page.getByRole('link', { name: 'English', exact: true }).click();
  }
}
