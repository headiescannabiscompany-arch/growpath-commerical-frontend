import client from "./client.js";
import ROUTES from "./routes.js";

export function getCommercialBillingSummary(token) {
  return client.get(ROUTES.COMMERCIAL_BILLING.SUMMARY, token);
}

export function listCommercialInvoices(token) {
  return client.get(ROUTES.COMMERCIAL_BILLING.INVOICES, token);
}

export function retryCommercialInvoice(invoiceId, token) {
  return client.post(ROUTES.COMMERCIAL_BILLING.RETRY_PAYMENT(invoiceId), {}, token);
}

export function updateCommercialPaymentMethod(token) {
  return client.post(ROUTES.COMMERCIAL_BILLING.UPDATE_PAYMENT_METHOD, {}, token);
}
