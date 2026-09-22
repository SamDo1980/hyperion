import { element, productImage } from '../lib/dom.js';
import { language, t } from '../lib/locale.js';

const textKey = value => value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/đ/g, 'd');
export function createConfiguratorStep({ field, title, number, options, selected, visual, onSelect, uiState = {} }) {
  const root = element('fieldset', 'configuration-step');
  root.dataset.field = field;
  root.dataset.state = selected ? 'complete' : 'current';
  const legend = element('legend');
  legend.tabIndex = -1;
  legend.append(element('span', 'step-number', String(number)), element('span', '', title));
  if (!selected) legend.setAttribute('aria-current', 'step');
  root.append(legend);
  const choices = element('div', 'step-choices');
  const grid = element('div', visual ? `sign-option-grid${field === 'product_family_id' ? ' design-option-grid' : ''}` : 'attribute-options');
  const nodes = [];
  // Keep the current option visible even when the inline filter excludes it.
  const sorted = options;
  for (const option of sorted) {
    const button = element('button', visual ? 'sign-option' : 'attribute-option');
    button.type = 'button';
    { const mark = element('span', 'option-check', '✓'); mark.setAttribute('aria-hidden', 'true'); mark.hidden = option.value !== selected; button.append(mark); }
    button.dataset.value = option.value;
    button.setAttribute('aria-pressed', String(option.value === selected));
    if (visual) button.append(productImage(option.product));
    if (option.arrow) { const arrow = element('span', 'direction-arrow', option.arrow); arrow.setAttribute('aria-hidden', 'true'); button.append(arrow); }
    button.append(element('span', 'option-label', option.label));
    if (option.detail) button.append(element('span', 'option-detail', option.detail));
    button.addEventListener('click', () => onSelect(field, option.value));
    nodes.push({ button, option });
    grid.append(button);
  }
  const more = element('button', 'step-show-more', t('Show more'));
  more.type = 'button';
  const status = element('p', 'filter-status');
  status.setAttribute('role', 'status');
  const batchSize = 12;
  const paginated = field === 'config_concept';
  uiState.limit ??= batchSize;
  function renderOptions() {
    const query = textKey((uiState.query ?? '').trim());
    const matches = nodes.filter(({ option }) => textKey(option.searchText).includes(query));
    const shown = new Set((paginated ? matches.slice(0, uiState.limit) : matches).map(({ option }) => option.value));
    if (selected) shown.add(selected);
    for (const { button, option } of nodes) button.hidden = !shown.has(option.value);
    more.hidden = !paginated || matches.every(({ option }) => shown.has(option.value));
    status.textContent = matches.length || selected ? '' : t('No matching signs. Try another name or code.');
  }
  more.addEventListener('click', () => {
    const firstNew = nodes.find(({ button, option }) => button.hidden && textKey(option.searchText).includes(textKey((uiState.query ?? '').trim())));
    uiState.limit += batchSize;
    renderOptions();
    firstNew?.button.focus({ preventScroll: true });
  });
  if (options.length > 8) {
    const label = element('label', 'concept-filter-label', t('Filter these signs'));
    const input = element('input', 'concept-filter');
    input.type = 'search';
    input.id = `filter-${field}`;
    input.placeholder = t('Type a sign name or IMPA');
    label.htmlFor = input.id;
    input.value = uiState.query ?? '';
    const filter = () => {
      uiState.query = input.value;
      uiState.limit = batchSize;
      renderOptions();
    };
    input.addEventListener('input', filter);
    choices.append(label, input, status);
  }
  renderOptions();
  choices.append(grid);
  if (paginated && options.length > batchSize) choices.append(more);
  root.append(choices);
  root.updateSelection = value => {
    selected = value;
    if (selected) legend.removeAttribute('aria-current');
    else legend.setAttribute('aria-current', 'step');
    for (const { button, option } of nodes) {
      button.setAttribute('aria-pressed', String(option.value === selected));
      button.querySelector('.option-check').hidden = option.value !== selected;
    }
    renderOptions();
  };
  return root;
}

export function describeOption(field, option, { mapping, families, catalogue }) {
  let label, detail, arrow;
  let members;
  if (field === 'config_concept') {
    const concept = mapping.concepts.find(concept => concept.id === option.value);
    label = concept[`label_${language}`];
    members = families.filter(family => concept.family_ids.includes(family.id));
  } else if (field === 'config_direction') {
    const direction = mapping.directions.find(direction => direction.id === option.value);
    label = direction[`label_${language}`]; arrow = direction.arrow;
    const ids = new Set(mapping.families.filter(family => family.config_direction === option.value).map(family => family.product_family_id));
    members = families.filter(family => ids.has(family.id));
  } else if (field === 'product_family_id') {
    members = families.filter(family => family.id === option.value);
    label = members[0][`display_name_${language}`];
    const product = catalogue.getById(members[0].sku_ids[0]);
    detail = `IMPA ${product.impa_code} · ${t('Barcode')} ${product.barcode} | ${product.dimensions_display}${members[0].direction ? ` | ${members[0].direction}` : ''}`;
  } else { label = t(option.value); members = []; }
  const product = members[0] ? catalogue.getById(members[0].sku_ids[0]) : null;
  return { ...option, label, detail, arrow, product,
    searchText: [label, ...members.flatMap(family => [family.display_name_en, family.display_name_vi, family.impa_code, ...family.sku_ids.map(id => catalogue.getById(id).internal_reference)])].join(' ') };
}
