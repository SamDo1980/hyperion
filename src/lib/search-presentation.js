// Presentation grouping only: input is the unchanged search engine's real matches.
// Different source wording/artwork or duplicate editions keep independent SKU rows.
export function groupSearchResults(products) {
  const families = new Map();
  for (const product of products) {
    const key = product.product_family_id ?? product.id;
    if (!families.has(key)) families.set(key, []);
    families.get(key).push(product);
  }
  const fields = ['display_name_en', 'display_name_vi', 'impa_code', 'dimensions_display', 'image_url'];
  return [...families.values()].flatMap(members => {
    const shared = members.length > 1
      && new Set(members.map(p => p.edition)).size === members.length
      && fields.every(field => members.every(p => p[field] === members[0][field]));
    return shared ? [{ shared, products: members }] : members.map(product => ({ shared: false, products: [product] }));
  });
}
