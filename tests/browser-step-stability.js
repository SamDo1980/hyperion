import { expect } from '@playwright/test';

export async function runStepStabilityChecks(page, measurements) {
  for (const width of [1440,1280,1024,768,390,320]) for (const lang of ['en','vi']) {
    await page.setViewportSize({width,height:900});
    await page.goto(`http://127.0.0.1:5174/?lang=${lang}`,{waitUntil:'networkidle'});
    await page.locator('[data-group="lifesaving-signs-lss-lsa"]').click();
    const step = page.locator('[data-field="config_concept"]');
    const measure = () => step.evaluate(el => {
      const box = node => {const r=node.getBoundingClientRect();return [r.x+scrollX,r.y+scrollY,r.width,r.height].map(n=>Math.round(n*100)/100);};
      const grid=el.querySelector('.sign-option-grid'), css=getComputedStyle(el), g=getComputedStyle(grid);
      return {step:box(el),heading:box(el.querySelector('legend')),filter:box(el.querySelector('input')),grid:box(grid),
        cards:[...grid.children].filter(n=>!n.hidden).map(box),columns:g.gridTemplateColumns,gap:g.gap,
        border:css.border,padding:css.padding,background:css.backgroundColor};
    });
    await step.evaluate(el=>{window.stableStepNodes=[el.querySelector('legend'),el.querySelector('input'),el.querySelector('.sign-option-grid'),...el.querySelectorAll('.sign-option')];});
    const before=await measure();
    await step.screenshot({path:`test-results/stable-step-before-${width}-${lang}.png`,style:'.site-header,.mobile-summary-bar,.toast{visibility:hidden!important;}'});
    await step.locator('.sign-option').first().click();
    await expect(step).toHaveAttribute('data-state','complete');
    expect(await measure()).toEqual(before);
    expect(await step.evaluate(el=>[el.querySelector('legend'),el.querySelector('input'),el.querySelector('.sign-option-grid'),...el.querySelectorAll('.sign-option')].every((node,i)=>node===window.stableStepNodes[i]))).toBe(true);
    await expect(step.locator('[aria-pressed="true"] .option-check')).toBeVisible();
    await step.locator('.sign-option').nth(1).click();
    expect(await measure()).toEqual(before);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await step.screenshot({path:`test-results/stable-step-after-${width}-${lang}.png`,style:'.site-header,.mobile-summary-bar,.toast{visibility:hidden!important;}'});
    measurements.push({flow:'stable step state',width,language:lang,unchanged:true,...before});
  }
  await page.setViewportSize({width:1440,height:1000});
  await page.goto('http://127.0.0.1:5174',{waitUntil:'networkidle'});
}
