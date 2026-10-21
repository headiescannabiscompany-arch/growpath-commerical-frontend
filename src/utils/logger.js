// Production-safe console replacement
import { privateSafeConsole } from "./courseGiftDiagnosticPrivacy";
// In production builds, console.logs are removed automatically by Metro bundler
// but we provide safe wrappers for development debugging

const isDev = __DEV__;

export const logger = {
  log: (...args) => {
    if (isDev) {
      privateSafeConsole("log", ...args);
    }
  },
  warn: (...args) => {
    if (isDev) {
      privateSafeConsole("warn", ...args);
    }
  },
  error: (...args) => {
    // Always log errors, even in production
    privateSafeConsole("error", ...args);
  },
  info: (...args) => {
    if (isDev) {
      privateSafeConsole("info", ...args);
    }
  }
};

export default logger;
