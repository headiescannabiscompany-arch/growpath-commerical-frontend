import client from "./client.js";
import ROUTES from "./routes.js";
import { handleApiError } from "../utils/proHelper";

export async function getCommercialBillingSummary(token, navigation) {
  try {
    return await client.get(ROUTES.COMMERCIAL_BILLING.SUMMARY, token);
  } catch (error) {
    if (handleApiError(error, navigation)) return;
    if (error.status === 401) {
      // Optionally navigate to login or show auth error
      if (navigation) navigation.navigate && navigation.navigate("Login");
    }
    throw error;
  }
}

export async function listCommercialInvoices(token, navigation) {
  try {
    return await client.get(ROUTES.COMMERCIAL_BILLING.INVOICES, token);
  } catch (error) {
    if (handleApiError(error, navigation)) return;
    if (error.status === 401) {
      if (navigation) navigation.navigate && navigation.navigate("Login");
    }
    throw error;
  }
}

export async function retryCommercialInvoice(invoiceId, token, navigation) {
  try {
    return await client.post(
      ROUTES.COMMERCIAL_BILLING.RETRY_PAYMENT(invoiceId),
      {},
      token
    );
  } catch (error) {
    if (handleApiError(error, navigation)) return;
    if (error.status === 401) {
      if (navigation) navigation.navigate && navigation.navigate("Login");
    }
    throw error;
  }
}

export async function updateCommercialPaymentMethod(token, navigation) {
  try {
    return await client.post(ROUTES.COMMERCIAL_BILLING.UPDATE_PAYMENT_METHOD, {}, token);
  } catch (error) {
    if (handleApiError(error, navigation)) return;
    if (error.status === 401) {
      if (navigation) navigation.navigate && navigation.navigate("Login");
    }
    throw error;
  }
}
