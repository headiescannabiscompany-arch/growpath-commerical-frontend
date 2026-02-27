// src/utils/serverErrorTelemetry.ts

export function logServerError(
  err: { code: string; message: string; status: number | null; requestId: string | null },
  extra?: any
) {
  // Replace with Sentry, PostHog, Segment, etc.
  // Keep it lightweight and non-blocking.
  console.error("[API_SERVER_ERROR]", {
    code: err.code,
    message: err.message,
    status: err.status,
    requestId: err.requestId,
    extra: extra ?? null
  });
}
