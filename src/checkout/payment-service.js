export class PaymentServiceError extends Error {
  constructor(code) { super(code); this.code = code; }
}

// Backend owns catalogue repricing, idempotency, provider credentials and webhook verification.
export function createPaymentService({ apiBase = null, methods = {} } = {}, fetcher = globalThis.fetch) {
  async function request(path, body) {
    if (!apiBase) throw new PaymentServiceError('not_configured');
    const response = await fetcher(`${apiBase.replace(/\/$/, '')}${path}`, {
      method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin',
      headers: { Accept: 'application/json', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new PaymentServiceError('service_error');
    return response.json();
  }
  return {
    configured: Boolean(apiBase),
    capabilities: Object.fromEntries(['card', 'zalopay', 'bank_transfer'].map(method => [method, Boolean(apiBase) && methods[method] === true])),
    createOrderDraft: (draft, idempotencyKey) => request('/orders', { draft, idempotencyKey }),
    createPayment: (orderId, payment, idempotencyKey) => request(`/orders/${encodeURIComponent(orderId)}/payments`, { payment, idempotencyKey }),
    getPaymentStatus: (orderId, transactionId) => request(`/orders/${encodeURIComponent(orderId)}/payments/${encodeURIComponent(transactionId)}`),
    submitBankTransferReference: (orderId, transactionId, reference) => request(`/orders/${encodeURIComponent(orderId)}/payments/${encodeURIComponent(transactionId)}/reference`, { reference }),
  };
}

export function secureURL(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; } catch { return null; }
}

export function validatePaymentResponse(response, draft, transactionId = null) {
  if (!response || !['pending', 'awaiting_confirmation', 'confirmed', 'failed'].includes(response.status)
    || response.orderId !== draft.orderId || typeof response.transactionId !== 'string' || !response.transactionId
    || (transactionId && response.transactionId !== transactionId)
    || response.currency !== draft.currency || response.amountDueNow !== draft.payment.amountDueNow
    || (response.status === 'confirmed' && response.amountPaid !== draft.payment.amountDueNow)) {
    throw new PaymentServiceError('invalid_response');
  }
  return response;
}
