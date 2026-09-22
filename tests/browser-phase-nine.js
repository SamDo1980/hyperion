import { expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
const mapping=JSON.parse(await readFile(new URL('../src/data/configurator.json',import.meta.url)));
export async function runPhaseNineChecks(page,products,measurements) {
  const root=page.locator('#find-your-sign');const field=name=>root.locator(`[data-field="${name}"]`);
  async function noInternalCodes(scope) {
    const presentation=await scope.evaluate(el=>[el.innerText,...[...el.querySelectorAll('[title],[aria-label]')].map(n=>`${n.title} ${n.getAttribute('aria-label')}`)].join(' '));
    expect(presentation).not.toMatch(/HYPERION33|Internal Reference|product families|\d+ options|sellable SKUs|308 SKUs/i);
  }
  for(const width of [1440,1280,1024,768,390,320])for(const lang of ['en','vi']) {
    await page.setViewportSize({width,height:900});await page.goto(`http://127.0.0.1:5174/?lang=${lang}`,{waitUntil:'networkidle'});
    await expect(root.locator('.configuration-steps .configuration-step:visible')).toHaveCount(4);
    await expect(root.locator('.configuration-steps .configuration-step[data-state="locked"]')).toHaveCount(4);
    expect(await root.locator('.configuration-steps .configuration-step').evaluateAll(nodes=>nodes.every(n=>n.disabled&&n.getAttribute('aria-disabled')==='true'))).toBe(true);
    await expect(root.locator('.hero-stats,.group-count')).toHaveCount(0);
    await expect(page.locator('.hero-stats')).toHaveCount(0);
    await root.evaluate(el=>{window.phaseNineSlots=Object.fromEntries([...el.querySelectorAll('.configuration-steps .configuration-step')].map(n=>[n.dataset.field,n]));});
    await noInternalCodes(page.locator('body'));
    if(width<1000){await page.locator('.header-menu').click();await expect(page.locator('.header-nav-links')).toBeVisible();}
    await expect(page.locator('#product-range,.product-range,a[href="#product-range"]')).toHaveCount(0);
    await noInternalCodes(page.locator('.lookup'));
    const concept=mapping.concepts.find(c=>c.label_en==='Lifeboat');
    const lockedHeights=await root.locator('.configuration-steps [data-state="locked"]').evaluateAll(nodes=>nodes.map(el=>el.getBoundingClientRect().height));
    for(const height of lockedHeights){expect(height).toBeGreaterThanOrEqual(64);expect(height).toBeLessThanOrEqual(88);}
    await root.locator('.configuration-steps').screenshot({path:`test-results/phase-nine-locked-${width}-${lang}.png`,style:'.site-header,.mobile-summary-bar,.toast {visibility:hidden!important;}'});
    await root.locator(`[data-group="${concept.category_id}"]`).click();
    await expect(field('config_concept')).toHaveAttribute('data-state','current');await expect(field('product_family_id')).toHaveAttribute('data-state','locked');
    const grid=field('config_concept').locator('.sign-option-grid');
    await expect(grid.locator('.sign-option:visible')).toHaveCount(12);
    const layout=await grid.evaluate(el=>{
      const cards=[...el.children].filter(n=>!n.hidden).map(n=>n.getBoundingClientRect());
      return {columns:getComputedStyle(el).gridTemplateColumns.split(' ').length,overflow:getComputedStyle(el).overflowY,
        heights:cards.map(r=>r.height),overlap:cards.some((a,i)=>cards.some((b,j)=>j>i&&a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top))};
    });
    expect(layout.overflow).toBe('visible');expect(layout.overlap).toBe(false);
    expect(layout.columns).toBe(width>1350?4:width>640?3:2);
    expect(Math.max(...layout.heights)-Math.min(...layout.heights)).toBeLessThan(2);
    await expect(field('config_concept').locator('.step-show-more')).toHaveText(lang==='en'?'Show more':'Xem thêm');
    await field('config_concept').locator('.step-show-more').click();
    await expect(grid.locator('.sign-option:visible')).toHaveCount(24);
    await field('config_concept').locator('.concept-filter').fill('Lifeboat');
    await expect(grid.locator('.sign-option:visible')).toHaveCount(2); // Lifeboat and Lifeboat Embarkation Station.
    await field('config_concept').locator('.concept-filter').fill('');
    await field('config_concept').screenshot({path:`test-results/phase-nine-sign-grid-${width}-${lang}.png`,style:'.site-header,.mobile-summary-bar,.toast {visibility:hidden!important;}'});
    await field('config_concept').locator(`[data-value=${JSON.stringify(concept.id)}]`).click();
    await expect(field('product_family_id').locator('button')).toHaveCount(5);
    await noInternalCodes(field('product_family_id'));
    const chosen=products.find(p=>p.product_family_id===concept.family_ids[0]&&p.edition==='Standard');
    await field('product_family_id').locator(`[data-value="${chosen.product_family_id}"]`).click();
    await expect(field('dimensions_display')).toHaveAttribute('data-state','current');
    await expect(field('edition')).toHaveAttribute('data-state','locked');
    await expect(field('edition').locator('.add-to-cart')).toBeDisabled();
    await field('dimensions_display').locator('button:enabled').click();
    await field('edition').locator('[data-value="Standard"]').click();
    await expect(field('edition').locator('[data-sku]')).toHaveAttribute('data-sku',chosen.id);
    await noInternalCodes(field('edition'));
    expect(await root.evaluate(el=>[...el.querySelectorAll('.configuration-steps .configuration-step')].every(n=>window.phaseNineSlots[n.dataset.field]===n))).toBe(true);
    measurements.push({flow:'fixed roadmap',width,language:lang,lockedHeights,...layout});
    await page.screenshot({path:`test-results/phase-nine-roadmap-${width}-${lang}.png`});
    await root.locator('[data-group="mandatory-signs-mss"]').click();
    await expect(field('edition')).toHaveAttribute('data-state','locked');await expect(field('edition').locator('.add-to-cart')).toBeDisabled();
    await expect(field('edition').locator('[data-sku]')).toHaveCount(0);
    const footer=page.locator('.site-footer');await footer.scrollIntoViewIfNeeded();
    await expect(footer.locator('a[href="mailto:sales@dlvcorp.com"]')).toHaveText('sales@dlvcorp.com');await expect(footer.locator('a[href="tel:+84347099905"]')).toBeVisible();
    expect(await footer.innerText()).not.toContain('Handypad');
    await expect(footer.locator('.footer-links,nav,a[href^="#"]')).toHaveCount(0);
    await footer.screenshot({path:`test-results/phase-nine-footer-${width}-${lang}.png`,style:'.mobile-summary-bar,.toast {visibility:hidden!important;}'});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
  await page.setViewportSize({width:1440,height:1000});await page.goto('http://127.0.0.1:5174',{waitUntil:'networkidle'});
}
