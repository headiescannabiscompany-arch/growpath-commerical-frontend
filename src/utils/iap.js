// IAP functionality disabled for development builds
// react-native-iap requires native modules that aren't compatible with Expo SDK 49

export const subscriptionSku = "growpath_pro_monthly";

export async function initIAP() {
  console.log("IAP: Not available in development build");
  return [];
}

export async function buySubscription() {
  console.log("IAP: Not available in development build");
  throw new Error("In-app purchases are not available in development builds. Use web-based Stripe checkout instead.");
}
