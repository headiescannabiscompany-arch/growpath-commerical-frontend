import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ExpoRoot,
  Slot,
  useLocalSearchParams,
  usePathname,
  useRouter
} from "expo-router";
import ClosedBoundary from "../../../src/components/courseGifts/CourseGiftWebBoundary";
import { InternalCourseGiftEntryBoundary } from "../../../src/components/courseGifts/CourseGiftCourseEntry";
import CourseDetailScreen from "../../../src/screens/CourseDetailScreen";
import CommercialRoute from "../../../src/app/home/commercial/courses/[courseId]";
import { suppressCourseGiftDiagnostic } from "../../../src/utils/courseGiftDiagnosticPrivacy";
import { FixtureAuthProvider, useFixtureAuth } from "../courseGiftHost/auth";
import {
  COURSE,
  COMMERCIAL,
  ORIGINAL,
  FINGERPRINT,
  newId,
  inspect,
  subscribe
} from "./seams";

// Development-only Metro bundle; no source gate rewritten. Browser network is
// additionally denied by CSP; all API imports resolve to the synthetic seams.
if (!["127.0.0.1", "localhost"].includes(window.location.hostname))
  throw Error("Loopback only");
process.env.NODE_ENV = "test";
// Bounded local render diagnostics only: keep the original error and report its
// component owners, never props, browser storage, identity or form contents.
const originalConsoleError = console.error;
let reportedTextOwner = false;
console.error = (...args: unknown[]) => {
  originalConsoleError(...args);
  if (!reportedTextOwner && String(args[0]).startsWith("Unexpected text node:")) {
    reportedTextOwner = true;
    console.warn("Local text-node owner:", React.captureOwnerStack?.());
  }
};
const forbiddenNetwork = () => {
  throw Error("Network forbidden in entry fixture");
};
window.fetch = forbiddenNetwork as any;
window.XMLHttpRequest = class {
  constructor() {
    forbiddenNetwork();
  }
} as any;
window.WebSocket = class {
  constructor() {
    forbiddenNetwork();
  }
} as any;
function Layout() {
  const router = useRouter(),
    pathname = usePathname();
  const { identity, setIdentity } = useFixtureAuth();
  const [internal, setInternal] = useState(true),
    [state, setState] = useState(inspect);
  const [evidence, setEvidence] = useState("");
  useEffect(() => subscribe(() => setState(inspect())), []);
  const boundaryProps = {
    storage: window.sessionStorage,
    newRequestId: newId,
    onNavigateToCheckout: () => {
      throw Error("External checkout refused");
    }
  };
  const child = <Slot />;
  function diagnostics() {
    const entries = Object.entries(sessionStorage).filter(([key]) =>
      key.startsWith("course_gift_")
    );
    setEvidence(
      JSON.stringify(
        {
          privateFormSuppressed: suppressCourseGiftDiagnostic("ordinary"),
          storedPrivatePayload: entries.some(([, value]) =>
            /recipientEmail|creatorTermsText|checkoutUrl|@|Bearer /.test(value)
          ),
          storedHintCount: entries.length,
          liveGifting: "OFF",
          analytics: "not initialized"
        },
        null,
        2
      )
    );
  }
  return (
    <main style={{ maxWidth: 980, margin: "20px auto", padding: 16 }}>
      <section style={{ border: "2px solid #b45309", padding: 12 }}>
        <h1>Local course-page gifting connections</h1>
        <p>
          Real course pages, gift controls and Expo router. Synthetic accounts/reads only.
          No backend, payment, email or analytics.
        </p>
        <p>
          Identity: {identity.state} / account {identity.account}. Synthetic plan Pro,
          credits 37. Live gifting OFF.
        </p>
        <p>
          Route: {pathname}. Boundary: {internal ? "local test" : "shipped inert"}.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={() =>
              setIdentity((old) => ({
                state: "ready",
                account: 1,
                revision: old.revision + 1
              }))
            }
          >
            Use synthetic creator
          </button>
          <button
            onClick={() =>
              setIdentity((old) => ({
                state: "ready",
                account: 2,
                revision: old.revision + 1
              }))
            }
          >
            Use synthetic buyer
          </button>
          <button onClick={() => router.push(`/courses/${COURSE}` as any)}>
            Shared course page
          </button>
          <button
            onClick={() => router.push(`/home/commercial/courses/${COMMERCIAL}` as any)}
          >
            Commercial author page
          </button>
          <button
            onClick={() =>
              router.push(`/home/commercial/courses/${COMMERCIAL}?preview=1` as any)
            }
          >
            Commercial learner preview
          </button>
          <button onClick={() => router.push("/ordinary" as any)}>
            Leave course page
          </button>
          <button onClick={() => window.location.reload()}>Reload local page</button>
          <button onClick={() => setInternal((value) => !value)}>
            Switch local boundary
          </button>
          <button
            onClick={() => {
              sessionStorage.setItem(
                `course_gift_sale_v1:${"2".repeat(24)}:${COURSE}:buyer`,
                JSON.stringify({
                  version: 1,
                  userId: "2".repeat(24),
                  expiresAt: Date.now() + 600000,
                  value: {
                    kind: "buyer",
                    courseId: COURSE,
                    attemptId: ORIGINAL,
                    fingerprint: FINGERPRINT,
                    giftId: null
                  }
                })
              );
              setEvidence("Synthetic pending hint seeded; no payment or reservation.");
            }}
          >
            Seed pending recovery
          </button>
          <button onClick={diagnostics}>Inspect entry evidence</button>
        </div>
        <pre aria-label="Fixture counters">{JSON.stringify(state, null, 2)}</pre>
        {evidence && <pre aria-label="Entry evidence">{evidence}</pre>}
      </section>
      {internal ? (
        <InternalCourseGiftEntryBoundary {...boundaryProps}>
          {child}
        </InternalCourseGiftEntryBoundary>
      ) : (
        <ClosedBoundary>{child}</ClosedBoundary>
      )}
    </main>
  );
}
function Shared() {
  const params = useLocalSearchParams();
  return <CourseDetailScreen route={{ params: { id: params.courseId } }} />;
}
function Ordinary() {
  return <h2>Entry fixture landing — no private form</h2>;
}
const modules: Record<string, { default: React.ComponentType<any> }> = {
  "./_layout.tsx": { default: Layout },
  "./index.tsx": { default: Ordinary },
  "./ordinary.tsx": { default: Ordinary },
  "./courses/[courseId].tsx": { default: Shared },
  "./home/commercial/courses/[courseId].tsx": { default: CommercialRoute }
};
const context = Object.assign(
  <T,>(id: string): T => {
    if (!Object.hasOwn(modules, id)) throw Error("Unknown fixture route");
    return modules[id] as T;
  },
  {
    keys: () => Object.keys(modules),
    resolve: (id: string) => id,
    id: "synthetic-gift-entry-routes"
  }
);
function RootWrapper({ children }: { children?: React.ReactNode }) {
  return <FixtureAuthProvider>{children}</FixtureAuthProvider>;
}
createRoot(document.getElementById("root")!).render(
  <ExpoRoot context={context} wrapper={RootWrapper} />
);
