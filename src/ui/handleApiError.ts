import type { ApiError } from "@/api/errors";

type ToastLike = {
  toast?: (opts: { title?: string; message?: string; type?: string }) => void;
};

type Handlers = {
  ui?: ToastLike;
  onAuthRequired?: () => void;
  onFacilityDenied?: () => void;
};

let handlers: Handlers | null = null;

export function setApiErrorHandlers(next: Handlers) {
  handlers = next || null;
}

function bestMessage(err: any, fallback: string) {
  return (
    err?.message ||
    err?.error?.message ||
    err?.error?.code ||
    err?.code ||
    fallback
  );
}

export function handleApiError(err: any, fallbackMessage = "Something went wrong.") {
  // Never crash, ever.
  try {
    const e = err as ApiError | any;

    // Optional routing hooks
    if (e?.code === "AUTH_REQUIRED") {
      handlers?.onAuthRequired?.();
    } else if (e?.code === "FACILITY_ACCESS_DENIED") {
      handlers?.onFacilityDenied?.();
    }

    const message = bestMessage(e, fallbackMessage);

    // Optional toast
    const toast = handlers?.ui?.toast;
    if (typeof toast === "function") {
      toast({ title: "Error", message, type: "error" });
      return message;
    }

    // Dev visibility, no UI dependency
    // eslint-disable-next-line no-console
    console.error("[API ERROR]", e);

    return message;
  } catch (crashErr) {
    // eslint-disable-next-line no-console
    console.error("[API ERROR] handleApiError crashed", crashErr, err);
    return fallbackMessage;
  }
}
