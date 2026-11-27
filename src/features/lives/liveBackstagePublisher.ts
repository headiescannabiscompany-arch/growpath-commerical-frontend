import { createBackstagePeerEndpoint } from "./liveBackstagePeerEndpoint";
import { createBackstageSignalingClient } from "./liveBackstageSignalingClient";
import type { DeviceTrack } from "./liveBackstageDeviceController";

type Kind = "audio" | "video";
type Handle = { peerId: string; liveId: string; kind: Kind; connected: boolean };
type SignalTransport = Parameters<typeof createBackstageSignalingClient>[0]["transport"];
export type PublisherTransport = SignalTransport & {
  prepareSource(body: { endpointId: string; kind: Kind; requestId: string }): Promise<Handle>;
  activateSource(body: { endpointId: string; peerId: string }): Promise<Handle>;
  closeSource(body: { endpointId: string; peerId: string }): Promise<{ peerId: string; closed: boolean }>;
};
type PublisherConnection = {
  endpoint: ReturnType<typeof createBackstagePeerEndpoint>;
  signaling: ReturnType<typeof createBackstageSignalingClient>;
  endpointId?: string;
  registration?: Promise<void>;
};
type Entry = {
  kind: Kind; track: DeviceTrack; connection?: PublisherConnection; peerId?: string;
  gatheringPeer?: RTCPeerConnection;
  ready: boolean; closing: boolean; serverStopExpected?: boolean; closePromise?: Promise<void>; cancel(): void;
};
const unavailable = () => new Error("Guest media was not confirmed. Local devices are stopped; reconnect to check access again.");

// Unmounted composition of the accepted signaling, peer and owned-source engines.
// It never acquires/enables devices, owns credentials or silently retries writes.
export function createBackstagePublisher({ liveId, transport, createPeerConnection, newRequestId,
  now = () => performance.now(), changed = () => undefined }: {
  liveId: string; transport: PublisherTransport; createPeerConnection: () => RTCPeerConnection;
  newRequestId: () => string; now?: () => number; changed?: (state: "idle" | "stopped") => void;
}) {
  const entries = new Map<Kind, Entry>(), listeners = new Set<() => void>(), requestIds = new Set<string>();
  let stopped = false;
  let connection: PublisherConnection | undefined;

  function getConnection() {
    if (connection) return connection;
    const endpoint = createBackstagePeerEndpoint({
      liveId, purpose: "publisher", now,
      createPeerConnection: kind => {
        const entry = entries.get(kind);
        if (!entry?.gatheringPeer || entry.closing) throw unavailable();
        const pc = entry.gatheringPeer;
        entry.gatheringPeer = undefined;
        return pc;
      },
      failed: () => { if (connection === current) fail(); },
      sourceClosed: id => {
        if (connection !== current) return;
        const entry = [...entries.values()].find(value => value.peerId === id && !value.closing);
        if (!entry || entry.serverStopExpected) return;
        // Stop devices/UI immediately, but let the signaling client acknowledge
        // the server's stop. Closing signaling inside handle(stop) would discard
        // that receipt and unnecessarily quarantine every cooperative shutdown.
        void close(entry).catch(() => undefined);
        listeners.forEach(listener => listener());
      } });
    const signaling = createBackstageSignalingClient({ liveId, purpose: "publisher", endpoint, now,
      transport: { ...transport, register: async purpose => {
        const result = await transport.register(purpose);
        current.endpointId = result?.endpointId;
        return result;
      } }, changed: state => {
        if (state !== "stopped" || stopped || connection !== current) return;
        // An endpoint can lose authority after its last exact source close.
        // Leave room controls available and open again only on explicit device use.
        if (entries.size === 0) connection = undefined;
        else fail();
      } });
    const current: PublisherConnection = { endpoint, signaling };
    connection = current;
    return current;
  }

  function stopTrack(track: DeviceTrack) { track.enabled = false; track.stop(); }
  function close(entry: Entry): Promise<void> {
    entry.closing = true; entry.cancel(); stopTrack(entry.track);
    entry.gatheringPeer?.close();
    entry.gatheringPeer = undefined;
    if (entry.peerId) entry.connection?.endpoint.stopPeer(entry.peerId);
    // A late prepare reply can still supply its exact handle for one cleanup.
    const id = entry.connection?.endpointId;
    if (!entry.peerId || !id) return Promise.resolve();
    if (!entry.closePromise) {
      const peerId = entry.peerId;
      let timer: ReturnType<typeof setTimeout> | undefined;
      entry.closePromise = Promise.race([
        Promise.resolve().then(() => transport.closeSource({ endpointId: id, peerId })),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(unavailable()), 5000); })
      ]).then(reply => {
        if (reply?.peerId !== peerId || reply.closed !== true) throw unavailable();
        if (entries.get(entry.kind) === entry) entries.delete(entry.kind);
      }).catch(() => { fail(); throw unavailable(); }).finally(() => clearTimeout(timer));
    }
    return entry.closePromise;
  }
  function fail() {
    if (stopped) return;
    stopped = true;
    // Mark every entry before peer disposal can report its closure recursively.
    entries.forEach(entry => { entry.closing = true; entry.cancel(); stopTrack(entry.track); });
    connection?.signaling.stop();
    entries.forEach(entry => { void close(entry).catch(() => undefined); });
    listeners.forEach(listener => listener());
    changed("stopped");
  }
  function exact(value: Handle, kind: Kind, peerId?: string) {
    return value?.liveId === liveId && value.kind === kind && typeof value.connected === "boolean" &&
      typeof value.peerId === "string" && /^[a-f0-9]{64}$/.test(value.peerId) && (!peerId || value.peerId === peerId);
  }
  async function openSource(kind: Kind, track: DeviceTrack) {
    if (stopped || !["audio", "video"].includes(kind) || track.kind !== kind || track.enabled ||
        track.readyState !== "live" || entries.has(kind)) throw unavailable();
    let reject!: (error: Error) => void;
    const cancelled = new Promise<never>((_, no) => { reject = no; });
    const entry: Entry = { kind, track, ready: false, closing: false, cancel: () => reject(unavailable()) };
    entries.set(kind, entry);
    const phaseTimeoutMs = 5000;
    let deadline = now() + phaseTimeoutMs;
    let timer = setTimeout(fail, phaseTimeoutMs);
    // Registration, reservation and activation are separate authenticated calls.
    // A successful call starts the next call's budget. Room and endpoint leases
    // continue running and can stop the disabled source during any phase.
    function startNextPhase() {
      clearTimeout(timer);
      deadline = now() + phaseTimeoutMs;
      timer = setTimeout(fail, phaseTimeoutMs);
    }
    const current = () => {
      if (stopped || entry.closing || entries.get(kind) !== entry || now() >= deadline ||
          track.enabled || track.readyState !== "live") throw unavailable();
    };
    const work = async () => {
      const transportConnection = getConnection();
      entry.connection = transportConnection;
      // Gather local candidates while the private endpoint and source register.
      // The disabled track is attached only after the server asks for its offer.
      entry.gatheringPeer = createPeerConnection();
      transportConnection.registration ??= transportConnection.signaling.start();
      await transportConnection.registration; current();
      const { endpoint, endpointId } = transportConnection;
      if (!endpointId) throw unavailable();
      const requestId = newRequestId();
      if (!/^[A-Za-z0-9_-]{16,128}$/.test(requestId) || requestIds.has(requestId) || requestIds.size >= 64) throw unavailable();
      requestIds.add(requestId);
      startNextPhase();
      const prepared = await transport.prepareSource({ endpointId, kind, requestId });
      if (!exact(prepared, kind)) throw unavailable();
      entry.peerId = prepared.peerId;
      if (entry.closing || stopped) { void close(entry).catch(() => undefined); throw unavailable(); }
      current();
      // A fresh browser cannot adopt a previous connected source without its SDP.
      if (prepared.connected) throw unavailable();
      endpoint.registerSource(prepared.peerId, kind, track as MediaStreamTrack);
      startNextPhase();
      const activated = await transport.activateSource({ endpointId, peerId: prepared.peerId });
      current();
      if (!exact(activated, kind, prepared.peerId) || !activated.connected || !endpoint.sourceReady(prepared.peerId, kind)) throw unavailable();
      entry.ready = true;
      return {
        close: () => close(entry),
        expectServerStop: () => { entry.serverStopExpected = true; }
      };
    };
    try { return await Promise.race([work(), cancelled]); }
    catch { fail(); throw unavailable(); }
    finally { clearTimeout(timer); }
  }
  return {
    openSource,
    stopPendingSources() { if ([...entries.values()].some(entry => !entry.ready && !entry.closing)) fail(); },
    async waitForSourceClosures() {
      if (stopped) throw unavailable();
      // Each retirement has its own five-second deadline and exact receipt.
      // Keep polling alive for the endpoint's stop acknowledgment while waiting.
      await Promise.all([...entries.values()].filter(entry => entry.closing).map(entry => close(entry)));
      if (stopped) throw unavailable();
    },
    subscribeSourceInvalidation(listener: () => void) {
      if (stopped) listener(); else listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    dispose: fail
  };
}
