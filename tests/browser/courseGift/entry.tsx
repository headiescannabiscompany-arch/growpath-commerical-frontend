import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  InternalCourseGiftSaleScreen,
  createInternalCourseGiftSaleHttpSession
} from "../../../src/components/courseGifts/CourseGiftSaleScreens";
import CourseGiftWebScreen, {
  InternalCourseGiftWebContext
} from "../../../src/components/courseGifts/CourseGiftWebScreen";
import { createCourseGiftContinuation } from "../../../src/utils/courseGiftContinuation";
import { createInternalCourseGiftWebSession } from "../../../src/utils/courseGiftWebSession";

type Role = "creator" | "buyer" | "recipient" | "other";
type Bootstrap = {
  courseId: string;
  attemptId: string;
  controlKey: string;
  accounts: Record<Role, { userId: string; token: string }>;
};
const bootstrap: Bootstrap = (globalThis as any).__giftFixture;
delete (globalThis as any).__giftFixture;
const savedRole = sessionStorage.getItem("fixture-role") as Role;
const role: Role = Object.hasOwn(bootstrap.accounts, savedRole) ? savedRole : "creator";
const account = bootstrap.accounts[role];
const auth = () => ({
  state: "ready" as const,
  userId: account.userId,
  sessionKey: `synthetic-browser-${role}`,
  emailVerified: true
});
async function control(action: string) {
  const response = await fetch(`/fixture/${action}`, {
    method: "POST",
    credentials: "omit",
    cache: "no-store",
    headers: { "X-Fixture-Key": bootstrap.controlKey }
  });
  if (!response.ok) throw new Error("Fixture control failed");
  return response.json();
}
const claim = window.location.pathname === "/claim-course-gift";
const webSession = claim
  ? createInternalCourseGiftWebSession({
      auth,
      storage: sessionStorage,
      getAccessToken: async () => account.token
    })
  : null;
const snapshot =
  webSession?.sync(
    window.location.pathname + window.location.search + window.location.hash,
    window
  ) || null;
const saleSession =
  !claim && ["creator", "buyer"].includes(role)
    ? createInternalCourseGiftSaleHttpSession({
        platform: "web",
        auth,
        continuation: createCourseGiftContinuation({ storage: sessionStorage }),
        getAccessToken: async () => account.token,
        courseId: bootstrap.courseId,
        attemptId: bootstrap.attemptId,
        newRequestId: () => crypto.randomUUID()
      })
    : null;
function App() {
  const [note, setNote] = useState("");
  const [evidence, setEvidence] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(
    () => () => {
      saleSession?.dispose();
      webSession?.dispose();
    },
    []
  );
  async function run(action: string) {
    setBusy(true);
    try {
      const result = await control(action);
      if (action === "invitation") window.location.assign(result.path);
      else {
        const stored = [sessionStorage, localStorage].flatMap((storage) =>
          Array.from({ length: storage.length }, (_, index) => {
            const key = storage.key(index)!;
            return [key, storage.getItem(key) || ""];
          })
        );
        setEvidence(
          JSON.stringify(
            {
              ...result,
              browser: {
                fragmentCleared: window.location.hash === "",
                storedItemCount: stored.length,
                privateStorageMarkersFound: stored.some(
                  ([key, value]) =>
                    /recipientEmail|claimToken|accessToken|creatorTermsText|checkoutUrl/i.test(
                      key + value
                    ) || /@|https:\/\/|Bearer |eyJ[A-Za-z0-9_-]+\./.test(value)
                )
              }
            },
            null,
            2
          )
        );
      }
    } catch {
      setNote("Fixture control failed. No external operation was attempted.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main style={{ maxWidth: 820, margin: "24px auto", padding: 16 }}>
      <section
        aria-label="Local fixture controls"
        style={{ border: "2px solid #b45309", padding: 12, marginBottom: 20 }}
      >
        <h1>Local synthetic course-gift check</h1>
        <p>No real accounts, money, email or analytics. Live gifting stays disabled.</p>
        <label>
          Synthetic identity:{" "}
          <select
            aria-label="Synthetic identity"
            value={role}
            onChange={(event) => {
              sessionStorage.setItem("fixture-role", event.target.value);
              window.location.assign("/");
            }}
          >
            {["creator", "buyer", "recipient", "other"].map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
          <button disabled={busy} onClick={() => void run("evidence")}>
            Inspect synthetic state
          </button>
          <button disabled={busy} onClick={() => void run("paid")}>
            Simulate payment result
          </button>
          <button disabled={busy} onClick={() => void run("invitation")}>
            Open synthetic invitation
          </button>
          <button disabled={busy} onClick={() => void run("drop-claim")}>
            Drop next successful claim reply
          </button>
          <button disabled={busy} onClick={() => void run("refund")}>
            Simulate full refund
          </button>
        </div>
        {note && <p role="status">{note}</p>}
        {evidence && <pre style={{ whiteSpace: "pre-wrap" }}>{evidence}</pre>}
      </section>
      {saleSession && (
        <InternalCourseGiftSaleScreen
          mode={role as "creator" | "buyer"}
          session={saleSession}
          onNavigateToCheckout={() =>
            setNote(
              "Synthetic checkout URL received. External navigation blocked; no payment made."
            )
          }
        />
      )}
      {webSession && (
        <InternalCourseGiftWebContext.Provider value={{ session: webSession, snapshot }}>
          <CourseGiftWebScreen />
        </InternalCourseGiftWebContext.Provider>
      )}
      {!saleSession && !webSession && (
        <p>Open the synthetic invitation to review the real recipient screen.</p>
      )}
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
