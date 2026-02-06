import type { ApiError } from "../api/errors";

type Handlers = {
  onAuthRequired: () => void; // logout + navigate to login
  onFacilityDenied: () => void; // show "no access" screen
  toast: (msg: string) => void;
};

export function handleApiError(err: any, h: Handlers) {
  const e = err as ApiError;

  switch (e?.code) {
    case "AUTH_REQUIRED":
      h.onAuthRequired();
      return;

    case "FACILITY_ACCESS_DENIED":
      h.onFacilityDenied();
      return;

    case "ROLE_NOT_ALLOWED":
      h.toast("You don’t have permission to do that.");
      return;

    case "NOT_FOUND":
      h.toast("Not found.");
      return;

    case "RATE_LIMITED":
      h.toast("Rate limited. Try again in a moment.");
      return;

    default:
      h.toast(e?.message || "Something went wrong.");
      return;
  }
}
