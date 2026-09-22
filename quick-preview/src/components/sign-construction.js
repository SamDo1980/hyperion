const constructionVisualURL = new URL('../assets/sign-construction/sign-construction-visual.png', import.meta.url).href;
import { element } from '../lib/dom.js';
import { t } from '../lib/locale.js';

const FEATURE_CARDS = [
  {
    icon: 'sun',
    title: 'Photoluminescent options',
    body: 'Reliable visibility in low light and emergency conditions.',
  },
  {
    icon: 'shield',
    title: 'Rigid and durable materials',
    body: 'Engineered for long service life in harsh marine environments.',
  },
  {
    icon: 'eye',
    title: 'Clear visibility',
    body: 'High contrast, easy to read graphics and compliance with international standards.',
  },
  {
    icon: 'waves',
    title: 'Suitable for marine use',
    body: 'Resistant to saltwater, UV and demanding offshore conditions.',
  },
];

const ICON_PATHS = {
  sun: '<circle cx="12" cy="12" r="3.4"/><path d="M12 2v3M12 19v3M4.9 4.9 7 7M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1"/>',
  shield: '<path d="M12 2.8 5.4 5.3v5.1c0 4.6 2.8 8.6 6.6 10.8 3.8-2.2 6.6-6.2 6.6-10.8V5.3L12 2.8Z"/>',
  eye: '<path d="M2.3 12s3.5-5.1 9.7-5.1 9.7 5.1 9.7 5.1-3.5 5.1-9.7 5.1S2.3 12 2.3 12Z"/><circle cx="12" cy="12" r="2.7"/>',
  waves: '<path d="M2.8 8.8c1.8 0 1.8 1.8 3.6 1.8s1.8-1.8 3.6-1.8 1.8 1.8 3.6 1.8 1.8-1.8 3.6-1.8 1.8 1.8 3.6 1.8 1.8-1.8 3.2-1.8M2.8 14c1.8 0 1.8 1.8 3.6 1.8S8.2 14 10 14s1.8 1.8 3.6 1.8 1.8-1.8 3.6-1.8 1.8 1.8 3.6 1.8 1.8-1.8 3.2-1.8"/>',
};

function createFeatureIcon(name) {
  const wrapper = element('span', 'sign-construction-feature-icon');
  wrapper.setAttribute('aria-hidden', 'true');
  wrapper.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${ICON_PATHS[name]}</svg>`;
  return wrapper;
}

function createFeatureCard(feature) {
  const card = element('article', 'sign-construction-feature');
  const copy = element('div', 'sign-construction-feature-copy');
  copy.append(
    element('h3', '', t(feature.title)),
    element('p', '', t(feature.body)),
  );
  card.append(createFeatureIcon(feature.icon), copy);
  return card;
}

/**
 * Marketing section inserted directly after the hero.
 * It is intentionally isolated from catalogue/configurator/cart logic so the
 * existing Phase 16 shopping flow remains unchanged.
 */
export function createSignConstructionSection() {
  const baseURL = import.meta.env?.BASE_URL ?? './';
  const section = element('section', 'sign-construction');
  section.id = 'sign-construction';
  section.setAttribute('aria-labelledby', 'sign-construction-title');

  const inner = element('div', 'container sign-construction-inner');

  const copyColumn = element('div', 'sign-construction-copy');
  const eyebrow = element('p', 'sign-construction-eyebrow', t('SIGN CONSTRUCTION'));
  const title = element('h2', 'sign-construction-title', t('Built for marine environments.'));
  title.id = 'sign-construction-title';
  const intro = element(
    'p',
    'sign-construction-intro',
    t('Hyperion signs are available in durable material options designed for marine and offshore use, delivering long-lasting performance in the harshest conditions.'),
  );

  const features = element('div', 'sign-construction-features');
  FEATURE_CARDS.forEach(feature => features.append(createFeatureCard(feature)));

  const catalogueLink = element('a', 'sign-construction-catalogue-link');
  catalogueLink.href = `${baseURL}assets/hyperion-catalogue-en.pdf`;
  catalogueLink.download = 'HYPERION-Marine-Safety-Signs-Catalogue.pdf';
  catalogueLink.append(
    element('span', '', t('View Catalogue')),
    element('span', 'sign-construction-link-arrow', '→'),
  );

  copyColumn.append(eyebrow, title, intro, features, catalogueLink);

  const visualColumn = element('div', 'sign-construction-visual-column');
  const visualPanel = element('figure', 'sign-construction-visual-panel');
  const visual = element('img', 'sign-construction-visual-image');
  visual.src = constructionVisualURL;
  visual.alt = t('Layered Lower Rescue Boat marine safety sign showing Hyperion sign construction.');
  visual.loading = 'lazy';
  visual.decoding = 'async';

  const visualCaption = element('figcaption', 'sign-construction-visual-caption');
  visualCaption.append(
    element('span', '', t('ENGINEERED')),
    element('span', '', t('FOR A SAFER TOMORROW')),
  );

  visualPanel.append(visual, visualCaption);
  visualColumn.append(visualPanel);

  const progressNote = element('p', 'sign-construction-progress', t('PEOPLE SAFETY PROGRESS'));
  progressNote.setAttribute('aria-hidden', 'true');

  inner.append(copyColumn, visualColumn);
  section.append(inner, progressNote);
  return section;
}
