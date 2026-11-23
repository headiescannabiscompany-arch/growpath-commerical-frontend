import React, { useEffect, useRef, useState } from "react";
import { createBackstageReceiver, type ReceiverPurpose, type ReceiverState, type ReceiverTransport } from "./liveBackstageReceiver";
import { createBackstageReceiverDom } from "./liveBackstageReceiverDom";

// Unmounted web surface. Parent must supply stable authenticated dependencies
// and remount on identity/Live changes. No public or OBS bearer link is created.
export function LiveBackstageReceiver(props: {
  identityKey: string; liveId: string; purpose: ReceiverPurpose; transport: ReceiverTransport;
  createPeerConnection: () => RTCPeerConnection; createMediaStream: (tracks: MediaStreamTrack[]) => MediaStream;
  context?: "talkback";
}) {
  if (props.context === "talkback" && props.purpose !== "preview") throw new Error("Talkback must use private playback");
  return <ReceiverSurface key={JSON.stringify([props.identityKey, props.liveId, props.purpose, props.context])} {...props} />;
}
function ReceiverSurface({ liveId, purpose, transport, createPeerConnection, createMediaStream, context }: Parameters<typeof LiveBackstageReceiver>[0]) {
  const surface = useRef<HTMLDivElement>(null);
  const instance = useRef<ReturnType<typeof createBackstageReceiver> | null>(null);
  const reconnectRequested = useRef(false);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<ReceiverState>({ status: "idle", audible: false, participants: 0 });
  useEffect(() => {
    if (!surface.current) return;
    let active = true;
    const client = createBackstageReceiver({ liveId, purpose, transport, createPeerConnection,
      sink: createBackstageReceiverDom({ container: surface.current, purpose, createMediaStream, audioOnly: context === "talkback" }),
      changed: value => { if (active) setState(value); } });
    instance.current = client; setState(client.snapshot());
    if (reconnectRequested.current) { reconnectRequested.current = false; void client.start(); }
    return () => { active = false; client.stop(); if (instance.current === client) instance.current = null; };
  }, [liveId, purpose, transport, createPeerConnection, createMediaStream, attempt]);
  const label = context === "talkback" ? "Private host audio" : purpose === "preview" ? "Private guest preview" : "Guest program output";
  return <section aria-label={label}>
    <h2>{label}</h2>
    <p>{context === "talkback" ? "Only the host's return audio is routed here while you allow listening in host preview. Use headphones. This does not enable your microphone or connect you to the audience. Stop private host listening in guest controls to withdraw permission."
      : purpose === "preview"
      ? "Private screening: only feeds assigned to your current host or producer role appear here. Use headphones; keep this view and its audio out of your broadcast capture."
      : "Only admitted guest feeds appear here. Your host camera stays in your broadcasting app (OBS or XSplit). This view does not start a broadcast."}</p>
    {state.status === "idle" && <button type="button" onClick={() => { void instance.current?.start(); }}>Connect {label.toLowerCase()}</button>}
    {state.status === "stopped" && <button type="button" onClick={() => {
      reconnectRequested.current = true; setAttempt(value => value + 1);
    }}>Reconnect {label.toLowerCase()}</button>}
    {state.status !== "idle" && state.status !== "stopped" && <button type="button" onClick={() => instance.current?.stop()}>Stop this playback</button>}
    <p role="status">{state.status === "idle" ? "Not connected. Camera and microphone are not requested."
      : state.status === "connecting" ? "Connecting private playback…"
      : state.status === "waiting" ? "Waiting for current server-confirmed routes. Nothing is playing here."
      : state.status === "stopped" ? "Local playback stopped. Reconnect to check access again; remote cleanup is separate and may still block recovery."
      : context === "talkback" ? (state.participants ? (state.audible ? "Host audio playing through your selected output. Use headphones." : "Host audio connected. Playback remains muted until you enable it.") : "Waiting for the host to start private talkback.")
      : state.participants ? `${state.participants} guest feed${state.participants === 1 ? "" : "s"} connected. Not proof of audience delivery.`
      : "No guest feeds routed here. Your broadcaster's host scene is unchanged."}</p>
    <button type="button" disabled={state.status !== "ready"} aria-pressed={state.audible}
      onClick={() => instance.current?.setAudible(!state.audible)}>
      {state.audible ? "Mute" : "Enable"} {purpose === "preview" ? "private headphone audio" : "program audio"}
    </button>
    <div ref={surface} aria-label={`${label} media`} />
  </section>;
}
