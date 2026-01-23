// src/navigation/filterRegistry.js
// Centralized registry filter for tabs/pages

export function filterRegistry(registry, user, caps, showAll = false) {
  // DEV override: show all tabs for OWNER/ADMIN/PRO in dev
  if (
    typeof __DEV__ !== "undefined" &&
    __DEV__ &&
    (user?.role === "OWNER" || user?.role === "ADMIN" || user?.plan === "PRO")
  ) {
    return registry;
  }
  if (showAll) return registry;
  return registry.filter((page) => {
    // Admin bypass
    if (caps?.isAdmin) return true;
    // Mode gating (optional)
    if (Array.isArray(page.modes) && page.modes.length > 0) {
      if (!page.modes.includes(caps.mode)) return false;
    }
    // Capability gating
    const req = page.requires || [];
    for (const capKey of req) {
      if (!caps?.[capKey]) return false;
    }
    return true;
  });
}
