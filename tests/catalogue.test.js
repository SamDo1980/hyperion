import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import XLSX from 'xlsx';
import { createCatalogue } from '../src/lib/product-catalogue.js';
import { createCartStore, CART_KEY } from '../src/cart/cart-store.js';
import { getProductPrice, formatPrice } from '../src/lib/storefront.js';
import { orderTotals } from '../src/cart/order-totals.js';
import { groupSearchResults } from '../src/lib/search-presentation.js';

const products = JSON.parse(await readFile(new URL('../src/data/products.json', import.meta.url)));
const report = JSON.parse(await readFile(new URL('../data/product-data-report.json', import.meta.url)));
const snapshot = JSON.parse(await readFile(new URL('../data/source-workbook.json', import.meta.url)));
const catalogue = createCatalogue(products);
const findIds = query => catalogue.search(query).map(p => p.id).sort();
const ids = list => list.map(p => p.id).sort();

test('search presentation groups only source-identical families and preserves every exact SKU', () => {
  const groups = groupSearchResults(products);
  assert.deepEqual(ids(groups.flatMap(group => group.products)), ids(products));
  assert.ok(groups.some(group => group.shared));
  for (const group of groups.filter(group => group.shared)) {
    for (const field of ['product_family_id', 'impa_code', 'dimensions_display', 'display_name_en', 'display_name_vi', 'image_url']) {
      assert.equal(new Set(group.products.map(p => p[field])).size, 1);
    }
    assert.equal(new Set(group.products.map(p => p.edition)).size, group.products.length);
    assert.ok(group.products.every(p => catalogue.getById(p.id) === p));
  }
  const one = catalogue.search(products[0].barcode);
  assert.equal(groupSearchResults(one).length, 1);
  assert.equal(groupSearchResults(one)[0].shared, false);
  assert.deepEqual(groupSearchResults([]), []);
});

test('presentation grouping falls back for different artwork, wording, size or repeated edition', () => {
  const pair = groupSearchResults(products).find(group => group.shared).products;
  for (const field of ['image_url', 'display_name_en', 'display_name_vi', 'dimensions_display', 'impa_code', 'edition']) {
    const changed = structuredClone(pair);
    changed[1][field] = field === 'edition' ? changed[0].edition : 'different';
    const groups = groupSearchResults(changed);
    assert.ok(groups.every(group => !group.shared));
    assert.equal(groups.length, changed.length);
  }
});

test('cart quantity editing and explicit removal publish and persist exact barcode rows', () => {
  const saved = new Map();
  const storage = { getItem: key => saved.get(key), setItem: (key, value) => saved.set(key, value) };
  const cart = createCartStore(catalogue, storage);
  const [first, second] = products;
  const events = [];
  cart.subscribe(items => events.push(items));
  cart.add(first.id, 2); cart.add(second.id, 1); cart.add(first.id, 1);
  assert.deepEqual(cart.getItems().map(p => p.id), [first.id, second.id]);
  cart.setQuantity(first.id, 5);
  assert.equal(cart.getCount(), 6);
  assert.equal(events.at(-1)[0].quantity, 5);
  cart.setQuantity(first.id, 1);
  assert.equal(cart.getItems().length, 2);
  assert.equal(cart.remove(first.id), true);
  assert.deepEqual(cart.getItems().map(p => p.id), [second.id]);
  assert.deepEqual(createCartStore(catalogue, storage).getItems(), cart.getItems());
  cart.remove(second.id);
  assert.deepEqual(cart.getItems(), []);
  assert.equal(cart.getCount(), 0);
});

test('cart edits reject invalid quantities and cannot introduce an unknown or absent SKU', () => {
  const cart = createCartStore(catalogue);
  cart.add(products[0].id, 2);
  for (const quantity of [0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => cart.setQuantity(products[0].id, quantity), /whole-number/);
  }
  assert.throws(() => cart.setQuantity(products[1].id, 1), /not in your order/);
  assert.throws(() => cart.setQuantity('invented-sku', 1), /not in your order/);
  assert.equal(cart.remove('invented-sku'), false);
  assert.equal(cart.getItems()[0].quantity, 2);
});

test('order totals use source currency minor units and respond to edits/removal', () => {
  for (const locale of ['en', 'vi']) {
    const currency = locale === 'en' ? 'USD' : 'VND';
    const factor = currency === 'USD' ? 100 : 1;
    const cart = createCartStore(catalogue, undefined, locale);
    assert.deepEqual(orderTotals(cart.getItems(), currency), { lineCount: 0, quantity: 0, amount: 0, currency });
    cart.add(products[0].id, 2); cart.add(products[1].id, 3);
    const expected = (Math.round(products[0].prices[currency] * factor) * 2 + Math.round(products[1].prices[currency] * factor) * 3) / factor;
    assert.deepEqual(orderTotals(cart.getItems(), currency), { lineCount: 2, quantity: 5, amount: expected, currency });
    cart.setQuantity(products[0].id, 4); cart.remove(products[1].id);
    assert.equal(orderTotals(cart.getItems(), currency).amount, Math.round(products[0].prices[currency] * factor) * 4 / factor);
  }
});

test('308 distinct SKUs, 150 IMPA codes, 154 products per edition', () => {
  assert.equal(products.length, 308);
  assert.equal(new Set(products.map(p => p.id)).size, 308);
  assert.equal(new Set(products.map(p => p.impa_code)).size, 150);
  assert.equal(products.filter(p => p.edition === 'Standard').length, 154);
  assert.equal(products.filter(p => p.edition === 'Outdoor').length, 154);
});

test('every source field and normalized commercial value agrees with XLSX', async () => {
  const workbook = XLSX.read(await readFile(report.source_file), { type: 'buffer' });
  const sheet = workbook.Sheets['SKU Master'];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true });
  const headers = rows[0];
  for (const p of products) {
    const row = rows[p.source.row - 1];
    const fields = snapshot[p.source.sheet].find(record => record.row === p.source.row).fields;
    for (let column = 0; column < headers.length; column++) {
      assert.deepEqual(fields[headers[column]], row[column], `${p.id}: ${headers[column]}`);
    }
    assert.equal(p.original_name_en, fields['Original Name EN']);
    assert.equal(p.original_name_vi, fields['Original Name VI']);
    assert.equal(p.sale_price, fields['Sales Price VND']);
    assert.equal(p.image_url, fields.Images);
    assert.equal(p.edition, fields.Edition);
    assert.equal(p.internal_reference, fields['Internal Reference']);
    assert.equal(p.currency, 'VND');
    assert.equal(p.prices.VND, fields['Sales Price VND']);
    assert.equal(p.prices.USD, fields['Sales Price USD']);
    assert.equal(p.display_name_en, fields['Display Name EN']);
    assert.equal(p.display_name_vi, fields['Display Name VI']);
    assert.equal(p.issa_code, fields['ISSA Code']);
    assert.equal(p.dimensions_source, 'Size');
    assert.equal(p.dimensions_display, fields['Size Display']);
  }
});

test('IMPA formatting and all real size/edition options', () => {
  const expected = products.filter(p => p.impa_code === '334420');
  assert.ok(expected.length > 2);
  for (const query of ['334420', '33.4420', '33 44 20', 'IMPA 334420', 'impa code: 33-44-20']) {
    assert.deepEqual(findIds(query), ids(expected));
  }
  assert.equal(new Set(expected.map(p => p.edition)).size, 2);
  assert.ok(new Set(expected.map(p => p.dimensions_display)).size > 1);
});

test('English, Vietnamese, partial and accent-insensitive searches', () => {
  const expected = products.filter(p => p.impa_code === '334152');
  for (const query of ['Emergency Eye Wash', 'emergency eye', 'Bồn rửa mắt', 'bon rua mat', '  EYE WASH  ']) {
    assert.deepEqual(findIds(query), ids(expected));
  }
  assert.equal(expected[0].display_name_en, 'Emergency Eye Wash');
});

test('duplicate internal references never merge different size SKUs in cart', () => {
  const variants = products.filter(p => p.internal_reference === 'HYPERION33.4420');
  assert.equal(variants.length, 2);
  const cart = createCartStore(catalogue);
  for (const p of variants) cart.add(p.id);
  assert.equal(cart.getItems().length, 2);
  assert.notEqual(cart.getItems()[0].dimensions, cart.getItems()[1].dimensions);
});

test('all internal references, barcodes and ISSA codes retrieve their source SKU', () => {
  for (const p of products) {
    assert.ok(findIds(p.id).includes(p.id));
    assert.ok(findIds(p.internal_reference.replaceAll('.', '-').toLowerCase()).includes(p.id));
    assert.ok(findIds(p.barcode).includes(p.id));
    if (p.issa_code) assert.ok(findIds(`ISSA ${p.issa_code}`).includes(p.id));
  }
});

test('blank, punctuation-only and no-result searches do not invent products', () => {
  for (const query of ['', '   ', '!!!', 'IMPA', 'ISSA code', 'no-such-hyperion-xyz999', '<script>alert(1)</script>']) {
    assert.deepEqual(catalogue.search(query), [], query);
  }
});

function memoryStorage() {
  const values = new Map();
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}

test('cart uses canonical SKU data, merges exact SKU, separates variants and persists', () => {
  const storage = memoryStorage();
  const cart = createCartStore(catalogue, storage);
  const standard = products.find(p => p.impa_code === '334152' && p.edition === 'Standard');
  const outdoor = products.find(p => p.impa_code === '334152' && p.edition === 'Outdoor');
  cart.add({ ...standard, sale_price: 1, display_name_en: 'Tampered' }, 2);
  cart.add(standard.id, 3);
  cart.add(outdoor.id, 1);
  const lines = cart.getItems();
  assert.equal(lines.length, 2);
  assert.equal(lines[0].quantity, 5);
  assert.equal(lines[0].unit_price, standard.prices.USD);
  assert.equal(lines[0].display_name, standard.display_name_en);
  assert.equal(lines[1].edition, 'Outdoor');
  assert.equal(cart.getCount(), 6);
  assert.deepEqual(createCartStore(catalogue, storage).getItems(), lines);
  lines[0].quantity = 99;
  assert.equal(cart.getItems()[0].quantity, 5);
});

test('cart rejects unknown SKUs and invalid quantities', () => {
  const cart = createCartStore(catalogue);
  assert.throws(() => cart.add('IMAGINARY-SKU'));
  for (const quantity of [0, -1, 1.5, NaN, Infinity, '2', Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => cart.add(products[0].id, quantity));
  }
  assert.deepEqual(cart.getItems(), []);
});

test('cart tolerates corrupt storage and revalidates persisted lines', () => {
  const storage = memoryStorage();
  storage.setItem(CART_KEY, '{bad-json');
  assert.deepEqual(createCartStore(catalogue, storage).getItems(), []);
  storage.setItem(CART_KEY, JSON.stringify({ version: 1, items: [
    { id: products[0].id, quantity: 2, unit_price: 0 },
    { id: 'FAKE', quantity: 1 }, { id: products[1].id, quantity: -1 },
  ] }));
  const cart = createCartStore(catalogue, storage);
  assert.equal(cart.getItems().length, 1);
  assert.equal(cart.getItems()[0].unit_price, products[0].prices.USD);
  const unavailable = createCartStore(catalogue, { getItem() { throw Error(); }, setItem() { throw Error(); } });
  unavailable.add(products[0].id);
  assert.equal(unavailable.getCount(), 1);
  assert.equal(unavailable.isPersistent(), false);
});

test('EN/USD and VI/VND read workbook prices and share persisted barcode identity', () => {
  const storage = memoryStorage();
  const en = createCartStore(catalogue, storage, 'en');
  en.add(products[0].id, 2);
  const vi = createCartStore(catalogue, storage, 'vi');
  vi.add(products[0].id, 1);
  assert.equal(vi.getItems().length, 1);
  assert.equal(vi.getItems()[0].quantity, 3);
  assert.equal(vi.getItems()[0].unit_price, products[0].prices.VND);
  assert.equal(vi.getItems()[0].currency, 'VND');
  for (const p of products) {
    assert.deepEqual(getProductPrice(p, 'en'), { amount: p.prices.USD, currency: 'USD' });
    assert.deepEqual(getProductPrice(p, 'vi'), { amount: p.prices.VND, currency: 'VND' });
    assert.ok(formatPrice(p.prices.USD, 'USD').includes('$'));
    assert.ok(formatPrice(p.prices.VND, 'VND').includes('₫'));
  }
});
