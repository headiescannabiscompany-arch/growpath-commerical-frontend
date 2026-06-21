// src/navigation/filterRegistry.js
// Centralized registry filter for tabs/pages

export function filterRegistry(registry, _user, caps, showAll = false) {
  if (showAll) return registry;
  return registry.filter((page) => {
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
