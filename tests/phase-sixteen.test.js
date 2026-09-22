import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { bankTransferConfig } from '../src/checkout/bank-transfer-config.js';
import { checkoutConfig } from '../src/checkout/config.js';
import { CONTACT_MESSAGE_MAX, validateContactSales } from '../src/contact/contact-sales-validation.js';

test('approved bank-transfer details are centralized and current', () => {
  assert.deepEqual(bankTransferConfig, {
    accountName: 'DLV CORPORATION',
    accountNumber: '54098995',
    bankName: 'VPBank - Chi nhanh Trung Son',
    method: 'VietQR / Bank Transfer',
    transferContent: 'DPS000005',
  });
});



test('approved bilingual deposit amounts are configured for checkout', () => {
  assert.equal(checkoutConfig.depositUSD, 5);
  assert.equal(checkoutConfig.depositVND, 130000);
});
test('Contact Sales validation accepts international names and phones and rejects bad input', () => {
  assert.deepEqual(validateContactSales({ name: "Nguyễn O'Neil-Smith", phone: '+358 (9) 123-4567', message: 'IMPA 334139' }), {});
  assert.ok(validateContactSales({ name: '', phone: '+84 347 099 905', message: '' }).name);
  assert.ok(validateContactSales({ name: '!!', phone: '+84 347 099 905', message: '' }).name);
  assert.ok(validateContactSales({ name: 'Jean-Pierre Martin', phone: '123', message: '' }).phone);
  assert.ok(validateContactSales({ name: 'Jean-Pierre Martin', phone: '+44 (20) 7946-0958', message: 'x'.repeat(CONTACT_MESSAGE_MAX + 1) }).message);
  assert.deepEqual(validateContactSales({ name: 'Jean-Pierre Martin', phone: '+44 (20) 7946-0958', message: '' }), {});
});

test('Phase 16 source includes copy actions, Contact Sales and approved favicon wiring', async () => {
  const root = new URL('../', import.meta.url);
  const modal = await readFile(new URL('../src/components/payment-modal.js', import.meta.url), 'utf8');
  const header = await readFile(new URL('../src/components/header.js', import.meta.url), 'utf8');
  const index = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(modal, /Copy account number/);
  assert.match(modal, /Copy transfer content/);
  assert.match(header, /CONTACT SALES/);
  assert.match(header, /language-option/);
  assert.match(index, /\.\/favicon\.png/);
  await access(new URL('../references/favicon.png', import.meta.url));
  await access(new URL('../public/favicon.png', import.meta.url));
  void root;
});

test('obsolete transfer content is absent from active source', async () => {
  const files = [
    '../src/checkout/bank-transfer-config.js',
    '../src/components/payment-modal.js',
    '../src/components/order-completion.js',
  ];
  for (const file of files) assert.doesNotMatch(await readFile(new URL(file, import.meta.url), 'utf8'), /DPS000004/);
});


test('payment modals do not expose simulation or developer commentary to customers', async () => {
  const source = await readFile(new URL('../src/components/payment-modal.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /t\(['"]SIMULATION['"]\)/);
  assert.doesNotMatch(source, /Simulation payment window/);
  assert.doesNotMatch(source, /QR preview — not payable/);
  assert.doesNotMatch(source, /Continue to secure card checkout/);
});


test('sticky Order Summary provides a contextual next-checkout CTA', async () => {
  const source = await readFile(new URL('../src/components/order-summary.js', import.meta.url), 'utf8');
  const css = await readFile(new URL('../src/styles/order-summary.css', import.meta.url), 'utf8');
  assert.match(source, /summary-next-action/);
  assert.match(source, /actionTargetSelector = state\.paymentUnlocked \? '#order-payment' : '#contact-shipping'/);
  assert.match(source, /function resolveActionTarget\(\)/);
  assert.match(source, /document\.querySelector\(actionTargetSelector\)/);
  assert.match(source, /state\.paymentUnlocked \? 'PAY NOW' : 'ORDER'/);
  assert.match(source, /targetIsInWorkingView/);
  assert.match(source, /scrollIntoView/);
  assert.match(css, /\.summary-next-action/);
});
