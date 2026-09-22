import { countryByCode, countryByName } from './countries.js';
export const DRAFT_KEY = 'hyperion.order-draft.v1';
export const CUSTOMER_FIELDS = ['fullName', 'company', 'email', 'phone'];
export const SHIPPING_FIELDS = ['address', 'cityProvince', 'country', 'countryCode'];
export const AMOUNT_OPTIONS = ['deposit', 'full'];
export const PAYMENT_METHODS = ['card', 'zalopay', 'bank_transfer'];
const cleanFields = (value, fields) => Object.fromEntries(fields.map(key => [key, typeof value?.[key] === 'string' ? value[key].slice(0, 500) : '']));

export function restoreDraft(storage) {
  let saved;
  try { saved = JSON.parse(storage?.getItem(DRAFT_KEY)); } catch { /* Session-only draft. */ }
  const shipping = cleanFields(saved?.shipping, SHIPPING_FIELDS);
  const country = countryByCode(shipping.countryCode) || (!shipping.countryCode && countryByName(shipping.country));
  if (country) { shipping.countryCode = country.code; shipping.country = country.name; }
  return {
    customer: cleanFields(saved?.customer, CUSTOMER_FIELDS),
    shipping,
    amountOption: AMOUNT_OPTIONS.includes(saved?.amountOption) ? saved.amountOption : null,
    method: PAYMENT_METHODS.includes(saved?.method) ? saved.method : null,
  };
}

export function validateContact(customer, shipping) {
  const errors = {};
  for (const key of [...CUSTOMER_FIELDS.filter(key => key !== 'company'), ...SHIPPING_FIELDS.filter(key => key !== 'countryCode')]) {
    if (!(customer[key] ?? shipping[key] ?? '').trim()) errors[key] = 'Required field';
  }
  if (customer.email?.trim() && !/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(customer.email.trim())) errors.email = 'Enter a valid email address';
  const phone = customer.phone?.trim() ?? '';
  const digits = phone.replace(/\D/g, '');
  if (phone && (!/^\+?[\d\s().-]+$/.test(phone) || digits.length < 7 || digits.length > 15)) errors.phone = 'Enter a valid international phone number';
  for (const [key, value] of [['fullName', customer.fullName], ['address', shipping.address], ['cityProvince', shipping.cityProvince]]) {
    if (value?.trim() && !/[\p{L}\p{N}]/u.test(value)) errors[key] = 'Enter a valid value';
  }
  if (!countryByCode(shipping.countryCode) || countryByCode(shipping.countryCode)?.name !== shipping.country) errors.country = 'Select a country from the list';
  return errors;
}

export function paymentAmounts(subtotal, currency, option, depositVND = null, depositUSD = 5) {
  const approvedUSD = Number.isFinite(depositUSD) && depositUSD > 0 ? depositUSD : 5;
  const depositAmount = currency === 'USD' ? approvedUSD : Number.isSafeInteger(depositVND) && depositVND > 0 ? depositVND : null;
  if (!AMOUNT_OPTIONS.includes(option)) return { depositAmount, amountDueNow: null, remainingProductBalance: null };
  if (option === 'deposit' && depositAmount === null) return { depositAmount, amountDueNow: null, remainingProductBalance: null };
  const factor = currency === 'VND' ? 1 : 100;
  const subtotalMinor = Math.max(0, Math.round(subtotal * factor));
  const dueMinor = option === 'full' ? subtotalMinor : Math.min(subtotalMinor, Math.round(depositAmount * factor));
  return { depositAmount, amountDueNow: dueMinor / factor, remainingProductBalance: (subtotalMinor - dueMinor) / factor };
}

export function buildOrderDraft(items, fields, currency, config = {}, session = {}) {
  const factor = currency === 'VND' ? 1 : 100;
  const orderItems = items.map(item => ({
    barcode: item.id, impa: item.impa_code, displayName: item.display_name,
    size: item.dimensions, edition: item.edition, quantity: item.quantity,
    unitPrice: item.prices[currency], lineSubtotal: Math.round(item.prices[currency] * factor) * item.quantity / factor,
  }));
  const merchandiseSubtotal = orderItems.reduce((sum, item) => sum + Math.round(item.lineSubtotal * factor), 0) / factor;
  return {
    orderId: session.orderId ?? null, currency, items: orderItems,
    customer: cleanFields(fields.customer, CUSTOMER_FIELDS),
    shipping: { ...cleanFields(fields.shipping, SHIPPING_FIELDS), feeStatus: 'to_be_confirmed' },
    merchandiseSubtotal,
    payment: {
      amountOption: fields.amountOption,
      ...paymentAmounts(merchandiseSubtotal, currency, fields.amountOption, config.depositVND, config.depositUSD),
      method: fields.method, status: session.status ?? 'idle',
      transactionId: session.transactionId ?? null, amountPaid: session.amountPaid ?? null,
    },
  };
}
