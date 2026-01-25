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
  const status =
    error?.status || error?.response?.status || error?.response?.data?.status;

  if (status === 403) return true;

  const msg = error?.message || error?.response?.data?.message || "";

  return /pro subscription required/i.test(msg);
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
