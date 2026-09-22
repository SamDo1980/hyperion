export const DEFAULT_STEPS = ['customer_category_id', 'config_concept', 'dimensions_display', 'product_family_id', 'edition'];

export function filterCandidates(records, selections = {}) {
  return records.filter(record => Object.entries(selections).every(([field, value]) => value == null || record[field] === value));
}

export function resetDownstreamSelections(selections, field, steps = DEFAULT_STEPS) {
  const index = steps.indexOf(field);
  if (index < 0) throw new Error(`Unknown selection field: ${field}`);
  return Object.fromEntries(Object.entries(selections).filter(([key]) => steps.indexOf(key) <= index));
}

// Exact resolution is deliberately independent of UI step count. Ambiguity always returns null.
export function resolveSellableSku(candidates) {
  return candidates.length === 1 ? candidates[0] : null;
}

export function createSelectionEngine(families, catalogue, steps = DEFAULT_STEPS) {
  const ids = new Set(families.flatMap(f => f.sku_ids));
  const products = catalogue.products.filter(p => ids.has(p.id));
  if (products.length !== ids.size) throw new Error('A family references a missing catalogue SKU.');
  let selections = {};
  const listeners = new Set();
  const getCandidates = () => filterCandidates(products, selections);
  function getState() {
    const currentCandidates = getCandidates();
    const familyIds = new Set(currentCandidates.map(p => p.product_family_id));
    return { selections: { ...selections }, currentCandidates, candidateFamilies: families.filter(f => familyIds.has(f.id)), resolvedSku: resolveSellableSku(currentCandidates) };
  }
  const notify = () => listeners.forEach(listener => listener(getState()));
  function getAvailableOptions(field) {
    const index = steps.indexOf(field);
    if (index < 0) throw new Error(`Unknown selection field: ${field}`);
    const previous = Object.fromEntries(Object.entries(selections).filter(([key]) => steps.indexOf(key) < index));
    const candidates = filterCandidates(products, previous);
    return [...new Set(products.map(p => p[field]).filter(value => value != null))].map(value => {
      const matches = candidates.filter(p => p[field] === value);
      return { value, available: matches.length > 0, sku_count: matches.length, family_count: new Set(matches.map(p => p.product_family_id)).size };
    });
  }
  function selectOption(field, value) {
    if (value != null && !getAvailableOptions(field).some(option => option.value === value && option.available)) throw new Error('This option produces no valid SKU.');
    selections = resetDownstreamSelections(selections, field, steps);
    if (value == null) delete selections[field]; else selections[field] = value;
    notify();
    return getState();
  }
  return {
    getState, getAvailableOptions, selectOption,
    reset() { selections = {}; notify(); },
    resetDownstreamSelections(field) { selections = resetDownstreamSelections(selections, field, steps); notify(); },
    autoSelectSingleOption(field) {
      const options = getAvailableOptions(field).filter(option => option.available);
      return options.length === 1 ? selectOption(field, options[0].value) : getState();
    },
    resolveSellableSku: () => resolveSellableSku(getCandidates()),
    addResolvedToCart(cart, quantity) {
      const sku = resolveSellableSku(getCandidates());
      if (!sku) throw new Error('Choose an exact SKU before adding to cart.');
      return cart.add(sku.id, quantity); // The same API as search; no second cart or inferred SKU.
    },
    subscribe(listener) { listeners.add(listener); listener(getState()); return () => listeners.delete(listener); },
  };
}
