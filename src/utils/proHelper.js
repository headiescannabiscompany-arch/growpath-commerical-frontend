export const requireCapabilityAccess = (navigation, hasAccess, action) => {
  if (!hasAccess) {
    navigation.navigate("Paywall");
    return false;
  }
  action();
  return true;
};

export const isAccessDeniedError = (error) => {
  const status =
    error?.status || error?.response?.status || error?.response?.data?.status;
  return status === 403;
};

export const handleApiError = (error, navigation) => {
  if (isAccessDeniedError(error)) {
    navigation.navigate("Paywall");
    return true;
  }
  return false;
};

if (typeof module !== "undefined") {
  module.exports = {
    requireCapabilityAccess,
    isAccessDeniedError,
    handleApiError
  };
}
