// Public configuration only. Approved checkout deposit amounts: US$5 for USD and 130,000 VND for VND.
// Never put merchant secrets or provider keys in browser configuration.
export const checkoutConfig = Object.freeze({
  paymentMode: 'simulation',
  depositUSD: 5,
  depositVND: 130000,
  apiBase: null,
  // Enable each method only after its backend/provider integration is ready.
  methods: Object.freeze({ card: false, zalopay: false, bank_transfer: false }),
});
