// Navigation identities are derived from normalized master fields, never from raw names.
const slug = value => value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const directionVI = { '': 'Chưa ghi hướng', Left: 'Trái', Right: 'Phải', Up: 'Lên', Down: 'Xuống', 'Up Left': 'Lên trái', 'Up Right': 'Lên phải', 'Down Left': 'Xuống trái', 'Down Right': 'Xuống phải', Straight: 'Thẳng', Diagonal: 'Chéo', Forward: 'Về phía trước', Backward: 'Về phía sau' };
export function buildCustomerTaxonomy(sheets, families, products) {
  const groups = sheets['Category Summary'].filter(r => r.fields['Customer Category EN'] !== 'TOTAL').sort((a, b) => a.fields.Order - b.fields.Order).map(({ fields: f }) => ({
    id: slug(f['Customer Category EN']), label_en: f['Customer Category EN'], label_vi: f['Customer Category VI'], order: f.Order,
    family_count: families.filter(p => p.customer_category_en === f['Customer Category EN']).length,
    sku_count: products.filter(p => p.customer_category_en === f['Customer Category EN']).length,
    impa_count: f['Unique IMPA'],
  }));
  for (const item of [...families, ...products]) item.customer_category_id = groups.find(g => g.label_en === item.customer_category_en).id;
  const concepts = [];
  for (const group of groups) {
    const members = families.filter(f => f.customer_category_id === group.id);
    for (const [name, matches] of Map.groupBy(members, f => f.product_concept_en)) {
      const labelsVI = [...new Set(matches.map(f => f.product_concept_vi))];
      // Multiple source translations stay visible rather than choosing an unsupported interpretation.
      concepts.push({ id: `${group.id}:${name}`, category_id: group.id, label_en: name, label_vi: labelsVI.join(' / '), labels_vi: labelsVI, family_ids: matches.map(f => f.id) });
    }
  }
  const directions = [...new Set(families.map(f => f.direction))].map(value => ({ id: value || 'unspecified', label_en: value || 'Direction not specified', label_vi: directionVI[value] ?? value }));
  const mapped = families.map(f => ({ product_family_id: f.id, config_concept: concepts.find(c => c.family_ids.includes(f.id)).id, config_direction: f.direction || 'unspecified' }));
  const branches = Object.fromEntries(groups.map(group => [group.id, ['customer_category_id', 'config_concept',
    ...(families.some(f => f.customer_category_id === group.id && f.direction) ? ['config_direction'] : []), 'dimensions_display', 'product_family_id', 'edition']]));
  return { taxonomy: { source: 'Customer Category fields / Category Summary', groups }, configurator: { source: 'Normalized SKU Master / Master Index', branches, concepts, directions, families: mapped } };
}
