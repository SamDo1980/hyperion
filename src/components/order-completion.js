import { element, icon } from '../lib/dom.js';
import { t } from '../lib/locale.js';
import { formatPrice } from '../lib/storefront.js';
import { secureURL } from '../checkout/payment-service.js';
import { createCountrySelect } from './country-select.js';
import { createPaymentModal } from './payment-modal.js';
import { paymentErrorMessage } from '../checkout/card-validation.js';

export function createPaymentSummary(order, compact = false) {
  const list = element('dl', compact ? 'payment-summary summary-payment' : 'payment-summary');
  const p = order.payment;
  const money = value => value === null ? t('Currently unavailable') : formatPrice(value, order.currency);
  const rows = [
    ['Merchandise subtotal', money(order.merchandiseSubtotal)],
    ['Shipping fee', t('To be confirmed')],
    ['Remaining balance', money(p.remainingProductBalance)],
  ];
  for (const [label, value] of rows) {
    const row = element('div', label.endsWith('due now') ? 'payment-due-row' : ''); row.append(element('dt', '', t(label)), element('dd', '', value)); list.append(row);
  }
  return list;
}

export function createOrderCompletion(checkout) {
  const root = element('div', 'order-completion');
  function step(id, title, number, lockedText) {
    const fieldset = element('fieldset', 'configuration-step completion-step'); fieldset.id = id;
    const legend = element('legend');
    const counter = element('span', 'step-number', String(number));
    legend.append(counter, element('span', '', t(title)));
    const placeholder = element('p', 'locked-message', t(lockedText)); placeholder.id = `${id}-locked`;
    const content = element('div', 'completion-content');
    fieldset.append(legend, placeholder, content); root.append(fieldset);
    return { fieldset, counter, placeholder, content };
  }
  const shipping = step('contact-shipping', 'Contact & Shipping', 6, 'Add an item to your order first');
  const payment = step('order-payment', 'Payment', 7, 'Complete Contact & Shipping first');
  const modal = createPaymentModal(checkout); root.append(modal.element);
  const form = element('div', 'shipping-fields');
  const inputs = new Map(), touched = new Set();
  for (const [group, key, label, autocomplete, type] of [
    ['customer', 'fullName', 'Full Name', 'name', 'text'], ['customer', 'company', 'Company', 'organization', 'text'],
    ['customer', 'email', 'Email', 'email', 'email'], ['customer', 'phone', 'Phone / WhatsApp', 'tel', 'tel'],
    ['shipping', 'address', 'Shipping Address', 'street-address', 'text'],
    ['shipping', 'cityProvince', 'City / Province', 'address-level2', 'text'], ['shipping', 'country', 'Country', 'country-name', 'text'],
  ]) {
    const field = element('div', `shipping-field${key === 'address' ? ' shipping-field-wide' : ''}`);
    const caption = element('label', '', t(label) + (key === 'company' ? '' : ' *'));
    const country = key === 'country' ? createCountrySelect({ onInput: value => checkout.setField(group, key, value), onSelect: code => checkout.selectCountry(code), onBlur: () => { touched.add(key); render(checkout.getState()); } }) : null;
    const input = country?.input ?? element('input'); input.id = `shipping-${key}`; input.name = key; input.type = type;
    input.autocomplete = autocomplete; input.required = key !== 'company'; input.maxLength = 500;
    caption.htmlFor = input.id;
    const error = element('span', 'field-error'); error.id = `${input.id}-error`;
    input.setAttribute('aria-describedby', error.id);
    if (!country) input.addEventListener('input', () => checkout.setField(group, key, input.value));
    input.addEventListener('blur', () => { touched.add(key); render(checkout.getState()); });
    field.append(caption, country?.root ?? input, error); form.append(field); inputs.set(key, { group, input, error });
  }
  shipping.content.append(form);
  const continueButton = element('button', 'button shipping-continue', t('Continue to payment')); continueButton.type = 'button';
  continueButton.addEventListener('click', () => {
    for (const key of inputs.keys()) touched.add(key); const state = checkout.getState(); render(state);
    const invalid = [...inputs].find(([key]) => state.errors[key]);
    if (invalid) invalid[1].input.focus(); else { payment.fieldset.scrollIntoView({ block: 'start', behavior: 'smooth' }); amounts.get(state.order.payment.amountOption || 'full').focus(); }
  }); shipping.content.append(continueButton);

  function choices(title, kind, options, onSelect) {
    const group = element('fieldset', `payment-choice-group payment-${kind}`);
    const legend = element('legend');
    legend.append(element('span', 'payment-group-title', t(title)));
    group.append(legend);
    const cards = element('div', 'payment-choices'); const buttons = new Map();
    for (const [value, label] of options) {
      const button = element('button', 'payment-choice'); button.type = 'button'; button.dataset.value = value;
      const copy = element('span', 'payment-choice-copy');
      copy.append(element('strong', 'payment-choice-title', t(label)));
      if (kind === 'amounts') {
        button.append(copy, element('strong', 'payment-choice-price'));
      } else {
        const radio = element('span', 'payment-method-indicator'); radio.setAttribute('aria-hidden', 'true');
        const tile = element('span', 'payment-method-icon'); tile.setAttribute('aria-hidden', 'true');
        const methodIcon = value === 'card' ? 'card' : value === 'zalopay' ? 'wallet' : 'bank'; tile.append(icon(methodIcon));
        const availability = element('span', 'method-availability'); availability.id = `availability-${value}`; copy.append(availability);
        const brands = element('span', 'payment-method-brands');
        if (value === 'card') {
          button.setAttribute('aria-label', t('Card — Visa / Mastercard'));
          for (const brand of ['visa', 'mastercard']) {
            const frame = element('span', `payment-logo payment-logo-${brand}`);
            const image = element('img'); image.src = `${'./'}assets/${brand}.png`; image.alt = brand === 'visa' ? 'Visa' : 'Mastercard';
            frame.append(image); brands.append(frame);
          }
        } else {
          const brand = value === 'zalopay' ? 'zalopay' : 'vietqr';
          if (value === 'bank_transfer') button.setAttribute('aria-label', t('Bank Transfer / VietQR'));
          const frame = element('span', `payment-logo payment-logo-${brand}`);
          const image = element('img'); image.src = `${'./'}assets/${brand === 'zalopay' ? 'Zalopay-logo.png' : 'vietqr.png'}`;
          image.alt = value === 'zalopay' ? 'ZaloPay' : 'VietQR'; frame.append(image); brands.append(frame);
        }
        button.append(radio, tile, copy, brands); button.setAttribute('aria-describedby', availability.id);
      }
      button.setAttribute('aria-pressed', 'false'); button.addEventListener('click', () => onSelect(value));
      cards.append(button); buttons.set(value, button);
    }
    group.append(cards); payment.content.append(group); return buttons;
  }
  const amounts = choices('Choose payment option', 'amounts', [
    ['deposit', 'Deposit'],
    ['full', 'Pay in full'],
  ], checkout.selectAmount);
  const methods = choices('Payment method', 'methods', [['card', 'Card'], ['zalopay', 'ZaloPay'], ['bank_transfer', 'Bank Transfer / VietQR']], checkout.selectMethod);
  const cta = element('button', 'button button-primary payment-cta'); cta.type = 'button';
  cta.addEventListener('click', () => modal.open(cta));
  const status = element('p', 'payment-status'); status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
  const hosted = element('a', 'button payment-hosted', t('Open secure checkout')); hosted.rel = 'noopener';
  const check = element('button', 'button payment-check', t('Check payment status')); check.type = 'button'; check.addEventListener('click', () => checkout.checkStatus());
  const bank = element('div', 'bank-details');
  const referenceRow = element('div', 'transfer-reference');
  const referenceLabel = element('label', '', t('Transfer reference')); referenceLabel.htmlFor = 'transfer-reference';
  const reference = element('input'); reference.id = 'transfer-reference'; reference.maxLength = 200;
  const submitReference = element('button', 'button', t('Submit transfer reference')); submitReference.type = 'button';
  reference.addEventListener('input', () => { submitReference.disabled = !reference.value.trim(); });
  submitReference.addEventListener('click', () => checkout.submitReference(reference.value));
  referenceRow.append(referenceLabel, reference, submitReference);
  const confirmation = element('div', 'payment-confirmation'); confirmation.setAttribute('role', 'status');
  payment.content.append(cta, status, hosted, bank, referenceRow, check, confirmation);

  function setState(step, unlocked, complete) {
    step.fieldset.disabled = !unlocked;
    step.fieldset.dataset.state = !unlocked ? 'locked' : complete ? 'complete' : 'current';
    step.fieldset.setAttribute('aria-disabled', String(!unlocked));
    if (!unlocked) step.fieldset.setAttribute('aria-describedby', step.placeholder.id);
    else step.fieldset.removeAttribute('aria-describedby');
    step.placeholder.hidden = unlocked;
  }
  function render(state) {
    const { order, busy } = state, p = order.payment;
    shipping.placeholder.textContent = t('Add an item to your order first');
    payment.placeholder.textContent = t(state.shippingUnlocked ? 'Complete Contact & Shipping first' : 'Add an item to your order first');
    setState(shipping, state.shippingUnlocked, state.paymentUnlocked);
    setState(payment, state.paymentUnlocked, p.status === 'confirmed');
    for (const [key, { group, input, error }] of inputs) {
      if (input.value !== order[group][key]) input.value = order[group][key];
      const invalid = touched.has(key) && Boolean(state.errors[key]);
      input.setAttribute('aria-invalid', String(invalid)); input.setCustomValidity(state.errors[key] ? t(state.errors[key]) : '');
      error.textContent = invalid ? t(state.errors[key]) : ''; error.hidden = !invalid;
    }
    for (const [value, button] of amounts) {
      button.disabled = !state.amountAvailability[value];
      button.setAttribute('aria-pressed', String(!button.disabled && value === p.amountOption));
    }
    amounts.get('full').querySelector('.payment-choice-price').textContent = formatPrice(order.merchandiseSubtotal, order.currency);
    const depositDue = p.depositAmount === null ? null : Math.min(p.depositAmount, order.merchandiseSubtotal);
    amounts.get('deposit').querySelector('.payment-choice-title').textContent = t('Deposit');
    amounts.get('deposit').querySelector('.payment-choice-price').textContent = depositDue === null ? '—' : formatPrice(depositDue, order.currency);
    for (const [value, button] of methods) {
      button.disabled = !state.methodAvailability[value];
      button.setAttribute('aria-pressed', String(!button.disabled && value === p.method));
      const availability = button.querySelector('.method-availability');
      availability.textContent = button.disabled ? t('Currently unavailable') : '';
      availability.hidden = !button.disabled;
    }
    cta.textContent = t(busy ? 'Processing…' : p.method === 'card' ? 'Pay by card' : p.method === 'zalopay' ? 'Pay with ZaloPay' : p.method === 'bank_transfer' ? 'View bank transfer details' : 'Select a payment method');
    cta.disabled = !state.canPay || busy;
    // Backend integration enables the method action; the current storefront only captures the choice.
    cta.hidden = !state.methodAvailability[p.method];
    const statuses = { idle: '', pending: 'Waiting for payment confirmation', confirmed: 'Payment confirmed', failed: 'Payment failed', awaiting_confirmation: 'Waiting for transfer confirmation' };
    status.textContent = state.error ? t(paymentErrorMessage(state.error)) : state.paymentMode === 'simulation' && state.simulationStatus !== 'idle' ? t(state.busy ? 'Processing…' : state.simulationStatus === 'awaiting_confirmation' ? 'Waiting for transfer confirmation' : 'Waiting for payment confirmation') : t(statuses[p.status]);
    status.dataset.status = p.status;
    const checkoutURL = secureURL(state.checkoutURL);
    hosted.hidden = !checkoutURL || p.status === 'confirmed' || p.status === 'failed';
    if (checkoutURL) hosted.href = checkoutURL; else hosted.removeAttribute('href');
    check.hidden = !p.transactionId || p.status === 'confirmed'; check.disabled = busy;
    bank.replaceChildren();
    const bankData = p.method === 'bank_transfer' ? state.bank : null;
    bank.hidden = !bankData;
    if (bankData) {
      const details = element('dl', 'payment-summary');
      for (const [label, value] of [['Account name', bankData.accountName], ['Bank name', bankData.bankName], ['Account number', bankData.accountNumber], ['Transfer content', bankData.transferContent], ['Amount due now', formatPrice(p.amountDueNow, order.currency)]]) {
        const row = element('div'); row.append(element('dt', '', t(label)), element('dd', '', typeof value === 'string' && value ? value : t('Currently unavailable'))); details.append(row);
      }
      bank.append(details);
      const qrURL = secureURL(bankData.vietQRImageURL);
      if (qrURL) { const img = element('img', 'bank-qr'); img.src = qrURL; img.alt = t('Bank Transfer / VietQR'); bank.append(img); }
    }
    referenceRow.hidden = p.method !== 'bank_transfer' || !p.transactionId || ['confirmed', 'failed'].includes(p.status);
    submitReference.disabled = busy || !reference.value.trim();
    confirmation.hidden = p.status !== 'confirmed'; confirmation.replaceChildren();
    if (p.status === 'confirmed') {
      confirmation.append(element('h3', '', t(p.amountOption === 'deposit' ? 'Deposit received' : 'Payment received')));
      const details = element('dl', 'payment-summary');
      const methodLabel = methods.get(p.method).getAttribute('aria-label') || methods.get(p.method).querySelector('.payment-choice-title').textContent;
      for (const [label, value] of [['Order reference', order.orderId], ['Amount paid', formatPrice(p.amountPaid, order.currency)], ...(p.amountOption === 'deposit' ? [['Remaining product balance', formatPrice(p.remainingProductBalance, order.currency)]] : []), ['Payment method', methodLabel], ['Shipping fee', t('To be confirmed')]]) {
        const row = element('div'); row.append(element('dt', '', t(label)), element('dd', '', value)); details.append(row);
      }
      confirmation.append(details, element('p', '', t('Shipping fee will be confirmed separately')));
    }
  }
  checkout.subscribe(render);
  return { element: root, setStartNumber(number) { shipping.counter.textContent = String(number); payment.counter.textContent = String(number + 1); } };
}
