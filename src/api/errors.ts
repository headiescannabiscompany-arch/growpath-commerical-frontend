export type ApiErrorCode =
  | "INVALID_CREDENTIALS"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "SERVER_ERROR"
  | "NETWORK_ERROR"
  | "PARSE_ERROR"
  | "UNKNOWN";

export type ApiError = {
  code: ApiErrorCode;
  message: string;
  status?: number;
  details?: any;
};

export type NormalizeApiErrorOptions = {
  // request path (recommended). ex: "/api/auth/login"
  path?: string;
  // explicit override if you know it's a login/signup flow
  isAuthCredentialFlow?: boolean;
};

function isCredentialFlow(opts?: NormalizeApiErrorOptions) {
  if (opts?.isAuthCredentialFlow) return true;
  const p = String(opts?.path || "");
  return p.includes("/api/auth/login") || p.includes("/api/auth/signup");
}

export function normalizeApiError(err: any, opts?: NormalizeApiErrorOptions): ApiError {
  // fetch network failures (do this early)
  const msg = String(err?.message || "");
  if (msg.includes("Network request failed") || msg.includes("Failed to fetch")) {
    return { code: "NETWORK_ERROR", message: "Unable to reach the server." };
  }

  // Already normalized
  if (err?.code && err?.message) return err as ApiError;

  // Backend returned error in { error: { code, message } } envelope
  // Prefer backend code when it exists
  if (err?.error?.code && err?.error?.message) {
    const backendCode = String(err.error.code) as ApiErrorCode;
    const status = err.status;

    // Special-case: backend says UNAUTHENTICATED/UNAUTHORIZED and status is 401
    // Keep it as UNAUTHORIZED unless this is a credential flow
    if (status === 401) {
      if (isCredentialFlow(opts)) {
        return {
          code: "INVALID_CREDENTIALS",
          message: "Incorrect email or password",
          status: 401,
          details: err
        };
      }
      return {
        code: "UNAUTHORIZED",
        message: err.error.message || "Not authenticated",
        status: 401,
        details: err
      };
    }

    return {
      code: backendCode,
      message: err.error.message,
      status,
      details: err
    };
  }

  // Status-based mapping (when we don't have an error envelope)
  if (err?.status === 401) {
    if (isCredentialFlow(opts)) {
      return {
        code: "INVALID_CREDENTIALS",
        message: "Incorrect email or password",
        status: 401,
        details: err
      };
    }
    return {
      code: "UNAUTHORIZED",
      message: "Not authenticated",
      status: 401,
      details: err
    };
  }

  if (err?.status === 403) {
    return {
      code: "FORBIDDEN",
      message: err?.error?.message || err?.message || "Forbidden",
      status: 403,
      details: err
    };
  }

  if (err?.status === 404) {
    return {
      code: "NOT_FOUND",
      message: err?.error?.message || err?.message || "Not found",
      status: 404,
      details: err
    };
  }

  if (err?.status === 429) {
    return {
      code: "RATE_LIMITED",
      message: err?.error?.message || err?.message || "Too many requests",
      status: 429,
      details: err
    };
  }

  if (err?.status === 400) {
    return {
      code: "VALIDATION_ERROR",
      message: err?.error?.message || err?.message || "Invalid input",
      status: 400,
      details: err
    };
  }

  if (err?.status >= 500) {
    return {
      code: "SERVER_ERROR",
      message: err?.error?.message || err?.message || "Server error",
      status: err.status,
      details: err
    };
  }

  // Backend returned an error object with message
  if (err?.message) {
    return {
      code: "UNKNOWN",
      message: err.message,
      status: err.status,
      details: err
    };
  }

  return {
    code: "UNKNOWN",
    message: "Unexpected error.",
    status: err?.status,
    details: err
  };
}
