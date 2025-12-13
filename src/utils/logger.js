// Production-safe console replacement
// In production builds, console.logs are removed automatically by Metro bundler
// but we provide safe wrappers for development debugging

const isDev = __DEV__;

export const logger = {
  log: (...args) => {
    if (isDev) {
      console.log(...args);
    }
  },
  warn: (...args) => {
    if (isDev) {
      console.warn(...args);
    }
  },
  error: (...args) => {
    // Always log errors, even in production
    console.error(...args);
  },
  info: (...args) => {
    if (isDev) {
      console.info(...args);
    }
  }
};

export default logger;
