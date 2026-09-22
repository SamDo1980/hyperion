import { chromium, expect } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { formatPrice } from '../src/lib/storefront.js';
import { runPhaseTwelveChecks } from './browser-phase-twelve.js';

const products = JSON.parse(await readFile(new URL('../src/data/products.json', import.meta.url)));
const product = products[0];
const directory = 'test-results/phase-eleven';
await mkdir(directory, { recursive: true });
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', '5175', '--strictPort', '--host', '127.0.0.1'], { stdio: 'pipe', windowsHide: true });
const logs = []; server.stdout.on('data', data => logs.push(String(data))); server.stderr.on('data', data => logs.push(String(data)));
const errors = [], localFailures = [], measurements = [], screenshots = [], remoteImageFailures = new Set();
let browser;
try {
  for (let attempt = 0; attempt < 80; attempt++) {
    if (server.exitCode !== null) throw new Error(logs.join(''));
    try { if (logs.join('').includes('Local:') && (await fetch('http://127.0.0.1:5175')).ok) break; } catch { /* Starting. */ }
    await delay(250);
  }
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) { if (response.url().startsWith('http://127.0.0.1')) localFailures.push(response.url()); else remoteImageFailures.add(response.url()); } });
  page.on('requestfailed', request => { if (request.url().startsWith('http://127.0.0.1')) localFailures.push(request.url()); else remoteImageFailures.add(request.url()); });
  const shipping = page.locator('#contact-shipping'), payment = page.locator('#order-payment');
  async function screenshot(name, locator = page) {
    const path = `${directory}/simulation-${name}.png`; screenshots.push(path);
    await locator.screenshot({ path, ...(locator === page ? { fullPage: true } : { style: '.site-header,.mobile-summary-bar,.toast{visibility:hidden!important}' }) });
  }
  async function add(p = product) {
    await page.locator('#product-query').fill(p.barcode);
    await page.locator('.search-form button[type="submit"]').click();
    await page.locator(`.result-card[data-sku="${p.id}"] .add-to-cart`).click();
  }
  const values = { fullName: 'Checkout QA', email: 'checkout@example.test', phone: '+44 (20) 7946-0958', address: 'QA address', cityProvince: 'QA city', country: 'United Kingdom' };
  async function fill() { for (const [key, value] of Object.entries(values)) { await page.locator(`#shipping-${key}`).fill(value); if (key === 'country') { await page.locator('#shipping-country').press('ArrowDown'); await page.locator('#shipping-country').press('Enter'); } } }
  const amount = value => payment.locator(`.payment-choice[data-value="${value}"]`);
  async function assertSummary(option, quantity = 1, lang = 'en') {
    const currency = lang === 'vi' ? 'VND' : 'USD';
    const subtotal = Math.round(product.prices[currency] * (currency === 'USD' ? 100 : 1)) * quantity / (currency === 'USD' ? 100 : 1);
    const fixedDeposit = currency === 'VND' ? 130000 : 5;
    const due = option === 'deposit' ? Math.min(subtotal, fixedDeposit) : subtotal;
    await expect(amount('full').locator('.payment-choice-price')).toHaveText(formatPrice(subtotal, currency));
    await expect(amount(option).locator('.payment-choice-price')).toHaveText(formatPrice(due, currency));
    await expect(page.locator('.summary-payment')).toContainText(formatPrice(Math.round((subtotal - due) * 100) / 100, currency));
    await expect(page.locator('.order-total-amount')).toHaveText(formatPrice(due, currency));
    await expect(page.locator('.summary-payment')).toContainText(formatPrice(subtotal, currency));
    await expect(page.locator('.order-total-label')).toHaveText(lang === 'vi' ? 'Thanh toán ngay' : 'Amount due now');
  }
  await page.goto('http://127.0.0.1:5175', { waitUntil: 'networkidle' });
  await expect(shipping).toHaveAttribute('data-state', 'locked'); await expect(payment).toHaveAttribute('data-state', 'locked');
  await expect(shipping).toBeDisabled(); await expect(payment).toBeDisabled();
  await screenshot('shipping-payment-locked', page.locator('.order-completion'));
  const roots = await page.locator('.order-completion').evaluate(el => { el.dataset.qaIdentity = 'stable'; return el.children.length; }); expect(roots).toBe(3);
  await add(); await expect(shipping).toHaveAttribute('data-state', 'current'); await expect(payment).toHaveAttribute('data-state', 'locked');
  await screenshot('shipping-active-payment-locked', page.locator('.order-completion'));
  await fill(); await expect(payment).toHaveAttribute('data-state', 'current'); await expect(shipping).toHaveAttribute('data-state', 'complete');
  await expect(page.locator('#shipping-company')).toHaveValue('');
  await page.locator('#shipping-email').fill('invalid'); await page.locator('#shipping-email').blur();
  await expect(page.locator('#shipping-email-error')).toHaveText('Enter a valid email address'); await expect(payment).toBeDisabled();
  await page.locator('#shipping-email').fill(values.email);
  await page.locator('#shipping-phone').fill('123'); await page.locator('#shipping-phone').blur(); await expect(payment).toBeDisabled();
  await page.locator('#shipping-phone').fill(values.phone); await expect(payment).toBeEnabled();
  await expect(payment.locator('.payment-cta')).toBeHidden();
  await expect(payment.locator('.payment-amounts .payment-choice').first()).toHaveAttribute('data-value', 'deposit');
  await expect(payment.locator('.payment-card-logos img')).toHaveCount(2);
  await expect.poll(() => payment.locator('.payment-card-logos img').evaluateAll(images => images.every(img => img.complete && img.naturalWidth > 0))).toBe(true);
  await expect.poll(() => payment.locator('.payment-methods img').evaluateAll(images => images.length === 4 && images.every(img => img.complete && img.naturalWidth > 0))).toBe(true);
  await screenshot('shipping-completed', shipping);
  await amount('deposit').click(); await assertSummary('deposit');
  await page.locator('.order-row .quantity-input, .order-row input[type="number"]').fill('10');
  await page.locator('.order-row input[type="number"]').press('Tab');
  await assertSummary('deposit', 10); await screenshot('deposit-selected', payment);
  await screenshot('summary-deposit', page.locator('.summary-shell'));
  await amount('full').click(); await assertSummary('full', 10); await screenshot('full-selected', payment);
  await screenshot('summary-full', page.locator('.summary-shell'));
  for (const method of ['card', 'zalopay', 'bank_transfer']) {
    await expect(amount(method)).toBeEnabled(); await amount(method).click();
    await expect(amount(method)).toHaveAttribute('aria-pressed', 'true');
    await expect(amount(method).locator('.method-availability')).toBeHidden();
    await expect(payment.locator('.payment-choice[aria-pressed="true"]')).toHaveCount(2);
    await expect(payment.locator('.payment-cta')).toBeEnabled();
    await expect(payment).not.toContainText('Payment service requires configuration');
    await expect(payment).not.toContainText('Bank details require configuration');
    await expect(payment.locator('.payment-status')).toHaveAttribute('data-status', 'idle');
    await expect(payment.locator('.payment-confirmation')).toBeHidden(); await expect(payment.locator('.bank-details')).toBeHidden();
    await screenshot(`method-${method}`, payment);
  }
  await amount('card').click(); await amount('deposit').click();
  for (const width of [1440, 1280, 1024, 768, 390, 320]) {
    for (const lang of ['en', 'vi']) {
      await page.setViewportSize({ width, height: width <= 390 ? 844 : 1000 });
      if (await page.locator('html').getAttribute('lang') !== lang) await page.locator(`[data-locale="${lang}"]`).click();
      await expect(shipping).toHaveAttribute('data-state', 'complete'); await expect(page.locator('#shipping-fullName')).toHaveValue(values.fullName);
      await expect(amount('bank_transfer')).toHaveAttribute('aria-pressed', 'false');
      await expect(amount('deposit')).toBeEnabled();
      await amount('deposit').click();
      await assertSummary('deposit', 10, lang);
      expect(await payment.innerText()).not.toMatch(/configuration|cấu hình|API|provider/i);
      await screenshot(`shipping-${width}-${lang}`, shipping); await screenshot(`payment-${width}-${lang}`, payment);
      const info = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
        columns: getComputedStyle(document.querySelector('.shipping-fields')).gridTemplateColumns.split(' ').length,
        amountColumns: getComputedStyle(document.querySelector('.payment-amounts .payment-choices')).gridTemplateColumns.split(' ').length,
        methodColumns: getComputedStyle(document.querySelector('.payment-methods .payment-choices')).gridTemplateColumns.split(' ').length,
        paymentContentWidth: document.querySelector('#order-payment .completion-content').clientWidth,
        taps: [...document.querySelectorAll('.order-completion input,.order-completion button')].filter(el => el.getBoundingClientRect().height > 0).map(el => el.getBoundingClientRect().height),
      }));
      expect(info.scrollWidth).toBeLessThanOrEqual(width); for (const size of info.taps) expect(size).toBeGreaterThanOrEqual(44);
      expect(info.columns).toBe(width < 768 ? 1 : 2); measurements.push({ ...info, lang });
      expect(info.amountColumns).toBe(width < 768 ? 1 : 2); expect(info.methodColumns).toBe(1);
      if (width < 768) {
        await expect(page.locator('.mobile-summary-bar')).toBeVisible();
        if (lang === 'en') await expect(page.locator('.mobile-summary-copy')).toContainText('Amount due now');
        await page.locator('.mobile-summary-bar').click();
        await expect(page.locator('.mobile-order-dialog')).toBeVisible();
        await expect(page.locator('.summary-payment')).toContainText(lang === 'en' ? 'Remaining balance' : 'Số dư còn lại');
        await screenshot(`mobile-summary-${width}-${lang}`, page.locator('.mobile-order-dialog'));
        await page.locator('.summary-close').click();
      }
      await amount('full').click(); await assertSummary('full', 10, lang);
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 }); await page.locator('[data-locale="en"]').click();
  await add(products[1]); await expect(page.locator('.order-row')).toHaveCount(2);
  await expect(page.locator('#shipping-phone')).toHaveValue(values.phone);
  await page.locator('.order-remove').last().click(); await assertSummary('full', 10);
  await page.locator('.order-remove').click();
  await expect(shipping).toHaveAttribute('data-state', 'locked'); await expect(payment).toHaveAttribute('data-state', 'locked');
  await add(); await expect(page.locator('#shipping-fullName')).toHaveValue(values.fullName); await expect(payment).toBeEnabled();
  await page.reload({ waitUntil: 'networkidle' }); await expect(page.locator('#shipping-address')).toHaveValue(values.address);
  const saved = await page.evaluate(() => localStorage.getItem('hyperion.order-draft.v1'));
  expect(saved).not.toMatch(/cvv|cardNumber|merchantKey/);
  await runPhaseTwelveChecks(page, products, measurements);
  expect(errors).toEqual([]); expect(localFailures).toEqual([]);
  await writeFile(`${directory}/report.json`, JSON.stringify({ status: 'passed', mode: 'production preview', errors, localFailures, remoteImageFailures: [...remoteImageFailures], measurements, screenshots }, null, 2));
  console.log(`Phase 11 production-preview QA passed: 6 widths × EN/VI, ${screenshots.length} screenshots; no JS errors or broken local paths.`);
} finally { await browser?.close(); server.kill(); }
