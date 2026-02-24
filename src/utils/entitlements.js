/**
 * Legacy test-compat shim.
 * Canonical entitlement logic now lives under src/entitlements/.
 */
export function getEntitlements(user = {}) {
  const plan = String(user?.plan || user?.subscriptionStatus || "free").toLowerCase();
  const guilds = Array.isArray(user?.guilds) ? user.guilds : [];
  const isPro = plan === "pro" || plan === "paid";
  const isEntitled = isPro || guilds.length > 0;

  return {
    isPro,
    isEntitled
  };
}
