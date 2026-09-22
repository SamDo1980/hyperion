import XLSX from 'xlsx';
export function readMaster(bytes) {
  const book = XLSX.read(bytes, { type: 'buffer', cellDates: false });
  return Object.fromEntries(book.SheetNames.map(name => {
    const rows = XLSX.utils.sheet_to_json(book.Sheets[name], { header: 1, defval: null, raw: true });
    return [name, rows.slice(1).flatMap((values, i) => values.some(v => v !== null) ? [{ row: i + 2, fields: Object.fromEntries(rows[0].map((key, j) => [key, values[j] ?? null])) }] : [])];
  }));
}
export function validateMaster(sheets) {
  const errors = [];
  const wording_variants = [];
  const check = (valid, message) => { if (!valid) errors.push(message); };
  const fail = () => { if (errors.length) throw new Error(`Master workbook QA failed; no data generated:\n${errors.join('\n')}`); };
  for (const name of ['Config', 'SKU Master', 'Master Index', 'Taxonomy Map', 'Category Summary', 'Catalogue Index', 'Raw Source', 'QA Report']) check(sheets[name]?.length, `Missing worksheet: ${name}`);
  fail();
  const config = Object.fromEntries(sheets.Config.map(r => [r.fields.Setting, r.fields.Value]));
  check(config.SKU_Identity === 'Barcode' && config.Family_Identity === 'Product Family ID', 'Invalid identity rules');
  check(config.EN_Currency === '$ / USD' && config.VI_Currency === '₫ / VND', 'Invalid currency rules');
  for (const { fields: f } of sheets['QA Report']) {
    check(['PASS', 'INFO', 'REVIEW'].includes(f.Status), `QA failure: ${f.Check}`);
    if (f.Status === 'PASS') check(f.Expected === f.Actual, `QA mismatch: ${f.Check}`);
  }
  const skus = sheets['SKU Master'].map(r => r.fields), families = sheets['Master Index'].map(r => r.fields);
  const byId = new Map(skus.map(f => [String(f.Barcode), f]));
  const unique = (rows, key) => new Set(rows.map(f => f[key])).size;
  const counts = { sku_count: skus.length, unique_barcodes: byId.size, family_count: families.length, unique_impa_count: unique(skus, 'IMPA Code'), source_category_count: unique(skus, 'Customer Category EN'), populated_sizes: skus.filter(f => f.Size).length, standard_skus: skus.filter(f => f.Edition === 'Standard').length, outdoor_skus: skus.filter(f => f.Edition === 'Outdoor').length };
  for (const [key, expected] of Object.entries({ sku_count: 308, unique_barcodes: 308, family_count: 154, unique_impa_count: 150, source_category_count: 5, populated_sizes: 308, standard_skus: 154, outdoor_skus: 154 })) check(counts[key] === expected, `${key}: expected ${expected}, got ${counts[key]}`);
  check(unique(families, 'Product Family ID') === families.length, 'Duplicate family identity');
  const common = ['Product Family ID', 'Customer Category EN', 'Customer Category VI', 'Category Order', 'Product Concept EN', 'Product Concept VI', 'Display Name EN', 'Display Name VI', 'Direction', 'Size', 'Size Display', 'IMPA Code', 'ISSA Code'];
  for (const f of skus) {
    for (const key of ['Barcode', 'Internal Reference', 'Original Name EN', 'Original Name VI', ...common.filter(k => !['Direction', 'ISSA Code'].includes(k))]) check(f[key] != null && f[key] !== '', `${f.Barcode}: missing ${key}`);
    check(/^(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*mm$/i.test(f.Size), `${f.Barcode}: invalid Size`);
    check(['Standard', 'Outdoor'].includes(f.Edition), `${f.Barcode}: invalid Edition`);
    for (const key of ['Sales Price VND', 'Sales Price USD']) check(typeof f[key] === 'number' && Number.isFinite(f[key]) && f[key] >= 0, `${f.Barcode}: invalid ${key}`);
    check(f['Currency EN'] === '$' && f['Currency VI'] === '₫', `${f.Barcode}: invalid currency`);
    check(!Object.keys(f).some(k => /shipserv/i.test(k)), 'Retired taxonomy column in SKU Master');
    check(families.some(g => g['Product Family ID'] === f['Product Family ID']), `${f.Barcode}: missing family`);
  }
  for (const f of families) {
    check(skus.filter(p => p['Product Family ID'] === f['Product Family ID']).length === 2, `${f['Product Family ID']}: expected edition pair`);
    for (const edition of ['Standard', 'Outdoor']) {
      const p = byId.get(String(f[`${edition} Barcode`]));
      check(p && p.Edition === edition, `${f['Product Family ID']}: missing ${edition} SKU`);
      if (!p) continue;
      for (const key of ['Product Concept VI', 'Display Name VI']) if (p[key] !== f[key]) wording_variants.push({ family: f['Product Family ID'], barcode: p.Barcode, field: key, family_value: f[key], sku_value: p[key] });
      for (const key of common.filter(k => !['Product Concept VI', 'Display Name VI'].includes(k))) check(p[key] === f[key], `${f['Product Family ID']}: ${key} disagrees with SKU Master`);
      for (const [key, source] of [[`${edition} Price VND`, 'Sales Price VND'], [`${edition} Price USD`, 'Sales Price USD'], [`${edition} Internal Reference`, 'Internal Reference']]) check(f[key] === p[source], `${f['Product Family ID']}: ${key} mismatch`);
    }
  }
  check(sheets['Category Summary'].filter(r => r.fields['Customer Category EN'] !== 'TOTAL').length === 5, 'Expected five category rows');
  for (const { fields: f } of sheets['Category Summary']) {
    const members = f['Customer Category EN'] === 'TOTAL' ? skus : skus.filter(p => p['Customer Category EN'] === f['Customer Category EN']);
    for (const [key, actual] of [['Sellable SKUs', members.length], ['Product Families', unique(members, 'Product Family ID')], ['Unique IMPA', unique(members, 'IMPA Code')]]) check(f[key] === actual, `${f['Customer Category EN']}: ${key} mismatch`);
    if (f['Customer Category EN'] !== 'TOTAL') check(members.every(p => p['Category Order'] === f.Order && p['Customer Category VI'] === f['Customer Category VI']), 'Category metadata mismatch');
  }
  check(sheets['Taxonomy Map'].length === 150 && unique(sheets['Taxonomy Map'].map(r => r.fields), 'IMPA Code') === 150, 'Invalid Taxonomy Map');
  for (const { fields: f } of sheets['Taxonomy Map']) {
    const members = skus.filter(p => p['IMPA Code'] === f['IMPA Code']);
    check(members.length === f['SKU Count'] && unique(members, 'Product Family ID') === f['Family Count'], `${f['IMPA Code']}: taxonomy count mismatch`);
    for (const p of members) for (const key of ['Customer Category EN', 'Customer Category VI', 'Product Concept EN']) check(p[key] === f[key], `${f['IMPA Code']}: taxonomy ${key} mismatch`);
  }
  check(sheets['Catalogue Index'].length === 154 && unique(sheets['Catalogue Index'].map(r => r.fields), 'Product Family ID') === 154, 'Invalid Catalogue Index');
  for (const { fields: f } of sheets['Catalogue Index']) {
    const family = families.find(p => p['Product Family ID'] === f['Product Family ID']);
    check(Boolean(family), 'Unknown Catalogue Index family');
    if (family) for (const key of common.filter(k => k !== 'Size')) check(f[key] === family[key], `${f['Product Family ID']}: Catalogue Index ${key} mismatch`);
  }
  fail();
  return { status: 'PASS', ...counts, config, wording_variants, review_flags: sheets['QA Report'].filter(r => r.fields.Status === 'REVIEW'), qa_report: sheets['QA Report'], inventory: 'Not inferred', errors };
}
