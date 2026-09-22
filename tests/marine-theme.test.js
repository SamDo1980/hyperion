import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');

test('selective marine layer is visual-only and imported last', () => {
  const main = read('src/main.js');
  assert.match(main, /import '\.\/styles\/checkout\.css';\s*\nimport '\.\/styles\/marine-theme\.css';/);
  const css = read('src/styles/marine-theme.css');
  assert.match(css, /hyperion-header-sky\.png/);
  assert.match(css, /hyperion-hero-ship\.png/);
  assert.match(css, /hyperion-order-summary\.png/);
  assert.match(css, /hyperion-footer-ocean\.png/);
});

test('desktop Contact Sales and workflow elements remain in source', () => {
  const header = read('src/components/header.js');
  assert.match(header, /header-contact-sales--desktop/);
  assert.match(header, /CONTACT SALES/);
  const summary = read('src/components/order-summary.js');
  assert.match(summary, /summary-next-action/);
  assert.match(summary, /PAY NOW/);
  assert.match(summary, /ORDER/);
});

test('approved marine assets are present in source and quick preview', () => {
  for (const name of [
    'hyperion-header-sky.png',
    'hyperion-hero-ship.png',
    'hyperion-order-summary.png',
    'hyperion-order-summary-tall.png',
    'hyperion-footer-ocean.png',
  ]) {
    assert.ok(existsSync(new URL(`src/assets/theme/${name}`, root)), `missing source ${name}`);
    assert.ok(existsSync(new URL(`quick-preview/src/assets/theme/${name}`, root)), `missing preview ${name}`);
  }
});
