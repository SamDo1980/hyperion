import { expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { canonicalSizes } from '../src/configurator/size-options.js';
const mapping = JSON.parse(await readFile(new URL('../src/data/configurator.json', import.meta.url)));

export async function runSizeMatrixChecks(page, products, measurements) {
  const sizes = canonicalSizes(products);
  const variants = products.filter(p => p.impa_code === '334420' && p.edition === 'Standard');
  const a = variants[0], b = variants.find(p => p.dimensions_display !== a.dimensions_display);
  const c = variants.find(p => p.product_family_id !== b.product_family_id && p.dimensions_display === b.dimensions_display);
  const concept = mapping.families.find(f => f.product_family_id === a.product_family_id).config_concept;
  const root = page.locator('#find-your-sign');
  const step = root.locator('[data-field="dimensions_display"]');
  const design = root.locator('[data-field="product_family_id"]');
  async function chooseDesign(product) {
    const button = design.locator(`[data-value="${product.product_family_id}"]`);
    while (!await button.isVisible()) await design.locator('.step-show-more').click();
    await button.click();
  }
  const buttons = step.locator('button');
  const positions = () => step.evaluate(el => {
    const grid = el.querySelector('.size-matrix').getBoundingClientRect();
    return [...el.querySelectorAll('button')].map(button => {
      const r = button.getBoundingClientRect();
      return [r.x-grid.x,r.y-grid.y,r.width,r.height].map(n => Math.round(n));
    });
  });
  for (const width of [1440,1280,1024,768,390,320]) for (const lang of ['en','vi']) {
    await page.setViewportSize({width,height:900});
    await page.goto(`http://127.0.0.1:5174/?lang=${lang}`, {waitUntil:'networkidle'});
    await root.locator(`[data-group="${a.customer_category_id}"]`).click();
    const sign = root.locator(`[data-field="config_concept"] [data-value="${concept}"]`);
    while (!await sign.isVisible()) await root.locator('[data-field="config_concept"] .step-show-more').click();
    await sign.click();
    await chooseDesign(a);
    await expect(buttons).toHaveCount(sizes.length);
    expect(await buttons.evaluateAll(nodes=>nodes.map(n=>n.dataset.value))).toEqual(sizes);
    await step.evaluate(el=>{ window.sizeButtons=[...el.querySelectorAll('button')]; });
    const initial = await positions();
    const height = await step.evaluate(el=>el.getBoundingClientRect().height);
    await expect(step.locator('[aria-pressed="true"]')).toHaveCount(0);
    await step.locator(`[data-value="${a.dimensions_display}"]`).click();
    // Selecting the same valid Design retains the explicit Size.
    await chooseDesign(a);
    await expect(step.locator('[aria-pressed="true"]')).toHaveAttribute('data-value',a.dimensions_display);
    await chooseDesign(b);
    await expect(step).toHaveAttribute('data-state','current');
    await expect(step.locator('[aria-pressed="true"]')).toHaveCount(0);
    await expect(step.locator(`[data-value="${a.dimensions_display}"]`)).toBeDisabled();
    await expect(step.locator(`[data-value="${b.dimensions_display}"]`)).toBeEnabled();
    for (const button of await buttons.all()) await expect(button).toBeVisible();
    // Native disabled click must not invoke selection or replace an invalid size.
    await step.locator('button:disabled').evaluateAll(nodes=>nodes.forEach(n=>n.click()));
    await expect(step.locator('[aria-pressed="true"]')).toHaveCount(0);
    expect(await positions()).toEqual(initial);
    expect(await step.evaluate(el=>el.getBoundingClientRect().height)).toBe(height);
    expect(await step.evaluate(el=>[...el.querySelectorAll('button')].every((n,i)=>n===window.sizeButtons[i]))).toBe(true);
    await step.locator(`[data-value="${b.dimensions_display}"]`).click();
    await expect(step.locator('[aria-pressed="true"]')).toHaveAttribute('data-value',b.dimensions_display);
    await chooseDesign(c);
    await expect(step.locator('[aria-pressed="true"]')).toHaveAttribute('data-value',b.dimensions_display);
    expect(await positions()).toEqual(initial);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    measurements.push({flow:'fixed size matrix',width,language:lang,sizes,stablePositions:true});
    await step.screenshot({path:`test-results/size-matrix-${width}-${lang}.png`,style:'.site-header,.mobile-summary-bar,.toast{visibility:hidden!important;}'});
  }
  await page.setViewportSize({width:1440,height:1000});
  await page.goto('http://127.0.0.1:5174', {waitUntil:'networkidle'});
}
