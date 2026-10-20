import { config } from "@/config/config";
import {
  filterCourseGiftDiagnostic,
  suppressCourseGiftDiagnostic
} from "./courseGiftDiagnosticPrivacy";

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
      tracesSampleRate: 0,
      beforeSend: filterCourseGiftDiagnostic,
      beforeSendTransaction: filterCourseGiftDiagnostic,
      // The breadcrumb is the outgoing payload. DOM/request hint objects aren't
      // serialized and may contain getters; don't inspect unrelated live objects.
      beforeBreadcrumb: (breadcrumb) => filterCourseGiftDiagnostic(breadcrumb),
      beforeSendLog: filterCourseGiftDiagnostic
    });
  } catch (err) {
    sentryModule = null;
    if (process.env.NODE_ENV !== "production") {
      console.warn("[monitoring] failed to initialize");
    }
  }

  return getMonitoringStatus();
}

export function captureException(error: unknown, context: Record<string, unknown> = {}) {
  if (!sentryModule || suppressCourseGiftDiagnostic(error, context)) return false;

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
      console.warn("[monitoring] failed to capture exception");
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
