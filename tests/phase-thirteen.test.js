import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateCard, formatExpiry, paymentErrorMessage } from '../src/checkout/card-validation.js';
import { countries } from '../src/checkout/countries.js';
import { validateContact, restoreDraft, DRAFT_KEY } from '../src/checkout/order-draft.js';
import { createCheckoutStore } from '../src/checkout/checkout-store.js';
const valid = { number:'4111 1111 1111 1111', expiry:'12 / 28', cvv:'123' }, now = new Date(2026,8,20);
test('card required fields, numeric/Luhn validation, expiry bounds and CVV', () => {
  assert.deepEqual(validateCard(valid,now),{});
  for(const key of ['number','expiry','cvv']) assert.ok(validateCard({...valid,[key]:''},now)[key]);
  for(const number of ['4111111111111112','123','abcd4111111111111111','0000000000000000']) assert.ok(validateCard({...valid,number},now).number);
  for(const expiry of ['00 / 28','13 / 28','1 / 28','12 /','1228']) assert.equal(validateCard({...valid,expiry},now).expiry,'Enter a valid expiry date.');
  assert.equal(validateCard({...valid,expiry:'08 / 26'},now).expiry,'This card has expired.');
  assert.equal(validateCard({...valid,expiry:'09 / 26'},now).expiry,undefined);
  for(const cvv of ['12','12345','12a']) assert.ok(validateCard({...valid,cvv},now).cvv);
  assert.equal(validateCard({...valid,cvv:'1234'},now).cvv,undefined); assert.equal(formatExpiry('1228'),'12 / 28');
});
test('customer-safe error mapping never exposes arbitrary service details', () => {
  for(const code of ['D1_ERROR: no such table: order_counters: SQLITE_ERROR','stack trace','provider payload','service_error']) assert.equal(paymentErrorMessage(code),"We couldn't start the payment. Please try again.");
});
const customer={fullName:"Nguyễn O’Neil-Smith",company:'',email:'buyer@example.test',phone:'+358 (9) 123-4567'};
const shipping={address:"#4 / 2 Nguyễn Trãi, Apt. B",cityProvince:'Hồ Chí Minh',country:'Vietnam',countryCode:'VN'};
test('Unicode contact and international addresses; country identity cannot be arbitrary',()=>{
  assert.deepEqual(validateContact(customer,shipping),{}); assert.equal(countries.length,249); assert.equal(new Set(countries.map(c=>c.code)).size,249);
  for(const value of ['', '!!']) assert.ok(validateContact({...customer,fullName:value},shipping).fullName);
  for(const key of ['address','cityProvince','country']) assert.ok(validateContact(customer,{...shipping,[key]:''})[key]);
  assert.ok(validateContact(customer,{...shipping,country:'Arbitrary land'}).country);
  assert.ok(validateContact(customer,{...shipping,countryCode:'XX'}).country);
  assert.ok(validateContact(customer,{...shipping,countryCode:''}).country);
});
test('legacy known country migrates; unknown saved country stays invalid',()=>{
  const restore = country => restoreDraft({getItem:()=>JSON.stringify({customer,shipping:{...shipping,country,countryCode:''}})});
  assert.equal(restore('United Kingdom').shipping.countryCode,'GB'); assert.ok(validateContact(customer,restore('unknown').shipping).country);
});
test('simulation enables UI but never calls live service, confirms, persists card details or emits success',async()=>{
  let observer, calls=0; const saved=new Map(), events=[];
  const item={id:'real-test-id',quantity:1,prices:{USD:24},display_name:'Test',dimensions:'test',edition:'Standard'};
  const cart={getItems:()=>[item],subscribe:fn=>{observer=fn;fn();}};
  const service={configured:true,capabilities:{card:true},createOrderDraft:()=>{calls++;throw Error('must not call');}};
  const storage={getItem:key=>saved.get(key),setItem:(key,value)=>saved.set(key,value),removeItem:key=>saved.delete(key)};
  const store=createCheckoutStore({cart,storage,config:{paymentMode:'simulation'},service,onEvent:event=>events.push(event)});
  for(const [group,fields] of Object.entries({customer,shipping})) for(const [key,value] of Object.entries(fields)) store.setField(group,key,value);
  store.selectAmount('deposit');
  for(const method of ['card','zalopay','bank_transfer']) {store.selectMethod(method);assert.equal(store.getState().canPay,true);await store.startPayment(); assert.equal(store.getState().order.payment.status,'idle');assert.equal(store.getState().order.payment.amountPaid,null);assert.match(store.getState().simulationStatus,/pending|awaiting_confirmation/);}
  assert.equal(calls,0);assert.deepEqual(events,[]);assert.equal(JSON.parse(saved.get(DRAFT_KEY)).shipping.countryCode,'VN');
  assert.doesNotMatch([...saved.values()].join(),/4111|cvv|cardNumber|confirmed/);
  store.selectMethod('card');const pending=store.startPayment();observer();await pending;assert.equal(store.getState().simulationStatus,'idle');
});
