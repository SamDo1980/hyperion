import { expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
const mapping = JSON.parse(await readFile(new URL('../src/data/configurator.json',import.meta.url)));

export async function runPhaseTenChecks(page, measurements) {
  const concept = mapping.concepts.find(c => c.label_en === 'Lifeboat Side');
  for (const width of [1440,1280,1024,768,390,320]) for (const lang of ['en','vi']) {
    await page.setViewportSize({width,height:900});
    await page.goto(`http://127.0.0.1:5174/?lang=${lang}`,{waitUntil:'networkidle'});
    await expect(page.locator('#product-range,.product-range,a[href="#product-range"],.footer-links')).toHaveCount(0);
    const body = await page.locator('body').innerText();
    expect(body).not.toContain('Look up IMO signs by product code or name. Compare the listed sizes and editions, then add the exact SKU to your cart.');
    expect(body).not.toContain('Start with a category to narrow your selection.');
    expect(body).not.toContain('Your sign is ready to add to cart.');
    const footer = page.locator('.site-footer');
    await expect(footer).toContainText(lang === 'en' ? 'Tax code: 0307940363' : 'Mã số thuế: 0307940363');
    await expect(footer).toContainText(`© 2026 DLV Corporation. ${lang === 'en' ? 'All rights reserved.' : 'Bảo lưu mọi quyền.'}`);
    const root = page.locator('#find-your-sign');
    await root.locator(`[data-group="${concept.category_id}"]`).click();
    const sign = root.locator(`[data-field="config_concept"] [data-value=${JSON.stringify(concept.id)}]`);
    while (!await sign.isVisible()) await root.locator('[data-field="config_concept"] .step-show-more').click();
    await sign.click();
    const design = root.locator('[data-field="product_family_id"]');
    const grid = design.locator('.design-option-grid');
    await expect(design.locator('.step-show-more')).toHaveCount(0);
    await expect(grid.locator('.sign-option')).toHaveCount(concept.family_ids.length);
    const scroll = await grid.evaluate(el => ({clientHeight:el.clientHeight,scrollHeight:el.scrollHeight,overflow:getComputedStyle(el).overflowY,columns:getComputedStyle(el).gridTemplateColumns.split(' ').length}));
    expect(scroll.overflow).toBe('auto');
    if (Math.ceil(concept.family_ids.length / scroll.columns) > 2) expect(scroll.scrollHeight).toBeGreaterThan(scroll.clientHeight);
    else expect(scroll.scrollHeight).toBeLessThanOrEqual(scroll.clientHeight);
    const last = grid.locator('.sign-option').last(); await last.click();
    await expect(last).toHaveAttribute('aria-pressed','true');
    await expect(last.locator('.option-check')).toBeVisible();
    expect(await last.evaluate(el=>{const r=el.getBoundingClientRect(),g=el.parentElement.getBoundingClientRect();return r.top>=g.top-1&&r.bottom<=g.bottom+1;})).toBe(true);
    const size = root.locator('[data-field="dimensions_display"]');
    const available = size.locator('button:enabled').first(), unavailable = size.locator('button:disabled').first();
    await expect(available).toBeVisible(); await expect(unavailable).toBeVisible();
    const colors = await Promise.all([available,unavailable].map(locator=>locator.evaluate(el=>({background:getComputedStyle(el).backgroundColor,color:getComputedStyle(el).color,border:getComputedStyle(el).borderColor,cursor:getComputedStyle(el).cursor}))));
    expect(colors[0].background).not.toBe(colors[1].background); expect(colors[0].border).not.toBe(colors[1].border);
    expect(colors[0].cursor).toBe('pointer'); expect(colors[1].cursor).toBe('not-allowed');
    await available.click(); await expect(available).toHaveAttribute('aria-pressed','true');
    expect(await available.evaluate(el=>getComputedStyle(el).backgroundColor)).not.toBe(colors[0].background);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    measurements.push({flow:'phase 10 cleanup',width,language:lang,designScroll:scroll,sizeColors:colors});
    await design.screenshot({path:`test-results/phase-ten-design-${width}-${lang}.png`,style:'.site-header,.mobile-summary-bar,.toast{visibility:hidden!important;}'});
    await size.screenshot({path:`test-results/phase-ten-size-${width}-${lang}.png`,style:'.site-header,.mobile-summary-bar,.toast{visibility:hidden!important;}'});
    await footer.screenshot({path:`test-results/phase-ten-footer-${width}-${lang}.png`,style:'.mobile-summary-bar,.toast{visibility:hidden!important;}'});
  }
  await page.setViewportSize({width:1440,height:1000});
  await page.goto('http://127.0.0.1:5174',{waitUntil:'networkidle'});
}
