import { createBackstagePeerEndpoint } from "./liveBackstagePeerEndpoint";
import { createBackstageSignalingClient } from "./liveBackstageSignalingClient";

export type ReceiverPurpose = "preview" | "program";
export type ReceiverItem = {
  peerId: string; operationId: string; kind: "audio" | "video";
  participantId: string; displayName: string;
};
export type ReceiverManifest = {
  liveId: string; endpointId: string; purpose: ReceiverPurpose; revision: number;
  confirmed: boolean; digest: string | null; leaseMs: number; receivers: ReceiverItem[];
};
export type ReceiverTrack = ReceiverItem & { track: MediaStreamTrack };
export type ReceiverSink = {
  render(items: ReceiverTrack[]): Promise<void>;
  clear(): void;
  setAudible(enabled: boolean): void;
};
export type ReceiverState = { status: "idle" | "connecting" | "waiting" | "ready" | "stopped"; audible: boolean; participants: number };
export type ReceiverTransport = Parameters<typeof createBackstageSignalingClient>[0]["transport"] & {
  readReceivers(endpointId: string): Promise<ReceiverManifest>;
};
const token = (value: unknown): value is string => typeof value === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(value);

// One explicit authenticated identity/Live/purpose per instance. No fetch, device
// acquisition, storage, OBS token, publication or automatic reconnect. This does
// not mount the new API or certify real browser/OBS packet isolation.
export function createBackstageReceiver({ liveId, purpose, transport, sink, createPeerConnection,
  now = () => performance.now(), changed = () => undefined }: {
  liveId: string; purpose: ReceiverPurpose; transport: ReceiverTransport; sink: ReceiverSink;
  createPeerConnection: () => RTCPeerConnection; now?: () => number; changed?: (state: ReceiverState) => void;
}) {
  if (!token(liveId) || !["preview", "program"].includes(purpose)) throw new Error("Private receiver scope required");
  let started = false, stopped = false, endpointId: string | undefined;
  let version = 0, revision = -1, deadline = 0, audible = false, fingerprint = "";
  let state: ReceiverState = { status: "idle", audible: false, participants: 0 };
  let pollTimer: ReturnType<typeof setTimeout> | undefined, leaseTimer: ReturnType<typeof setTimeout> | undefined;
  let readTimer: ReturnType<typeof setTimeout> | undefined;
  function notify(status: ReceiverState["status"], participants = 0) {
    state = { status, audible, participants }; changed({ ...state });
  }
  function clear() {
    version += 1; deadline = 0; fingerprint = ""; audible = false;
    clearTimeout(leaseTimer); sink.clear();
  }
  function stop() {
    if (stopped) return;
    stopped = true; clearTimeout(pollTimer); clearTimeout(readTimer); clear(); signaling.stop(); notify("stopped");
  }
  const endpoint = createBackstagePeerEndpoint({ liveId, purpose, createPeerConnection, now, failed: stop,
    receiverClosed: () => { if (!stopped) { clear(); notify("waiting"); } } });
  const signaling = createBackstageSignalingClient({ liveId, purpose, endpoint, now,
    transport: { ...transport, register: async requested => {
      const result = await transport.register(requested);
      // The signaling client validates the whole registration before start returns.
      endpointId = result?.endpointId; return result;
    } }, changed: status => { if (status === "stopped") stop(); }
  });
  function validate(value: ReceiverManifest) {
    if (!value || value.liveId !== liveId || value.endpointId !== endpointId || value.purpose !== purpose ||
        !Number.isSafeInteger(value.revision) || value.revision < revision || typeof value.confirmed !== "boolean" ||
        !Array.isArray(value.receivers) || value.receivers.length > (purpose === "program" ? 10 : 24)) throw new Error("Invalid private receiver view");
    if (!value.confirmed) {
      if (value.digest !== null || value.leaseMs !== 0 || value.receivers.length) throw new Error("Unconfirmed media must stay empty");
      return;
    }
    if (typeof value.digest !== "string" || !/^[a-f0-9]{64}$/.test(value.digest) ||
        !Number.isInteger(value.leaseMs) || value.leaseMs <= 0 || value.leaseMs > 5000) throw new Error("Receiver confirmation expired");
    const peers = new Set<string>(), slots = new Set<string>(), labels = new Map<string, string>();
    for (const item of value.receivers) {
      if (!item || !token(item.peerId) || !token(item.operationId) || !token(item.participantId) ||
          !["audio", "video"].includes(item.kind) || typeof item.displayName !== "string" || item.displayName.length > 80 ||
          peers.has(item.peerId) || slots.has(`${item.participantId}:${item.kind}`) ||
          (labels.has(item.participantId) && labels.get(item.participantId) !== item.displayName)) throw new Error("Invalid receiver set");
      peers.add(item.peerId); slots.add(`${item.participantId}:${item.kind}`); labels.set(item.participantId, item.displayName);
    }
    if (labels.size > (purpose === "program" ? 5 : 12)) throw new Error("Receiver layout exceeded");
  }
  async function poll() {
    if (stopped || !endpointId) return;
    const epoch = version, sentAt = now();
    // Independent of route invalidation: a peer closing during a hung read must
    // not cancel that read's timeout and leave an unbounded session running.
    readTimer = setTimeout(stop, 5000);
    try {
      const result = await transport.readReceivers(endpointId);
      if (stopped) return;
      if (version !== epoch) return; // A peer closed while this reply was in flight.
      validate(result); revision = result.revision;
      if (!result.confirmed) { clear(); notify("waiting"); return; }
      const expires = sentAt + result.leaseMs;
      if (expires <= now()) throw new Error("Delayed receiver confirmation");
      const items: ReceiverTrack[] = [];
      for (const item of result.receivers) {
        const track = endpoint.receiverTrack(item.peerId, item.operationId, item.kind);
        if (!track) { clear(); notify("waiting"); return; }
        items.push({ ...item, track });
      }
      const next = JSON.stringify([result.revision, result.digest, result.receivers]);
      if (next !== fingerprint) {
        clear(); // Both audio and video disappear before replacing a route.
        const renderVersion = version;
        deadline = expires; leaseTimer = setTimeout(stop, Math.max(0, deadline - now()));
        await sink.render(items);
        if (stopped || renderVersion !== version) return;
        if (now() >= deadline) throw new Error("Receiver render expired");
        fingerprint = next;
      } else {
        clearTimeout(leaseTimer); deadline = expires; leaseTimer = setTimeout(stop, deadline - now());
      }
      notify("ready", new Set(items.map(item => item.participantId)).size);
    } catch { stop(); }
    finally { clearTimeout(readTimer); if (!stopped) pollTimer = setTimeout(() => { void poll(); }, 1000); }
  }
  return {
    async start() {
      if (started || stopped) return;
      started = true; notify("connecting");
      await signaling.start();
      if (!stopped && endpointId) void poll();
    },
    setAudible(enabled: boolean) {
      if (stopped || state.status !== "ready" || now() >= deadline) return;
      audible = enabled === true; sink.setAudible(audible); notify("ready", state.participants);
    },
    stop,
    snapshot: () => ({ ...state })
  };
}
