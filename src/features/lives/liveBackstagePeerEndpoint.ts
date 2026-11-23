export type BackstagePeerPurpose = "publisher" | "preview" | "program";
export type BackstagePeerCommand = {
  requestId: string; liveId: string; peerId: string; operationId: string;
  action: "offer" | "applyAnswer" | "answer" | "connected" | "stop";
  kind: "audio" | "video"; purpose: BackstagePeerPurpose; expiresInMs: number;
  description?: RTCSessionDescriptionInit;
};
export type BackstagePeerReply = {
  peerId: string; operationId: string; trackMid?: string;
  description?: RTCSessionDescriptionInit; applied?: true; connected?: true; stopped?: true;
};
type Peer = {
  id: string; operationId: string; kind: "audio" | "video"; pc: RTCPeerConnection;
  phase: "opening" | "offered" | "answered" | "connected";
  tracks: Set<MediaStreamTrack>; closed: boolean; cancel: Set<() => void>;
};
const validId = (value: unknown): value is string => typeof value === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(value);
const unavailable = () => new Error("Private media negotiation stopped. Refresh the guest studio before trying again.");

// Unmounted browser adapter. Construction does not request devices or open a
// connection. The accepted device controller alone may acquire/enable sources.
// SDP and track references live only in this instance, never browser storage.
export function createBackstagePeerEndpoint({ liveId, purpose, createPeerConnection,
  now = () => performance.now(), failed = () => undefined, receiverClosed = () => undefined,
  sourceClosed = (_peerId: string) => undefined }: {
  liveId: string; purpose: BackstagePeerPurpose; createPeerConnection: () => RTCPeerConnection;
  now?: () => number; failed?: () => void; receiverClosed?: () => void; sourceClosed?: (peerId: string) => void;
}) {
  if (!validId(liveId) || !["publisher", "preview", "program"].includes(purpose) ||
      typeof createPeerConnection !== "function") throw unavailable();
  const sources = new Map<string, MediaStreamTrack>();
  const peers = new Map<string, Peer>();
  const retired = new Set<string>(), seen = new Set<string>();
  let disposed = false;
  let last: { id: string; fingerprint: string; result: Promise<BackstagePeerReply>; busy: boolean } | undefined;
  function stopTrack(track: MediaStreamTrack) { track.enabled = false; track.stop(); }
  function closePeer(id: string) {
    const peer = peers.get(id);
    retired.add(id);
    if (peer && !peer.closed) {
      peer.closed = true;
      peer.pc.ontrack = null; peer.pc.onconnectionstatechange = null;
      peer.cancel.forEach(cancel => cancel()); peer.cancel.clear();
      peer.tracks.forEach(stopTrack); peer.tracks.clear(); peer.pc.close();
      peers.delete(id);
      if (purpose !== "publisher") receiverClosed();
    }
    const source = sources.get(id);
    if (source) { stopTrack(source); sources.delete(id); }
    // MediaStreamTrack.stop() does not emit ended. The device owner must also
    // learn about a server-directed stop, not keep showing a dead source as on.
    if (purpose === "publisher" && (source || peer)) sourceClosed(id);
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    new Set([...peers.keys(), ...sources.keys()]).forEach(closePeer);
    last = undefined; seen.clear();
  }
  function current(peer: Peer, deadline: number) {
    if (disposed || peer.closed || peers.get(peer.id) !== peer || now() >= deadline) throw unavailable();
  }
  async function bounded<T>(peer: Peer, deadline: number, work: () => Promise<T>): Promise<T> {
    current(peer, deadline);
    let timer: ReturnType<typeof setTimeout> | undefined, cancel!: () => void;
    try {
      const result = await Promise.race([Promise.resolve().then(() => { current(peer, deadline); return work(); }),
        new Promise<never>((_, reject) => {
          cancel = () => reject(unavailable()); peer.cancel.add(cancel);
          timer = setTimeout(cancel, Math.max(0, deadline - now()));
        })]);
      current(peer, deadline); return result;
    } finally { clearTimeout(timer); peer.cancel.delete(cancel); }
  }
  async function waitFor(peer: Peer, deadline: number, event: string, ready: () => boolean) {
    let listener: (() => void) | undefined;
    try {
      await bounded(peer, deadline, () => new Promise<void>(resolve => {
        listener = () => { if (ready()) resolve(); };
        peer.pc.addEventListener(event, listener); listener();
      }));
    } finally { if (listener) peer.pc.removeEventListener(event, listener); }
  }
  function sdp(value: RTCSessionDescriptionInit | null | undefined, type: "offer" | "answer", kind: string) {
    if (value?.type !== type || typeof value.sdp !== "string" || !value.sdp ||
        new TextEncoder().encode(value.sdp).length > 196608) throw unavailable();
    const media = value.sdp.split(/\r?\n/).filter(line => line.startsWith("m="));
    if (media.length !== 1 || !media[0].startsWith(`m=${kind} `)) throw unavailable();
    return { type, sdp: value.sdp };
  }
  function newPeer(command: BackstagePeerCommand) {
    if (peers.has(command.peerId) || retired.has(command.peerId) || peers.size + retired.size >= 64) throw unavailable();
    const pc = createPeerConnection();
    const peer: Peer = { id: command.peerId, operationId: command.operationId, kind: command.kind,
      pc, phase: "opening", tracks: new Set(), closed: false, cancel: new Set() };
    peers.set(peer.id, peer);
    pc.onconnectionstatechange = () => {
      if (["failed", "closed", "disconnected"].includes(pc.connectionState) && !peer.closed) {
        closePeer(peer.id); failed();
      }
    };
    pc.ontrack = event => {
      event.track.enabled = false;
      if (disposed || peer.closed || purpose === "publisher" || event.track.kind !== peer.kind || peer.tracks.size) {
        stopTrack(event.track); closePeer(peer.id); failed(); return;
      }
      // Kept disabled until the current authenticated receiver manifest binds it
      // to a private preview OR program renderer. Negotiation alone is not consent.
      peer.tracks.add(event.track);
    };
    return peer;
  }
  async function run(command: BackstagePeerCommand): Promise<BackstagePeerReply> {
    const base = { peerId: command.peerId, operationId: command.operationId };
    if (command.action === "stop") {
      const existing = peers.get(command.peerId);
      if (existing && existing.operationId !== command.operationId) throw unavailable();
      closePeer(command.peerId); return { ...base, stopped: true };
    }
    let peer: Peer | undefined;
    const deadline = now() + command.expiresInMs;
    try {
      if (command.action === "offer") {
        const source = sources.get(command.peerId);
        if (purpose !== "publisher" || !source || source.kind !== command.kind || source.enabled || source.readyState !== "live") throw unavailable();
        peer = newPeer(command); peer.tracks.add(source);
        const transceiver = peer.pc.addTransceiver(source, { direction: "sendonly" });
        const offered = await bounded(peer, deadline, () => peer!.pc.createOffer());
        await bounded(peer, deadline, () => peer!.pc.setLocalDescription(sdp(offered, "offer", command.kind)));
        await waitFor(peer, deadline, "icegatheringstatechange", () => peer!.pc.iceGatheringState === "complete");
        if (!validId(transceiver.mid)) throw unavailable();
        peer.phase = "offered";
        return { ...base, trackMid: transceiver.mid, description: sdp(peer.pc.localDescription, "offer", command.kind) };
      }
      if (command.action === "answer") {
        if (purpose === "publisher") throw unavailable();
        const offer = sdp(command.description, "offer", command.kind);
        peer = newPeer(command);
        await bounded(peer, deadline, () => peer!.pc.setRemoteDescription(offer));
        const transceivers = peer.pc.getTransceivers();
        if (transceivers.length !== 1 || transceivers[0].receiver.track.kind !== command.kind ||
            transceivers[0].sender.track) throw unavailable();
        transceivers[0].direction = "recvonly";
        const answer = await bounded(peer, deadline, () => peer!.pc.createAnswer());
        await bounded(peer, deadline, () => peer!.pc.setLocalDescription(sdp(answer, "answer", command.kind)));
        await waitFor(peer, deadline, "icegatheringstatechange", () => peer!.pc.iceGatheringState === "complete");
        peer.phase = "answered";
        return { ...base, description: sdp(peer.pc.localDescription, "answer", command.kind) };
      }
      peer = peers.get(command.peerId);
      if (!peer || peer.operationId !== command.operationId || peer.kind !== command.kind) throw unavailable();
      current(peer, deadline);
      if (command.action === "applyAnswer") {
        if (purpose !== "publisher" || peer.phase !== "offered") throw unavailable();
        await bounded(peer, deadline, () => peer!.pc.setRemoteDescription(sdp(command.description, "answer", command.kind)));
        peer.phase = "answered"; return { ...base, applied: true };
      }
      if (command.action !== "connected" || peer.phase !== "answered") throw unavailable();
      await waitFor(peer, deadline, "connectionstatechange", () => peer!.pc.connectionState === "connected");
      peer.phase = "connected"; return { ...base, connected: true };
    } catch {
      closePeer(command.peerId); throw unavailable();
    }
  }
  return {
    sourceReady(peerId: string, kind: "audio" | "video") {
      const peer = peers.get(peerId), source = sources.get(peerId);
      return !disposed && purpose === "publisher" && !!peer && !peer.closed && peer.phase === "connected" &&
        peer.kind === kind && peer.pc.connectionState === "connected" && !!source &&
        source.kind === kind && source.readyState === "live" && !source.enabled;
    },
    receiverTrack(peerId: string, operationId: string, kind: "audio" | "video") {
      const peer = peers.get(peerId);
      if (disposed || purpose === "publisher" || !peer || peer.closed || peer.phase !== "connected" ||
          peer.operationId !== operationId || peer.kind !== kind || peer.pc.connectionState !== "connected") return null;
      const tracks = [...peer.tracks];
      return tracks.length === 1 && tracks[0].readyState === "live" && tracks[0].kind === kind ? tracks[0] : null;
    },
    registerSource(peerId: string, kind: "audio" | "video", track: MediaStreamTrack) {
      if (disposed || purpose !== "publisher" || !validId(peerId) || sources.has(peerId) || retired.has(peerId) ||
          sources.size >= 2 || [...sources.values()].some(value => value.kind === kind) ||
          track.kind !== kind || track.enabled || track.readyState !== "live") throw unavailable();
      sources.set(peerId, track);
    },
    handle(command: BackstagePeerCommand): Promise<BackstagePeerReply> {
      if (disposed || !command || [command.requestId, command.peerId, command.operationId].some(value => !validId(value)) ||
          command.liveId !== liveId || command.purpose !== purpose || !["audio", "video"].includes(command.kind) ||
          !["offer", "answer", "applyAnswer", "connected", "stop"].includes(command.action) ||
          !Number.isFinite(command.expiresInMs) || command.expiresInMs <= 0 || command.expiresInMs > 10000) return Promise.reject(unavailable());
      const { expiresInMs: _expires, ...identity } = command;
      const fingerprint = JSON.stringify(identity);
      if (last?.id === command.requestId) return last.fingerprint === fingerprint ? last.result : Promise.reject(unavailable());
      if (last?.busy || seen.has(command.requestId) || seen.size >= 128) return Promise.reject(unavailable());
      seen.add(command.requestId);
      const entry = { id: command.requestId, fingerprint, busy: true, result: Promise.resolve({} as BackstagePeerReply) };
      last = entry;
      entry.result = run(command).finally(() => { entry.busy = false; });
      return entry.result;
    },
    stopPeer: closePeer,
    dispose
  };
}
