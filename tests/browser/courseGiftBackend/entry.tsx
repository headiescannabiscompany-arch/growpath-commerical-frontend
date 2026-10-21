/// <reference path="../courseGiftEntry/react-dom-client.d.ts" />
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { ExpoRoot, Slot, useLocalSearchParams, useRouter } from "expo-router";
import { bootstrap, FixtureAuthProvider, useFixtureAuth, type Role } from "./auth";
import { InternalCourseGiftEntryBoundary } from "../../../src/components/courseGifts/CourseGiftCourseEntry";
import CourseDetailScreen from "../../../src/screens/CourseDetailScreen";
import CourseGiftWebScreen from "../../../src/components/courseGifts/CourseGiftWebScreen";

process.env.NODE_ENV = "test";
const nativeFetch = window.fetch.bind(window);
window.fetch = ((input: RequestInfo | URL, options: RequestInit = {}) => {
  const url = new URL(String(input), location.origin);
  const renewalPath =
    bootstrap.renewalMode &&
    [
      "/api/course-gifts/recipient/renew",
      "/fixture/drop-renew",
      "/fixture/accept-replacement",
      "/fixture/original-invitation"
    ].includes(url.pathname);
  if (
    url.origin !== location.origin ||
    url.search ||
    url.hash ||
    (!renewalPath &&
      !/^\/(api\/course-gifts\/(creator\/(review|accept|revoke)|buyer\/(review|reserve|status|checkout)|recipient\/(review|claim))|fixture\/(paid|refund|invitation|evidence|course))$/.test(
        url.pathname
      ))
  )
    throw Error("Only isolated gift transport allowed");
  return nativeFetch(url.href, { ...options, credentials: "omit", redirect: "error" });
}) as typeof fetch;
window.XMLHttpRequest = class {
  constructor() {
    throw Error("XHR forbidden");
  }
} as any;
window.WebSocket = class {
  constructor() {
    throw Error("WebSocket forbidden");
  }
} as any;

function Layout() {
  const router = useRouter(),
    { role, setRole } = useFixtureAuth();
  const [note, setNote] = useState(""),
    [evidence, setEvidence] = useState(""),
    [busy, setBusy] = useState(false);
  async function control(action: string) {
    setBusy(true);
    setNote("");
    try {
      const response = await fetch(`/fixture/${action}`, {
        method: "POST",
        headers: { "X-Fixture-Key": bootstrap.controlKey },
        cache: "no-store"
      });
      if (!response.ok) throw Error("Local fixture control failed");
      const result = await response.json();
      if (action === "invitation" || action === "original-invitation")
        router.push(result.path);
      else
        setEvidence(
          JSON.stringify(
            {
              ...result,
              fragmentCleared: location.hash === "",
              privateStorageFound: [
                ...Object.entries(sessionStorage),
                ...Object.entries(localStorage)
              ].some(([key, value]) =>
                /recipientEmail|claimToken|operationId|[a-f0-9]{64}|Bearer |@|https:\/\/|eyJ[A-Za-z0-9_-]+\./.test(
                  key + value
                )
              )
            },
            null,
            2
          )
        );
    } catch {
      setNote("Local fixture request failed; no external operation attempted.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main style={{ maxWidth: 980, margin: "20px auto", padding: 16 }}>
      <section style={{ border: "2px solid #b45309", padding: 12 }}>
        <h1>
          {bootstrap.renewalMode
            ? "Local recipient-renewal check"
            : "Local backend-connected gift check"}
        </h1>
        <p>
          {bootstrap.renewalMode
            ? "Real recipient page, router, private API, JWT and database transactions. One seeded expired security link; synthetic delivery only. No email, payment or live gift."
            : "Real pages, private API, JWT, transactions and signed-event handler. Synthetic accounts, approval, payments and email only. Live gifts OFF."}
        </p>
        <label>
          Synthetic identity:{" "}
          <select
            aria-label="Synthetic identity"
            value={role}
            onChange={(e) => {
              setRole(e.target.value as Role);
              router.push(`/courses/${bootstrap.courseId}` as any);
            }}
          >
            {["creator", "buyer", "recipient"].map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          <button onClick={() => router.push(`/courses/${bootstrap.courseId}` as any)}>
            Open synthetic course
          </button>
          <button onClick={() => location.reload()}>Reload local page</button>
          <button disabled={busy} onClick={() => void control("evidence")}>
            Inspect database evidence
          </button>
          {!bootstrap.renewalMode && (
            <button disabled={busy} onClick={() => void control("paid")}>
              Simulate signed payment and local delivery
            </button>
          )}
          <button disabled={busy} onClick={() => void control("invitation")}>
            Open synthetic invitation
          </button>
          {!bootstrap.renewalMode && (
            <button disabled={busy} onClick={() => void control("refund")}>
              Simulate signed full refund
            </button>
          )}
          {bootstrap.renewalMode && (
            <>
              <button disabled={busy} onClick={() => void control("drop-renew")}>
                Drop next successful renewal reply
              </button>
              <button disabled={busy} onClick={() => void control("accept-replacement")}>
                Materialize replacement locally (no email)
              </button>
              <button disabled={busy} onClick={() => void control("original-invitation")}>
                Open original expired invitation
              </button>
            </>
          )}
        </div>
        {note ? <p role="status">{note}</p> : null}
        {evidence ? <pre style={{ whiteSpace: "pre-wrap" }}>{evidence}</pre> : null}
      </section>
      <InternalCourseGiftEntryBoundary
        storage={sessionStorage}
        newRequestId={() => crypto.randomUUID()}
        onNavigateToCheckout={() =>
          setNote(
            "Synthetic checkout URL received; external navigation blocked. No payment made."
          )
        }
      >
        <Slot />
      </InternalCourseGiftEntryBoundary>
    </main>
  );
}
function Shared() {
  const params = useLocalSearchParams();
  return <CourseDetailScreen route={{ params: { id: params.courseId } }} />;
}
const modules: Record<string, { default: React.ComponentType<any> }> = {
  "./_layout.tsx": { default: Layout },
  "./index.tsx": { default: () => <p>Open the synthetic course to begin.</p> },
  "./courses/[courseId].tsx": { default: Shared },
  "./claim-course-gift.tsx": { default: CourseGiftWebScreen },
  "./course-gifts/checkout.tsx": { default: CourseGiftWebScreen }
};
const context = Object.assign(
  <T,>(id: string): T => {
    if (!Object.hasOwn(modules, id)) throw Error("Unknown fixture route");
    return modules[id] as T;
  },
  {
    keys: () => Object.keys(modules),
    resolve: (id: string) => id,
    id: "local-backend-gift-routes"
  }
);
createRoot(document.getElementById("root")!).render(
  <ExpoRoot context={context} wrapper={FixtureAuthProvider} />
);
