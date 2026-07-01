import { config } from "@/config/config";

let initialized = false;
let sentryModule: typeof import("@sentry/react-native") | null = null;

export function initMonitoring() {
  if (initialized) return getMonitoringStatus();
  initialized = true;

  if (!config.sentryDsn) return getMonitoringStatus();

  try {
    // Keep the dependency isolated so local/test builds without a DSN stay inert.
    sentryModule = require("@sentry/react-native");
    sentryModule?.init({
      dsn: config.sentryDsn,
      environment: config.env,
      enableAutoSessionTracking: true,
      tracesSampleRate: 0
    });
  } catch (err) {
    sentryModule = null;
    if (process.env.NODE_ENV !== "production") {
      console.warn("[monitoring] failed to initialize", err);
    }
  }

  return getMonitoringStatus();
}

export function captureException(error: unknown, context: Record<string, unknown> = {}) {
  if (!sentryModule) return false;

  try {
    sentryModule.withScope((scope) => {
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
      sentryModule?.captureException(error);
    });
    return true;
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[monitoring] failed to capture exception", err);
    }
    return false;
  }
}

export function wrapWithMonitoring<T>(component: T): T {
  if (!sentryModule?.wrap) return component;
  return sentryModule.wrap(component as any) as T;
}

export function getMonitoringStatus() {
  return {
    initialized,
    enabled: Boolean(sentryModule),
    provider: sentryModule ? "sentry" : "none"
  };
}
