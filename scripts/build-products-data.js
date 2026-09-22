import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { readMaster, validateMaster } from './lib/master-workbook.js';
import { buildCustomerTaxonomy } from './lib/customer-taxonomy.js';
const root = fileURLToPath(new URL('../', import.meta.url));
const source = 'references/Hyperion_Product_Master.xlsx';
if (process.argv.length > 2) throw new Error(`Only ${source} is permitted; source overrides are not supported.`);
const bytes = await readFile(path.join(root, source));
const sheets = readMaster(bytes);
const qa = validateMaster(sheets);
const common = f => {
  const [, first, second] = f.Size.match(/^(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*mm$/i);
  return { product_family_id: f['Product Family ID'], display_name_en: f['Display Name EN'], display_name_vi: f['Display Name VI'],
    customer_category_en: f['Customer Category EN'], customer_category_vi: f['Customer Category VI'], category_order: f['Category Order'],
    product_concept_en: f['Product Concept EN'], product_concept_vi: f['Product Concept VI'], direction: f.Direction,
    impa_code: String(f['IMPA Code']), issa_code: f['ISSA Code'] == null ? null : String(f['ISSA Code']),
    size: f.Size, dimensions: { first_mm: Number(first), second_mm: Number(second) }, dimensions_display: f['Size Display'], dimensions_source: 'Size',
    taxonomy_mapping_method: f['Taxonomy Mapping Method'], taxonomy_confidence: f['Taxonomy Confidence'] };
};
const products = sheets['SKU Master'].map(({ row, fields: f }) => ({ ...common(f),
  id: String(f.Barcode), barcode: String(f.Barcode), internal_reference: f['Internal Reference'],
  original_name_en: f['Original Name EN'], original_name_vi: f['Original Name VI'],
  edition: f.Edition, sale_price: f['Sales Price VND'], currency: 'VND', prices: { VND: f['Sales Price VND'], USD: f['Sales Price USD'] },
  currency_symbols: { VND: f['Currency VI'], USD: f['Currency EN'] }, cost: f['Cost VND'], unit: f.Unit, quantity_on_hand: f['Quantity On Hand'],
  description_en: f['Description EN'], description_vi: f['Description VI'], manufacturer: f.Producer, origin: f.Origin,
  image_url: f.Images, data_status: f['Data Status'], review_note: f['Review Note'], source: { sheet: 'SKU Master', row },
}));
const families = sheets['Master Index'].map(({ row, fields: f }) => ({ ...common(f), id: f['Product Family ID'],
  sku_ids: [String(f['Standard Barcode']), String(f['Outdoor Barcode'])], image_url: f['Image URL'], source: { sheet: 'Master Index', row } }));
const { taxonomy, configurator } = buildCustomerTaxonomy(sheets, families, products);
const report = { source_file: source, source_sha256: createHash('sha256').update(bytes).digest('hex'), ...qa,
  concept_translation_variants: configurator.concepts.filter(c => c.labels_vi.length > 1).map(c => ({ concept: c.label_en, labels_vi: c.labels_vi })) };
for (const dir of ['src/data', 'data']) await mkdir(path.join(root, dir), { recursive: true });
for (const [file, data] of [['src/data/products.json', products], ['src/data/families.json', families], ['src/data/taxonomy.json', taxonomy],
  ['src/data/configurator.json', configurator], ['data/source-workbook.json', sheets], ['data/product-data-report.json', report]])
  await writeFile(path.join(root, file), JSON.stringify(data, null, 2) + '\n');
console.log(JSON.stringify({ status: qa.status, sku_count: products.length, family_count: families.length, unique_impa: qa.unique_impa_count, categories: taxonomy.groups.map(g => ({ name: g.label_en, families: g.family_count, skus: g.sku_count })), review_flags: qa.review_flags }, null, 2));
