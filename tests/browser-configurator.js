import { expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { formatPrice } from '../src/lib/storefront.js';
const mapping = JSON.parse(await readFile(new URL('../src/data/configurator.json', import.meta.url)));
export async function runConfiguratorBrowserChecks(page, products, measurements) {
  const root = page.locator('#find-your-sign'), purchase = root.locator('.edition-purchase');
  const field = name => root.locator(`[data-field="${name}"]`);
  const attrs = p => ({ ...p, ...mapping.families.find(f => f.product_family_id === p.product_family_id) });
  async function choose(name, value) {
    const step = field(name);
    const target = step.locator(`[data-value=${JSON.stringify(value)}]`);
    while (!await target.isVisible()) await step.locator(".step-show-more").click();
    await target.click();
    await expect(step).toHaveAttribute('data-state','complete');
    await expect(step.locator('.step-choices')).toBeVisible();
    await expect(step.locator('[aria-pressed="true"] .option-check')).toHaveCount(1);
    await expect(step.locator('.step-change')).toHaveCount(0);
  }
  async function configure(p) {
    if (await root.locator('.configurator-reset').isEnabled()) await root.locator('.configurator-reset').click();
    await root.locator(`[data-group="${p.customer_category_id}"]`).click();
    for (let i=0;i<10;i++) {
      const active=root.locator('.configuration-steps .configuration-step[data-state="current"]');
      if (!await active.count()) break;
      const key=await active.getAttribute('data-field'); await choose(key,attrs(p)[key]);
    }
    await expect(purchase.locator('[data-sku]')).toHaveAttribute('data-sku',p.id);
    await expect(purchase.locator('img')).toHaveAttribute('src',p.image_url);
    await expect(root.locator('.order-summary .add-to-cart')).toHaveCount(0);
  }
  await page.setViewportSize({width:1440,height:1000});
  const raft=products.find(p=>p.product_concept_en==='Liferaft' && p.edition==='Standard');
  await configure(raft);
  await expect(field('config_concept').locator('input')).toBeVisible();
  await field('config_concept').locator('input').fill('not-a-real-sign');
  await expect(field('config_concept').locator('.sign-option:visible')).toHaveCount(1);
  await field('config_concept').locator('input').fill('phao');
  expect(await field('config_concept').locator('.sign-option:visible').count()).toBeGreaterThan(1);
  await field('config_concept').locator('input').fill('');
  const boat=products.find(p=>p.product_concept_en==='Lifeboat' && p.edition==='Standard');
  await choose('config_concept',attrs(boat).config_concept);
  await expect(root.locator(`[data-field="product_family_id"] [data-value="${raft.product_family_id}"]`)).toHaveCount(0);
  for (const key of ['product_family_id','dimensions_display']) {
    if (await field(key).count()) await choose(key,attrs(boat)[key]);
  }
  await expect(root.locator('[data-field="edition"] [data-value="Standard"]')).toHaveAttribute('aria-pressed','true');
  const wash=products.find(p=>p.impa_code==='334152' && p.edition==='Standard');
  const hospital=products.find(p=>p.product_concept_en==='Hospital' && p.edition==='Standard');
  await configure(wash);
  await field('config_concept').locator('input').fill('Hospital');
  await choose('config_concept',attrs(hospital).config_concept);
  await expect(field('config_concept').locator('input')).toHaveValue('Hospital');
  await expect(purchase.locator('[data-sku]')).toHaveAttribute('data-sku',hospital.id);
  await expect(field('edition').locator('[data-value="Standard"]')).toHaveAttribute('aria-pressed','true');
  // Every category, direction, duplicate design and size flow uses source attributes.
  for (const p of [wash, ...['334402','334335','334455','334481'].map(code=>products.find(p=>p.impa_code===code && p.edition==='Outdoor')),
    products.find(p=>p.customer_category_en==='Mandatory Signs (MSS)'),products.find(p=>p.customer_category_en==='General Shipboard / Port & Leisure Signs'),
    ...products.filter(p=>p.impa_code==='334420' && p.edition==='Standard')]) await configure(p);
  await configure(wash);
  const prior=await page.evaluate(id=>JSON.parse(localStorage.getItem('hyperion.cart.v1'))?.items.find(p=>p.id===id)?.quantity??0,wash.id);
  await purchase.getByRole('spinbutton').fill('2'); await purchase.locator('.add-to-cart').click();
  await page.locator('#product-query').fill(wash.id); await page.locator('.search-submit').click(); await page.locator('.lookup .add-to-cart').click();
  const lines=await page.evaluate(id=>JSON.parse(localStorage.getItem('hyperion.cart.v1')).items.filter(p=>p.id===id),wash.id);
  expect(lines).toHaveLength(1);expect(lines[0].quantity).toBe(prior+3);
  await purchase.getByRole('spinbutton').fill('0');await expect(purchase.locator('.add-to-cart')).toBeDisabled();
  await purchase.getByRole('spinbutton').fill('1');
  for(const width of [1440,1280,1024,768,390,320]) {
    await page.setViewportSize({width,height:width<500?844:1000});
    for(const lang of ['en','vi']) {
      await page.goto(`http://127.0.0.1:5174/?lang=${lang}`,{waitUntil:'domcontentloaded'});
      await configure(raft);
      await expect(purchase.locator('.result-title')).toHaveText(raft[`display_name_${lang}`]);
      const currency=lang==='en'?'USD':'VND';await expect(purchase.locator('.result-price strong')).toHaveText(formatPrice(raft.prices[currency],currency));
      await expect(field('config_concept').locator('input')).toBeVisible();
      await expect(root.locator('.step-choices[hidden], .step-change')).toHaveCount(0);
      const measure=await root.evaluate(el=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,
        overflow:[...el.querySelectorAll('*')].filter(e=>{const b=e.getBoundingClientRect();return b.width>0&&!e.classList.contains('sr-only')&&(b.left< -1||b.right>innerWidth+1)}).map(e=>e.className),
        targets:[...el.querySelectorAll('button')].filter(e=>e.offsetWidth).map(e=>({width:e.offsetWidth,height:e.offsetHeight}))}));
      expect(measure.scrollWidth).toBeLessThanOrEqual(width);expect(measure.overflow).toEqual([]);
      for(const target of measure.targets){expect(target.height).toBeGreaterThanOrEqual(44);expect(target.width).toBeGreaterThanOrEqual(44);}
      measurements.push({flow:'expanded configurator',language:lang,...measure});
      await page.screenshot({path:`test-results/configurator-${width}-${lang}.png`});
    }
  }
  await page.goto('http://127.0.0.1:5174',{waitUntil:'domcontentloaded'});
  await root.locator(`[data-group="${wash.customer_category_id}"]`).click();
}
