export function getProductPrice(product, language = 'en') {
  const currency = language === 'vi' ? 'VND' : 'USD';
  return { currency, amount: product.prices[currency] };
}
export const getProductName = (product, language = 'en') => product[`display_name_${language === 'vi' ? 'vi' : 'en'}`];
export function formatPrice(amount, currency = 'USD') {
  return new Intl.NumberFormat(currency === 'VND' ? 'vi-VN' : 'en-US', { style: 'currency', currency, currencyDisplay: 'narrowSymbol' }).format(amount);
}
