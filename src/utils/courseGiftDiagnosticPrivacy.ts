// Diagnostic-only policy, not routing, authentication or analytics consent.
// No secret registry, URL persistence, mutation or custom getter/toJSON execution.
// Some engines expose Error.stack through a built-in accessor rather than data.
const engineStackGetter = Object.getOwnPropertyDescriptor(new Error(), "stack")?.get;
// An internal support panel can live under a generic Admin URL. Hold suppression
// before mounting its private children; retain no candidate, URL or consent data.
let privatePanelScopes = 0;
export function enterCourseGiftDiagnosticScope(): () => void {
  privatePanelScopes += 1;
  let active = true;
  return () => {
    if (!active) return;
    active = false;
    privatePanelScopes -= 1;
  };
}
function privateText(value: string): boolean {
  if (value.length > 32768) return true;
  let decoded = value;
  for (let depth = 0; depth < 6; depth += 1) {
    if (
      /course[-_ ]?gifts?|claim-course-gift|claimToken|checkoutAttemptId/i.test(
        decoded
      ) ||
      /[a-f0-9]{64}/i.test(decoded)
    )
      return true;
    const next = decoded.replace(/%([a-f0-9]{2})/gi, (_match, hex) =>
      String.fromCharCode(parseInt(hex, 16))
    );
    if (next === decoded) return false;
    decoded = next;
  }
  // Cannot safely classify unusually deep encoding within this bounded budget.
  return true;
}

export function containsCourseGiftDiagnostic(value: unknown): boolean {
  const seen = new WeakSet<object>();
  let remaining = 1000;
  function inspect(item: unknown, depth: number): boolean {
    if (--remaining < 0 || depth > 12) return true;
    if (typeof item === "string") return privateText(item);
    if (!item || typeof item !== "object") return false;
    if (seen.has(item)) return false;
    seen.add(item);
    const descriptors = Object.getOwnPropertyDescriptors(item);
    const safeEngineStack =
      !!engineStackGetter &&
      item instanceof Error &&
      descriptors.stack?.get === engineStackGetter;
    if (safeEngineStack) {
      // Engine stack formatting reads name/message; don't invoke supplied
      // accessors on these properties, including on an Error subclass.
      let proto: object | null = item;
      for (let level = 0; proto; level += 1, proto = Object.getPrototypeOf(proto)) {
        if (level > 6) return true;
        for (const field of ["name", "message"]) {
          const descriptor = Object.getOwnPropertyDescriptor(proto, field);
          if (descriptor?.get || descriptor?.set) return true;
        }
      }
    }
    for (const key of Reflect.ownKeys(descriptors)) {
      const descriptor = (descriptors as any)[key];
      if ((descriptor.get || descriptor.set) && !(safeEngineStack && key === "stack"))
        return true;
    }
    for (const key of Reflect.ownKeys(descriptors)) {
      if (typeof key === "string" && privateText(key)) return true;
      const descriptor = (descriptors as any)[key];
      // Accessors and unexpected proxies are not safe diagnostic payloads.
      if (!descriptor || (key === "toJSON" && typeof descriptor.value === "function"))
        return true;
      const value =
        safeEngineStack && key === "stack"
          ? engineStackGetter!.call(item)
          : descriptor.value;
      if (inspect(value, depth + 1)) return true;
    }
    return false;
  }
  try {
    return inspect(value, 0);
  } catch {
    return true;
  }
}

export function suppressCourseGiftDiagnostic(...values: unknown[]): boolean {
  try {
    if (privatePanelScopes > 0) return true;
    // Evaluated on every capture/hook, including before React mounts or scrubs a
    // fragment. No token is extracted or retained; native remains a separate gate.
    if (typeof window !== "undefined" && privateText(window.location.href)) return true;
    return values.some(containsCourseGiftDiagnostic);
  } catch {
    return true;
  }
}

export function filterCourseGiftDiagnostic<T>(value: T, hint?: unknown): T | null {
  return suppressCourseGiftDiagnostic(value, hint) ? null : value;
}

export function privateSafeConsole(
  level: "log" | "warn" | "error" | "info",
  ...values: unknown[]
): boolean {
  if (suppressCourseGiftDiagnostic(...values)) return false;
  console[level](...values);
  return true;
}

export const PRIVATE_PAGE_ERROR =
  "This private page is unavailable. Go back and try again.";
