// Use the complete normalized master, independent of the current route.
// Sort by area, then width and height; retain the source display label.
export function canonicalSizes(products) {
  const values = [...new Set(products.map(product => product.dimensions_display))];
  const dimensions = value => value.match(/\d+(?:\.\d+)?/g).map(Number);
  return values.sort((a, b) => {
    const [aw, ah] = dimensions(a), [bw, bh] = dimensions(b);
    return aw * ah - bw * bh || aw - bw || ah - bh || a.localeCompare(b, 'en');
  });
}
