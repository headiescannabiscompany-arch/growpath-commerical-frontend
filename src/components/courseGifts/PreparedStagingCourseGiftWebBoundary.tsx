import React, { useLayoutEffect, useState } from "react";
import { createStagingCourseGiftWebContextInternal } from "@/utils/courseGiftStagingWebContext";
import { InternalCourseGiftScopedEntryBoundary } from "./CourseGiftCourseEntry";
import { InternalCourseGiftTransportContext } from "./CourseGiftTransportContext";

type Context = ReturnType<typeof createStagingCourseGiftWebContextInternal>;
function prepare(): Context | null {
  try {
    return createStagingCourseGiftWebContextInternal();
  } catch {
    return null;
  }
}

/** Selected by the staging candidate's ordinary root. The existing exact
 * website/API/platform guards keep production, native and unknown targets inert.
 * Local selection is not a deployment or server/provider activation. No public
 * env/query/account toggle, new auth store or alternate payment engine.
 */
export function PreparedStagingCourseGiftWebBoundary({
  children
}: {
  children: React.ReactNode;
}) {
  // Select synchronously so the existing private-route screen cannot scrub an
  // invitation as "unreleased" before its continuation owner mounts.
  const [context, setContext] = useState<Context | null>(prepare);
  useLayoutEffect(() => {
    let current = context;
    try {
      current?.assertCurrent();
    } catch {
      // React Strict Mode may replay setup after cleanup. Fresh context only;
      // never reopen the closed one or carry its outstanding work forward.
      current = prepare();
      setContext(current);
    }
    if (!current) return;
    const mounted = current;
    // Leaving the document (including bfcache) cancels pending gift operations.
    // Returning requires a fresh page; no automatic retries or recovery sends.
    const hide = () => {
      mounted.close();
      setContext(null);
    };
    window.addEventListener("pagehide", hide);
    return () => {
      window.removeEventListener("pagehide", hide);
      mounted.close();
    };
  }, []);
  if (!context) return <>{children}</>;
  try {
    context.assertCurrent();
  } catch {
    return <>{children}</>;
  }
  return (
    <InternalCourseGiftTransportContext.Provider value={context.invoke}>
      <InternalCourseGiftScopedEntryBoundary
        storage={context.storage}
        newRequestId={context.newRequestId}
        onNavigateToCheckout={context.onNavigateToCheckout}
      >
        {children}
      </InternalCourseGiftScopedEntryBoundary>
    </InternalCourseGiftTransportContext.Provider>
  );
}
