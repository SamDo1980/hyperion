import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { readMaster, validateMaster } from '../scripts/lib/master-workbook.js';
import { createProgressiveFlow } from '../src/configurator/progressive-flow.js';
import { createCatalogue } from '../src/lib/product-catalogue.js';
import { createCartStore } from '../src/cart/cart-store.js';
const load = async file => JSON.parse(await readFile(new URL(file, import.meta.url)));
const products = await load('../src/data/products.json'), families = await load('../src/data/families.json');
const taxonomy = await load('../src/data/taxonomy.json'), mapping = await load('../src/data/configurator.json');
const sheets = readMaster(await readFile(new URL('../references/Hyperion_Product_Master.xlsx', import.meta.url)));
const catalogue = createCatalogue(products);
const flow = () => createProgressiveFlow(families, catalogue, mapping);
const attributes = p => ({ ...p, ...mapping.families.find(f => f.product_family_id === p.product_family_id) });
function resolve(p, f = flow()) {
  f.select('customer_category_id', p.customer_category_id);
  for (let i = 0; i < 10 && f.getState().activeField; i++) {
    const key = f.getState().activeField;
    f.select(key, attributes(p)[key]);
  }
  return f;
}
test('clean workbook passes validation and retains REVIEW without reclassification', () => {
  const qa = validateMaster(sheets);
  assert.equal(qa.sku_count, 308); assert.equal(qa.family_count, 154); assert.equal(qa.populated_sizes, 308);
  assert.equal(qa.review_flags[0].fields.Actual, '334153');
  assert.ok(products.filter(p => p.impa_code === '334153').every(p => p.taxonomy_confidence === 'Medium' && p.customer_category_en === 'Emergency Equipment Signs (EES)'));
});
test('validation rejects corrupt counts, QA, identity, dimensions, prices and family linkage', () => {
  for (const damage of [s => s['SKU Master'].pop(), s => s['SKU Master'][0].fields.Barcode = s['SKU Master'][1].fields.Barcode,
    s => s['SKU Master'][0].fields.Size = '', s => s['SKU Master'][0].fields['Sales Price USD'] = -1,
    s => s['Master Index'][0].fields['Standard Barcode'] = 'unknown', s => s['QA Report'][0].fields.Status = 'FAIL',
    s => s['Category Summary'][0].fields['Sellable SKUs'] = 1, s => delete s['SKU Master']]) {
    const damaged = structuredClone(sheets); damage(damaged); assert.throws(() => validateMaster(damaged), /QA failed/);
  }
});
test('five source categories and actual distributions replace retired taxonomy completely', () => {
  assert.deepEqual(taxonomy.groups.map(g => [g.impa_count, g.family_count, g.sku_count]), [[70,70,140],[53,57,114],[16,16,32],[10,10,20],[1,1,2]]);
  assert.deepEqual(taxonomy.groups.map(g => g.label_en), sheets['Category Summary'].slice(0,5).map(r => r.fields['Customer Category EN']));
  assert.doesNotMatch(JSON.stringify({ products, families, taxonomy, mapping }), /shipserv|hyperion_ui_|"symbols"|"direction-signs"|"safety-signs"/i);
  for (const group of taxonomy.groups) {
    const state = flow().select('customer_category_id', group.id);
    assert.equal(state.currentCandidates.length, group.sku_count);
    assert.ok(state.currentCandidates.every(p => p.customer_category_id === group.id));
  }
});
test('Direction stays in data while singleton size requires confirmation', () => {
  for (const group of taxonomy.groups) assert.equal(mapping.branches[group.id].includes('config_direction'), families.some(f => f.customer_category_id === group.id && f.direction));
  const state = flow().select('customer_category_id', taxonomy.groups[4].id);
  assert.deepEqual(state.visibleSteps.map(s => s.field), ['config_concept', 'dimensions_display']);
  assert.equal(state.currentCandidates.length, 2); assert.equal(state.resolvedSku, null);
});
test('every reachable path resolves a real barcode, and all 308 SKUs are reachable', () => {
  const reached = new Set();
  function visit(path) {
    const f = flow(); for (const [key,value] of path) f.select(key,value);
    const s = f.getState(); assert.equal(s.error, null); assert.ok(s.currentCandidates.length);
    if (s.resolvedSku) { assert.equal(s.currentCandidates.length, 1); assert.equal(s.resolvedSku, catalogue.getById(s.resolvedSku.id)); reached.add(s.resolvedSku.id); return; }
    assert.ok(s.activeField); const step = s.visibleSteps.find(step => step.field === s.activeField);
    assert.ok(step.options.length >= (step.field === 'dimensions_display' ? 1 : 2)); for (const option of step.options) visit([...path, [step.field,option.value]]);
  }
  for (const g of taxonomy.groups) visit([['customer_category_id',g.id]]);
  assert.deepEqual([...reached].sort(), products.map(p => p.id).sort());
});
test('normalized source attributes, source display names and edition price resolve for every SKU', () => {
  for (const p of products) {
    const f = resolve(p); assert.equal(f.getState().resolvedSku, p);
    const source = sheets['SKU Master'].find(r => String(r.fields.Barcode) === p.id).fields;
    assert.equal(p.direction, source.Direction); assert.equal(p.dimensions_display, source['Size Display']);
    assert.equal(p.display_name_vi, source['Display Name VI']); assert.equal(p.prices.USD, source['Sales Price USD']);
  }
});
test('upstream changes discard invalid family identity but retain valid size and edition', () => {
  const first = products.find(p => p.impa_code === '334152' && p.edition === 'Outdoor');
  const next = products.find(p => p.display_name_en === 'Hospital' && p.edition === 'Outdoor');
  const f = resolve(first);
  const state = f.select('config_concept', attributes(next).config_concept);
  assert.equal(state.resolvedSku, next); assert.equal(state.selections.edition, 'Outdoor');
  assert.notEqual(state.selections.product_family_id, first.product_family_id);
  assert.equal(state.selections.dimensions_display, first.dimensions_display);
  const changed = f.select('customer_category_id', taxonomy.groups[0].id);
  assert.equal(changed.resolvedSku, null); assert.equal(changed.selections.config_concept, undefined);
  assert.equal(changed.selections.edition, 'Outdoor');
});
test('purchase guard rejects partial/unknown choices and shares barcode cart merge behavior', () => {
  const f = flow(), cart = createCartStore(catalogue);
  assert.throws(() => f.addResolvedToCart(cart,1)); assert.throws(() => f.select('customer_category_id','invented'));
  const p = products[0]; resolve(p,f); f.addResolvedToCart(cart,2); cart.add(p.id,1);
  assert.equal(cart.getItems().length,1); assert.equal(cart.getCount(),3);
  f.reset(); assert.equal(f.getState().resolvedSku,null); assert.throws(() => f.addResolvedToCart(cart,1));
});

test('each concept exposes exactly its family count as unified designs before explicit Size', () => {
  for (const concept of mapping.concepts) {
    const f = flow(); f.select('customer_category_id', concept.category_id);
    if (f.getState().activeField === 'config_concept') f.select('config_concept', concept.id);
    let s = f.getState();
    assert.ok(!s.visibleSteps.some(step => step.field === 'config_direction'));
    if (concept.family_ids.length > 1) {
      const step = s.visibleSteps.find(step => step.field === 'product_family_id');
      assert.equal(step.options.length, concept.family_ids.length);
      f.select('product_family_id', concept.family_ids[0]);
    }
    s = f.getState(); assert.equal(s.activeField, 'dimensions_display');
    assert.equal(s.selections.dimensions_display, undefined); assert.equal(s.resolvedSku, null);
    assert.throws(() => f.addResolvedToCart(createCartStore(catalogue),1));
    const size = s.visibleSteps.find(step => step.field === 'dimensions_display');
    s = f.select('dimensions_display',size.options[0].value);
    assert.equal(s.activeField,'edition');
  }
});
test('single edition auto-selects only after explicit Size confirmation', () => {
  const p=products[0], family=families.find(f=>f.id===p.product_family_id);
  const f=createProgressiveFlow([{...family,sku_ids:[p.id]}],createCatalogue([p]),mapping);
  let s=f.select('customer_category_id',p.customer_category_id);
  assert.equal(s.resolvedSku,null); assert.equal(s.activeField,'dimensions_display');
  s=f.select('dimensions_display',p.dimensions_display);
  assert.equal(s.resolvedSku.id,p.id);assert.equal(s.visibleSteps.at(-1).field,'edition');
});
test('changing design clears incompatible size and preserves a valid edition', () => {
  const list=products.filter(p=>p.impa_code==='334420' && p.edition==='Standard');
  const a=list[0],b=list.find(p=>p.dimensions_display!==a.dimensions_display);
  const f=resolve(a);let s=f.select('product_family_id',b.product_family_id);
  assert.equal(s.activeField,'dimensions_display');assert.equal(s.selections.dimensions_display,undefined);
  assert.equal(s.resolvedSku,null);assert.equal(s.selections.edition,'Standard');
  s=f.select('dimensions_display',b.dimensions_display);assert.equal(s.resolvedSku.id,b.id);
});

test('roadmap keeps downstream steps locked and omits only a known singleton design', () => {
  const f=flow();let s=f.getState();
  assert.deepEqual(s.roadmap.map(x=>x.field),['config_concept','product_family_id','dimensions_display','edition']);
  assert.ok(s.roadmap.every(x=>x.locked));
  const p=products.find(p=>p.impa_code==='334152');
  s=f.select('customer_category_id',p.customer_category_id);
  assert.equal(s.roadmap[0].locked,undefined);assert.ok(s.roadmap.slice(1).every(x=>x.locked));
  s=f.select('config_concept',attributes(p).config_concept);
  assert.ok(!s.roadmap.some(x=>x.field==='product_family_id'));
  assert.equal(s.activeField,'dimensions_display');assert.equal(s.roadmap.at(-1).locked,true);
  assert.throws(()=>f.select('edition','Standard'));
  f.select('dimensions_display',p.dimensions_display);s=f.select('edition','Standard');assert.equal(s.resolvedSku.id,p.id);
  s=f.select('customer_category_id',taxonomy.groups[0].id);
  assert.ok(s.roadmap.slice(1).every(x=>x.locked));assert.equal(s.resolvedSku,null);
});
import { canonicalSizes } from '../src/configurator/size-options.js';

test('canonical size matrix retains all source sizes in dimensional order regardless of row order', () => {
  const sizes = canonicalSizes(products);
  assert.equal(sizes.length, new Set(products.map(p => p.dimensions_display)).size);
  assert.deepEqual(canonicalSizes([...products].reverse()), sizes);
  const area = value => value.match(/\d+/g).map(Number).reduce((a, b) => a * b);
  for (let i = 1; i < sizes.length; i++) assert.ok(area(sizes[i]) >= area(sizes[i - 1]));
  for (const p of products) {
    const f = resolve(p);
    const step = f.getState().visibleSteps.find(s => s.field === 'dimensions_display');
    const valid = new Set(step.options.map(o => o.value));
    for (const size of sizes.filter(size => !valid.has(size))) assert.throws(() => f.select('dimensions_display', size));
  }
});
