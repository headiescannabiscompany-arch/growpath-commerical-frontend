import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import SharedProfile from "../../../src/app/profile/index";
import PersonalProfile from "../../../src/app/home/personal/(tabs)/profile/index";

const fixture = (globalThis as any).__exportFixture;
const nativeFetch = globalThis.fetch.bind(globalThis);
let blockedRequests = 0;
globalThis.fetch = ((input: any, init: any = {}) => {
  const url = new URL(typeof input === "string" ? input : input.url, location.origin);
  if (
    url.origin !== location.origin ||
    !["/api/account/export", "/fixture/evidence"].includes(url.pathname) ||
    (init.method || "GET") !== "GET"
  ) {
    blockedRequests++;
    return Promise.reject(new Error("Only the local read-only export is allowed"));
  }
  return nativeFetch(input, init);
}) as typeof fetch;

function App() {
  const [evidence, setEvidence] = useState<any>(null);
  return (
    <main
      style={{
        maxWidth: 1000,
        margin: "24px auto",
        fontFamily: "system-ui",
        color: "#f1f5f9",
        background: "#10171e",
        padding: 20
      }}
    >
      <h1>Synthetic local gift export check</h1>
      <p>
        No live account, payments or analytics. Gifting OFF. Only export is connected;
        other account actions are blocked.
      </p>
      <nav style={{ display: "flex", gap: 20, marginBottom: 20 }}>
        <a href="/?actor=buyer&view=shared">Buyer — shared Profile</a>
        <a href="/?actor=recipient&view=personal">Recipient — Personal Profile</a>
        <a href="/?actor=bad&view=shared">Malformed record — shared Profile</a>
        <button
          onClick={async () =>
            setEvidence({
              ...(await nativeFetch("/fixture/evidence").then((r) => r.json())),
              blockedRequests,
              localStorageKeys: localStorage.length,
              sessionStorageKeys: sessionStorage.length
            })
          }
        >
          Inspect fixture evidence
        </button>
      </nav>
      <p>
        Current synthetic actor: {fixture.actor}. Original {fixture.view} Profile
        component.
      </p>
      {evidence && (
        <pre aria-label="Fixture evidence">{JSON.stringify(evidence, null, 2)}</pre>
      )}
      {fixture.view === "personal" ? <PersonalProfile /> : <SharedProfile />}
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
