import { element, icon } from '../lib/dom.js';
import { language, t } from '../lib/locale.js';
import { createProgressiveFlow } from '../configurator/progressive-flow.js';
import { createConfiguratorStep, describeOption } from './configurator-step.js';
import { createEditionPurchase } from './edition-purchase.js';
import { createSizeMatrix } from './size-matrix.js';
import { createOrderCompletion } from './order-completion.js';

export function createProductConfigurator(families, taxonomy, catalogue, mapping, cart, announce, checkout) {
  const engine = createProgressiveFlow(families, catalogue, mapping);
  const CONFIG_STATE_KEY = 'hyperion.configurator-state.v1';
  let session;
  try { session = window.sessionStorage; } catch { /* Configurator remains usable without storage. */ }
  function readSavedSelections() { try { return JSON.parse(session?.getItem(CONFIG_STATE_KEY)) ?? {}; } catch { return {}; } }
  function saveSelections(selections) { try { session?.setItem(CONFIG_STATE_KEY, JSON.stringify(selections)); } catch { /* Ignore unavailable storage. */ } }
  const section = element('section', 'configurator');
  section.id = 'find-your-sign';
  section.setAttribute('aria-labelledby', 'configurator-title');
  const heading = element('div', 'configurator-heading');
  const title = element('h2', '', t('FIND YOUR HYPERION SIGN'));
  title.id = 'configurator-title';
  const reset = element('button', 'configurator-reset', t('Reset selection'));
  reset.type = 'button';
  heading.append(title, reset);
  const panel = element('fieldset', 'group-selector');
  const legend = element('legend');
  legend.append(element('span', 'step-number', '1'), element('span', '', t('Choose a product category')));
  const options = element('div', 'group-options');
  const buttons = new Map();
  for (const group of taxonomy.groups) {
    const button = element('button', 'group-option');
    button.type = 'button';
    button.dataset.group = group.id;
    button.setAttribute('aria-pressed', 'false');
    const top = element('span', 'group-option-top');
    const name = element('span', 'group-name', group[`label_${language}`]);
    const marker = element('span', 'group-marker');
    marker.append(icon('check'));
    top.append(name, marker);
    button.append(top);
    button.disabled = !families.some(family => family.customer_category_id === group.id);
    button.addEventListener('click', () => select('customer_category_id', group.id));
    buttons.set(group.id, button);
    options.append(button);
  }
  const status = element('p', 'selection-status sr-only');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.setAttribute('aria-atomic', 'true');
  panel.append(legend, options);
  const downstream = element('div', 'configuration-steps');
  const main = element('div', 'configurator-main');
  const completion = createOrderCompletion(checkout);
  main.append(panel, status, downstream, completion.element);
  section.append(heading, main);
  const initial = new URLSearchParams(location.search).get('group');
  const savedSelections = readSavedSelections();
  const initialGroup = taxonomy.groups.some(group => group.id === initial) ? initial
    : taxonomy.groups.some(group => group.id === savedSelections.customer_category_id) ? savedSelections.customer_category_id : null;
  if (initialGroup) {
    engine.select('customer_category_id', initialGroup);
    for (const field of ['config_concept', 'product_family_id', 'dimensions_display', 'edition']) {
      const value = savedSelections[field];
      const step = engine.getState().roadmap.find(item => item.field === field);
      if (value && step?.options.some(option => option.value === value && option.available !== false)) {
        try { engine.select(field, value); } catch { /* Stale session choices are ignored. */ }
      }
    }
  }
  const stepStates = new Map();
  const labels = { config_concept: 'Choose a sign', product_family_id: 'Choose a design', dimensions_display: 'Choose size', edition: 'Choose edition' };
  const purchase = createEditionPurchase({ number: 5, catalogue, cart, announce, onSelect: select, getState: engine.getState });
  const sizeMatrix = createSizeMatrix(catalogue.products, select);
  const slots = new Map(Object.keys(labels).map((field, index) => {
    const root = field === 'edition' ? purchase.element : element('fieldset', 'configuration-step');
    root.dataset.field = field;
    if (field !== 'edition') {
      const legend = element('legend'); legend.tabIndex = -1;
      legend.append(element('span', 'step-number', String(index + 2)), element('span', '', t(labels[field])));
      root.append(legend);
    }
    const message = element('p', 'locked-message'); message.id = 'locked-' + field;
    if (field === 'dimensions_display') root.append(sizeMatrix.element);
    root.append(message); downstream.append(root);
    return [field, { root, message, signature: null }];
  }));
  function select(field, value) {
    const wasComplete = downstream.querySelector(`[data-field="${field}"]`)?.dataset.state === 'complete';
    engine.select(field, value);
    const next = downstream.querySelector('[data-state="current"] legend');
    // Announce continuation and retain keyboard focus after replacing a completed step.
    if (wasComplete) {
      downstream.querySelector(`[data-field="${field}"] [aria-pressed="true"]`)?.focus({ preventScroll: true });
    } else if (next) {
      next.focus({ preventScroll: true });
      const bounds = next.getBoundingClientRect();
      if (bounds.top < 110 || bounds.bottom > innerHeight - 100) next.scrollIntoView({ block: 'nearest', behavior: 'auto' });
    }
  }
  engine.subscribe(state => {
    saveSelections(state.selections);
    const selected = state.selections.customer_category_id;
    for (const [id, button] of buttons) button.setAttribute('aria-pressed', String(id === selected));
    reset.disabled = !selected;
    section.dataset.familyCount = state.candidateFamilies.length;
    section.dataset.skuCount = state.currentCandidates.length;
    const group = taxonomy.groups.find(g => g.id === selected);
    panel.dataset.state = selected ? 'complete' : 'current';
    status.textContent = state.error ? t(state.error) : !group ? t('Choose a category to begin.')
      : state.resolvedSku ? '' : t(labels[state.activeField]);
    const route = state.roadmap;
    completion.setStartNumber(route.length + 2);
    for (const [field, slot] of slots) {
      const index = route.findIndex(step => step.field === field);
      slot.root.hidden = index < 0;
      if (index < 0) { slot.signature = null; slot.root.querySelectorAll('[aria-pressed]').forEach(el => el.setAttribute('aria-pressed', 'false')); continue; } // Omit only a now-known unnecessary Design route.
      const step = route[index];
      if (field === 'dimensions_display') sizeMatrix.update(step);
      slot.root.querySelector('.step-number').textContent = String(index + 2);
      slot.root.disabled = Boolean(step.locked);
      slot.root.setAttribute('aria-disabled', String(Boolean(step.locked)));
      if (step.locked) {
        slot.root.dataset.state = 'locked';
        slot.root.querySelector('legend').removeAttribute('aria-current');
        slot.root.querySelector('.step-complete')?.remove();
        slot.root.querySelectorAll('[aria-pressed]').forEach(el => el.setAttribute('aria-pressed', 'false'));
        slot.root.setAttribute('aria-describedby', slot.message.id);
        slot.message.textContent = t(field === 'config_concept' ? 'Select a product category first' : field === 'product_family_id' ? 'Select a sign first' : 'Complete the previous step');
        slot.message.hidden = false;
        // Remove stale purchasable identity, leaving this same container in place.
        slot.root.querySelector('[data-sku]')?.removeAttribute('data-sku');
        slot.signature = null;
        continue;
      }
      slot.root.removeAttribute('aria-describedby'); slot.message.hidden = true;
      if (field === 'edition') { purchase.update(state); continue; }
      if (field === 'dimensions_display') {
        slot.root.dataset.state = step.selected ? 'complete' : 'current';
        const legend = slot.root.querySelector('legend');
        legend.querySelector('.step-complete')?.remove();
        if (step.selected) {
          legend.removeAttribute('aria-current');
        } else legend.setAttribute('aria-current', 'step');
        continue;
      }
      const signature = JSON.stringify([selected, step.field, step.options]);
      slot.root.dataset.state = step.selected ? 'complete' : 'current';
      if (signature === slot.signature) { slot.updateSelection(step.selected); continue; }
      slot.signature = signature;
      const branchFamilies = families.filter(family => family.customer_category_id === selected
        && (!state.selections.config_concept || field === 'config_concept' || mapping.families.some(item => item.product_family_id === family.id && item.config_concept === state.selections.config_concept)));
      const stateKey = selected + ':' + field;
      if (!stepStates.has(stateKey)) stepStates.set(stateKey, {});
      const contents = createConfiguratorStep({ uiState: stepStates.get(stateKey), ...step, number: index + 2, title: t(labels[field]),
        visual: ['config_concept', 'product_family_id'].includes(field),
        options: step.options.map(option => describeOption(field, option, { mapping, families: branchFamilies, catalogue })), onSelect: select });
      slot.root.dataset.state = contents.dataset.state;
      slot.updateSelection = contents.updateSelection;
      slot.root.replaceChildren(...contents.childNodes, slot.message);
    }
    const url = new URL(location.href);
    if (selected) url.searchParams.set('group', selected); else url.searchParams.delete('group');
    history.replaceState(null, '', url);
  });
  reset.addEventListener('click', () => { stepStates.clear(); try { session?.removeItem(CONFIG_STATE_KEY); } catch {} engine.reset(); buttons.values().next().value?.focus(); });
  window.addEventListener('hyperion:configure', event => { if (buttons.has(event.detail)) { select('customer_category_id', event.detail); section.scrollIntoView({ block: 'start' }); } });
  return section;
}
