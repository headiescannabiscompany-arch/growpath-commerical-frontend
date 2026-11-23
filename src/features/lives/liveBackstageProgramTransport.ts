import type { ApiError, apiRequest } from "../../api/apiRequest";
import type { ConnectedBackstageView } from "./liveBackstageDeviceController";
import type { BackstageCommand } from "./LiveBackstagePanel";
import type { PublisherTransport } from "./liveBackstagePublisher";
import type { ReceiverTransport } from "./liveBackstageReceiver";

type Session = { identityKey: string; token: string } | null;
export type ProgramTransport = { readHost(): Promise<boolean>; receiver: ReceiverTransport };
type TransportInput = {
  identityKey: string; liveId: string; currentIdentity(): string | null;
  readSession(): Promise<Session>; request: typeof apiRequest;
};
const validEndpoint = (value: unknown): value is string => typeof value === "string" && /^[A-Za-z0-9_-]{16,128}$/.test(value);
const validPeer = (value: unknown): value is string => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const missingEndpoint = Symbol("Missing private signaling endpoint");

// Unmounted binding to the existing private router contracts. Inject the existing
// apiRequest and account/session reader; never read URL credentials, store a token,
// choose an API host, or issue a public broadcaster link here.
export function createBackstageProgramTransport(input: TransportInput): ProgramTransport & { dispose(): void } {
  const binding = createReceiverTransport(input, "program");
  return { receiver: binding.receiver, readHost: binding.readAccess, dispose: binding.dispose };
}
export function createBackstagePreviewTransport(input: TransportInput) {
  return createReceiverTransport(input, "preview");
}
export function createBackstageTalkbackTransport(input: TransportInput) {
  // Same private receiver engine, distinct guest preflight. Never a program grant.
  return createReceiverTransport(input, "preview", true);
}

// A stale broker endpoint can disappear before its delayed close request.
// Accept this response only to discard the local signaling handle.
function endpointMissing(error: unknown) {
  if (!(error instanceof Error) || error.name !== "ApiError") return false;
  const { status, data } = error as ApiError;
  if (status !== 404 || typeof data !== "string" || data.length > 1024) return false;
  try { return JSON.parse(data)?.code === "PRIVATE_SIGNALING_UNAVAILABLE"; }
  catch { return false; }
}

function createPrivateBackstageRequest({ identityKey, liveId, currentIdentity, readSession, request }: TransportInput,
  unavailable: () => Error) {
  if (!identityKey || !/^[a-f0-9]{24}$/.test(liveId)) throw unavailable();
  const active = new Set<AbortController>();
  let disposed = false;
  const current = () => !disposed && currentIdentity() === identityKey;
  async function call<T>(path: string, body?: object, onMissingEndpoint?: () => T): Promise<T> {
    if (!current()) throw unavailable();
    const controller = new AbortController(); active.add(controller);
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const work = async () => {
        const session = await readSession();
        if (!current() || controller.signal.aborted || session?.identityKey !== identityKey ||
            typeof session.token !== "string" || !/^[A-Za-z0-9._~-]{1,8192}$/.test(session.token)) throw unavailable();
        if (body && new TextEncoder().encode(JSON.stringify(body)).length > 262144) throw unavailable();
        // Explicit header pins this request to the checked session. The shared
        // client must not read a later account's global token or emit private errors.
        let raw: string;
        try {
          raw = await request<string>(path, { method: body ? "POST" : "GET", body,
            headers: { Authorization: `Bearer ${session.token}` }, auth: false, retries: 0,
            responseType: "text", cache: "no-store", redirect: "error", timeoutMs: 5000,
            notifyTransport: false, notifyTokenBalance: false, invalidateOn401: false, signal: controller.signal });
        } catch (error) {
          if (onMissingEndpoint && current() && !controller.signal.aborted && endpointMissing(error)) return onMissingEndpoint();
          throw error;
        }
        if (!current() || controller.signal.aborted || typeof raw !== "string" || raw.length > 262144) throw unavailable();
        return JSON.parse(raw) as T;
      };
      return await Promise.race([work(), new Promise<never>((_, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(unavailable()); }, 5000);
      })]);
    } catch { throw unavailable(); }
    finally { clearTimeout(timer); active.delete(controller); }
  }
  return { call, dispose() { disposed = true; active.forEach(controller => controller.abort()); active.clear(); } };
}

type SignalingTransport = Pick<PublisherTransport, "register" | "poll" | "reply" | "close">;
function createEndpointTransport(liveId: string, target: "preview" | "program" | "publisher",
  call: ReturnType<typeof createPrivateBackstageRequest>["call"], unavailable: () => Error) {
  const endpoints = new Set<string>();
  let registrationStarted = false;
  let closing: Promise<{ closed: boolean }> | undefined;
  const base = `/api/lives/backstage-signaling/${liveId}`;
  function endpointPath(id: string) {
    if (!validEndpoint(id) || !endpoints.has(id)) throw unavailable();
    return `${base}/endpoints/${id}`;
  }
  async function closeEndpoint(id: string, path: string) {
    const value = await call<{ closed: boolean } | typeof missingEndpoint>(
      `${path}/close`, {}, target === "publisher" ? () => missingEndpoint : undefined
    );
    if (value !== missingEndpoint && value?.closed !== true) throw unavailable();
    endpoints.delete(id); registrationStarted = false;
    // Losing the old handle does not establish that the provider closed.
    return value === missingEndpoint ? { closed: false } : value;
  }
  const signaling: SignalingTransport = {
    async register(purpose) {
      if (closing) await closing.catch(() => undefined);
      if (purpose !== target || registrationStarted) throw unavailable();
      // A lost registration is not permission to allocate a parallel endpoint.
      registrationStarted = true;
      const result = await call<Awaited<ReturnType<SignalingTransport["register"]>>>(`${base}/endpoints`, { purpose: target });
      if (!validEndpoint(result?.endpointId) || result.liveId !== liveId || result.purpose !== target ||
          !Number.isInteger(result.leaseMs) || result.leaseMs < 5000 || result.leaseMs > 30000) throw unavailable();
      endpoints.add(result.endpointId); return result;
    },
    poll: id => call(`${endpointPath(id)}/poll`, {}),
    reply: (id, body) => call(`${endpointPath(id)}/reply`, { requestId: body.requestId, result: body.result }),
    async close(id) {
      const path = endpointPath(id);
      if (target !== "publisher") return closeEndpoint(id, path);
      closing ??= closeEndpoint(id, path).finally(() => { closing = undefined; });
      return closing;
    }
  };
  return { signaling, endpointPath };
}

export function createBackstageGuestTransport(input: TransportInput) {
  const unavailable = () => new Error("Guest media is unavailable. Stop your devices and refresh the guest studio.");
  const request = createPrivateBackstageRequest(input, unavailable);
  const { call } = request;
  const binding = createEndpointTransport(input.liveId, "publisher", call, unavailable);
  const controlPath = `/api/lives/backstage/${input.liveId}`;
  function sourcePath(endpointId: string, peerId: string) {
    if (!validPeer(peerId)) throw unavailable();
    return `${binding.endpointPath(endpointId)}/sources/${peerId}`;
  }
  const signaling: PublisherTransport = {
    ...binding.signaling,
    async prepareSource({ endpointId, kind, requestId }) {
      if ((kind !== "audio" && kind !== "video") || !validEndpoint(requestId)) throw unavailable();
      return call(`${binding.endpointPath(endpointId)}/sources`, { kind, requestId });
    },
    async activateSource({ endpointId, peerId }) { return call(`${sourcePath(endpointId, peerId)}/activate`, {}); },
    async closeSource({ endpointId, peerId }) { return call(`${sourcePath(endpointId, peerId)}/close`, {}); }
  };
  return {
    signaling,
    controls: {
      read: () => call<ConnectedBackstageView>(controlPath),
      send: (command: BackstageCommand) => call<ConnectedBackstageView>(`${controlPath}/command`, command)
    },
    dispose: request.dispose
  };
}

function createReceiverTransport(input: TransportInput, target: "preview" | "program", talkback = false) {
  const { liveId } = input;
  const unavailable = () => new Error(talkback ? "Private host audio is unavailable. Stop playback and check your guest listening choice." : target === "program"
    ? "Program output is unavailable. Stop playback and check your signed-in host session."
    : "Private preview is unavailable. Stop playback and check your signed-in host or producer session.");
  const { call, dispose } = createPrivateBackstageRequest(input, unavailable);
  const { signaling, endpointPath } = createEndpointTransport(liveId, target, call, unavailable);
  const receiver: ReceiverTransport = {
    ...signaling,
    async readReceivers(id) {
      const value = await call<Awaited<ReturnType<ReceiverTransport["readReceivers"]>>>(`${endpointPath(id)}/receivers/${target}`, {});
      if (talkback && (!Array.isArray(value?.receivers) || value.receivers.length > 1 || value.receivers.some(peer => peer.kind !== "audio"))) throw unavailable();
      return value;
    }
  };
  return { receiver,
    async readAccess() {
      const value = await call<{ sessionId?: string; role?: string; closed?: boolean;
        guests?: { position?: string; previewOperator?: string; talkbackListening?: boolean }[] }>(`/api/lives/backstage/${liveId}`);
      // Do not pass the host's roster to this capture-only UI.
      return value?.sessionId === liveId && value.closed === false && (talkback
        ? value.role === "guest" && value.guests?.length === 1 && value.guests[0].position === "preview" &&
          !value.guests[0].previewOperator && value.guests[0].talkbackListening === true
        : value.role === "host" || target === "preview" && value.role === "producer");
    },
    dispose
  };
}
