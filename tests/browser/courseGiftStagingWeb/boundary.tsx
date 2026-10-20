import React, { useContext, useEffect, useState } from "react";
import { PreparedStagingCourseGiftWebBoundary } from "../../../src/components/courseGifts/PreparedStagingCourseGiftWebBoundary";
import { InternalCourseGiftWebContext } from "../../../src/components/courseGifts/CourseGiftWebScreen";

function Evidence({ children }: { children: React.ReactNode }) {
  const owner = useContext(InternalCourseGiftWebContext);
  const [redirects, setRedirects] = useState(0);
  useEffect(() => {
    const record = () => setRedirects((value) => value + 1);
    window.addEventListener("course-gift-fixture-checkout", record);
    return () => window.removeEventListener("course-gift-fixture-checkout", record);
  }, []);
  return (
    <>
      <section
        aria-label="Prepared staging wrapper evidence"
        style={{ padding: 12, border: "2px solid #22c55e", marginTop: 12 }}
      >
        <h2>Prepared staging wrapper — local connection check</h2>
        <p>
          Test-only loopback target substitution. Actual wrapper, sessions, quiet HTTP
          client and local backend. Not hosted acceptance.
        </p>
        <p>
          Private owner: {owner ? "connected" : "closed"}; route:{" "}
          {owner?.snapshot?.kind || "none"}; invitation:{" "}
          {owner?.snapshot?.hasInvitation ? "present" : "absent"}.
        </p>
        <p>
          External checkout redirects blocked: {redirects}. No provider navigation or real
          payment.
        </p>
        <button onClick={() => window.dispatchEvent(new Event("pagehide"))}>
          Close local gift binding
        </button>
      </section>
      {children}
    </>
  );
}

// Selected only by the dedicated Metro fixture resolver, never by src/app.
// Ignore the old local wrapper's storage/navigation props: use the actual new
// prepared wrapper, whose generated test context has the two documented seams.
export function InternalCourseGiftEntryBoundary({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <PreparedStagingCourseGiftWebBoundary>
      <Evidence>{children}</Evidence>
    </PreparedStagingCourseGiftWebBoundary>
  );
}
