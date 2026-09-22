import { expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { formatPrice } from '../src/lib/storefront.js';
const mapping=JSON.parse(await readFile(new URL('../src/data/configurator.json',import.meta.url)));
export async function runPhaseEightChecks(page,products,measurements) {
  await page.setViewportSize({width:1440,height:1000});
  const root=page.locator('#find-your-sign');
  const step=field=>root.locator(`[data-field="${field}"]`);
  const click=async(field,value)=>{ const target=step(field).locator(`[data-value=${JSON.stringify(value)}]`); while(!await target.isVisible()) await step(field).locator(".step-show-more").click(); await target.click(); };
  async function start(name) {
    await page.goto('http://127.0.0.1:5174',{waitUntil:'networkidle'});
    const concept=mapping.concepts.find(c=>c.label_en===name);
    await root.locator(`[data-group="${concept.category_id}"]`).click();await click('config_concept',concept.id);
    return concept;
  }
  for(const name of ['Lifeboat','Line Throwing Appliance']) {
    const concept=await start(name);
    await expect(step('config_direction')).toHaveCount(0);
    await expect(step('product_family_id').locator('button')).toHaveCount(concept.family_ids.length);
    await expect(step('product_family_id').locator('legend')).toContainText('Choose a design');
    await step('product_family_id').screenshot({path:`test-results/phase-eight-${name==='Lifeboat'?'lifeboat':'line-throwing'}-designs.png`});
  }
  await start('Emergency Eye Wash');
  await expect(step('product_family_id')).toBeHidden();
  await expect(step('dimensions_display').locator('button:enabled')).toHaveCount(1);
  await expect(step('dimensions_display').locator('button:enabled')).toHaveAttribute('aria-pressed','false');
  await expect(step('edition')).toHaveAttribute('data-state','locked');
  await step('dimensions_display').screenshot({path:'test-results/phase-eight-size-unselected.png'});
  await step('dimensions_display').locator('button:enabled').click();
  const final=step('edition');
  await expect(final.locator('.add-to-cart')).toBeDisabled();
  await expect(root.locator('.configured-summary')).toHaveCount(0);
  await expect(root.getByRole('heading',{name:'Your selected sign',exact:true})).toHaveCount(0);
  await step('dimensions_display').screenshot({path:'test-results/phase-eight-size-selected.png'});
  await final.evaluate(el=>{window.finalCard=el;window.finalAdd=el.querySelector('.add-to-cart');});
  const family=products.find(p=>p.impa_code==='334152');
  let previous=null;
  for(const edition of ['Standard','Outdoor','Standard']) {
    await click('edition',edition);
    const p=products.find(p=>p.product_family_id===family.product_family_id && p.edition===edition);
    await expect(final.locator('[data-sku]')).toHaveAttribute('data-sku',p.id);
    await expect(final.locator('.result-reference')).toHaveText(`Barcode ${p.barcode}`);
    await expect(final.locator('img')).toHaveAttribute('src',p.image_url);
    await expect(final.locator('.result-price strong')).toHaveText(formatPrice(p.prices.USD,'USD'));
    if(!previous) await final.getByRole('spinbutton').fill('3');
    await expect(final.getByRole('spinbutton')).toHaveValue('3');
    await expect(final.locator('.selection-subtotal')).toHaveCount(0);
    expect(await final.evaluate(el=>el===window.finalCard && el.querySelector('.add-to-cart')===window.finalAdd)).toBe(true);
    const position=await final.locator('.add-to-cart').evaluate(el=>{const r=el.getBoundingClientRect(),card=el.closest('fieldset').getBoundingClientRect();return {top:r.top-card.top,left:r.left-card.left,height:card.height};});
    if(previous) expect(position).toEqual(previous); previous=position;
    await final.screenshot({path:`test-results/phase-eight-edition-${edition.toLowerCase()}.png`});
    await final.locator('.add-to-cart').click();
    const saved=await page.evaluate(id=>JSON.parse(localStorage.getItem('hyperion.cart.v1')).items.find(i=>i.id===id),p.id);
    expect(saved.quantity).toBeGreaterThanOrEqual(3);
  }
  for(const width of [1440,1280,1024,768,390,320]) {
    await page.setViewportSize({width,height:900});
    if(width<500)await final.screenshot({path:`test-results/phase-eight-final-${width}.png`,style:'.toast,.mobile-summary-bar,.site-header { visibility:hidden !important; }'});
    for(const code of ['334152','334480']) {
      await page.locator('#product-query').fill(code);await page.locator('.search-submit').click();
      const frame=page.locator('.lookup .product-image:visible').first();
      const size=await frame.evaluate(el=>({width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height,fit:getComputedStyle(el.querySelector('img')).objectFit}));
      expect(size.width).toBe(width>=1024?68:width>=701?60:52);expect(size.height).toBe(size.width);expect(size.fit).toBe('contain');
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      measurements.push({flow:'phase-eight thumbnails',viewport:width,code,...size});
      if([1440,390].includes(width))await page.locator('.lookup').screenshot({path:`test-results/phase-eight-search-${code}-${width}.png`,style:'.toast { visibility:hidden !important; }'});
    }
  }
  await page.evaluate(()=>localStorage.removeItem('hyperion.cart.v1'));
  await page.setViewportSize({width:1440,height:1000});await page.goto('http://127.0.0.1:5174',{waitUntil:'networkidle'});
}
