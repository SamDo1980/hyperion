import { expect } from '@playwright/test';
export async function runPolishChecks(page, measurements, products) {
  for (const width of [1440,1280,1024,768,390,320]) for (const lang of ['en','vi']) {
    await page.setViewportSize({width,height:900});
    await page.goto(`http://127.0.0.1:5174/?lang=${lang}`,{waitUntil:'networkidle'});
    const lookup=page.locator('.lookup'), input=lookup.locator('input[type=search]');
    await expect(input).toBeVisible();
    await expect(lookup.locator('.search-help,.search-examples,.example-button,.catalogue-label,.lookup-heading p,.results-note')).toHaveCount(0);
    await expect(lookup.locator('.search-results')).toBeHidden();
    await expect(input).toHaveAccessibleName(lang==='en'?'Search by product code or name':'Tìm theo mã hoặc tên sản phẩm');
    await expect(input).toHaveAttribute('placeholder',lang==='en'?'Search by IMPA, ISSA, barcode or product name':'Tìm theo IMPA, ISSA, mã vạch hoặc tên sản phẩm');
    await expect(input).toHaveAttribute('aria-description',/IMPA.*ISSA/);
    const before=await lookup.evaluate(el=>({width:innerWidth,section:el.getBoundingClientRect().height,panel:el.querySelector('.lookup-panel').getBoundingClientRect().height}));
    const lookupWidth = await lookup.evaluate(el => el.clientWidth);
    expect(before.panel).toBeLessThan(width<641 || lookupWidth<=650 ? 245 : 170);
    measurements.push({flow:'compressed search',language:lang,...before});
    if(lang==='en' && [1440,390].includes(width)) await lookup.screenshot({path:`test-results/phase-seven-search-${width}-empty.png`});
    const shell=page.locator('.summary-shell');
    if(width<768) await page.locator('.mobile-summary-bar').click();
    else await shell.scrollIntoViewIfNeeded();
    await expect(shell.locator('.order-empty')).toBeVisible();
    await expect(shell.locator('.order-counts')).toBeHidden();
    const appearance=await shell.evaluate(el=>({height:el.getBoundingClientRect().height,background:getComputedStyle(el).backgroundColor,
      sections:['.summary-header','.summary-content','.order-empty','.order-totals'].map(q=>getComputedStyle(el.querySelector(q)).backgroundColor),heading:getComputedStyle(el.querySelector('h3')).color}));
    expect(appearance.background).toBe('rgb(8, 34, 56)');
    expect(appearance.sections.every(c=>c==='rgba(0, 0, 0, 0)'||c===appearance.background)).toBe(true);
    expect(appearance.heading).toBe('rgb(255, 255, 255)');expect(appearance.height).toBeLessThan(300);
    await expect(shell.locator('.order-total-amount')).toBeInViewport();
    if(width===1440 && lang==='en') await shell.screenshot({path:'test-results/phase-seven-order-empty-desktop.png'});
    if(width<768) await shell.locator('.summary-close').click();
    await input.fill('334420');await lookup.locator('.search-submit').click();
    await expect(lookup.locator('.result-card')).toHaveCount(products.filter(p => p.impa_code === '334420').length);
    const spacing=await lookup.evaluate(el=>({gap:el.querySelector('.results-heading').getBoundingClientRect().top-el.querySelector('.lookup-panel').getBoundingClientRect().bottom,overflow:document.documentElement.scrollWidth>innerWidth}));
    expect(spacing.gap).toBeLessThanOrEqual(12);expect(spacing.overflow).toBe(false);
    if(lang==='en' && [1440,390].includes(width)) await lookup.screenshot({path:`test-results/phase-seven-search-${width}-results.png`});
  }
  await page.setViewportSize({width:1440,height:1000});
  await page.goto('http://127.0.0.1:5174',{waitUntil:'networkidle'});
}
