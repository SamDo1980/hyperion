export const CONTACT_MESSAGE_MAX = 1000;

export function validateContactSales(values) {
  const errors = {};
  const name = String(values?.name ?? '').trim();
  const phone = String(values?.phone ?? '').trim();
  const message = String(values?.message ?? '');
  const digits = phone.replace(/\D/g, '');
  if (!name) errors.name = 'Name is required.';
  else if (name.length < 2 || !/\p{L}/u.test(name)) errors.name = 'Enter a valid name.';
  if (!phone) errors.phone = 'Phone / WhatsApp is required.';
  else if (!/^\+?[\d\s().-]+$/.test(phone) || digits.length < 7 || digits.length > 15) errors.phone = 'Enter a valid phone number.';
  if (message.length > CONTACT_MESSAGE_MAX) errors.message = 'Message is too long.';
  return errors;
}
