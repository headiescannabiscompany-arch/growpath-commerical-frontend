type ToastLike = {
  toast?: (opts: { title?: string; message?: string; type?: string }) => void;
};

type Handlers = {
  ui?: ToastLike;
};

let handlers: Handlers | null = null;

export function setApiErrorHandlers(next: Handlers) {
  handlers = next || null;
}

export function handleApiError(err: any, fallbackMessage = "Something went wrong.") {
  const message =
    err?.message || err?.error?.message || err?.error?.code || fallbackMessage;

  // Try toast if present
  try {
    const t = handlers?.ui?.toast;
    if (typeof t === "function") {
      t({ title: "Error", message, type: "error" });
      return message;
    }
  } catch {
    // ignore
  }

  // eslint-disable-next-line no-console
  console.error("[API ERROR]", err);

  return message;
}
type ToastLike = {
  toast?: (opts: { title?: string; message?: string; type?: string }) => void;
};

type Handlers = {
  ui?: ToastLike;
};

let handlers: Handlers | null = null;

export function setApiErrorHandlers(next: Handlers) {
  handlers = next || null;
}

export function handleApiError(err: any, fallbackMessage = "Something went wrong.") {
  const message =
    err?.message || err?.error?.message || err?.error?.code || fallbackMessage;

  try {
    const t = handlers?.ui?.toast;
    if (typeof t === "function") {
      t({ title: "Error", message, type: "error" });
      return message;
    }
  } catch {
    // ignore
  }

  // eslint-disable-next-line no-console
  console.error("[API ERROR]", err);

  return message;
}
import type { ApiError } from "../api/errors";
import { Alert } from "react-native";

type Handlers = {
  onAuthRequired?: () => void; // logout + navigate to login
  onFacilityDenied?: () => void; // show "no access" screen
  toast?: (msg: string) => void;
};

const defaultHandlers: Handlers = {
  onAuthRequired: () => Alert.alert("Auth Required", "Please log in again."),
  onFacilityDenied: () =>
    Alert.alert("Access Denied", "You don't have access to this facility."),
  toast: (msg: string) => Alert.alert("Info", msg)
};

export function handleApiError(err: any, h?: Handlers) {
  const handlers = { ...defaultHandlers, ...h };
  const e = err as ApiError;

  switch (e?.code) {
    case "AUTH_REQUIRED":
      handlers.onAuthRequired?.();
      return;

    case "FACILITY_ACCESS_DENIED":
      handlers.onFacilityDenied?.();
      return;

    case "ROLE_NOT_ALLOWED":
      handlers.toast?.("You don’t have permission to do that.");
      return;

    case "NOT_FOUND":
      handlers.toast?.("Not found.");
      return;

    case "RATE_LIMITED":
      handlers.toast?.("Rate limited. Try again in a moment.");
      return;

    default:
      handlers.toast?.(e?.message || "Something went wrong.");
      return;
  }
}
