import React, { useContext, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ExpoRoot,
  Slot,
  useLocalSearchParams,
  usePathname,
  useRouter
} from "expo-router";
import ClosedBoundary, {
  InternalCourseGiftWebBoundary
} from "../../../src/components/courseGifts/CourseGiftWebBoundary";
import { InternalCourseGiftWebContext } from "../../../src/components/courseGifts/CourseGiftWebScreen";
import ClaimRoute from "../../../src/app/claim-course-gift";
import CheckoutRoute from "../../../src/app/course-gifts/checkout";
import { parseSafeLoginReturnPath } from "../../../src/utils/authReturnPath";
import { filterCourseGiftDiagnostic } from "../../../src/utils/courseGiftDiagnosticPrivacy";
import { FixtureAuthProvider, useFixtureAuth } from "./auth";
import { inspectHostTrace } from "./session";
import {
  inspectFixture,
  subscribeFixture,
  holdNextReview,
  releaseHeldReview
} from "./http";

function Snapshot() {
  const context = useContext(InternalCourseGiftWebContext);
  const snapshot = context?.snapshot;
  return (
    <p aria-label="Internal host snapshot">
      Host:{" "}
      {snapshot
        ? `${snapshot.kind}; ${snapshot.authState}; invitation ${snapshot.hasInvitation ? "present" : "absent"}`
        : "no private journey"}
    </p>
  );
}
function Layout() {
  const router = useRouter();
  const pathname = usePathname();
  const { identity, setIdentity } = useFixtureAuth();
  const [internal, setInternal] = useState(true);
  const [state, setState] = useState(inspectFixture);
  const [diagnostics, setDiagnostics] = useState("");
  const [trace, setTrace] = useState("");
  useEffect(() => subscribeFixture(() => setState(inspectFixture())), []);
  const Boundary = internal ? InternalCourseGiftWebBoundary : ClosedBoundary;
  const setAuth = (state: "signed_out" | "pending" | "ready") =>
    setIdentity((old) => ({ ...old, state }));
  function checkDiagnostics() {
    // Only booleans are rendered. No SDK initialization or outgoing telemetry.
    const retainedPrivate = {
      message: `Synthetic retained invitation ${"a".repeat(64)}`
    };
    const ordinary = { message: "Synthetic ordinary error" };
    let privateMarkersFound = false;
    let storageReadable = true;
    try {
      for (const storage of [window.sessionStorage, window.localStorage]) {
        for (let index = 0; index < storage.length; index += 1) {
          const key = storage.key(index)!;
          const value = storage.getItem(key) || "";
          if (
            /claimToken|accessToken|recipientEmail|Bearer |[a-f0-9]{64}/i.test(
              key + value
            )
          )
            privateMarkersFound = true;
        }
      }
    } catch {
      storageReadable = false;
    }
    setDiagnostics(
      JSON.stringify(
        {
          fragmentCleared: window.location.hash === "",
          ordinaryEventSuppressedHere: filterCourseGiftDiagnostic(ordinary) === null,
          retainedPrivateEventSuppressed:
            filterCourseGiftDiagnostic(retainedPrivate) === null,
          storageReadable,
          privateMarkersFound
        },
        null,
        2
      )
    );
  }
  return (
    <main style={{ maxWidth: 880, margin: "20px auto", padding: 16 }}>
      <section
        aria-label="Synthetic host controls"
        style={{ border: "2px solid #b45309", padding: 12 }}
      >
        <h1>Local course-gift host/navigation check</h1>
        <p>
          Actual installed Expo router and gift boundary. Synthetic auth and read-only
          transport. No real accounts, database, payments, email or analytics. Live
          gifting stays OFF.
        </p>
        <p>
          Fixture auth: {identity.state}; account {identity.account}. Plan pro / credits
          37 (synthetic constants).
        </p>
        <p>
          Route: {pathname}. Gate:{" "}
          {internal ? "internal fixture only" : "closed public boundary"}.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={() =>
              window.location.assign(`/claim-course-gift#token=${"a".repeat(64)}`)
            }
          >
            Open invitation A
          </button>
          <button
            onClick={() =>
              window.location.assign(`/claim-course-gift#token=${"b".repeat(64)}`)
            }
          >
            Open invitation B
          </button>
          <button
            onClick={() => window.location.assign("/claim-course-gift#token=invalid")}
          >
            Open malformed invitation
          </button>
          <button
            onClick={() =>
              window.location.assign(`/claim-course-gift?token=${"a".repeat(64)}`)
            }
          >
            Open query invitation
          </button>
          <button onClick={() => router.push("/ordinary" as any)}>Leave gift flow</button>
          <button onClick={() => router.push("/claim-course-gift" as any)}>
            Return without invitation
          </button>
          <button
            onClick={() =>
              router.push(
                "/course-gifts/checkout?attempt=synthetic-host-attempt-123456&result=return" as any
              )
            }
          >
            Open synthetic checkout return
          </button>
          <button onClick={() => setAuth("ready")}>Set synthetic auth ready</button>
          <button onClick={() => setAuth("pending")}>Set synthetic auth pending</button>
          <button onClick={() => setAuth("signed_out")}>Set synthetic signed out</button>
          <button
            onClick={() =>
              setIdentity((old) => ({
                state: "ready",
                account: old.account === 1 ? 2 : 1,
                revision: old.revision + 1
              }))
            }
          >
            Change synthetic identity
          </button>
          <button onClick={holdNextReview} disabled={state.heldReply}>
            Hold next review reply
          </button>
          <button onClick={releaseHeldReview} disabled={!state.heldReply}>
            Release held reply
          </button>
          <button onClick={() => setInternal((old) => !old)}>
            Switch fixture boundary
          </button>
          <button onClick={checkDiagnostics}>Inspect diagnostic policy</button>
          <button onClick={() => setTrace(JSON.stringify(inspectHostTrace(), null, 2))}>
            Inspect host trace
          </button>
        </div>
        <pre>{JSON.stringify(state, null, 2)}</pre>
        {diagnostics && <pre aria-label="Diagnostic evidence">{diagnostics}</pre>}
        {trace && <pre aria-label="Host trace">{trace}</pre>}
        <p>
          Do not click Claim: this fixture refuses every mutation. Diagnostic checks do
          not initialize Sentry.
        </p>
      </section>
      <Boundary key={internal ? "internal" : "closed"}>
        <Snapshot />
        <Slot />
      </Boundary>
    </main>
  );
}
function Login() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { setIdentity } = useFixtureAuth();
  const destination = parseSafeLoginReturnPath(params.next);
  return (
    <section>
      <h2>Synthetic sign-in handoff</h2>
      <p>No password or actual login. Return path validated by the product allowlist.</p>
      <button
        disabled={!destination}
        onClick={() => {
          setIdentity((old) => ({ ...old, state: "ready" }));
          router.replace(destination as any);
        }}
      >
        Finish synthetic sign-in
      </button>
    </section>
  );
}
function Ordinary() {
  return <h2>Ordinary fixture page — no course content or real account</h2>;
}
const modules: Record<string, { default: React.ComponentType<any> }> = {
  "./_layout.tsx": { default: Layout },
  "./index.tsx": { default: Ordinary },
  "./ordinary.tsx": { default: Ordinary },
  "./login.tsx": { default: Login },
  "./courses.tsx": { default: Ordinary },
  "./claim-course-gift.tsx": { default: ClaimRoute },
  "./course-gifts/checkout.tsx": { default: CheckoutRoute }
};
const context = Object.assign(
  <T,>(id: string): T => {
    if (!Object.hasOwn(modules, id)) throw new Error("Unknown fixture route");
    return modules[id] as T;
  },
  {
    keys: () => Object.keys(modules),
    resolve: (id: string) => id,
    id: "synthetic-gift-host-routes"
  }
);
createRoot(document.getElementById("root")!).render(
  <ExpoRoot context={context} wrapper={FixtureAuthProvider} />
);
