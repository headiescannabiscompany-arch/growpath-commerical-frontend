/**
 * backend/utils/errors.js
 *
 * Canonical error helper for API responses.
 * Pass to next(err) in middleware, or return res.status().json(err) in handlers.
 */

/**
 * Create a standardized error object.
 *
 * @param {string} code - Error code (e.g., "AUTH_REQUIRED", "VALIDATION_ERROR")
 * @param {string} message - Human-readable message
 * @param {number} statusCode - HTTP status (default: 400)
 * @returns {Error} Error with .code and .statusCode properties
 */
function apiError(code, message, statusCode = 400) {
  const err = new Error(message || code);
  err.code = code;
  err.statusCode = statusCode;
  err.isApiError = true;
  return err;
}

/**
 * Express error handler middleware.
 * Place this LAST in your app.use() chain.
 *
 * Usage in app.js:
 *   app.use(errorHandler);
 */
function errorHandler(err, req, res, next) {
  const isApiError = err?.isApiError === true;
  const code = err?.code || "INTERNAL_ERROR";
  const statusCode = err?.statusCode || 500;
  const message = err?.message || "Internal server error";

  // Log non-API errors for debugging
  if (!isApiError && statusCode >= 500) {
    console.error("[ERROR]", code, message, err?.stack || "");
  }

  return res.status(statusCode).json({
    success: false,
    data: null,
    error: {
      code,
      message
    }
  });
}

module.exports = {
  apiError,
  errorHandler
};
