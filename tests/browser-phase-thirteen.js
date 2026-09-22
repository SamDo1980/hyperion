import { chromium, expect } from '@playwright/test';
import { spawn } from 'node:child_process';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { runPhaseFourteenEditionChecks } from './browser-phase-fourteen.js';
const phase14=process.argv.includes('--phase14');
const directory=phase14?'test-results/phase-fourteen':'test-results/phase-thirteen'; await mkdir(directory,{recursive:true});
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5178','--strictPort'],{stdio:'pipe',windowsHide:true});
const logs=[]; server.stdout.on('data',data=>logs.push(String(data)));server.stderr.on('data',data=>logs.push(String(data)));
const errors=[],failures=[],shots=[],checks=[];let browser;
try {
  for(let i=0;i<80;i++){try{if((await fetch('http://127.0.0.1:5178')).ok)break;}catch{}await delay(250);}
  browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage();
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().startsWith('http://127.0.0.1')&&r.status()>=400)failures.push(r.url());});
  let payments=0;page.on('request',request=>{if(request.url().includes('/api/checkout'))payments++;});
  const products=JSON.parse(await readFile('src/data/products.json','utf8'));
  async function shot(name,locator=page){const path=`${directory}/${name}.png`;await locator.screenshot({path});shots.push(path);}
  const choice=value=>page.locator(`.payment-choice[data-value="${value}"]`),modal=page.locator('.payment-modal'),cta=page.locator('.payment-cta');
  async function country(name){const input=page.locator('#shipping-country');await input.fill(name);await input.press('ArrowDown');await input.press('Enter');}
  async function assertModal(){await expect(modal).toBeVisible();expect(await page.evaluate(()=>document.body.style.overflow)).toBe('hidden');expect(await modal.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);}
  for(const width of [1440,1280,1024,768,390,320])for(const lang of ['en','vi']){
    await page.setViewportSize({width,height:900});await page.goto(`http://127.0.0.1:5178/?lang=${lang}`);await page.evaluate(()=>localStorage.clear());await page.reload({waitUntil:'networkidle'});
    await expect.poll(()=>page.locator('.payment-methods img').evaluateAll(images=>images.length===4&&images.every(img=>img.complete&&img.naturalWidth>0))).toBe(true);
    expect(await page.locator('#product-query').getAttribute('placeholder')).not.toMatch(/reference|mã nội bộ/i);
    await page.locator('#product-query').fill(products[0].barcode);await page.locator('.search-submit').click();await page.locator('.result-card .add-to-cart').click();
    await expect(page.locator('.toast')).toHaveText(lang==='en'?'Added to order':'Đã thêm vào đơn hàng');
    const toastSafe=await page.locator('.toast').evaluate(el=>{if(getComputedStyle(el).clipPath!=='none')return true;const r=el.getBoundingClientRect();return ![...document.querySelectorAll('button,input,select,.mobile-summary-bar')].some(control=>{const b=control.getBoundingClientRect();return b.width&&b.height&&r.left<b.right&&r.right>b.left&&r.top<b.bottom&&r.bottom>b.top;});});expect(toastSafe).toBe(true);
    await shot(`simulation-toast-${width}-${lang}`);
    await page.locator('.shipping-continue').click();await expect(page.locator('#shipping-fullName')).toBeFocused();
    const contact={fullName:"Nguyễn O’Neil-Smith",email:'review@example.test',phone:'+358 (9) 123-4567',address:'#4 / 2 Nguyễn Trãi, Apt. B',cityProvince:'Hồ Chí Minh'};
    for(const [key,value]of Object.entries(contact))await page.locator(`#shipping-${key}`).fill(value);
    const ci=page.locator('#shipping-country');await ci.fill('Unmatched land');await ci.blur();await expect(page.locator('#order-payment')).toBeDisabled();
    await ci.fill('');await ci.press('ArrowUp');await expect(ci).toHaveAttribute('aria-activedescendant','country-ZW');await ci.press('Escape');await expect(ci).toHaveAttribute('aria-expanded','false');
    await ci.fill('Viet');await expect(page.locator('#country-options [role="option"]')).toHaveCount(1);await shot(`simulation-country-${width}-${lang}`,page.locator('#contact-shipping'));
    await ci.press('ArrowDown');await ci.press('Enter');await expect(page.locator('#order-payment')).toBeEnabled();
    expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('hyperion.order-draft.v1')).shipping.countryCode)).toBe('VN');
    await page.reload({waitUntil:'networkidle'});await expect(ci).toHaveValue('Vietnam');await expect(page.locator('#shipping-fullName')).toHaveValue(contact.fullName);
    await page.locator('#shipping-email').fill('invalid');await expect(page.locator('#order-payment')).toBeDisabled();await page.locator('#shipping-email').fill(contact.email);
    await choice(lang==='en'?'deposit':'full').click();
    await expect(choice('deposit').locator('.payment-choice-title')).toHaveText(lang==='en'?'Deposit':'Đặt cọc');
    if(lang==='en')await expect(choice('deposit').locator('.payment-choice-description')).toHaveText('Up to US$5');
    await expect(page.locator('#order-payment .checkout-totals')).toHaveCount(0);await expect(page.locator('#order-payment .payment-summary')).toHaveCount(0);
    if(width<768)await page.locator('.mobile-summary-bar').click();
    const summary=page.locator('.summary-payment');await expect(summary).toBeVisible();expect(await summary.innerText()).not.toMatch(/Payment option|Lựa chọn thanh toán/);
    for(const text of lang==='en'?['Merchandise subtotal','Shipping fee','Remaining balance']:['Tổng tiền hàng','Phí vận chuyển','Số dư còn lại'])await expect(summary).toContainText(text);
    const sizes=await summary.evaluate(el=>({details:parseFloat(getComputedStyle(el).fontSize),primary:parseFloat(getComputedStyle(document.querySelector('.order-total-amount')).fontSize)}));expect(sizes.details).toBeGreaterThanOrEqual(14);expect(sizes.primary).toBeGreaterThan(sizes.details);
    await shot(`simulation-summary-${width}-${lang}`,page.locator('.summary-shell'));if(width<768)await page.locator('.summary-close').click();
    const rows=await page.locator('.payment-methods .payment-choice').evaluateAll(nodes=>nodes.map(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,height:r.height,width:r.width};}));
    expect(new Set(rows.map(r=>r.x)).size).toBe(1);expect(Math.max(...rows.map(r=>r.height))-Math.min(...rows.map(r=>r.height))).toBeLessThan(1);
    for(const row of rows){expect(row.height).toBeGreaterThanOrEqual(72);expect(row.height).toBeLessThanOrEqual(84);}
    await expect(page.locator('.payment-methods .method-availability:visible')).toHaveCount(0);
    await choice('card').click();expect((await choice('card').boundingBox()).height).toBe(rows[0].height);
    await shot(`simulation-payment-${width}-${lang}`,page.locator('#order-payment'));
    await cta.click();await assertModal();await expect(modal.locator('.field-error:visible')).toHaveCount(0);
    await expect(modal.locator('.simulation-note')).toHaveCount(0);
    await expect(modal.locator('.payment-modal-due strong')).toHaveText(await page.locator('.order-total-amount').textContent());
    await modal.locator('.modal-pay').click();await expect(page.locator('#payment-card-number')).toBeFocused();await expect(modal.locator('.field-error:visible')).toHaveCount(3);
    await page.locator('#payment-card-number').fill('4111111111111112');await expect(page.locator('#payment-card-number')).toHaveAttribute('aria-invalid','true');
    await page.locator('#payment-card-number').fill('4111 1111 1111 1111');await expect(page.locator('#payment-card-number-error')).toBeHidden();
    await page.locator('#payment-card-expiry').fill('1228');await expect(page.locator('#payment-card-expiry')).toHaveValue('12 / 28');
    await page.locator('#payment-card-cvv').fill('123');await shot(`simulation-card-${width}-${lang}`,modal);
    const persisted=await page.evaluate(()=>JSON.stringify({local:{...localStorage},session:{...sessionStorage}}));expect(persisted).not.toMatch(/4111|cvv|cardNumber/);
    await modal.locator('.modal-pay').click();await expect(modal.locator('.payment-modal-status')).toHaveText(lang==='en'?'Waiting for payment confirmation':'Đang chờ xác nhận thanh toán');await expect(page.locator('.payment-confirmation')).toBeHidden();
    await expect(page.locator('#payment-card-number')).toHaveValue('4111 1111 1111 1111');await expect(page.locator('#payment-card-number')).toHaveAttribute('readonly','');await expect(modal.locator('.modal-pay')).toBeDisabled();await shot(`simulation-card-pending-${width}-${lang}`,modal);
    await modal.evaluate(el=>{window.pendingMutations=[];window.pendingObserver=new MutationObserver(()=>window.pendingMutations.push(el.querySelector('.payment-modal-status').textContent));window.pendingObserver.observe(el.querySelector('.payment-modal-status'),{subtree:true,childList:true,characterData:true});el.querySelector('form').requestSubmit();});
    await page.waitForTimeout(400);expect(await page.evaluate(()=>{window.pendingObserver.disconnect();return window.pendingMutations;})).toEqual([]);
    await page.keyboard.press('Escape');await expect(modal).not.toBeVisible();await expect(cta).toBeFocused();expect(await page.evaluate(()=>document.body.style.overflow)).toBe('');
    await expect(page.locator('#payment-card-number')).toHaveCount(0);
    await choice('full').click();await choice('zalopay').click();await cta.click();await assertModal();await expect(modal.locator('.payment-modal-due strong')).toHaveText(await page.locator('.order-total-amount').textContent());
    await shot(`simulation-zalopay-initial-${width}-${lang}`,modal);await modal.locator('.modal-pay').click();await expect(modal.locator('.simulation-gateway')).toBeVisible();
    await modal.locator('.simulation-gateway button').click();await expect(modal.locator('.modal-pay')).toHaveText(lang==='en'?'Reopen payment window':'Mở lại cửa sổ thanh toán');
    await expect(modal.locator('.payment-modal-status')).toHaveText(lang==='en'?'Waiting for payment confirmation':'Đang chờ xác nhận thanh toán');
    await modal.locator('.modal-pay').click();await modal.locator('.simulation-gateway button').click();await expect(modal.locator('.modal-pay')).toBeEnabled();
    await shot(`simulation-zalopay-returned-${width}-${lang}`,modal);await modal.locator('.payment-modal-close').click();await expect(cta).toBeFocused();
    await choice('bank_transfer').click();await cta.click();await assertModal();await expect(modal.locator('.payment-modal-status')).toHaveText(lang==='en'?'Waiting for transfer confirmation':'Đang chờ xác nhận chuyển khoản');
    await expect(modal.locator('.modal-pay')).toHaveCount(0);await expect(modal.locator('dl > div')).toHaveCount(4);
    expect(await modal.locator('dl').innerText()).not.toMatch(/Payment method|Amount due now|Simulation only|Phương thức thanh toán|Thanh toán ngay|Chỉ mô phỏng/);
    await shot(`simulation-vietqr-${width}-${lang}`,modal);await page.mouse.click(2,2);await expect(modal).not.toBeVisible();await expect(cta).toBeFocused();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);await expect(page.locator('.payment-confirmation')).toBeHidden();
    const editions=phase14?await runPhaseFourteenEditionChecks(page,products,width,lang,shot):undefined;
    checks.push({width,lang,detailsFont:sizes.details,toastSafe,simulationNeverConfirmed:true,editions});
  }
  // Explicit live capability fixture. It does not alter the shipped review configuration.
  expect(payments).toBe(0);
  await page.route('**/phase13-live*',route=>route.fulfill({contentType:'text/html',body:`<!doctype html><html><body><script type="module">
    import '/src/styles/tokens.css';import '/src/styles/base.css';import '/src/styles/checkout.css';import '/src/styles/configurator-steps.css';
    import {createOrderCompletion} from '/src/components/order-completion.js';import {createCheckoutStore} from '/src/checkout/checkout-store.js';import {createPaymentService} from '/src/checkout/payment-service.js';
    const cart={getItems:()=>[{id:'test-fixture',quantity:1,prices:{USD:10}}],subscribe:fn=>fn()};
    const configured=location.search.includes('error');
    const store=createCheckoutStore({cart,config:{paymentMode:'live'},service:createPaymentService(configured?{apiBase:'/api/checkout',methods:{card:true}}:{})});
    for(const [group,values]of Object.entries({customer:{fullName:'Test Buyer',email:'review@example.test',phone:'+358 91234567'},shipping:{address:'Test Address',cityProvince:'Test City'}}))for(const [key,value]of Object.entries(values))store.setField(group,key,value);store.selectCountry('VN');store.selectAmount('full');
    document.body.append(createOrderCompletion(store).element);
  </script></body></html>`}));
  await page.setViewportSize({width:1280,height:900});await page.goto('http://127.0.0.1:5178/phase13-live');for(const method of ['card','zalopay','bank_transfer'])await expect(choice(method)).toBeDisabled();await expect(cta).toBeHidden();
  await shot('production-live-capability-unavailable',page.locator('#order-payment'));
  expect(errors).toEqual([]);expect(failures).toEqual([]);
  await page.route('**/api/checkout/**',route=>route.fulfill({status:500,json:{message:'D1_ERROR: no such table: order_counters: SQLITE_ERROR'}}));
  await page.goto('http://127.0.0.1:5178/phase13-live?error');await choice('card').click();await cta.click();await modal.locator('.modal-pay').click();
  await expect(modal.locator('.simulation-note')).toHaveCount(0);
  await expect(modal.locator('.payment-form-error')).toHaveText("We couldn't start the payment. Please try again.");
  expect(await page.locator('body').innerText()).not.toMatch(/SQLITE|D1_ERROR|order_counters/);await expect(modal.locator('.field-error')).toHaveCount(0);
  await shot('test-fixture-technical-error-sanitized',modal);await modal.locator('.payment-modal-close').click();
  expect(errors).toEqual([]);expect(failures.every(url=>url.includes('/api/checkout'))).toBe(true);
  await writeFile(`${directory}/report.json`,JSON.stringify({status:'passed',mode:'simulation plus explicit live-capability fixture',checks,errors,expectedHTTPFailure:failures,simulationPaymentRequests:0,fixturePaymentRequests:payments,screenshots:shots},null,2));
  console.log(`Phase ${phase14?14:13} passed: ${checks.length} viewport/locale cases, ${shots.length} screenshots, zero simulation payment requests.`);
}finally{await browser?.close();server.kill();}
