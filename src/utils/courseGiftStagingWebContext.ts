import { Platform } from "react-native";
import { API_URL } from "@/api/apiRequest";
import { invokeCourseGiftHttp } from "@/api/courseGiftHttp";
import { CourseGiftClientError } from "@/api/courseGiftClient";
import { safeGiftCheckoutUrl } from "@/api/courseGiftSaleContract";

const WEB = "https://growpath-web-staging.onrender.com";
const API = "https://growpath-api-staging.onrender.com";
const unavailable = () => new CourseGiftClientError("COURSE_GIFT_STAGING_UNAVAILABLE");

/** Code-selected staging composition only. Construction makes no request, reads
 * no credentials/storage, and cannot enable ordinary routes or a backend.
 * Origin checks are routing safeguards, NOT authentication/provider authority.
 */
export function createStagingCourseGiftWebContextInternal() {
  const browser = typeof window === "undefined" ? null : window;
  let closed = false;
  const active = new Set<AbortController>();
  function close() {
    closed = true;
    for (const controller of active) controller.abort();
    active.clear();
  }
  function assertCurrent() {
    if (
      closed ||
      !browser ||
      typeof window === "undefined" ||
      window !== browser ||
      Platform.OS !== "web" ||
      browser.location.origin !== WEB ||
      API_URL !== API
    ) {
      close();
      throw unavailable();
    }
  }
  assertCurrent();
  const invoke: typeof invokeCourseGiftHttp = async (request) => {
    assertCurrent();
    if (request.signal.aborted)
      throw new CourseGiftClientError("COURSE_GIFT_REQUEST_CANCELED");
    const controller = new AbortController();
    const abort = () => controller.abort();
    request.signal.addEventListener("abort", abort, { once: true });
    active.add(controller);
    try {
      const result = await invokeCourseGiftHttp({
        ...request,
        signal: controller.signal
      });
      assertCurrent();
      if (controller.signal.aborted)
        throw new CourseGiftClientError("COURSE_GIFT_REQUEST_CANCELED");
      return result;
    } finally {
      request.signal.removeEventListener("abort", abort);
      active.delete(controller);
    }
  };
  return Object.freeze({
    assertCurrent,
    invoke,
    close,
    storage: Object.freeze({
      getItem(key: string) {
        assertCurrent();
        return browser!.sessionStorage.getItem(key);
      },
      setItem(key: string, value: string) {
        assertCurrent();
        browser!.sessionStorage.setItem(key, value);
      }
    }),
    newRequestId() {
      assertCurrent();
      return browser!.crypto.randomUUID();
    },
    onNavigateToCheckout(url: string) {
      assertCurrent();
      if (!safeGiftCheckoutUrl(url)) throw unavailable();
      browser!.location.assign(url);
    }
  });
}
