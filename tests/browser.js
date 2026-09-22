import { runPhaseNineChecks } from './browser-phase-nine.js';
import { runSizeMatrixChecks } from './browser-size-matrix.js';
import { runStepStabilityChecks } from './browser-step-stability.js';
import { runPhaseTenChecks } from './browser-phase-ten.js';
import { runPhaseEightChecks } from './browser-phase-eight.js';
import { runPolishChecks } from './browser-polish.js';
import { chromium, expect } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { formatPrice } from '../src/lib/storefront.js';
import { runConfiguratorBrowserChecks } from './browser-configurator.js';
import { runOrderSummaryBrowserChecks } from './browser-order-summary.js';
import { runSearchDensityChecks } from './browser-search-density.js';

const products = JSON.parse(await readFile(new URL('../src/data/products.json', import.meta.url)));
const taxonomy = JSON.parse(await readFile(new URL('../src/data/taxonomy.json', import.meta.url)));
await mkdir('test-results', { recursive: true });
const preview = process.argv.includes('--preview');
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', ...(preview ? ['preview'] : []), '--port', '5174', '--strictPort', '--host', '127.0.0.1'], { stdio: 'pipe', windowsHide: true });
const serverLogs = [];
server.stdout.on('data', data => serverLogs.push(String(data)));
server.stderr.on('data', data => serverLogs.push(String(data)));
let browser;
let page;
const errors = [];
const localFailures = [];
const remoteFailures = new Set();
const measurements = [];
try {
  let ready = false;
  for (let i = 0; i < 60; i++) {
    if (server.exitCode !== null) throw new Error(`Test server exited: ${serverLogs.join('')}`);
    try { ready = serverLogs.join('').includes('Local:') && (await fetch('http://127.0.0.1:5174')).ok; } catch { /* wait for our own server */ }
    if (ready) break;
    await delay(250);
  }
  if (!ready) throw new Error(`Vite did not start: ${serverLogs.join('')}`);
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', error => errors.push(error.message));
  page.on('requestfailed', request => {
    if (request.url().startsWith('http://127.0.0.1')) localFailures.push(request.url());
    else remoteFailures.add(request.url());
  });
  page.on('response', response => {
    if (response.status() >= 400) {
      if (response.url().startsWith('http://127.0.0.1')) localFailures.push(`${response.status()}: ${response.url()}`);
      else remoteFailures.add(`${response.status()}: ${response.url()}`);
    }
  });
  await page.goto('http://127.0.0.1:5174', { waitUntil: 'networkidle' });
  await page.locator('#find-your-sign').waitFor({ state: 'attached', timeout: 30000 });
  await runPolishChecks(page, measurements, products);
  await runStepStabilityChecks(page, measurements);
  await runPhaseEightChecks(page, products, measurements);
  await runPhaseNineChecks(page, products, measurements);
  await runPhaseTenChecks(page, measurements);
  await runSizeMatrixChecks(page, products, measurements);
  await expect(page.locator('h1')).toContainText('Marine safety signs.');
  await expect(page.locator('.site-header .cart-indicator, .site-header .cart-count')).toHaveCount(0);
  await expect(page.locator('.site-header .header-lookup')).toBeVisible();
  await expect(page.locator('.result-card')).toHaveCount(0);
  await page.screenshot({ path: 'test-results/desktop-home.png', fullPage: true });
  const input = page.locator('#product-query');
  async function search(query, expected) {
    await input.fill(query);
    await page.getByRole('button', { name: 'Find products', exact: true }).click();
    await expect(page.locator('.result-card')).toHaveCount(expected);
  }
  const arrowCount = products.filter(p => p.impa_code === '334420').length;
  await search('IMPA 33.4420', arrowCount);
  const arrowIds = await page.locator('.result-card').evaluateAll(cards => cards.map(card => card.dataset.sku).sort());
  expect(arrowIds).toEqual(products.filter(p => p.impa_code === '334420').map(p => p.id).sort());
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'test-results/desktop-results.png', fullPage: true });
  await search('Emergency Eye Wash', 2);
  await search('Bồn rửa mắt', 2);
  await search('bon rua mat', 2);
  const standard = products.find(p => p.impa_code === '334152' && p.edition === 'Standard');
  await search(standard.internal_reference, 2);
  await search(standard.barcode, 1);
  await search(`ISSA ${standard.issa_code}`, 2);
  await search('no-such-hyperion-xyz999', 0);
  await expect(page.getByText('No matching Hyperion product found')).toBeVisible();
  await search('334152', 2);
  const card = page.locator(`[data-sku="${standard.id}"]`);
  await expect(card.locator('.dimensions')).toHaveText(standard.dimensions_display);
  await expect(card.locator('.edition')).toHaveText(standard.edition);
  await expect(card.locator('.result-price strong')).toHaveText(formatPrice(standard.prices.USD, 'USD'));
  await card.getByRole('button', { name: `Increase quantity for ${standard.id}`, exact: true }).click();
  await card.locator('.add-to-cart').click();
  await card.locator('.add-to-cart').click();
  await expect(page.locator('.order-unit-count')).toHaveText('4');
  let stored = await page.evaluate(() => JSON.parse(localStorage.getItem('hyperion.cart.v1')));
  expect(stored.items).toHaveLength(1);
  expect(stored.items[0]).toMatchObject({ id: standard.id, quantity: 4, unit_price: standard.prices.USD, currency: 'USD', edition: standard.edition });
  const quantity = card.getByRole('spinbutton');
  await quantity.fill('0');
  await card.locator('.add-to-cart').click();
  await expect(page.locator('.order-unit-count')).toHaveText('4');
  await quantity.fill('1');
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.locator('.order-unit-count')).toHaveText('4');
  await expect(input).toHaveValue('334152');
  await page.getByRole('link', { name: 'Tiếng Việt', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
  await expect(card.locator('.result-title')).toHaveText(standard.display_name_vi);
  await expect(card.locator('.result-price strong')).toHaveText(formatPrice(standard.prices.VND, 'VND'));
  await card.locator('.add-to-cart').click();
  await expect(page.locator('.order-unit-count')).toHaveText('5');
  stored = await page.evaluate(() => JSON.parse(localStorage.getItem('hyperion.cart.v1')));
  expect(stored.items[0]).toMatchObject({ id: standard.id, quantity: 5, unit_price: standard.prices.VND, currency: 'VND' });
  await page.getByRole('link', { name: 'English', exact: true }).click();
  await expect(card.locator('.result-price strong')).toHaveText(formatPrice(standard.prices.USD, 'USD'));
  await search('lifeboat', Math.min(8, products.filter(p => p.original_name_en.toLowerCase().includes('lifeboat')).length));
  while (await page.getByRole('button', { name: 'Show more results' }).isVisible()) await page.getByRole('button', { name: 'Show more results' }).click();
  await expect(page.locator('.result-card')).toHaveCount(products.filter(p => p.original_name_en.toLowerCase().includes('lifeboat')).length);

  // Step 1 keeps Search independent and immediately reveals real Step 2 controls.
  await search('334152', 2);
  const configurator = page.locator('#find-your-sign');
  await expect(configurator.locator('.group-option')).toHaveCount(5);
  await expect(configurator.locator('.result-card')).toHaveCount(0);
  for (const group of taxonomy.groups) {
    const button = configurator.locator(`[data-group="${group.id}"]`);
    await button.focus();
    await page.keyboard.press('Space');
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(configurator).toHaveAttribute('data-family-count', String(group.family_count));
    await expect(configurator).toHaveAttribute('data-sku-count', String(group.sku_count));
    await expect(input).toHaveValue('334152');
    await expect(configurator.locator(`[data-field="config_concept"]`)).toBeVisible();
    await expect(page.locator('.result-card')).toHaveCount(2);
    await expect(page.locator('.order-unit-count')).toHaveText('5');
  }
  await configurator.locator('.configurator-reset').click();
  await expect(configurator).toHaveAttribute('data-family-count', '154');
  await expect(configurator.locator('[aria-pressed="true"]')).toHaveCount(0);
  await configurator.locator('[data-group="lifesaving-signs-lss-lsa"]').click();

  for (const [name, width, height] of [['desktop', 1440, 1000], ['tablet', 768, 1024], ['mobile', 390, 844], ['small-mobile', 320, 740]]) {
    await page.setViewportSize({ width, height });
    await search('334420', arrowCount);
    await page.evaluate(() => scrollTo(0, 0));
    const measurement = await page.evaluate(() => ({
      width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
      overflowing: [...document.querySelectorAll('main *, header *')].filter(el => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && (r.left < -1 || r.right > innerWidth + 1);
      }).map(el => el.className),
      addButtons: [...document.querySelectorAll('.add-to-cart')].filter(el => el.offsetWidth).map(el => ({ width: el.offsetWidth, height: el.offsetHeight })),
      groupButtons: [...document.querySelectorAll('.group-option')].map(el => ({ width: el.offsetWidth, height: el.offsetHeight })),
    }));
    measurements.push({ name, ...measurement });
    expect(measurement.scrollWidth).toBeLessThanOrEqual(width);
    expect(measurement.overflowing).toEqual([]);
    for (const button of measurement.addButtons) expect(button.height).toBeGreaterThanOrEqual(44);
    for (const button of measurement.groupButtons) { expect(button.height).toBeGreaterThanOrEqual(44); expect(button.width).toBeGreaterThanOrEqual(44); }
    await page.screenshot({ path: `test-results/${name}-responsive.png`, fullPage: true });
    await configurator.screenshot({ path: `test-results/phase-nine-${name}-step-one.png`, style: '.site-header, .skip-link { visibility: hidden !important; }' });
    await page.getByRole('link', { name: 'Tiếng Việt', exact: true }).click();
    await expect(configurator.locator('[data-group="lifesaving-signs-lss-lsa"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await configurator.screenshot({ path: `test-results/phase-nine-${name}-step-one-vi.png`, style: '.site-header, .skip-link { visibility: hidden !important; }' });
    await page.getByRole('link', { name: 'English', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  }
  await runConfiguratorBrowserChecks(page, products, measurements);
  await configurator.locator('.configurator-reset').click();
  await runOrderSummaryBrowserChecks(page, products, measurements);
  await runSearchDensityChecks(page, products, measurements);
  // Force one real source image to fail, then verify the stable neutral fallback.
  await page.route(standard.image_url, route => route.abort());
  await search(standard.barcode, 1);
  await page.locator(`[data-sku="${standard.id}"]`).scrollIntoViewIfNeeded();
  await expect(page.locator(`[data-sku="${standard.id}"] .image-fallback`)).toBeVisible();
  expect(errors).toEqual([]);
  expect(localFailures).toEqual([]);
  await writeFile('test-results/browser-report.json', JSON.stringify({ status: 'passed', mode: preview ? 'production preview' : 'development', errors, localFailures, remoteImageFailures: [...remoteFailures], measurements }, null, 2));
  console.log('Browser checks passed: Search/configurator regression, shared order editing/totals, exact thumbnails/fallback, zebra rows, bounded sticky layout, mobile sheet/keyboard behavior, and EN/VI at 6 widths.');
  console.log(`Remote image failures (including the deliberate fallback test): ${remoteFailures.size}`);
} catch (error) {
  if (page && !page.isClosed()) await page.screenshot({ path: 'test-results/browser-failure.png' }).catch(() => {});
  throw error;
} finally {
  await browser?.close();
  server.kill();
}
