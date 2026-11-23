import type { BackstagePeerCommand, BackstagePeerPurpose, BackstagePeerReply } from "./liveBackstagePeerEndpoint";

type Registration = { endpointId: string; liveId: string; purpose: BackstagePeerPurpose; leaseMs: number };
type Poll = Registration & { command: BackstagePeerCommand | null };
type SignalTransport = {
  register: (purpose: BackstagePeerPurpose) => Promise<Registration>;
  poll: (endpointId: string) => Promise<Poll>;
  reply: (endpointId: string, body: { requestId: string; result: BackstagePeerReply }) => Promise<{ accepted: boolean }>;
  close: (endpointId: string) => Promise<{ closed: boolean }>;
};

// An explicit account-and-Live-bound transport is required; no default fetch,
// credentials, background startup or browser storage. Never replace this client
// on an uncertain registration by silently creating another provider session.
export function createBackstageSignalingClient({ liveId, purpose, transport, endpoint,
  now = () => performance.now(), changed = () => undefined }: {
  liveId: string; purpose: BackstagePeerPurpose; transport: SignalTransport;
  endpoint: { handle: (command: BackstagePeerCommand) => Promise<BackstagePeerReply>; dispose: () => void };
  now?: () => number; changed?: (state: "connecting" | "signaling_ready" | "stopped") => void;
}) {
  let started = false, stopped = false, endpointId: string | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined, lease: ReturnType<typeof setTimeout> | undefined;
  let generation = 0, deadline = 0;
  const closeOnce = new Set<string>();
  function remoteClose(id: string) {
    if (closeOnce.has(id)) return;
    closeOnce.add(id);
    // Local shutdown does not assert remote closure. The server independently
    // revokes on its lease; any uncertain provider closure remains quarantined.
    void Promise.resolve().then(() => transport.close(id)).catch(() => undefined);
  }
  function stop() {
    if (stopped) return;
    stopped = true; generation += 1;
    clearTimeout(timer); clearTimeout(lease); endpoint.dispose();
    if (endpointId) remoteClose(endpointId);
    changed("stopped");
  }
  function valid(value: Registration, expected?: string) {
    return value?.liveId === liveId && value.purpose === purpose &&
      typeof value.endpointId === "string" && /^[A-Za-z0-9_-]{16,128}$/.test(value.endpointId) &&
      (!expected || value.endpointId === expected) && Number.isInteger(value.leaseMs) && value.leaseMs >= 5000 && value.leaseMs <= 30000;
  }
  function arm(sentAt: number, ms: number) {
    deadline = sentAt + ms; // A delayed reply never starts a fresh full lease.
    if (now() >= deadline) throw new Error("Private signaling lease expired");
    clearTimeout(lease); lease = setTimeout(stop, deadline - now());
  }
  async function poll(epoch: number, id: string) {
    const sentAt = now();
    try {
      const result = await transport.poll(id);
      if (stopped || generation !== epoch) return;
      if (!valid(result, id) || now() >= deadline) throw new Error("Private signaling scope expired");
      arm(sentAt, result.leaseMs);
      if (result.command) {
        // Account binding lives in the supplied transport; endpoint also checks
        // Live/purpose/operation before touching the browser PeerConnection.
        const command = result.command;
        const age = now() - sentAt;
        const reply = await endpoint.handle({ ...command, expiresInMs: command.expiresInMs - age });
        if (stopped || generation !== epoch || now() >= deadline) return;
        const ack = await transport.reply(id, { requestId: command.requestId, result: reply });
        if (stopped || generation !== epoch) return;
        if (ack?.accepted !== true || now() >= deadline) throw new Error("Private signaling reply uncertain");
      }
      timer = setTimeout(() => { void poll(epoch, id); }, 250);
    } catch { if (generation === epoch) stop(); }
  }
  return {
    async start() {
      if (started || stopped) return;
      started = true;
      const epoch = ++generation, sentAt = now();
      changed("connecting");
      // An unanswered registration must also stop local devices.
      lease = setTimeout(stop, 10000);
      try {
        const result = await transport.register(purpose);
        if (!valid(result)) throw new Error("Private signaling registration unavailable");
        if (stopped || generation !== epoch) { remoteClose(result.endpointId); return; }
        endpointId = result.endpointId; arm(sentAt, result.leaseMs);
        changed("signaling_ready"); // This does not certify media playback.
        void poll(epoch, endpointId);
      } catch { if (generation === epoch) stop(); }
    },
    stop
  };
}
