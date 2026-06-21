export type ApiErrorLike = {
  ok?: false;
  status: number | null;
  code: string;
  message: string;
  requestId: string | null;
};

export type ErrorAction =
  | { kind: "toast"; title?: string; message: string }
  | { kind: "auth/logout"; reason?: string }
  | { kind: "nav/replace"; href: string }
  | { kind: "none" };

export function mapApiErrorToAction(err: ApiErrorLike): ErrorAction {
  if (err.code === "UNAUTHENTICATED" || err.status === 401) {
    return { kind: "auth/logout", reason: "Session expired" };
  }

  if (err.code === "FORBIDDEN" || err.status === 403) {
    return {
      kind: "toast",
      title: "Permission denied",
      message: err.message || "You don't have permission to do that."
    };
  }

  if (err.code === "BAD_REQUEST" || err.status === 400) {
    return {
      kind: "toast",
      title: "Check your input",
      message: err.message || "Invalid request."
    };
  }

  if (err.code === "NOT_FOUND" || err.status === 404) {
    return {
      kind: "toast",
      title: "Not found",
      message: err.message || "That resource doesn't exist (or was removed)."
    };
  }

  if ((err.status ?? 0) >= 500 || err.code === "INTERNAL_ERROR") {
    const suffix = err.requestId ? ` (ref: ${err.requestId})` : "";
    return {
      kind: "toast",
      title: "Server error",
      message: `Something went wrong on our side.${suffix}`
    };
  }

  return {
    kind: "toast",
    title: "Error",
    message: err.message || "Something went wrong."
  };
}
