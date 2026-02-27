import { mapApiErrorToAction, type ApiErrorLike } from "@/utils/errorActions";
import { logServerError } from "@/utils/serverErrorTelemetry";

// Deps: Provide these from your app layer
export type Deps = {
  showToast?: (title: string | undefined, message: string) => void;
  logout?: (reason?: string) => void;
  navigateReplace?: (href: string) => void;
};

export function handleApiError(err: ApiErrorLike, deps: Deps = {}) {
  // Telemetry: only server-side errors
  if ((err.status ?? 0) >= 500 || err.code === "INTERNAL_ERROR") {
    logServerError(err);
  }

  const action = mapApiErrorToAction(err);

  switch (action.kind) {
    case "auth/logout":
      deps.logout?.(action.reason);
      return action;

    case "nav/replace":
      deps.navigateReplace?.(action.href);
      return action;

    case "toast":
      deps.showToast?.(action.title, action.message);
      return action;

    case "none":
    default:
      return action;
  }
}
