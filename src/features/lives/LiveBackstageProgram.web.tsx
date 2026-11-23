import React, { useLayoutEffect, useRef, useState } from "react";
import { createBackstageReceiver, type ReceiverState } from "./liveBackstageReceiver";
import { createBackstageReceiverDom } from "./liveBackstageReceiverDom";
import type { ProgramTransport } from "./liveBackstageProgramTransport";

type Props = {
  identityKey: string | null; liveId: string; transport: ProgramTransport;
  createPeerConnection: () => RTCPeerConnection; createMediaStream: (tracks: MediaStreamTrack[]) => MediaStream;
};
// Dedicated, unmounted output entry. Do not wrap in normal app navigation/login
// redirects, mount preview beside it or give it a public/bearer URL. A future
// authenticated entry must supply stable account-bound dependencies.
export function LiveBackstageProgram(props: Props) {
  const [clean, setClean] = useState(false);
  const stop = useRef<(() => void) | null>(null);
  useLayoutEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { stop.current?.(); setClean(false); }
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, []);
  return <main aria-label="Guest program output" data-clean-output={clean ? "true" : "false"}
    style={clean ? { position: "fixed", inset: 0, background: "#000", color: "#fff", overflow: "hidden", zIndex: 2147483647 }
      : { background: "#101713", color: "#fff", padding: 16 }}>
    {props.identityKey ? <ProgramSurface key={JSON.stringify([props.identityKey, props.liveId])} {...props}
      clean={clean} onClean={() => setClean(true)} stopRef={stop} />
      : !clean && <p role="alert">Sign in to the existing host account outside the captured window, then reopen program output.</p>}
  </main>;
}
function ProgramSurface({ liveId, transport, createPeerConnection, createMediaStream, clean, onClean, stopRef }: Props & {
  clean: boolean; onClean(): void; stopRef: React.MutableRefObject<(() => void) | null>;
}) {
  const container = useRef<HTMLDivElement>(null), client = useRef<ReturnType<typeof createBackstageReceiver> | null>(null);
  const [attempt, setAttempt] = useState(0), [access, setAccess] = useState<"checking" | "host" | "unavailable">("checking");
  const [state, setState] = useState<ReceiverState>({ status: "idle", audible: false, participants: 0 });
  useLayoutEffect(() => {
    if (!container.current) return;
    let active = true;
    setAccess("checking"); setState({ status: "idle", audible: false, participants: 0 });
    const receiver = createBackstageReceiver({ liveId, purpose: "program", transport: transport.receiver,
      createPeerConnection, sink: createBackstageReceiverDom({ container: container.current, purpose: "program", createMediaStream }),
      changed: value => { if (active) setState(value); } });
    client.current = receiver; stopRef.current = receiver.stop;
    const stop = () => receiver.stop();
    const timer = setTimeout(() => { if (active) { active = false; receiver.stop(); setAccess("unavailable"); } }, 5000);
    void Promise.resolve().then(() => transport.readHost()).then(allowed => {
      if (active) { clearTimeout(timer); setAccess(allowed ? "host" : "unavailable"); }
    }).catch(() => { if (active) { clearTimeout(timer); setAccess("unavailable"); receiver.stop(); } });
    window.addEventListener("pagehide", stop);
    return () => {
      active = false; clearTimeout(timer); receiver.stop(); window.removeEventListener("pagehide", stop);
      if (client.current === receiver) client.current = null;
      if (stopRef.current === receiver.stop) stopRef.current = null;
    };
  }, [liveId, transport, createPeerConnection, createMediaStream, attempt, stopRef]);
  return <>
    {!clean && <section aria-label="Program setup controls">
      <h1>Guest output for OBS or XSplit</h1>
      <p>This dedicated view contains admitted program feeds only. Keep private preview in a separate, uncaptured window.
        Use headphones for private preview and exclude desktop audio from the broadcast mix. Verify the mix in your broadcaster before going live.</p>
      <p>Your host camera stays in OBS or XSplit. These controls do not request a camera/microphone or start a broadcast.
        Clean output hides setup controls. Press Escape to stop this playback and return to setup.</p>
      <p role="status">{access === "checking" ? "Checking signed-in host access…" : access === "unavailable" ? "Host access is unavailable. Nothing is playing."
        : state.status === "idle" ? "Host access checked. Connect program output when ready."
        : state.status === "ready" ? `${state.participants} admitted guest feed(s). Program audio ${state.audible ? "on" : "muted"}. Audience delivery is not verified.`
        : state.status === "stopped" ? "Playback stopped. Check access again before reconnecting; remote cleanup may still be pending."
        : "Waiting for current program routes. No private preview is shown."}</p>
      {access === "unavailable" || state.status === "stopped" ? <button type="button" onClick={() => setAttempt(value => value + 1)}>Check host access again</button>
        : <button type="button" disabled={access !== "host" || state.status !== "idle"} onClick={() => { void client.current?.start(); }}>Connect program output</button>}
      <button type="button" disabled={state.status !== "ready"} aria-pressed={state.audible}
        onClick={() => client.current?.setAudible(!state.audible)}>{state.audible ? "Mute program audio" : "Enable program audio"}</button>
      <button type="button" disabled={state.status !== "ready"} onClick={onClean}>Show clean output</button>
      <button type="button" onClick={() => client.current?.stop()}>Stop program playback</button>
    </section>}
    <div ref={container} aria-label="Admitted guest program media" />
  </>;
}
