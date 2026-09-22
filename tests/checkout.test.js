import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createCatalogue } from '../src/lib/product-catalogue.js';
import { createCartStore } from '../src/cart/cart-store.js';
import { createCheckoutStore } from '../src/checkout/checkout-store.js';
import { paymentAmounts, validateContact, DRAFT_KEY } from '../src/checkout/order-draft.js';
import { createPaymentService, secureURL } from '../src/checkout/payment-service.js';

const products = JSON.parse(await readFile(new URL('../src/data/products.json', import.meta.url)));
const catalogue = createCatalogue(products);
const customer = { fullName: 'Checkout Test', company: '', email: 'checkout@example.test', phone: '+44 20 7946 0958' };
const shipping = { address: 'Test address', cityProvince: 'Test city', country: 'United Kingdom', countryCode: 'GB' };
function memory() { const data = new Map(); return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key), data }; }
function setup({ storage = memory(), currency = 'USD', config = {}, service = backend(), onEvent } = {}) {
  const cart = createCartStore(catalogue, storage, currency === 'VND' ? 'vi' : 'en');
  const store = createCheckoutStore({ cart, storage, currency, config, service, onEvent });
  function fill() { for (const [group, values] of Object.entries({ customer, shipping })) for (const [key, value] of Object.entries(values)) store.setField(group, key, value); }
  function ready() { cart.add(products[0].id, 10); fill(); store.selectAmount('deposit'); store.selectMethod('card'); }
  return { store, cart, storage, fill, ready };
}
// Service doubles exist only in tests, never in the shipped frontend.
function backend(status = 'pending') {
  let payment;
  const response = () => ({ orderId: 'test-order', transactionId: 'test-transaction', currency: 'USD', amountDueNow: payment.amountDueNow, amountPaid: status === 'confirmed' ? payment.amountDueNow : null, status });
  return { configured: true, capabilities: { card: true, zalopay: true, bank_transfer: true }, createOrderDraft: async () => ({ orderId: 'test-order' }),
    createPayment: async (_id, value) => { payment = value; return response(); },
    getPaymentStatus: async () => response(), submitBankTransferReference: async () => response(),
    setStatus: value => { status = value; },
  };
}

test('empty cart locks both steps; first real SKU unlocks shipping; required fields gate payment', () => {
  const { store, cart, fill } = setup();
  assert.equal(store.getState().shippingUnlocked, false); assert.equal(store.getState().paymentUnlocked, false);
  cart.add(products[0].id); assert.equal(store.getState().shippingUnlocked, true); assert.equal(store.getState().paymentUnlocked, false);
  fill(); assert.equal(store.getState().paymentUnlocked, true);
  for (const [group, key] of [['customer', 'fullName'], ['customer', 'email'], ['customer', 'phone'], ['shipping', 'address'], ['shipping', 'cityProvince'], ['shipping', 'country']]) {
    store.setField(group, key, ' '); assert.equal(store.getState().paymentUnlocked, false); fill();
  }
  cart.remove(products[0].id); assert.equal(store.getState().shippingUnlocked, false); assert.equal(store.getState().paymentUnlocked, false);
  assert.equal(store.getState().order.customer.fullName, customer.fullName);
});
test('company is optional; invalid emails are rejected', () => {
  assert.deepEqual(validateContact(customer, shipping), {});
  for (const email of ['plain', 'a@', 'a@b', 'a b@example.com', 'a@example..com']) assert.ok(validateContact({ ...customer, email }, shipping).email);
});
test('international telephone lengths, punctuation and country codes are accepted', () => {
  for (const phone of ['+84 912 345 678', '+44 (20) 7946-0958', '+1 202-555-0123', '+358 9 1234567', '090 123 4567', '+123456789012345']) assert.equal(validateContact({ ...customer, phone }, shipping).phone, undefined);
  for (const phone of ['123', '+1234567890123456', 'call me', '++44 1234567', '12+3456789']) assert.ok(validateContact({ ...customer, phone }, shipping).phone);
});
test('fixed USD deposit, capped small orders and exact remaining balance', () => {
  for (const [subtotal, due, remaining] of [[120, 5, 115], [5, 5, 0], [2.85, 2.85, 0], [0, 0, 0], [7.35, 5, 2.35]]) assert.deepEqual(paymentAmounts(subtotal, 'USD', 'deposit'), { depositAmount: 5, amountDueNow: due, remainingProductBalance: remaining });
});
test('full payment uses merchandise subtotal and zero remaining balance', () => {
  assert.equal(paymentAmounts(120.25, 'USD', 'full').amountDueNow, 120.25);
  assert.equal(paymentAmounts(120.25, 'USD', 'full').remainingProductBalance, 0);
});
test('VND deposit uses the configured fixed amount and is capped by merchandise subtotal', () => {
  assert.equal(paymentAmounts(2308000, 'VND', 'deposit', 130000).amountDueNow, 130000);
  assert.equal(paymentAmounts(2308000, 'VND', 'deposit', 130000).remainingProductBalance, 2178000);
  assert.equal(paymentAmounts(74000, 'VND', 'deposit', 130000).amountDueNow, 74000);
  assert.equal(paymentAmounts(74000, 'VND', 'deposit', 130000).remainingProductBalance, 0);
  assert.equal(paymentAmounts(74000, 'VND', 'full', 130000).amountDueNow, 74000);
});
test('cart quantity/removal recalculates deposit, full totals and remaining; shipping never added', () => {
  const { store, cart, ready } = setup(); ready();
  cart.add(products[1].id, 3); cart.setQuantity(products[0].id, 2);
  let order = store.getState().order;
  const subtotal = Math.round(products[0].prices.USD * 100) * 2 / 100 + Math.round(products[1].prices.USD * 100) * 3 / 100;
  assert.equal(order.merchandiseSubtotal, subtotal); assert.equal(order.payment.amountDueNow, 5);
  assert.equal(order.payment.remainingProductBalance, Math.round((subtotal - 5) * 100) / 100);
  assert.equal(order.shipping.feeStatus, 'to_be_confirmed'); assert.equal(order.shipping.fee, undefined);
  store.selectAmount('full'); assert.equal(store.getState().order.payment.amountDueNow, subtotal);
  cart.remove(products[1].id); assert.equal(store.getState().order.payment.amountDueNow, products[0].prices.USD * 2);
  cart.remove(products[0].id); assert.equal(store.getState().order.payment.amountDueNow, 0);
  assert.equal(store.getState().canPay, false);
});
test('order identity is Barcode and excludes Internal Reference', () => {
  const { store, ready } = setup(); ready(); const item = store.getState().order.items[0];
  assert.equal(item.barcode, products[0].barcode); assert.equal(item.impa, products[0].impa_code);
  assert.equal(item.size, products[0].dimensions_display); assert.equal(item.edition, products[0].edition);
  assert.doesNotMatch(JSON.stringify(store.getState().order), /internal_reference|internalReference/);
});
test('draft survives reload/language switch and allowlists fields; ignores stored confirmed status', () => {
  const { store, storage, ready } = setup(); ready(); store.selectMethod('zalopay');
  const saved = JSON.parse(storage.getItem(DRAFT_KEY)); saved.customer.cardNumber = 'never-persist'; saved.cvv = 'never-persist'; saved.status = 'confirmed'; storage.setItem(DRAFT_KEY, JSON.stringify(saved));
  const restored = setup({ storage, currency: 'VND' });
  assert.deepEqual(restored.store.getState().order.customer, customer); assert.deepEqual(restored.store.getState().order.shipping, { ...shipping, feeStatus: 'to_be_confirmed' });
  assert.equal(restored.store.getState().order.payment.method, 'zalopay'); assert.equal(restored.store.getState().order.payment.amountOption, null);
  assert.equal(restored.store.getState().order.payment.status, 'idle');
  restored.store.setField('customer', 'cvv', 'secret'); restored.store.selectAmount('full');
  assert.doesNotMatch(storage.getItem(DRAFT_KEY), /cvv|cardNumber|never-persist|secret/);
});
test('all three unconfigured methods reject selection and cannot initiate payment', async () => {
  const { store, ready } = setup({ service: createPaymentService() }); ready();
  for (const method of ['card', 'zalopay', 'bank_transfer']) {
    store.selectMethod(method); assert.equal(store.getState().order.payment.status, 'idle');
    assert.equal(store.getState().order.payment.method, null);
    assert.equal(store.getState().methodAvailability[method], false);
    await store.startPayment(); assert.equal(store.getState().error, null);
    assert.equal(store.getState().order.payment.status, 'idle'); assert.equal(store.getState().bank, null);
  }
});
test('only matching backend confirmation produces received amount and a handoff event', async () => {
  const service = backend(), events = []; const { store, ready } = setup({ service, onEvent: (type, order) => events.push({ type, order }) }); ready();
  await store.startPayment(); assert.equal(store.getState().order.payment.status, 'pending');
  assert.equal(store.getState().order.payment.amountPaid, null); assert.equal(events.length, 1);
  service.setStatus('confirmed'); await store.checkStatus();
  assert.equal(store.getState().order.payment.status, 'confirmed'); assert.equal(store.getState().order.payment.amountPaid, 5);
  assert.equal(events[1].type, 'payment-confirmed'); assert.equal(events[1].order.orderId, 'test-order');
  await store.checkStatus(); assert.equal(events.length, 2);
});
test('mismatched payment responses are never confirmed', async () => {
  for (const wrong of [{ currency: 'VND' }, { amountPaid: 0 }, { orderId: 'another-order' }, { amountDueNow: 99 }, { status: 'success' }]) {
    const service = backend('confirmed'); const original = service.createPayment;
    service.createPayment = async (...args) => ({ ...await original(...args), ...wrong });
    const { store, ready } = setup({ service }); ready(); await store.startPayment();
    assert.equal(store.getState().error, 'invalid_response'); assert.notEqual(store.getState().order.payment.status, 'confirmed');
  }
});
test('stale response after cart edit cannot confirm a changed order', async () => {
  let resolve; const service = backend('confirmed'); const original = service.createPayment;
  service.createPayment = (...args) => new Promise(done => { resolve = async () => done(await original(...args)); });
  const { store, cart, ready } = setup({ service }); ready(); const pending = store.startPayment();
  await new Promise(done => setImmediate(done)); cart.setQuantity(products[0].id, 11); await resolve(); await pending;
  assert.equal(store.getState().order.payment.status, 'idle'); assert.equal(store.getState().order.orderId, null); assert.equal(store.getState().busy, false);
});
test('bank reference does not imply success; only service status can confirm', async () => {
  const service = backend('awaiting_confirmation'); const { store, ready } = setup({ service }); ready(); store.selectMethod('bank_transfer');
  await store.startPayment(); await store.submitReference('test-reference');
  assert.equal(store.getState().order.payment.status, 'awaiting_confirmation');
  service.setStatus('confirmed'); await store.checkStatus(); assert.equal(store.getState().order.payment.status, 'confirmed');
});
test('reload rechecks saved attempt rather than trusting cached paid status', async () => {
  const service = backend('confirmed'); const { store, storage, ready } = setup({ service }); ready(); await store.startPayment();
  const restored = setup({ service, storage }); assert.equal(restored.store.getState().order.payment.status, 'pending');
  await restored.store.checkStatus(); assert.equal(restored.store.getState().order.payment.status, 'confirmed');
});
test('network failures allow retry with the same idempotency key; rapid double-click does not duplicate', async () => {
  const service = backend(); const original = service.createPayment; const keys = []; let calls = 0;
  service.createPayment = async (id, payment, key) => { keys.push(key); if (++calls === 1) throw new Error('network'); return original(id, payment, key); };
  const { store, ready } = setup({ service }); ready(); await Promise.all([store.startPayment(), store.startPayment()]);
  assert.equal(calls, 1); assert.equal(store.getState().error, 'service_error'); await store.startPayment();
  assert.equal(calls, 2); assert.equal(keys[0], keys[1]); assert.equal(store.getState().order.payment.status, 'pending');
});
test('service adapter sends the documented requests and refuses unconfigured calls', async () => {
  await assert.rejects(createPaymentService().createOrderDraft({}), { code: 'not_configured' });
  const requests = []; const service = createPaymentService({ apiBase: '/api/checkout' }, async (url, options) => { requests.push({ url, options }); return { ok: true, json: async () => ({}) }; });
  await service.createOrderDraft({ currency: 'USD' }, 'key'); await service.createPayment('order/1', { method: 'card' }, 'key');
  await service.getPaymentStatus('order/1', 'tx/1'); await service.submitBankTransferReference('order/1', 'tx/1', 'ref');
  assert.equal(requests[0].url, '/api/checkout/orders'); assert.equal(requests[1].url, '/api/checkout/orders/order%2F1/payments');
  assert.equal(requests[2].options.method, 'GET'); assert.deepEqual(JSON.parse(requests[3].options.body), { reference: 'ref' });
  assert.equal(secureURL('javascript:alert(1)'), null); assert.equal(secureURL('http://example.test'), null); assert.equal(secureURL('https://checkout.example.test/'), 'https://checkout.example.test/');
});

test('VND deposit is guarded without configuration and selectable with the approved 130,000 VND amount', () => {
  const unavailable = setup({ currency: 'VND' }); unavailable.ready();
  assert.equal(unavailable.store.getState().amountAvailability.deposit, false);
  assert.equal(unavailable.store.getState().order.payment.amountOption, null);
  unavailable.store.selectAmount('full'); assert.equal(unavailable.store.getState().order.payment.amountDueNow, products[0].prices.VND * 10);
  const configured = setup({ currency: 'VND', config: { depositVND: 130000 } }); configured.ready();
  assert.equal(configured.store.getState().amountAvailability.deposit, true);
  assert.equal(configured.store.getState().order.payment.depositAmount, 130000);
  assert.equal(configured.store.getState().order.payment.amountDueNow, 130000);
  assert.equal(configured.store.getState().order.payment.remainingProductBalance, products[0].prices.VND * 10 - 130000);
});
test('method capabilities require both backend presence and explicit per-method configuration', () => {
  const service = createPaymentService({ apiBase: '/api', methods: { card: true, zalopay: false } });
  assert.deepEqual(service.capabilities, { card: true, zalopay: false, bank_transfer: false });
  assert.equal(createPaymentService({ methods: { card: true } }).capabilities.card, false);
  const { store, ready } = setup({ service }); ready(); assert.equal(store.getState().order.payment.method, 'card');
  store.selectMethod('zalopay'); assert.equal(store.getState().order.payment.method, 'card');
  store.selectMethod('bank_transfer'); assert.equal(store.getState().order.payment.method, 'card');
});
test('shipping starts blank; unavailable restored choices are cleared without losing customer data', () => {
  const empty = setup(); assert.ok(Object.values(empty.store.getState().order.customer).every(value => value === ''));
  for (const key of ['address', 'cityProvince', 'country']) assert.equal(empty.store.getState().order.shipping[key], '');
  empty.ready(); const restored = setup({ storage: empty.storage, currency: 'VND', service: createPaymentService() });
  assert.deepEqual(restored.store.getState().order.customer, customer);
  assert.equal(restored.store.getState().order.payment.amountOption, null); assert.equal(restored.store.getState().order.payment.method, null);
});
test('only intended application entry points remain and source ownership is documented', async () => {
  const { access, readdir } = await import('node:fs/promises');
  const files = await readdir(new URL('../', import.meta.url));
  assert.deepEqual(files.filter(name => name.endsWith('.html')).sort(), ['OPEN_UI_FAST.html', 'index.html']);
  for (const file of ['quick-preview/index.html', 'src/main.js']) await access(new URL('../' + file, import.meta.url));
  for (const file of ['QUICK_PREVIEW.html', 'OPEN_UI_FAST.txt', 'HOW_TO_PREVIEW.txt']) assert.ok(!files.includes(file));
  const rules = await readFile(new URL('../AGENTS.md', import.meta.url), 'utf8');
  for (const text of ['index.html', 'only source application entry', 'src/', 'Never edit `dist/` as source', 'Never edit `quick-preview/` as source', 'OPEN_UI_FAST.html', 'regenerated from source', 'Do not treat generated preview/build files as source of truth']) assert.ok(rules.includes(text), text);
});
