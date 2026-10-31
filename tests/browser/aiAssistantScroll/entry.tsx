import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import AiScreen from "../../../src/app/home/personal/(tabs)/ai";
import { blockedNetwork, counts } from "./services";

if (location.hostname !== "127.0.0.1") throw new Error("Loopback fixture only");
window.fetch = blockedNetwork as any;
window.XMLHttpRequest = class {
  constructor() {
    blockedNetwork();
  }
} as any;
window.WebSocket = class {
  constructor() {
    blockedNetwork();
  }
} as any;
window.EventSource = class {
  constructor() {
    blockedNetwork();
  }
} as any;
navigator.sendBeacon = blockedNetwork as any;

function Fixture() {
  const [, update] = useState(0);
  useEffect(() => {
    const changed = () => update((value) => value + 1);
    window.addEventListener("fixture-counts", changed);
    return () => window.removeEventListener("fixture-counts", changed);
  }, []);
  return (
    <>
      <header>Local AI Assistant — synthetic check</header>
      <main>
        <AiScreen />
      </main>
      <footer>
        <div>Simulated navigation bar</div>
        <output aria-label="Fixture safety counters">
          Simulated replies: {counts.simulatedReplies}; blocked actions:{" "}
          {counts.forbiddenActions}; network attempts: {counts.networkAttempts}
        </output>
      </footer>
    </>
  );
}
createRoot(document.getElementById("root")!).render(<Fixture />);
