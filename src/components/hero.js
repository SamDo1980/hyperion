import { element } from '../lib/dom.js';
import { t } from '../lib/locale.js';

export function createHero() {
  const hero = element('section', 'hero');
  hero.setAttribute('aria-labelledby', 'hero-title');
  const inner = element('div', 'container hero-inner');
  const copy = element('div', 'hero-copy');
  const eyebrow = element('p', 'eyebrow', 'HYPERION BY HANDYMAN');
  const title = element('h1', '', t('Marine safety signs'));
  title.id = 'hero-title';
  title.append(element('span', 'hero-title-second', t('for onboard safety, emergency response and wayfinding.')));
  copy.append(eyebrow, title);

  inner.append(copy);
  hero.append(inner);
  return hero;
}
