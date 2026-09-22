import { expect } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { formatPrice } from '../src/lib/storefront.js';
const mapping = JSON.parse(await readFile(new URL('../src/data/configurator.json', import.meta.url)));

export async function runPhaseTwelveChecks(page, products, measurements) {
  const directory = 'test-results/phase-twelve'; await mkdir(directory, { recursive: true });
  const shots = [], checks = [];
  const capture = async (name, locator = page) => {
    const path = `${directory}/simulation-${name}.png`; shots.push(path);
    await locator.screenshot({ path, ...(locator === page ? {} : { style: '.site-header,.mobile-summary-bar,.toast{visibility:hidden!important;}' }) });
  };
  const searchProduct = products.find(p => p.impa_code === '334152' && p.edition === 'Standard');
  const configuredProduct = products.find(p => p.impa_code === '334139' && p.edition === 'Outdoor');
  for (const width of [1440,1280,1024,768,390,320]) for (const lang of ['en','vi']) {
    await page.setViewportSize({ width, height: 1000 });
    await page.evaluate(() => localStorage.clear());
    await page.goto(`http://127.0.0.1:5175/?lang=${lang}`, { waitUntil: 'networkidle' });
    await expect(page.locator('.order-summary')).toHaveCount(1);
    await expect(page.locator('.summary-shell')).toHaveCount(1);
    const blank = await page.locator('.shipping-fields input').evaluateAll(inputs => inputs.every(el => el.value === ''));
    expect(blank).toBe(true);
    await page.locator('.lookup').scrollIntoViewIfNeeded();
    if (width >= 768) {
      const bounds = await page.locator('.shopping-layout').evaluate(el => {
        const lookup = el.querySelector('.lookup').getBoundingClientRect(), summary = el.querySelector('.summary-shell').getBoundingClientRect();
        return { lookupRight: lookup.right, summaryLeft: summary.left, summaryTop: summary.top, summaryBottom: summary.bottom, viewport: innerHeight };
      });
      expect(bounds.summaryLeft).toBeGreaterThan(bounds.lookupRight); expect(bounds.summaryTop).toBeGreaterThanOrEqual(0); expect(bounds.summaryBottom).toBeLessThanOrEqual(bounds.viewport);
    } else await expect(page.locator('.mobile-summary-bar')).toBeVisible();
    await capture(`lookup-empty-${width}-${lang}`);
    await page.locator('#product-query').fill(searchProduct.barcode); await page.locator('.search-submit').click();
    const result = page.locator(`.result-card[data-sku="${searchProduct.id}"]`);
    await result.getByRole('spinbutton').fill('2'); await result.locator('.add-to-cart').scrollIntoViewIfNeeded();
    await page.evaluate(() => { window.phaseTwelveSummary = document.querySelector('.summary-shell'); });
    const before = await page.evaluate(() => scrollY); await result.locator('.add-to-cart').click();
    expect(await page.evaluate(() => scrollY)).toBe(before);
    expect(await page.evaluate(() => window.phaseTwelveSummary === document.querySelector('.summary-shell'))).toBe(true);
    await expect(page.locator('.order-unit-count')).toHaveText('2');
    if (width >= 768) await expect(page.locator('.order-row')).toBeInViewport();
    await capture(`search-added-${width}-${lang}`);
    await capture(`shipping-blank-${width}-${lang}`, page.locator('#contact-shipping'));
    const fields = { fullName: 'Phase Twelve Buyer', company: '', email: 'buyer@example.test', phone: '+358 9 1234567', address: 'Test delivery address', cityProvince: 'Test city', country: 'Finland' };
    for (const [key, value] of Object.entries(fields)) { await page.locator(`#shipping-${key}`).fill(value); if (key === 'country') { await page.locator('#shipping-country').press('ArrowDown'); await page.locator('#shipping-country').press('Enter'); } }
    await expect(page.locator('#order-payment')).toBeEnabled();
    const choice = value => page.locator(`.payment-choice[data-value="${value}"]`);
    await expect(choice('deposit')).toBeEnabled();
    await choice('deposit').click();
    await choice('full').click();
    await expect(page.locator('.order-total-amount')).toHaveText(formatPrice(searchProduct.prices[lang === 'en' ? 'USD' : 'VND'] * 2, lang === 'en' ? 'USD' : 'VND'));
    const root = page.locator('#find-your-sign');
    await root.locator(`[data-group="${configuredProduct.customer_category_id}"]`).click();
    const attrs = { ...configuredProduct, ...mapping.families.find(f => f.product_family_id === configuredProduct.product_family_id) };
    for (let i = 0; i < 6; i++) {
      const active = root.locator('.configuration-steps .configuration-step[data-state="current"]');
      if (!await active.count()) break;
      const field = await active.getAttribute('data-field');
      const button = active.locator(`[data-value=${JSON.stringify(attrs[field])}]`);
      while (!await button.isVisible()) await active.locator('.step-show-more').click();
      await button.click();
    }
    await root.locator('.edition-controls input').fill('3'); await root.locator('.edition-controls .add-to-cart').click();
    await expect(page.locator('.order-row')).toHaveCount(2);
    await expect(page.locator('#shipping-fullName')).toHaveValue(fields.fullName);
    if (width < 768) await page.locator('.mobile-summary-bar').click();
    const summaryRow = page.locator(`[data-cart-sku="${searchProduct.id}"]`);
    await summaryRow.getByRole('spinbutton').fill('4');
    const currency = lang === 'en' ? 'USD' : 'VND';
    const factor = currency === 'USD' ? 100 : 1;
    const subtotal = (Math.round(searchProduct.prices[currency] * factor) * 4 + Math.round(configuredProduct.prices[currency] * factor) * 3) / factor;
    await expect(page.locator('.order-total-amount')).toHaveText(formatPrice(subtotal, currency));
    await expect(page.locator('.summary-payment')).toContainText(formatPrice(0,currency));
    const summaryGeometry = await page.locator('.summary-shell').evaluate(el => ({ primary: parseFloat(getComputedStyle(el.querySelector('.order-total-amount')).fontSize), secondary: parseFloat(getComputedStyle(el.querySelector('.summary-payment dd')).fontSize) }));
    expect(summaryGeometry.primary).toBeGreaterThan(summaryGeometry.secondary);
    await capture(`summary-full-${width}-${lang}`, page.locator('.summary-shell'));
    if (width < 768) await page.locator('.summary-close').click();
    const controls = await page.locator('.quantity-stepper').evaluateAll(nodes => nodes.filter(el => el.getBoundingClientRect().width).map(el => {
      const box = el.getBoundingClientRect(), children = [...el.children].map(child => child.getBoundingClientRect());
      return { count: children.length, tags: [...el.children].map(child => child.tagName), width: box.width,
        emptySpace: box.width - children.reduce((sum, child) => sum + child.width, 0), trailing: box.right - children.at(-1).right };
    }));
    for (const control of controls) { expect(control.tags).toEqual(['BUTTON','INPUT','BUTTON']); expect(control.count).toBe(3); expect(control.emptySpace).toBeLessThanOrEqual(2.1); expect(control.trailing).toBeLessThanOrEqual(1.1); }
    await capture(`quantity-${width}-${lang}`, page.locator('.edition-controls'));
    await choice('full').click(); await capture(`payment-full-${width}-${lang}`, page.locator('#order-payment'));
    if (lang === 'en') {
      await choice('deposit').click(); await expect(page.locator('.order-total-amount')).toHaveText('$5.00');
      await expect(page.locator('.summary-payment')).toContainText(formatPrice(Math.round((subtotal - 5) * 100) / 100, 'USD'));
      await capture(`payment-deposit-${width}-${lang}`, page.locator('#order-payment'));
      if (width < 768) { await expect(page.locator('.mobile-summary-copy')).toContainText('Amount due now'); await page.locator('.mobile-summary-bar').click(); }
      await capture(`summary-deposit-${width}-${lang}`, page.locator('.summary-shell'));
      if (width < 768) await page.locator('.summary-close').click();
    }
    for (const method of ['card','zalopay','bank_transfer']) { await expect(choice(method)).toBeEnabled(); await choice(method).click(); await expect(choice(method)).toHaveAttribute('aria-pressed','true'); }
    expect(await page.locator('body').innerText()).not.toMatch(/configuration required|cần cấu hình|not configured|require configuration|missing backend/i);
    await expect(page.locator('#contact-shipping .shipping-fee,.payment-group-hint')).toHaveCount(0);
    await page.reload({ waitUntil:'networkidle' });
    await expect(page.locator('#shipping-fullName')).toHaveValue(fields.fullName); await expect(page.locator('#shipping-address')).toHaveValue(fields.address);
    await capture(`shipping-restored-${width}-${lang}`, page.locator('#contact-shipping'));
    await page.locator('.site-footer').scrollIntoViewIfNeeded();
    if (width >= 768) {
      const boundary = await page.evaluate(() => ({ bottom: document.querySelector('.summary-shell').getBoundingClientRect().bottom, footer: document.querySelector('.site-footer').getBoundingClientRect().top }));
      expect(boundary.bottom).toBeLessThanOrEqual(boundary.footer);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    const item = { phase:12, width, lang, blank, controls, summaryGeometry, searchBuyer:true, configuratorBuyer:true, multiSkuBuyer:true, footerBoundary:true };
    checks.push(item); measurements.push(item);
  }
  await writeFile(`${directory}/report.json`, JSON.stringify({ status:'passed', checks, screenshots:shots }, null, 2));
}
