// Test-only HTTP fixtures exercise the real service, store and presentation together.
// This harness and its transaction responses are never part of either shipped bundle.
import { chromium, expect } from '@playwright/test';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { mkdir, writeFile } from 'node:fs/promises';
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--port', '5177', '--strictPort', '--host', '127.0.0.1'], { stdio: 'pipe', windowsHide: true });
const logs = []; server.stdout.on('data', data => logs.push(String(data))); server.stderr.on('data', data => logs.push(String(data)));
let browser;
try {
  for (let i = 0; i < 80; i++) {
    if (server.exitCode !== null) throw new Error(logs.join(''));
    try { if (logs.join('').includes('Local:') && (await fetch('http://127.0.0.1:5177')).ok) break; } catch { /* Starting. */ }
    await delay(250);
  }
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage(); const errors = [], events = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.exposeFunction('recordCheckoutEvent', (type, order) => events.push({ type, order }));
  await mkdir('test-results/phase-thirteen', { recursive: true });
  await page.route('**/checkout-test-harness*', route => route.fulfill({ contentType: 'text/html', body: `<!doctype html><html lang="en"><body><script type="module">
    import '/src/styles/tokens.css'; import '/src/styles/base.css'; import '/src/styles/configurator.css';
    import '/src/styles/configurator-steps.css'; import '/src/styles/order-summary.css'; import '/src/styles/checkout.css';
    import { createCatalogue } from '/src/lib/product-catalogue.js';
    import { createCartStore } from '/src/cart/cart-store.js';
    import { createCheckoutStore } from '/src/checkout/checkout-store.js';
    import { createPaymentService } from '/src/checkout/payment-service.js';
    import { createOrderCompletion } from '/src/components/order-completion.js';
    import { createOrderSummary } from '/src/components/order-summary.js';
    const products = await (await fetch('/src/data/products.json')).json();
    const vi = location.search.includes('lang=vi');
    const config = { apiBase:'/api/checkout', methods:{card:true,zalopay:true,bank_transfer:true}, depositVND:130000 };
    const catalogue = createCatalogue(products);
    const cart = createCartStore(catalogue, undefined, vi ? 'vi' : 'en'); cart.add(products[0].id, 10);
    const checkout = createCheckoutStore({ cart, currency:vi?'VND':'USD', config, service: createPaymentService(config), onEvent: (type, order) => window.recordCheckoutEvent(type, order) });
    for (const [group, fields] of Object.entries({ customer: {fullName:'Service QA',email:'qa@example.test',phone:'+44 20 7946 0958'}, shipping: {address:'QA address',cityProvince:'QA city',country:'United Kingdom',countryCode:'GB'} })) for (const [key, value] of Object.entries(fields)) checkout.setField(group,key,value);
    const wrapper = document.createElement('main'); wrapper.className = 'shopping-layout container'; wrapper.style.marginTop = '40px';
    const main = document.createElement('div'); main.className = 'shopping-main'; main.append(createOrderCompletion(checkout).element);
    wrapper.append(main, createOrderSummary({catalogue,cart,checkout,announce:()=>{}}).element); document.body.append(wrapper);
  </script></body></html>` }));
  let status = 'pending', due = null, mismatch = false, paymentCalls = 0, delayed = false, release;
  await page.route('**/api/checkout/**', async route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    if (path.endsWith('/orders')) { await route.fulfill({ json: { orderId: 'fixture-order' } }); return; }
    if (request.method() === 'POST' && path.endsWith('/payments')) {
      due = request.postDataJSON().payment.amountDueNow; paymentCalls++;
      if (delayed) await new Promise(done => { release = done; });
    }
    await route.fulfill({ json: { orderId: 'fixture-order', transactionId: 'fixture-transaction', currency: mismatch ? 'VND' : 'USD', amountDueNow: due, amountPaid: status === 'confirmed' ? due : null, status } });
  });
  await page.goto('http://127.0.0.1:5177/checkout-test-harness');
  const choice = value => page.locator(`.payment-choice[data-value="${value}"]`);
  const confirmation = page.locator('.payment-confirmation'), cta = page.locator('.payment-cta');
  async function start() { await cta.click(); await page.locator('.modal-pay').click(); }
  async function closeModal() { if (await page.locator('.payment-modal').isVisible()) await page.locator('.payment-modal-close').click(); }
  for (const method of ['card', 'zalopay', 'bank_transfer']) {
    await choice(method).click(); await expect(confirmation).toBeHidden(); await expect(page.locator('.payment-status')).toHaveAttribute('data-status', 'idle');
  }
  await choice('deposit').click(); await choice('card').click(); delayed = true;
  await page.locator('#order-payment').screenshot({ path:'test-results/phase-thirteen/test-fixture-available-method-selected-test.png' });
  await start(); await expect(cta).toHaveText('Processing…'); await expect(cta).toBeDisabled(); await expect(confirmation).toBeHidden();
  await expect.poll(() => Boolean(release)).toBe(true); release(); await closeModal();
  await expect(page.locator('.payment-status')).toHaveText('Waiting for payment confirmation'); await expect(confirmation).toBeHidden();
  await page.locator('#order-payment').screenshot({ path:'test-results/phase-thirteen/test-fixture-payment-pending-test.png' });
  mismatch = true; status = 'confirmed'; await page.locator('.payment-check').click();
  await expect(page.locator('.payment-status')).toHaveText('Payment response could not be verified'); await expect(confirmation).toBeHidden();
  mismatch = false; await page.locator('.payment-check').click(); await expect(confirmation).toContainText('Deposit received'); await expect(confirmation).toContainText('$5.00');
  await expect(confirmation).toContainText('fixture-order'); await expect(confirmation).toContainText('Shipping fee will be confirmed separately');
  await page.locator('#order-payment').screenshot({ path:'test-results/phase-thirteen/test-fixture-deposit-confirmed-test.png' });
  await expect(page.locator('#shipping-fullName')).toBeVisible(); await expect(choice('deposit')).toBeVisible();
  await expect.poll(() => events.filter(event => event.type === 'payment-confirmed').length).toBe(1);
  await choice('full').click(); await expect(confirmation).toBeHidden(); status = 'failed'; delayed = false; await start(); await closeModal();
  await expect(page.locator('.payment-status')).toHaveText('Payment failed'); await expect(cta).toBeEnabled();
  status = 'confirmed'; await start(); await closeModal(); await expect(confirmation).toContainText('Payment received');
  await page.locator('#order-payment').screenshot({ path:'test-results/phase-thirteen/test-fixture-full-confirmed-test.png' });
  await expect(confirmation).not.toContainText('Remaining product balance');
  await choice('bank_transfer').click(); status = 'awaiting_confirmation'; await cta.click(); await closeModal();
  await expect(confirmation).toBeHidden(); await expect(page.locator('.payment-status')).toHaveText('Waiting for transfer confirmation');
  await page.locator('#transfer-reference').fill('fixture-reference'); await page.getByRole('button', { name: 'Submit transfer reference' }).click();
  await expect(confirmation).toBeHidden();
  status = 'confirmed'; await page.locator('.payment-check').click(); await expect(confirmation).toContainText('Payment received');
  expect(paymentCalls).toBe(4); expect(errors).toEqual([]);
  await page.goto('http://127.0.0.1:5177/checkout-test-harness?lang=vi');
  await expect(choice('deposit')).toBeEnabled(); await choice('deposit').click();
  await expect(choice('deposit')).toContainText('130.000'); await expect(choice('deposit')).not.toContainText('US$');
  await expect(page.locator('.order-total-amount')).toContainText('130.000');
  await expect(page.locator('.summary-payment')).toContainText('610.000');
  await choice('zalopay').click(); await expect(choice('zalopay')).toHaveAttribute('aria-pressed','true');
  await page.locator('#order-payment').screenshot({ path:'test-results/phase-thirteen/test-fixture-vnd-deposit-configured-test.png' });
  await mkdir('test-results/phase-eleven', { recursive: true });
  await writeFile('test-results/phase-eleven/service-report.json', JSON.stringify({ status: 'passed', testOnlyHTTPFixtures: true, paymentCalls, errors, confirmedEvents: events.filter(event => event.type === 'payment-confirmed').length }, null, 2));
  console.log('Checkout service/UI integration passed: loading, pending, invalid response, confirmed deposit/full, failed retry and awaiting bank confirmation.');
} finally { await browser?.close(); server.kill(); }
