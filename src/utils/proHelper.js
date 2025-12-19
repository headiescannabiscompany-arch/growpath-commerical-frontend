// Frontend utility for PRO feature gating
// Call this before executing PRO-only actions

export const requirePro = (navigation, isPro, action) => {
  if (!isPro) {
    navigation.navigate("Paywall");
    return;
  }
  action();
};

// Check if error is 403 PRO-required response
export const isPro403Error = (error) => {
  const status = error?.status ?? error?.response?.status;
  const message = error?.data?.message ?? error?.response?.data?.message;
  return status === 403 && typeof message === "string" && message.includes("PRO");
};

// Handle API errors with automatic paywall redirect
export const handleApiError = (error, navigation) => {
  if (isPro403Error(error)) {
    navigation.navigate("Paywall");
    return true; // Handled
  }
  return false; // Not handled, let caller handle
};

// CommonJS export for Node-based tests.
if (typeof module !== "undefined") {
  module.exports = { requirePro, isPro403Error, handleApiError };
}
