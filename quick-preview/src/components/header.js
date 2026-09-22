import { element } from '../lib/dom.js';
import { language, t } from '../lib/locale.js';
import { createContactSalesModal } from './contact-sales.js';

function scrollToSection(href) {
  const target = document.querySelector(href);
  if (!target) return;
  const behavior = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  target.scrollIntoView({ behavior, block: 'start' });
}

export function createHeader() {
  const baseURL = import.meta.env?.BASE_URL ?? './';
  const header = element('header', 'site-header');
  const inner = element('div', 'container header-inner');
  const brand = element('a', 'brand');
  brand.href = './';
  brand.setAttribute('aria-label', 'Handyman HYPERION home');

  const logo = element('img', 'brand-logo');
  logo.src = `${baseURL}assets/handyman-logo.png`;
  logo.alt = 'Handyman — Where jobs get done';
  logo.width = 584;
  logo.height = 143;
  brand.append(logo, element('span', 'brand-product', 'HYPERION'));

  let storage;
  try {
    storage = window.sessionStorage;
  } catch {
    /* Header remains usable without storage. */
  }
  const contactModal = createContactSalesModal(storage);

  const nav = element('nav', 'header-actions');
  nav.setAttribute('aria-label', t('Menu'));

  const links = element('div', 'header-nav-links');
  links.id = 'header-section-links';

  const sectionLinks = [
    ['PRODUCT LOOKUP', '#product-query'],
    ['ORDER', '#find-your-sign'],
  ];

  for (const [label, href] of sectionLinks) {
    const link = element('a', 'header-section-link', t(label));
    link.href = href;
    link.addEventListener('click', event => {
      const target = document.querySelector(href);
      if (!target) return;
      event.preventDefault();
      close();
      scrollToSection(href);
      history.replaceState(null, '', href);
    });
    links.append(link);
  }

  const catalogue = element('a', 'header-section-link header-catalogue-link', t('CATALOGUE'));
  catalogue.href = `${baseURL}assets/hyperion-catalogue-en.pdf`;
  catalogue.download = 'HYPERION-Marine-Safety-Signs-Catalogue.pdf';
  links.append(catalogue);

  const mobileSales = element('button', 'header-contact-sales header-contact-sales--menu', t('CONTACT SALES'));
  mobileSales.type = 'button';
  mobileSales.addEventListener('click', () => {
    close();
    contactModal.open(mobileSales);
  });
  links.append(mobileSales);

  const locales = element('div', 'language-switch');
  locales.setAttribute('aria-label', 'Language / Ngôn ngữ');
  locales.setAttribute('role', 'group');

  for (const code of ['en', 'vi']) {
    const button = element('button', 'language-option', code.toUpperCase());
    button.type = 'button';
    button.dataset.locale = code;
    button.setAttribute('aria-label', code === 'en' ? 'English' : 'Tiếng Việt');
    button.setAttribute('aria-pressed', String(code === language));
    button.addEventListener('click', () => {
      if (code === language) return;
      const url = new URL(location.href);
      url.searchParams.set('lang', code);
      // q/group are already represented by URL state; configurator/contact drafts use session storage.
      location.assign(url);
    });
    locales.append(button);
  }

  const desktopSales = element('button', 'header-contact-sales header-contact-sales--desktop', t('CONTACT SALES'));
  desktopSales.type = 'button';
  desktopSales.addEventListener('click', () => contactModal.open(desktopSales));

  const toggle = element('button', 'header-menu', t('Menu'));
  toggle.type = 'button';
  toggle.setAttribute('aria-controls', links.id);
  toggle.setAttribute('aria-expanded', 'false');

  const narrow = matchMedia('(max-width: 999px)');

  function close() {
    links.hidden = narrow.matches;
    toggle.hidden = !narrow.matches;
    toggle.setAttribute('aria-expanded', 'false');
  }

  toggle.addEventListener('click', () => {
    links.hidden = !links.hidden;
    toggle.setAttribute('aria-expanded', String(!links.hidden));
  });

  links.addEventListener('click', event => {
    if (event.target.closest('a')) close();
  });

  header.addEventListener('keydown', event => {
    if (event.key === 'Escape' && narrow.matches && !contactModal.element.open) {
      close();
      toggle.focus();
    }
  });

  narrow.addEventListener('change', close);
  close();

  nav.append(links, locales, desktopSales, toggle);
  inner.append(brand, nav);
  header.append(inner, contactModal.element);
  return header;
}
