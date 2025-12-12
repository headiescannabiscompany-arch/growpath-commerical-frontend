// Frontend utility for PRO feature gating
// Call this before executing PRO-only actions

export const requirePro = (navigation, isPro, action) => {
  if (!isPro) {
    navigation.navigate('Paywall');
    return;
  }
  action();
};

// Check if error is 403 PRO-required response
export const isPro403Error = (error) => {
  return error.response?.status === 403 && 
         error.response?.data?.message?.includes('PRO');
};

// Handle API errors with automatic paywall redirect
export const handleApiError = (error, navigation) => {
  if (isPro403Error(error)) {
    navigation.navigate('Paywall');
    return true; // Handled
  }
  return false; // Not handled, let caller handle
};
