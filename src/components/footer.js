import { element } from '../lib/dom.js';
import { t } from '../lib/locale.js';
import { corporate } from '../data/corporate.js';

export function createFooter() {
  const footer = element('footer', 'site-footer');
  const inner = element('div', 'footer-inner');
  const columns = element('div', 'footer-columns');

  const identity = element('div', 'footer-identity');
  const title = element('h2', 'footer-brand-title', 'HYPERION ');
  title.append(element('span', 'footer-brand-secondary', `by ${corporate.company}`));

  const tax = element('p', 'footer-tax');
  tax.append(
    element('span', 'tax-label', `${t('Tax code')}:`),
    document.createTextNode(' '),
    element('span', 'tax-value', corporate.tax_code),
  );

  identity.append(
    title,
    element('p', 'footer-tagline', t('Clear signs. Safer operations.')),
    element('p', 'footer-legal', corporate.legal_vi),
    element('p', 'footer-legal', corporate.legal_en),
    tax,
  );

  const contact = element('section', 'footer-contact');
  contact.id = 'contact';
  contact.setAttribute('aria-labelledby', 'footer-contact-title');

  const heading = element('h3', 'footer-contact-title', t('Contact'));
  heading.id = 'footer-contact-title';

  const address = element('address', 'footer-contact-groups');
  for (const [label, value, href] of [
    [t('Address'), corporate.address, null],
    [t('Phone / WhatsApp / Zalo'), corporate.phone, corporate.phone_href],
    [t('Email'), corporate.email, `mailto:${corporate.email}`],
  ]) {
    const row = element('div', 'contact-group');
    row.append(element('strong', 'contact-label', label));
    const detail = element(href ? 'a' : 'span', 'contact-value', value);
    if (href) detail.href = href;
    row.append(detail);
    address.append(row);
  }

  contact.append(heading, address);
  columns.append(identity, contact);

  inner.append(
    columns,
    element('p', 'footer-copyright', `© 2026 DLV Corporation. ${t('All rights reserved.')}`),
  );
  footer.append(inner);
  return footer;
}
