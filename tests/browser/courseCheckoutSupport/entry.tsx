import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { InternalCourseCheckoutSupportPanel } from "../../../src/features/admin/CourseCheckoutSupportPanel";
import { clearAdminStepUp } from "../../../src/api/adminPasskeys";
import { filterCourseGiftDiagnostic } from "../../../src/utils/courseGiftDiagnosticPrivacy";
import { getMonitoringStatus } from "../../../src/utils/monitoring";
import { switchSyntheticIdentity } from "./tokenStore";
import { subscribeToTokenBalanceChange } from "../../../src/utils/tokenBalanceEvents";

const fixture = (globalThis as any).__supportFixture;
const originalFetch = globalThis.fetch.bind(globalThis);
let blockedRequests = 0;
let balanceNotifications = 0;
subscribeToTokenBalanceChange(() => {
  balanceNotifications++;
});
globalThis.fetch = ((input: any, init: any) => {
  const url = new URL(typeof input === "string" ? input : input.url, location.origin);
  if (url.origin !== location.origin) {
    blockedRequests++;
    return Promise.reject(new Error("External request forbidden"));
  }
  return originalFetch(input, init);
}) as typeof fetch;

function App() {
  const [mounted, setMounted] = useState(true);
  const [evidence, setEvidence] = useState<any>(null);
  async function inspect() {
    const server = await originalFetch("/fixture/evidence", { cache: "no-store" }).then(
      (r) => r.json()
    );
    setEvidence({
      ...server,
      diagnosticSuppressed:
        filterCourseGiftDiagnostic({ message: "innocuous fixture probe" }) === null,
      localStorageKeys: localStorage.length,
      sessionStorageKeys: sessionStorage.length,
      monitoring: getMonitoringStatus(),
      blockedRequests,
      balanceNotifications,
      visiblePrivateInputCount: document.querySelectorAll(
        "input[aria-label^='Original'],textarea[aria-label^='Exact']"
      ).length
    });
  }
  return (
    <main style={{ maxWidth: 1000, margin: "20px auto", fontFamily: "system-ui" }}>
      <h1>Synthetic local support browser check</h1>
      <p>
        No real account, device passkey, payment or analytics. Software signer only. Live
        gifting OFF.
      </p>
      <details>
        <summary>Synthetic original evidence</summary>
        <pre>{JSON.stringify(fixture.refs, null, 2)}</pre>
      </details>
      <div style={{ display: "flex", gap: 12, margin: "16px 0" }}>
        <button onClick={inspect}>Inspect fixture evidence</button>
        <button onClick={() => setMounted((v) => !v)}>
          {mounted ? "Unmount private panel" : "Mount private panel"}
        </button>
        <button
          onClick={() => {
            switchSyntheticIdentity();
            clearAdminStepUp({ accountChanged: true });
          }}
        >
          Simulate synthetic identity change
        </button>
      </div>
      {evidence && (
        <pre aria-label="Fixture evidence">{JSON.stringify(evidence, null, 2)}</pre>
      )}
      {mounted && <InternalCourseCheckoutSupportPanel />}
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
