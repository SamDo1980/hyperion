import { element, icon, productImage } from '../lib/dom.js';
import { formatPrice, getProductPrice, getProductName } from '../lib/storefront.js';
import { language, t } from '../lib/locale.js';
import { createQuantityStepper } from './quantity-stepper.js';

export function createSearchResult(product, cart, announce, { showSubtotal = false, compact = false } = {}) {
  const card = element('article', 'result-card');
  card.dataset.sku = product.id;
  const top = element('div', 'result-main');
  const copy = element('div', 'result-copy');
  const name = getProductName(product, language);
  const title = element('h3', 'result-title', name);
  const impa = element('p', 'result-impa', `IMPA ${product.impa_code ?? 'not provided'}`);
  const metadata = element('div', 'result-metadata');
  metadata.append(element('span', 'dimensions', product.dimensions_display), element('span', `edition${product.edition === 'Outdoor' ? ' edition-outdoor' : ''}`, t(product.edition)));
  const reference = element('p', 'result-reference', `${t('Barcode')} ${product.barcode}`);
  copy.append(impa, title, metadata, reference);
  top.append(productImage(product), copy);

  const bottom = element('form', 'result-purchase');
  bottom.setAttribute('aria-label', `${t('Add to cart')}: ${product.barcode}`);
  const price = element('div', 'result-price');
  const sourcePrice = getProductPrice(product, language);
  price.append(element('span', 'price-label', t('Unit price')), element('strong', '', formatPrice(sourcePrice.amount, sourcePrice.currency)));
  const subtotal = element('div', 'selection-subtotal');
  const subtotalValue = element('strong', '', formatPrice(sourcePrice.amount, sourcePrice.currency));
  subtotal.append(element('span', 'price-label', t('Subtotal')), subtotalValue);
  const quantity = createQuantityStepper(product.id, { onChange(value, valid) {
    subtotalValue.textContent = valid ? formatPrice(sourcePrice.amount * value, sourcePrice.currency) : '—';
    if (showSubtotal) add.disabled = !valid;
  } });
  const add = element('button', 'button button-primary add-to-cart');
  add.type = 'submit';
  add.append(icon('cart'), element('span', '', t(compact ? 'Add' : 'Add to cart')));
  add.setAttribute('aria-label', `${t('Add to cart')}: ${product.barcode}`);
  bottom.append(price, quantity.element, add);
  if (showSubtotal) {
    const label = element('span', 'summary-quantity-label', t('Quantity'));
    bottom.insertBefore(label, quantity.element);
    bottom.insertBefore(subtotal, add);
  }
  bottom.addEventListener('submit', event => {
    event.preventDefault();
    try {
      const value = quantity.getValue();
      cart.add(product.id, value);
      announce(t('Added to order'));
    } catch (error) { announce(error.message); }
  });
  card.append(top, bottom);
  return card;
}
