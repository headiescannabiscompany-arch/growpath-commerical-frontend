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

export function normalizeApiError(err: any): ApiError {
  // Already normalized
  if (err?.code && err?.message) return err as ApiError;

  // Backend returned error in { error: { code, message } } envelope
  if (err?.error?.code && err?.error?.message) {
    return {
      code: err.error.code as ApiErrorCode,
      message: err.error.message,
      status: err.status,
      details: err
    };
  }

  // Backend returned an error object with message
  if (err?.message) {
    return {
      code: "SERVER_ERROR",
      message: err.message,
      status: err.status,
      details: err
    };
  }

  // fetch network failures
  const msg = String(err?.message || "");
  if (msg.includes("Network request failed") || msg.includes("Failed to fetch")) {
    return { code: "NETWORK_ERROR", message: "Network error. Check your connection." };
  }

  return {
    code: "UNKNOWN",
    message: "Unexpected error.",
    status: err?.status,
    details: err
  };
}
