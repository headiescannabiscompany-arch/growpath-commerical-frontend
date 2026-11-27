import type { BackstageCommand, BackstageView } from "./LiveBackstagePanel";

export type ConnectedBackstageView = BackstageView & {
  connectionPending: boolean;
  connectionLeaseMs: number;
};
type Kind = "audio" | "video";
export type DeviceTrack = {
  kind: string; enabled: boolean; readyState: string; stop(): void;
  addEventListener?(type: "ended", listener: () => void): void;
};
type Stream = { getTracks(): DeviceTrack[] };
type Source = { close(): void | Promise<void>; expectServerStop?(): void };
export type BackstageDeviceDependencies = {
  read(): Promise<ConnectedBackstageView>;
  send(command: BackstageCommand): Promise<ConnectedBackstageView>;
  // Publication adapter must register a disabled source to this authenticated
  // session; it must never accept arbitrary receiver/publisher IDs from the UI.
  openSource(kind: Kind, track: DeviceTrack, beforeActivate?: () => Promise<void>): Promise<Source>;
  stopPendingSources?(): void;
  waitForSourceClosures?(): Promise<void>;
  subscribeSourceInvalidation?(listener: () => void): () => void;
  getUserMedia(constraints: { audio: boolean; video: boolean }): Promise<Stream>;
  clock?: () => number;
  changed(state: BackstageClientState): void;
};
export type BackstageClientState = {
  view: ConnectedBackstageView | null;
  status: "checking" | "ready" | "uncertain" | "closed";
  microphone: boolean; camera: boolean;
};

// Explicit instance per identity+Live. Does nothing at import/construction.
// The host's OBS devices and ordinary viewer player never enter this controller.
export function createBackstageDeviceController(sessionId: string, dependencies: BackstageDeviceDependencies) {
  const clock = dependencies.clock || (() => performance.now());
  let closed = false;
  let epoch = 0;
  let busy = false;
  let preparingGuestRevision: number | null = null;
  let reading = false;
  let readSequence = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let view: ConnectedBackstageView | null = null;
  let status: BackstageClientState["status"] = "checking";
  let deadline = 0;
  const tracks = new Map<Kind, DeviceTrack>();
  const sources = new Map<Kind, Source>();
  let talkbackTarget: string | undefined;

  function notify() {
    if (!closed) dependencies.changed({ view, status,
      microphone: tracks.get("audio")?.enabled === true, camera: tracks.get("video")?.enabled === true });
  }
  function stopTrack(kind: Kind) {
    const track = tracks.get(kind);
    tracks.delete(kind);
    if (track) { track.enabled = false; track.stop(); }
  }
  function stopKind(kind: Kind) {
    if (kind === "audio") talkbackTarget = undefined;
    stopTrack(kind);
    const source = sources.get(kind);
    sources.delete(kind);
    if (source) { try { Promise.resolve(source.close()).catch(() => undefined); } catch { /* local track already stopped */ } }
  }
  function stopDevices() {
    // Synchronous local off, including before an unfinished permission prompt
    // returns. This doesn't claim remote receivers have stopped playing buffers.
    epoch += 1;
    stopKind("audio"); stopKind("video");
    dependencies.stopPendingSources?.();
    notify();
  }
  function uncertain() {
    if (closed) return;
    if (timer) clearTimeout(timer);
    deadline = 0;
    status = "uncertain";
    if (view?.role === "producer") view = null; // Do not retain another guest's roster after uncertain operator access.
    stopDevices();
  }
  function accept(next: ConnectedBackstageView, requestedAt: number) {
    if (!next || next.sessionId !== sessionId || !Number.isSafeInteger(next.revision) || next.revision < 0 ||
        !["host", "guest", "producer"].includes(next.role) || !Array.isArray(next.guests) ||
        next.guests.length > (next.role === "guest" ? 1 : 100) ||
        (next.role === "producer" && next.guests.some(guest => guest?.producerPreviewConsent !== true)) ||
        (next.producerInvitation !== undefined && (next.role !== "guest" || typeof next.producerInvitation !== "boolean")) ||
        (next.hostTalkback !== undefined && (next.role !== "host" || !next.hostTalkback ||
          typeof next.hostTalkback.targetId !== "string" || typeof next.hostTalkback.confirmed !== "boolean" ||
          !next.guests.some(guest => guest?.userId === next.hostTalkback?.targetId && guest.position === "preview" &&
            !guest.previewOperator && guest.talkbackListening === true))) ||
        (next.producer !== undefined && (next.role !== "host" || !next.producer ||
          typeof next.producer.userId !== "string" || !next.producer.userId || next.producer.userId.length > 160 ||
          typeof next.producer.displayName !== "string" || !next.producer.displayName || next.producer.displayName.length > 80 ||
          !["invited", "active"].includes(next.producer.status))) ||
        typeof next.closed !== "boolean" || typeof next.queueOpen !== "boolean" ||
        typeof next.mediaConfirmed !== "boolean" || typeof next.connectionPending !== "boolean" ||
        next.stageLimit !== 6 || next.waitingLimit !== 12 ||
        next.guests.some((guest) => !guest || typeof guest.displayName !== "string" || guest.displayName.length > 80 ||
          !["waiting", "preview", "stage", "left", "removed"].includes(guest.position) ||
          !["unconfirmed", "off", "private_preview", "on_air"].includes(guest.connection) ||
          (guest.producerPreviewConsent !== undefined && typeof guest.producerPreviewConsent !== "boolean") ||
          (guest.previewOperator !== undefined && guest.previewOperator !== "producer") ||
          (guest.talkbackListening !== undefined && (typeof guest.talkbackListening !== "boolean" || next.role === "producer")) ||
          (guest.hostSpeaking !== undefined && (typeof guest.hostSpeaking !== "boolean" || guest.talkbackListening !== true || next.role === "producer")) ||
          typeof guest.microphone !== "boolean" || typeof guest.camera !== "boolean") ||
        (view && next.revision < view.revision)) throw new Error("Stale guest view");
    view = next;
    if (timer) clearTimeout(timer);
    const lease = next.connectionLeaseMs;
    deadline = typeof lease === "number" && Number.isFinite(lease) && lease > 0 && lease <= 5000
      ? requestedAt + lease : 0;
    if (next.closed || next.connectionPending || !next.mediaConfirmed || deadline <= clock()) {
      uncertain(); return;
    }
    status = "ready";
    if (talkbackTarget && next.role !== "host") stopDevices();
    if (next.role === "guest") {
      const own = next.guests[0];
      if (!own || !["waiting", "preview", "stage"].includes(own.position)) stopDevices();
      else {
        if (!own.microphone) stopKind("audio");
        if (!own.camera) stopKind("video");
      }
    } else if (next.role === "host" && next.hostTalkback?.confirmed === true) {
      stopKind("video");
      // Another host tab must not redirect this tab's live microphone.
      if (tracks.has("audio") && talkbackTarget !== next.hostTalkback.targetId) stopDevices();
    }
    else stopDevices();
    timer = setTimeout(uncertain, Math.max(0, deadline - clock()));
    notify();
  }
  async function refresh() {
    if (closed || (busy && preparingGuestRevision === null) || reading) return;
    reading = true;
    const sequence = ++readSequence;
    const requestedAt = clock();
    try {
      const next = await dependencies.read();
      if (closed || sequence !== readSequence) return;
      if (busy && (next.role !== "guest" || next.revision !== preparingGuestRevision)) {
        uncertain();
        return;
      }
      accept(next, requestedAt);
    } catch { if (!closed && sequence === readSequence) uncertain(); }
    finally { reading = false; }
  }
  async function command(input: BackstageCommand) {
    if (closed || busy || !view || status !== "ready" || clock() >= deadline) throw new Error("Refresh the guest studio first");
    if (input.expectedRevision !== view.revision) throw new Error("Refresh the guest studio first");
    busy = true; readSequence += 1;
    const talkback = input.action === "talkback";
    const kind: Kind | null = input.action === "microphone" || talkback ? "audio" : input.action === "camera" ? "video" : null;
    const deviceStart = kind !== null && input.enabled === true;
    const expectedStop = talkback && input.enabled === false && view.role === "host" &&
      view.hostTalkback?.confirmed === true && view.hostTalkback.targetId === talkbackTarget
      ? sources.get("audio")?.expectServerStop : undefined;
    if (["leave", "disconnect", "close", "host_only", "accept_producer", "leave_producer"].includes(input.action)) stopDevices();
    if (view.role === "host" && view.hostTalkback?.targetId === input.targetId && ["admit", "backstage", "remove"].includes(input.action)) stopDevices();
    if (kind && !deviceStart) {
      epoch += 1;
      if (expectedStop) {
        // Keep signaling available while the room withdraws the route. Removing
        // the remote source first would leave the old acknowledged route broken.
        expectedStop();
        stopTrack(kind);
      } else stopKind(kind);
      notify();
    }
    const attempt = epoch;
    let acquired: DeviceTrack[] = [];
    let source: Source | undefined;
    const valid = () => !closed && epoch === attempt && clock() < deadline;
    try {
      // Local off above is synchronous. Serialize the following room change
      // with owned-source retirement so it cannot race the server's cleanup.
      if (dependencies.waitForSourceClosures) {
        await dependencies.waitForSourceClosures();
        if (!valid()) throw new Error("Guest request ended");
      }
      if (deviceStart && kind) {
        if (talkback) {
          if (view.role !== "host" || view.hostTalkback || !view.guests.some(guest => guest.userId === input.targetId &&
            guest.position === "preview" && !guest.previewOperator && guest.talkbackListening === true)) throw new Error("Check private listening first");
        } else if (view.role !== "guest" || !view.guests[0] || !["waiting", "preview", "stage"].includes(view.guests[0].position)) throw new Error("Join first");
        const stream = await dependencies.getUserMedia({ audio: kind === "audio", video: kind === "video" });
        acquired = stream.getTracks();
        for (const track of acquired) track.enabled = false;
        if (!valid() || acquired.length !== 1 || acquired[0].kind !== kind || acquired[0].readyState !== "live") throw new Error("Device unavailable");
        const confirmGuestRoom = async () => {
          // Discard a background read started before this check. It cannot
          // replace a newer room decision after the publisher starts.
          preparingGuestRevision = null;
          readSequence += 1;
          const requestedAt = clock();
          const fresh = await dependencies.read();
          if (!valid() || fresh.role !== "guest" || fresh.revision !== input.expectedRevision) throw new Error("Guest access changed");
          accept(fresh, requestedAt);
          if (!valid() || status !== "ready") throw new Error("Guest connection expired");
          preparingGuestRevision = fresh.revision;
        };
        if (!talkback) await confirmGuestRoom();
        try {
          source = await dependencies.openSource(kind, acquired[0], talkback ? undefined : confirmGuestRoom);
        } finally {
          // A read started during negotiation must not override the command reply.
          preparingGuestRevision = null;
          readSequence += 1;
        }
        if (!valid()) throw new Error("Device request ended");
      }
      const requestedAt = clock();
      const next = await dependencies.send(input);
      if (!valid()) throw new Error("Guest request ended");
      if (expectedStop && next.hostTalkback) throw new Error("Talkback withdrawal was not confirmed");
      accept(next, requestedAt);
      if (deviceStart && kind) {
        const own = view?.guests[0];
        const deviceConfirmed = talkback ? view?.role === "host" && view.hostTalkback?.confirmed === true && view.hostTalkback.targetId === input.targetId
          : own?.[kind === "audio" ? "microphone" : "camera"];
        if (!valid() || status !== "ready" || !deviceConfirmed) throw new Error("Device not confirmed");
        stopKind(kind);
        const track = acquired[0];
        tracks.set(kind, track);
        sources.set(kind, source!);
        if (talkback) talkbackTarget = input.targetId;
        track.enabled = true;
        track.addEventListener?.("ended", () => { if (tracks.get(kind) === track) uncertain(); });
        acquired = []; source = undefined;
      }
      notify();
    } catch {
      for (const track of acquired) { track.enabled = false; track.stop(); }
      if (source) { try { Promise.resolve(source.close()).catch(() => undefined); } catch { /* remote uncertainty remains visible */ } }
      if (!closed) uncertain();
      throw new Error("The guest action was not confirmed. Your local devices are stopped; refresh before trying again.");
    } finally { busy = false; }
  }
  function dispose() {
    if (closed) return;
    closed = true; readSequence += 1;
    unsubscribe?.();
    if (timer) clearTimeout(timer);
    stopDevices(); view = null; status = "closed";
  }
  const unsubscribe = dependencies.subscribeSourceInvalidation?.(uncertain);
  return { refresh, command, stopDevices, dispose };
}
