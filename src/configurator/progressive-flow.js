import { createSelectionEngine } from './filter-engine.js';

// Branch controller over the existing exact-candidate engine. Only this controller
// advances/skips steps; presentation code never parses names or invents variants.
export function createProgressiveFlow(families, catalogue, mapping) {
  const attributes = new Map(mapping.families.map(family => [family.product_family_id, family]));
  const derivedCatalogue = { products: catalogue.products.map(product => {
    const derived = attributes.get(product.product_family_id);
    if (!derived) throw new Error('Missing configurator family mapping.');
    return { ...product, config_concept: derived.config_concept, config_direction: derived.config_direction };
  }) };
  let steps = ['customer_category_id'];
  let engine = createSelectionEngine(families, derivedCatalogue, steps);
  let visibleSteps = [];
  let error = null;
  const listeners = new Set();
  function advance(preferred = {}) {
    visibleSteps = [];
    error = null;
    if (!engine.getState().selections.customer_category_id) return;
    for (const field of steps.slice(1)) {
      const options = engine.getAvailableOptions(field).filter(option => option.available);
      if (!options.length) { error = 'No valid options remain. Reset your selection and try again.'; break; }
      if (options.length === 1 && field !== 'dimensions_display') {
        if (engine.getState().selections[field] !== options[0].value) engine.selectOption(field, options[0].value);
        if (['edition', 'config_concept'].includes(field)) visibleSteps.push({ field, options, selected: options[0].value });
      } else {
        if (!engine.getState().selections[field] && options.some(o => o.value === preferred[field])) engine.selectOption(field, preferred[field]);
        const selected = engine.getState().selections[field];
        visibleSteps.push({ field, options, selected });
        if (!selected) break;
      }
    }
    const pending = visibleSteps.find(step => !step.selected)?.field;
    if (pending) for (const next of steps.slice(steps.indexOf(pending) + 1)) {
      if (!engine.getState().selections[next] && preferred[next] && engine.getAvailableOptions(next).some(o => o.available && o.value === preferred[next])) engine.selectOption(next, preferred[next]);
    }
  }
  function getState() {
    const state = engine.getState();
    // Hand the canonical catalogue object to purchase/cart, not a constructed SKU.
    return { ...state, resolvedSku: error || visibleSteps.some(step => !step.selected) || !state.resolvedSku ? null : catalogue.getById(state.resolvedSku.id),
      roadmap: ['config_concept', 'product_family_id', 'dimensions_display', 'edition']
        .filter(field => field !== 'product_family_id' || !state.selections.config_concept || mapping.concepts.find(c => c.id === state.selections.config_concept)?.family_ids.length > 1)
        .map(field => visibleSteps.find(step => step.field === field) ?? { field, options: [], selected: null, locked: true }),
      visibleSteps, activeField: visibleSteps.find(step => !step.selected)?.field ?? null, error };
  }
  const notify = () => listeners.forEach(listener => listener(getState()));
  function select(field, value) {
    const previous = engine.getState().selections;
    if (field === 'customer_category_id') {
      if (!mapping.branches[value] || !families.some(family => family.customer_category_id === value)) throw new Error('Unknown product group.');
      steps = ['customer_category_id', 'config_concept', 'product_family_id', 'dimensions_display', 'edition'];
      engine = createSelectionEngine(families, derivedCatalogue, steps);
    } else if (!visibleSteps.some(step => step.field === field && step.options.some(option => option.value === value))) {
      throw new Error('This option is not available in the current step.');
    }
    engine.selectOption(field, value);
    // Reapply only choices still supported by actual candidates, in branch order.
    for (const next of steps.slice(steps.indexOf(field) + 1)) {
      if (previous[next] && engine.getAvailableOptions(next).some(o => o.available && o.value === previous[next])) engine.selectOption(next, previous[next]);
    }
    advance(previous); notify();
    return getState();
  }
  return {
    select, getState,
    reset() { steps = ['customer_category_id']; engine = createSelectionEngine(families, derivedCatalogue, steps); advance(); notify(); },
    addResolvedToCart(cart, quantity) {
      const sku = getState().resolvedSku;
      if (!sku) throw new Error('Choose an exact SKU before adding to cart.');
      return cart.add(sku.id, quantity);
    },
    subscribe(listener) { listeners.add(listener); listener(getState()); return () => listeners.delete(listener); },
  };
}
