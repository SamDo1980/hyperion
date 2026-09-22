import { element } from '../lib/dom.js';
import { t } from '../lib/locale.js';
import { canonicalSizes } from '../configurator/size-options.js';

export function createSizeMatrix(products, onSelect) {
  const elementRoot = element('div', 'step-choices');
  const grid = element('div', 'size-matrix');
  const buttons = canonicalSizes(products).map(value => {
    const button = element('button', 'attribute-option');
    button.type = 'button'; button.dataset.value = value;
    const mark = element('span', 'option-check', '✓');
    mark.setAttribute('aria-hidden', 'true');
    button.append(element('span', 'option-label', value), mark);
    button.addEventListener('click', () => { if (!button.disabled) onSelect('dimensions_display', value); });
    grid.append(button);
    return button;
  });
  elementRoot.append(grid);
  return { element: elementRoot, update(step) {
    const available = new Set(step.options.filter(option => option.available !== false).map(option => option.value));
    for (const button of buttons) {
      button.disabled = Boolean(step.locked) || !available.has(button.dataset.value);
      button.setAttribute('aria-disabled', String(button.disabled));
      button.setAttribute('aria-pressed', String(!button.disabled && step.selected === button.dataset.value));
      button.title = button.disabled ? t('Not available for this design') : '';
    }
  } };
}
