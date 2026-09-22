import { element } from '../lib/dom.js';
import { t } from '../lib/locale.js';
import { countries } from '../checkout/countries.js';

export function createCountrySelect({ onInput, onSelect, onBlur }) {
  const root = element('div', 'country-select');
  const input = element('input'); input.type = 'text'; input.autocomplete = 'country-name';
  input.setAttribute('role', 'combobox'); input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-expanded', 'false'); input.setAttribute('aria-controls', 'country-options');
  const list = element('div', 'country-options'); list.id = 'country-options'; list.setAttribute('role', 'listbox'); list.setAttribute('aria-label', t('Country')); list.hidden = true;
  let options = [], active = -1;
  const normalize = text => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  function close() { list.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); active = -1; }
  function select(country) { input.value = country.name; close(); onSelect(country.code); }
  function highlight(index) {
    active = index;
    [...list.children].forEach((option, i) => option.setAttribute('aria-selected', String(i === active)));
    if (list.children[active]) { input.setAttribute('aria-activedescendant', list.children[active].id); list.children[active].scrollIntoView({ block: 'nearest' }); }
  }
  function open(all = false) {
    const query = normalize(input.value.trim());
    options = countries.filter(country => all || normalize(country.name).includes(query) || country.code.toLowerCase().includes(query));
    list.replaceChildren(); active = -1; input.removeAttribute('aria-activedescendant');
    for (const country of options) {
      const row = element('div', 'country-option', country.name); row.id = `country-${country.code}`; row.setAttribute('role', 'option'); row.setAttribute('aria-selected', 'false');
      row.addEventListener('mousedown', event => { event.preventDefault(); select(country); }); list.append(row);
    }
    if (!options.length) list.append(element('div', 'country-empty', t('No countries found')));
    list.hidden = false; input.setAttribute('aria-expanded', 'true');
  }
  input.addEventListener('focus', () => open(countries.some(c => c.name === input.value)));
  input.addEventListener('click', () => { if (list.hidden) open(true); });
  input.addEventListener('input', () => { onInput(input.value); open(); });
  input.addEventListener('blur', () => { close(); onBlur(); });
  input.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); close(); }
    if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
      event.preventDefault(); if (list.hidden) open(true);
      if (options.length) highlight(active < 0 ? (event.key === 'ArrowDown' ? 0 : options.length - 1) : (active + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length);
    }
    if (event.key === 'Enter' && !list.hidden) { event.preventDefault(); if (options[active]) select(options[active]); }
  });
  root.append(input, list); return { root, input };
}
