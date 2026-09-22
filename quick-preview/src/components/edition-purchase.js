import { element, productImage } from '../lib/dom.js';
import { language, t } from '../lib/locale.js';
import { formatPrice, getProductName, getProductPrice } from '../lib/storefront.js';
import { createQuantityStepper } from './quantity-stepper.js';

// One persistent final card: edition changes update fields, not the purchase DOM.
export function createEditionPurchase({ number, catalogue, cart, announce, onSelect, getState }) {
  const root = element('fieldset', 'configuration-step edition-purchase');
  root.dataset.field = 'edition';
  const legend = element('legend'); legend.tabIndex = -1;
  legend.append(element('span', 'step-number', String(number)), element('span', '', t('Choose edition')));
  const identity = element('div', 'edition-identity');
  const imageSlot = element('div', 'edition-preview');
  const details = element('div', 'edition-details');
  const copy = element('div', 'result-copy');
  const title = element('h3', 'result-title');
  const impa = element('p', 'result-impa');
  const size = element('p', 'dimensions');
  const reference = element('p', 'result-reference');
  copy.append(title, impa, reference, size); identity.append(imageSlot, details);
  const choices = element('div', 'step-choices attribute-options');
  const form = element('form', 'edition-controls');
  const price = element('div', 'result-price');
  const priceValue = element('strong'); price.append(element('span', 'price-label', t('Unit price')), priceValue);
  const add = element('button', 'button button-primary add-to-cart', t('Add to cart')); add.type = 'submit';
  let product = null, imageKey = null;
  const quantity = createQuantityStepper('', { onChange: updateAmounts });
  const quantityGroup = element('div', 'edition-quantity'); quantityGroup.append(element('span', 'price-label', t('Quantity')), quantity.element);
  form.append(price, quantityGroup, add);
  details.append(copy, choices, form);
  root.append(legend, identity);
  const optionButtons = new Map();
  function updateAmounts() {
    const valid = quantity.element.querySelector('input').validity.valid;
    const source = product && getProductPrice(product, language);
    priceValue.textContent = source ? formatPrice(source.amount, source.currency) : '—';
    add.disabled = !product || !valid;
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    try {
      if (!product || getState().resolvedSku?.id !== product.id) throw Error(t('Choose an exact SKU before adding to cart.'));
      cart.add(product.id, quantity.getValue());
      announce(t('Added to order'));
    } catch (error) { announce(error.message); }
  });
  function update(state) {
    root.disabled = false; root.removeAttribute('aria-disabled');
    const step = state.visibleSteps.find(step => step.field === 'edition');
    product = state.resolvedSku;
    const current = product ?? catalogue.getById(state.currentCandidates[0]?.id);
    root.dataset.state = product ? 'complete' : 'current';
    if (product) identity.dataset.sku = product.id; else delete identity.dataset.sku;
    title.textContent = getProductName(current, language);
    impa.textContent = `IMPA ${current.impa_code}`;
    size.textContent = `${t('Size')} ${current.dimensions_display}`;
    reference.textContent = product ? `${t('Barcode')} ${product.barcode}` : t('Choose an edition to see the barcode and price.');
    const key = `${current.image_url}:${title.textContent}`;
    if (key !== imageKey) { imageSlot.replaceChildren(productImage(current, { eager: true })); imageKey = key; }
    const values = new Set(step.options.map(o => o.value));
    for (const [value, button] of optionButtons) if (!values.has(value)) { button.remove(); optionButtons.delete(value); }
    for (const option of step.options) {
      let button = optionButtons.get(option.value);
      if (!button) {
        button = element('button', 'attribute-option'); button.type = 'button'; button.dataset.value = option.value;
        button.append(element('span', 'option-check', '✓'), element('span', 'option-label', t(option.value)));
        button.addEventListener('click', () => onSelect('edition', option.value));
        optionButtons.set(option.value, button); choices.append(button);
      }
      button.setAttribute('aria-pressed', String(step.selected === option.value));
      button.querySelector('.option-check').style.visibility = step.selected === option.value ? 'visible' : 'hidden';
    }
    const controls = quantity.element.querySelectorAll('button, input');
    quantity.setValue(quantity.getValue());
    controls[0].setAttribute('aria-label', `${t('Decrease quantity for')} ${current.id}`);
    controls[1].setAttribute('aria-label', `${t('Quantity for')} ${current.id}`);
    controls[2].setAttribute('aria-label', `${t('Increase quantity for')} ${current.id}`);
    for (const control of controls) if (!product) control.disabled = true;
    if (product) { controls[1].disabled = false; quantity.setValue(quantity.getValue()); }
    add.setAttribute('aria-label', `${t('Add to cart')}: ${product?.barcode ?? title.textContent}`);
    updateAmounts();
  }
  return { element: root, update };
}
