import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { Text } from "react-native";
import { apiRequest } from "@/api/apiRequest";
import { useAuth } from "@/auth/AuthContext";
import { LiveBackstageGuest } from "./LiveBackstageGuest.web";
import { LiveBackstageProgram } from "./LiveBackstageProgram.web";
import { LiveBackstageReceiver } from "./LiveBackstageReceiver.web";
import {
  createBackstageGuestTransport, createBackstagePreviewTransport, createBackstageProgramTransport,
  createBackstageTalkbackTransport
} from "./liveBackstageProgramTransport";
import { readStagingBackstageLiveId, type StagingBackstageSurface } from "./liveBackstageStagingWeb";

type Scope = { identityKey: string; token: string; liveId: string; surface: StagingBackstageSurface };
const unavailable = () => new Error("This private rehearsal connection ended.");
const createMediaStream = (tracks: MediaStreamTrack[]) => new MediaStream(tracks);
const newRequestId = () => window.crypto.randomUUID();

function bindScope(scope: Scope, isCurrent: () => boolean) {
  const { identityKey, liveId, token, surface } = scope;
  let stopped = false;
  const peers = new Set<RTCPeerConnection>();
  const devices = new Set<MediaStreamTrack>();
  const current = () => !stopped && isCurrent() && readStagingBackstageLiveId(surface) === liveId;
  const input = {
    liveId, identityKey, request: apiRequest,
    currentIdentity: () => current() ? identityKey : null,
    readSession: async () => current() ? { identityKey, token } : null
  };
  const createPeerConnection = () => {
    if (!current()) throw unavailable();
    for (const peer of peers) if (peer.connectionState === "closed") peers.delete(peer);
    const peer = new RTCPeerConnection({ iceServers: [], bundlePolicy: "max-bundle" });
    peers.add(peer);
    return peer;
  };
  async function getUserMedia(constraints: { audio: boolean; video: boolean }) {
    if (!current()) throw unavailable();
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    if (!current()) {
      for (const track of stream.getTracks()) track.stop();
      throw unavailable();
    }
    for (const track of devices) if (track.readyState === "ended") devices.delete(track);
    for (const track of stream.getTracks()) devices.add(track);
    return stream;
  }
  function stop() {
    stopped = true;
    for (const track of devices) { track.enabled = false; track.stop(); }
    for (const peer of peers) peer.close();
    devices.clear();
    peers.clear();
  }

  if (surface === "program") {
    const program = createBackstageProgramTransport(input);
    return {
      surface, program, createPeerConnection,
      dispose() { stop(); program.dispose(); }
    };
  }
  const guest = createBackstageGuestTransport(input);
  const preview = createBackstagePreviewTransport(input);
  const talkback = createBackstageTalkbackTransport(input);
  return {
    surface, signaling: guest.signaling, controls: { ...guest.controls, getUserMedia },
    preview: preview.receiver, talkback: talkback.receiver, createPeerConnection,
    dispose() { stop(); guest.dispose(); preview.dispose(); talkback.dispose(); }
  };
}

export function StagingBackstageEntry({ surface }: { surface: StagingBackstageSurface }) {
  const params = useLocalSearchParams<{ liveId?: string }>();
  const locationId = readStagingBackstageLiveId(surface);
  const liveId = locationId === params.liveId ? locationId : null;
  const { token, user, isHydrating, meStatus } = useAuth();
  const identityKey = user?.id;
  const scope = useMemo<Scope | null>(() => liveId && !isHydrating && meStatus === "ready" &&
    identityKey && /^[a-f0-9]{24}$/.test(identityKey) && token && /^[A-Za-z0-9._~-]{1,8192}$/.test(token)
    ? { identityKey, token, liveId, surface } : null, [identityKey, isHydrating, liveId, meStatus, surface, token]);
  const latest = useRef(scope);
  latest.current = scope;
  const [entry, setEntry] = useState<{ scope: Scope; binding: ReturnType<typeof bindScope> } | null>(null);
  useEffect(() => {
    if (!scope) return;
    const binding = bindScope(scope, () => latest.current === scope);
    setEntry({ scope, binding });
    const hide = () => {
      binding.dispose();
      setEntry(current => current?.binding === binding ? null : current);
    };
    window.addEventListener("pagehide", hide);
    return () => {
      window.removeEventListener("pagehide", hide);
      binding.dispose();
    };
  }, [scope]);

  if (!liveId) return <Text accessibilityRole="alert">This private rehearsal is unavailable.</Text>;
  if (isHydrating || (token && (meStatus === "idle" || meStatus === "loading"))) {
    return <Text accessibilityLiveRegion="polite">Checking your signed-in account…</Text>;
  }
  if (!scope) {
    return <Text accessibilityRole="alert">Sign in to your staging account in a separate window, then reopen this rehearsal.</Text>;
  }
  if (entry?.scope !== scope) return <Text accessibilityLiveRegion="polite">Reopen the private rehearsal to connect.</Text>;
  const { binding } = entry;
  if (binding.surface === "program") {
    return <LiveBackstageProgram identityKey={scope.identityKey} liveId={scope.liveId}
      transport={binding.program} createPeerConnection={binding.createPeerConnection} createMediaStream={createMediaStream} />;
  }
  const receiverProps = {
    identityKey: scope.identityKey, liveId: scope.liveId, purpose: "preview" as const,
    createPeerConnection: binding.createPeerConnection, createMediaStream
  };
  return <LiveBackstageGuest identityKey={scope.identityKey} liveId={scope.liveId} signaling={binding.signaling}
    controls={binding.controls} createPeerConnection={binding.createPeerConnection} newRequestId={newRequestId}
    privatePreview={<LiveBackstageReceiver {...receiverProps} transport={binding.preview} />}
    privateTalkback={<LiveBackstageReceiver {...receiverProps} context="talkback" transport={binding.talkback} />} />;
}
