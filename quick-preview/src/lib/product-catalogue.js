export function normalizeText(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

const compact = value => normalizeText(value).replaceAll(' ', '');

export function createCatalogue(products) {
  const byId = new Map(products.map(product => [product.id, product]));
  const index = products.map(product => ({
    product,
    names: normalizeText([product.original_name_en, product.original_name_vi, product.display_name_en, product.display_name_vi].join(' ')),
    codes: [product.impa_code, product.issa_code, product.internal_reference, product.barcode].filter(Boolean).map(compact),
    identifiers: {
      impa: [product.impa_code].filter(Boolean).map(compact),
      issa: [product.issa_code].filter(Boolean).map(compact),
      barcode: [product.barcode].filter(Boolean).map(compact),
    },
  }));
  return {
    products,
    getById: id => byId.get(id),
    search(query) {
      const text = normalizeText(query);
      if (!text) return [];
      if (/^(impa|issa|barcode)(?: code)?$/.test(text)) return [];
      const labeled = text.match(/^(impa|issa|barcode)(?:\s+code)?\s+(.*)$/);
      const codeQuery = compact(labeled ? labeled[2] : query);
      const tokens = text.split(' ');
      if (!codeQuery) return [];
      return index.filter(entry => {
        const codes = labeled ? entry.identifiers[labeled[1]] : entry.codes;
        const codeMatch = codes.some(code => code.includes(codeQuery));
        return codeMatch || (!labeled && tokens.every(token => entry.names.includes(token)));
      }).map(entry => entry.product);
    },
  };
}
