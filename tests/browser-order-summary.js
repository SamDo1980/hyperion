import { expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { formatPrice } from '../src/lib/storefront.js';

const mapping = JSON.parse(await readFile(new URL('../src/data/configurator.json', import.meta.url)));
export async function runOrderSummaryBrowserChecks(page, products, measurements) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.evaluate(() => localStorage.removeItem('hyperion.cart.v1'));
  await page.goto('http://127.0.0.1:5174', { waitUntil: 'networkidle' });
  const root = page.locator('#find-your-sign');
  const shell = page.locator('.summary-shell');
  const current = root.locator('.configurator-main');
  const rows = shell.locator('.order-row');
  const dialog = page.locator('.mobile-order-dialog');
  const bar = page.locator('.mobile-summary-bar');
  const wash = products.find(p => p.impa_code === '334152' && p.edition === 'Standard');
  const hospital = products.find(p => p.display_name_en === 'Hospital' && p.edition === 'Standard');
  const byId = product => shell.locator(`[data-cart-sku="${product.id}"]`);
  const concept = name => mapping.concepts.find(c => c.category_id === 'emergency-equipment-signs-ees' && c.label_en === name).id;
  async function closeMobile() { if (await dialog.evaluate(el => el.open)) await shell.locator('.summary-close').click(); }
  async function addSearch(product) {
    await closeMobile();
    await page.locator('#product-query').fill(product.id);
    await page.locator('.search-submit').click();
    await page.locator('.lookup .add-to-cart').click();
  }
  async function configure(name = 'Emergency Eye Wash', edition = 'Standard') {
    await closeMobile();
    await root.locator('[data-group="emergency-equipment-signs-ees"]').click();
    await root.locator(`[data-field="config_concept"] [data-value=${JSON.stringify(concept(name))}]`).click();
    const size = root.locator('[data-field="dimensions_display"][data-state="current"] button:enabled');
    if (await size.count()) await size.first().click();
    await root.locator(`[data-field="edition"] [data-value="${edition}"]`).click();
  }
  async function checkTotal(currency) {
    const items = await page.evaluate(() => JSON.parse(localStorage.getItem('hyperion.cart.v1'))?.items ?? []);
    const amount = items.reduce((sum, item) => sum + products.find(p => p.id === item.id).prices[currency] * item.quantity, 0);
    await expect(shell.locator('.order-total-amount')).toHaveText(formatPrice(amount, currency));
    return items;
  }
  await expect(shell.locator('.order-empty')).toBeVisible();
  expect(await shell.locator('h3').evaluate(el => getComputedStyle(el).color)).toBe('rgb(255, 255, 255)');
  await expect(current.locator('.add-to-cart')).toBeDisabled();
  await expect(current.locator('.result-price')).toBeHidden();
  await root.locator('[data-group="emergency-equipment-signs-ees"]').click();
  await expect(current).toContainText('Emergency Equipment Signs');
  await expect(current).toContainText('Choose a sign');
  await root.locator(`[data-field="config_concept"] [data-value=${JSON.stringify(concept('Emergency Eye Wash'))}]`).click();
  await expect(current).toContainText('Emergency Eye Wash');
  await expect(current.locator('.add-to-cart')).toBeDisabled();
  await expect(current.locator('[data-sku]')).toHaveCount(0);
  await root.locator('[data-field="dimensions_display"] button:enabled').click();
  await root.locator('[data-field="edition"] [data-value="Standard"]').click();
  await expect(current.locator('.edition-purchase')).toContainText(wash.dimensions_display);
  await expect(current.locator('.add-to-cart')).toBeEnabled();
  await expect(current.locator('.edition-purchase img')).toHaveAttribute('src', wash.image_url);
  await current.getByRole('spinbutton').fill('3');
  await expect(current.locator('.selection-subtotal')).toHaveCount(0);
  await current.locator('.add-to-cart').click();
  await expect(rows).toHaveCount(1);
  await expect(shell.locator('.summary-header .order-line-count')).toHaveText('1');
  await expect(shell.locator('.summary-header .order-unit-count')).toHaveText('3');
  await expect(shell.locator('.add-to-cart, .selection-subtotal')).toHaveCount(0);
  await expect(byId(wash).getByRole('spinbutton')).toHaveValue('3');
  await expect(current.locator('[data-sku]')).toHaveAttribute('data-sku', wash.id);
  await expect(current.getByRole('spinbutton')).toHaveValue('3');
  await addSearch(wash);
  await expect(rows).toHaveCount(1);
  await expect(byId(wash).getByRole('spinbutton')).toHaveValue('4');
  await addSearch(hospital);
  await expect(rows).toHaveCount(2);
  const inset = await rows.first().evaluate(el => { const shell = el.closest('.summary-shell').getBoundingClientRect(), row = el.getBoundingClientRect(); return {left:row.left-shell.left,right:shell.right-row.right}; });
  expect(inset.left).toBeGreaterThanOrEqual(12); expect(inset.right).toBeGreaterThanOrEqual(12);
  await shell.screenshot({path:'test-results/phase-nine-phase-seven-order-multiple-desktop.png', style: '.toast { visibility: hidden !important; }'});
  await expect(shell.locator('.summary-header .order-counts')).toHaveText('2 products · 5 units');
  await expect(byId(hospital).locator('img')).toHaveAttribute('src', hospital.image_url);
  await byId(wash).getByRole('button', { name: `Increase quantity for ${wash.id}`, exact: true }).click();
  await expect(byId(wash).getByRole('spinbutton')).toHaveValue('5');
  await expect(byId(wash).locator('.order-line-subtotal')).toHaveText(formatPrice(wash.prices.USD * 5, 'USD'));
  await byId(wash).getByRole('spinbutton').fill('1');
  await expect(byId(wash).getByRole('button', { name: `Decrease quantity for ${wash.id}`, exact: true })).toBeDisabled();
  await expect(rows).toHaveCount(2);
  await byId(wash).getByRole('spinbutton').fill('0');
  await shell.locator('.summary-header').click();
  await expect(byId(wash).getByRole('spinbutton')).toHaveValue('1');
  await checkTotal('USD');

  // Upstream changes remove the exact preview immediately without clearing the order.
  await root.locator('[data-group="lifesaving-signs-lss-lsa"]').click();
  await expect(current.locator('[data-sku]')).toHaveCount(0);
  await expect(current.locator('.add-to-cart')).toBeDisabled();
  await expect(current).toContainText('Lifesaving Signs');
  await expect(rows).toHaveCount(2);
  await root.locator('.configurator-reset').click();
  await expect(current.locator('[data-sku]')).toHaveCount(0);

  // Many real source SKUs, added through Search, exercise internal scrolling/zebra rows.
  for (const product of products.filter(p => ![wash.id, hospital.id].includes(p.id)).slice(0, 10)) await addSearch(product);
  await expect(rows).toHaveCount(12);
  const backgrounds = await rows.evaluateAll(nodes => nodes.map(node => getComputedStyle(node).backgroundColor));
  expect(backgrounds[0]).not.toBe(backgrounds[1]);
  backgrounds.forEach((color, i) => expect(color).toBe(backgrounds[i % 2]));
  await byId(wash).locator('.order-remove').click();
  await expect(rows).toHaveCount(11);
  await expect(byId(wash)).toHaveCount(0);
  await expect(rows.first().getByRole('spinbutton')).toBeFocused();
  const reordered = await rows.evaluateAll(nodes => nodes.map(node => getComputedStyle(node).backgroundColor));
  reordered.forEach((color, i) => expect(color).toBe(backgrounds[i % 2]));
  await checkTotal('USD');
  await page.reload({ waitUntil: 'networkidle' });
  await expect(rows).toHaveCount(11);

  for (const width of [1440, 1280, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: width < 500 ? 740 : 768 });
    await configure();
    if (width < 768) {
      await expect(bar).toBeVisible();
      await expect(bar).toHaveAttribute('aria-expanded', 'false');
      const padding = await page.evaluate(() => parseFloat(getComputedStyle(document.body).paddingBottom));
      expect(padding).toBeGreaterThanOrEqual(await bar.evaluate(el => el.getBoundingClientRect().height));
      await bar.focus(); await page.keyboard.press('Enter');
      await expect(dialog).toBeVisible();
      await expect(bar).toHaveAttribute('aria-expanded', 'true');
      await expect(shell.locator('.summary-close')).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible();
      await expect(bar).toBeFocused();
      await bar.click();
      await expect(current.locator('.edition-purchase img')).toHaveAttribute('src', wash.image_url);
    } else {
      await expect(bar).not.toBeVisible();
      if (width >= 768) {
        const rectangles = await page.locator('.shopping-layout').evaluate(el => {
          const main = el.querySelector('.configurator-main').getBoundingClientRect();
          const panel = el.querySelector('.summary-shell').getBoundingClientRect();
          return { mainRight: main.right, panelLeft: panel.left, position: getComputedStyle(el.querySelector('.summary-shell')).position };
        });
        expect(rectangles.panelLeft).toBeGreaterThan(rectangles.mainRight);
        expect(rectangles.position).toBe('sticky');
        await root.locator('[data-group="lifesaving-signs-lss-lsa"]').click();
        await page.evaluate(() => {
          const layout = document.querySelector('.shopping-layout');
          const panel = layout.querySelector('.summary-shell');
          const offset = parseFloat(getComputedStyle(panel).top);
          const travel = Math.max(0, layout.getBoundingClientRect().height - panel.getBoundingClientRect().height);
          scrollTo(0, layout.getBoundingClientRect().top + scrollY - offset + travel / 2);
        });
        const sticky = await shell.evaluate(el => ({ top: el.getBoundingClientRect().top, bottom: el.getBoundingClientRect().bottom, offset: parseFloat(getComputedStyle(el).top), height: innerHeight }));
        expect(sticky.top).toBeGreaterThanOrEqual(sticky.offset - 1);
        expect(sticky.bottom).toBeLessThanOrEqual(sticky.height - 8);
        // A temporary blank test spacer allows scrolling beyond this final page section.
        await page.evaluate(() => { const probe = document.createElement('div'); probe.id = 'boundary-probe'; probe.style.height = '1000px'; document.body.append(probe); scrollTo(0, document.querySelector('#find-your-sign').getBoundingClientRect().bottom + scrollY - 50); });
        const bounded = await page.locator('.shopping-layout').evaluate(el => ({ sectionBottom: el.getBoundingClientRect().bottom, summaryBottom: el.querySelector('.summary-shell').getBoundingClientRect().bottom }));
        expect(bounded.summaryBottom).toBeLessThanOrEqual(bounded.sectionBottom + 1);
        expect(bounded.summaryBottom).toBeLessThan(100);
        await page.evaluate(() => document.querySelector('#boundary-probe').remove());
        await configure();
      } else expect(await shell.evaluate(el => getComputedStyle(el).position)).toBe('static');
    }
    if (width === 768) await shell.scrollIntoViewIfNeeded();
    else if (width >= 1024) await shell.scrollIntoViewIfNeeded();
    const measurement = await page.evaluate(() => {
      const summary = document.querySelector('.summary-shell');
      const scroll = document.querySelector('.summary-content');
      return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
        shellHeight: summary.getBoundingClientRect().height, bodyClientHeight: scroll.clientHeight, bodyScrollHeight: scroll.scrollHeight,
        overflow: [...document.querySelectorAll('main *, header *')].filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && !el.classList.contains('sr-only') && (r.left < -1 || r.right > innerWidth + 1); }).map(el => el.className),
        targets: [...summary.querySelectorAll('.quantity-stepper button')].map(el => ({ width: el.offsetWidth, height: el.offsetHeight })),
      };
    });
    expect(measurement.scrollWidth).toBeLessThanOrEqual(width);
    expect(measurement.overflow).toEqual([]);
    expect(measurement.bodyScrollHeight).toBeGreaterThan(measurement.bodyClientHeight);
    for (const target of measurement.targets) { expect(target.width).toBeGreaterThanOrEqual(44); expect(target.height).toBeGreaterThanOrEqual(44); }
    measurements.push({ flow: 'order summary', ...measurement });
    await shell.locator('.summary-content').evaluate(el => { el.scrollTop = el.scrollHeight; });
    await expect(rows.last().locator('.order-remove')).toBeInViewport();
    await shell.locator('.summary-content').evaluate(el => { el.scrollTop = 0; });
    await checkTotal('USD');
    if (width >= 768) await shell.scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/phase-nine-order-summary-${width}-en.png` });
    await closeMobile();
    await page.getByRole('link', { name: 'Tiếng Việt', exact: true }).click();
    await configure('Emergency Eye Wash', 'Outdoor');
    if (width < 768) await bar.click();
    const outdoor = products.find(p => p.product_family_id === wash.product_family_id && p.edition === 'Outdoor');
    await expect(current.locator('.result-price strong')).toHaveText(formatPrice(outdoor.prices.VND, 'VND'));
    await checkTotal('VND');
    await expect(byId(hospital).getByRole('spinbutton')).toHaveAttribute('aria-label', `Số lượng cho ${hospital.id}`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({ path: `test-results/phase-nine-order-summary-${width}-vi.png` });
    await closeMobile();
    await page.getByRole('link', { name: 'English', exact: true }).click();
  }
  // Modal → desktop relocation retains one summary and leaves no modal/inert backdrop.
  await bar.click();
  await page.setViewportSize({ width: 1280, height: 768 });
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('.summary-desktop-slot .summary-shell')).toHaveCount(1);
  await root.locator('.configurator-reset').click();
  while (await rows.count()) await rows.first().locator('.order-remove').click();
  await expect(shell.locator('.order-empty')).toBeVisible();
  await expect(shell.locator('.order-total-amount')).toHaveText('$0.00');
  await expect(page.locator('.order-unit-count')).toHaveText('0');
  // The same neutral image fallback works for both exact preview and saved rows.
  await page.route(wash.image_url, route => route.abort());
  await configure();
  await expect(current.locator('.edition-purchase .image-fallback')).toBeVisible();
  await current.locator('.add-to-cart').click();
  await expect(byId(wash).locator('.image-fallback')).toBeVisible();
  await byId(wash).locator('.order-remove').click();
  await page.unroute(wash.image_url);
  // Unsaved configuration quantities never appear in the saved-order mobile bar.
  await page.setViewportSize({ width: 390, height: 740 });
  await configure();
  await expect(bar.locator('strong')).toHaveText('$0.00');
  await current.getByRole('spinbutton').fill('2');
  await expect(current.locator('.result-price strong')).toHaveText(formatPrice(wash.prices.USD, 'USD'));
  await bar.click();
  await expect(shell.locator('.add-to-cart')).toHaveCount(0);
  await closeMobile();
  await expect(bar.locator('strong')).toHaveText('$0.00');
  await root.locator('.configurator-reset').click();
  await expect(bar).toContainText('0 products · 0 units');
  await page.setViewportSize({ width: 1280, height: 768 });
}
