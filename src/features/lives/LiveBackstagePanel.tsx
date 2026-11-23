import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { useAppTheme } from "@/theme/appTheme";

// R11 local preparation. No app route, network transport or device acquisition.
// An authenticated adapter must supply server views and enforce media isolation.
export type BackstageGuest = {
  userId?: string;
  displayName: string;
  position: "waiting" | "preview" | "stage" | "left" | "removed";
  microphone: boolean;
  camera: boolean;
  connection: "unconfirmed" | "off" | "private_preview" | "on_air";
  producerPreviewConsent?: boolean;
  previewOperator?: "producer";
  talkbackListening?: boolean;
  hostSpeaking?: boolean;
};
export type BackstageView = {
  sessionId: string;
  revision: number;
  role: "host" | "guest" | "producer";
  producer?: { userId: string; displayName: string; status: "invited" | "active" };
  producerInvitation?: boolean;
  hostTalkback?: { targetId: string; confirmed: boolean };
  queueOpen: boolean;
  closed: boolean;
  mediaConfirmed: boolean;
  stageLimit: number;
  waitingLimit: number;
  guests: BackstageGuest[];
};
export type BackstageCommand = {
  action: string;
  expectedRevision: number;
  targetId?: string;
  enabled?: boolean;
  displayName?: string;
  previewConsent?: boolean;
  programConsent?: boolean;
  producerPreviewConsent?: boolean;
  consentVersion?: string;
};

function connectionLabel(guest: BackstageGuest) {
  if (guest.connection === "unconfirmed") return "Connection not confirmed — do not assume you are off air";
  if (guest.connection === "on_air") return "On air — viewers can receive your enabled camera and microphone";
  if (guest.connection === "private_preview") return guest.previewOperator === "producer"
    ? "Private preview — only the assigned producer can receive your enabled camera and microphone"
    : "Private preview — only the host can receive your enabled camera and microphone";
  return "Not connected to the host or audience";
}

export function LiveBackstagePanel({
  view, identityKey, connectionReady = false, onCommand
}: {
  view: BackstageView;
  identityKey: string;
  connectionReady?: boolean;
  onCommand: (command: BackstageCommand) => Promise<void>;
}) {
  const { palette } = useAppTheme();
  const [name, setName] = useState("");
  const [previewConsent, setPreviewConsent] = useState(false);
  const [programConsent, setProgramConsent] = useState(false);
  const [producerConsent, setProducerConsent] = useState(false);
  const [broadcastMuted, setBroadcastMuted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [uncertainRevision, setUncertainRevision] = useState<number | null>(null);
  const scope = `${identityKey}:${view.sessionId}`;
  const currentScope = useRef(scope);
  currentScope.current = scope;
  const operation = useRef(0);
  const inFlight = useRef(false);
  const own = view.role === "guest" ? view.guests[0] : undefined;
  const joined = !!own && ["waiting", "preview", "stage"].includes(own.position);

  useEffect(() => {
    operation.current += 1;
    inFlight.current = false;
    setBusy(false);
    setError("");
    setUncertainRevision(null);
    setName("");
    setPreviewConsent(false);
    setProgramConsent(false);
    setProducerConsent(false);
    setBroadcastMuted(false);
    return () => { operation.current += 1; };
  }, [scope]);
  useEffect(() => {
    setPreviewConsent(false);
    setProgramConsent(false);
    setProducerConsent(false);
  }, [joined]);
  useEffect(() => { if (!connectionReady || view.role !== "host" || !view.hostTalkback) setBroadcastMuted(false); },
    [connectionReady, view.role, view.hostTalkback?.targetId]);
  useEffect(() => {
    if (uncertainRevision !== null && view.revision !== uncertainRevision) {
      setUncertainRevision(null);
      setError("");
    }
  }, [view.revision, uncertainRevision]);

  const send = async (command: Omit<BackstageCommand, "expectedRevision">) => {
    if (inFlight.current || !connectionReady || view.closed || uncertainRevision !== null) return;
    inFlight.current = true;
    const sequence = ++operation.current;
    setBusy(true);
    setError("");
    try {
      await onCommand({ ...command, expectedRevision: view.revision });
    } catch {
      if (currentScope.current === scope && sequence === operation.current) {
        setUncertainRevision(view.revision);
        setError("The action was not confirmed. Reload the guest studio before trying again. Your media state may still be changing; close your camera or microphone in your device controls if needed.");
      }
    } finally {
      if (currentScope.current === scope && sequence === operation.current) {
        inFlight.current = false;
        setBusy(false);
      }
    }
  };
  const disabled = busy || !connectionReady || view.closed || uncertainRevision !== null;
  const button = (label: string, command: Omit<BackstageCommand, "expectedRevision">, blocked = false) => (
    <Pressable accessibilityRole="button" accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || blocked }} disabled={disabled || blocked}
      onPress={() => void send(command)} style={[styles.button, { borderColor: palette.border }]}>
      <Text style={{ color: palette.text }}>{label}</Text>
    </Pressable>
  );

  return <View style={[styles.panel, { backgroundColor: palette.card, borderColor: palette.border }]}>
    <Text accessibilityRole="header" style={[styles.heading, { color: palette.text }]}>Live guest studio</Text>
    {!connectionReady && <Text style={{ color: palette.text }}>Guest connections are not available yet. Existing OBS broadcasting is unchanged.</Text>}
    {view.closed && <Text style={{ color: palette.text }}>This guest session has ended.</Text>}
    {busy && <Text accessibilityLiveRegion="polite" style={{ color: palette.text }}>Waiting for confirmation…</Text>}
    {!!error && <Text accessibilityRole="alert" style={{ color: palette.text }}>{error}</Text>}
    {view.producerInvitation && view.role === "guest" && <View style={styles.guest}>
      <Text accessibilityRole="header" style={[styles.heading, { color: palette.text }]}>Producer invitation</Text>
      <Text style={{ color: palette.text }}>The host invited you to screen consenting guests and manage their stage admission, mute and removal for this session. Accepting stops your guest camera and microphone. This does not grant billing, broadcast keys, public program output or chat-moderation access.</Text>
      <View style={styles.actions}>
        {button("Accept producer role", { action: "accept_producer" })}
        {button("Decline producer invitation", { action: "decline_producer" })}
      </View>
    </View>}
    {view.role === "host" || view.role === "producer" ? <>
      <Text style={{ color: palette.text }}>Up to {view.stageLimit} on stage, including {view.role === "host" ? "you" : "the host"}. Up to {view.waitingLimit} waiting backstage.</Text>
      {view.role === "producer" && <>
        <Text style={{ color: palette.text }}>Producer controls — only guests who opted into producer screening appear here. Preview stays private; do not capture this screen or its audio in OBS or XSplit. Use headphones.</Text>
        <Text style={{ color: palette.text }}>No billing, broadcast-key, public program output or chat-moderation access is granted. The host alone controls the queue and emergency Host only.</Text>
        {button("Leave producer role", { action: "leave_producer" })}
      </>}
      {view.role === "host" && <View style={styles.actions}>
        {button(view.queueOpen ? "Close guest queue" : "Open guest queue", { action: view.queueOpen ? "close_queue" : "open_queue" })}
        {button("Host only — disconnect all guests", { action: "host_only" })}
      </View>}
      {view.role === "host" && view.producer && <View style={styles.guest}>
        <Text style={{ color: palette.text }}>Producer: {view.producer.displayName} — {view.producer.status === "invited" ? "invitation awaiting acceptance" : "role assigned; current Live access is still required"}.</Text>
        {button(view.producer.status === "invited" ? "Cancel producer invitation" : "Revoke producer role", { action: "revoke_producer" })}
      </View>}
      {view.role === "host" && <View style={styles.guest}>
        <Text accessibilityRole="header" style={[styles.heading, { color: palette.text }]}>Private host talkback</Text>
        <Text style={{ color: palette.text }}>Talk to one consenting guest in your host preview, never the program feed. Mute your broadcast microphone in OBS or XSplit first; GrowPath cannot mute that separate microphone or prevent desktop capture. Use headphones and keep backstage audio out of your broadcast.</Text>
        <View style={styles.consent}><Switch accessibilityLabel="My broadcast microphone is muted" value={broadcastMuted}
          onValueChange={value => { setBroadcastMuted(value); if (!value && view.hostTalkback) void send({ action: "talkback", enabled: false }); }}
          disabled={disabled} /><Text style={[styles.consentText, { color: palette.text }]}>I have muted my broadcast microphone and checked that private audio is excluded from the broadcast.</Text></View>
        {view.hostTalkback && <>
          <Text accessibilityLiveRegion="polite" style={{ color: palette.text }}>{view.hostTalkback.confirmed ? "Private host route confirmed; check your local microphone status below." : "Private host route is not confirmed."}</Text>
          {button("Stop private talkback", { action: "talkback", enabled: false })}
        </>}
      </View>}
      {view.guests.length === 0 && <Text style={{ color: palette.text }}>{view.role === "producer" ? "No guest requests with producer permission yet." : "No guest requests yet."}</Text>}
      {view.guests.map((guest) => <View key={guest.userId} style={styles.guest}>
        <Text style={[styles.heading, { color: palette.text }]}>{guest.displayName}</Text>
        <Text style={{ color: palette.text }}>Requested position: {guest.position}</Text>
        <Text accessibilityLiveRegion="polite" style={{ color: palette.text }}>{connectionLabel(guest)}</Text>
        {["waiting", "preview", "stage"].includes(guest.position) && <View style={styles.actions}>
          {guest.position === "waiting" && button(`Preview ${guest.displayName}`, { action: "preview", targetId: guest.userId })}
          {guest.position === "preview" && button(`Bring ${guest.displayName} on stage`, { action: "admit", targetId: guest.userId }, view.guests.filter((g) => g.position === "stage").length >= view.stageLimit - 1)}
          {guest.position !== "waiting" && button(`Return ${guest.displayName} backstage`, { action: "backstage", targetId: guest.userId })}
          {button(`Mute ${guest.displayName}`, { action: "mute", targetId: guest.userId })}
          {button(`Remove ${guest.displayName} for this session`, { action: "remove", targetId: guest.userId })}
          {view.role === "host" && guest.position === "waiting" && !view.producer && button(`Invite ${guest.displayName} as producer`, { action: "invite_producer", targetId: guest.userId })}
          {view.role === "host" && guest.position === "preview" && !guest.previewOperator &&
            button(`Talk privately to ${guest.displayName}`, { action: "talkback", enabled: true, targetId: guest.userId },
              !broadcastMuted || guest.talkbackListening !== true || !!view.hostTalkback)}
        </View>}
        {view.role === "host" && guest.position === "preview" && !guest.previewOperator && guest.talkbackListening !== true &&
          <Text style={{ color: palette.text }}>Waiting for this guest to allow private host listening.</Text>}
      </View>)}
    </> : joined && own ? <>
      <Text accessibilityLiveRegion="polite" style={{ color: palette.text }}>{connectionLabel(own)}</Text>
      <Text style={{ color: palette.text }}>Waiting is not on air. The host{own.producerPreviewConsent ? " or the assigned producer" : ""} must preview and admit you. On-air content may be recorded in the replay.</Text>
      <View style={styles.actions}>
        {button(own.microphone ? "Turn my microphone off" : "Turn my microphone on", { action: "microphone", enabled: !own.microphone })}
        {button(own.camera ? "Turn my camera off" : "Turn my camera on", { action: "camera", enabled: !own.camera })}
        {button("Leave guest session", { action: "leave" })}
      </View>
      {own.position === "preview" && !own.previewOperator && <View style={styles.guest}>
        <Text style={{ color: palette.text }}>You can choose to hear the host privately. Listening does not enable your microphone or put you on air. Use headphones; Connect and Enable audio in the private playback controls after allowing listening.</Text>
        {button(own.talkbackListening ? "Stop private host listening" : "Allow private host listening",
          { action: "talkback_listen", enabled: !own.talkbackListening })}
        {own.talkbackListening && <Text accessibilityLiveRegion="polite" style={{ color: palette.text }}>{own.hostSpeaking ? "The host's private audio route is confirmed. Playback is controlled separately below." : "Private listening allowed; the host is not yet confirmed as speaking."}</Text>}
      </View>}
    </> : own?.position === "removed" ? <Text style={{ color: palette.text }}>The host removed you from this guest session. Rejoining is unavailable.</Text> : <>
      {!view.queueOpen && <Text style={{ color: palette.text }}>The host is not accepting guest requests.</Text>}
      <Text style={{ color: palette.text }}>Joining is optional. Watching does not share your camera or microphone.</Text>
      <TextInput accessibilityLabel="Guest display name" placeholder="Your display name" maxLength={80}
        value={name} onChangeText={setName} editable={!disabled} style={[styles.input, { color: palette.text, borderColor: palette.border }]} />
      <View style={styles.consent}><Switch accessibilityLabel="Allow private host preview" value={previewConsent} onValueChange={setPreviewConsent} disabled={disabled} /><Text style={[styles.consentText, { color: palette.text }]}>I allow the host to preview media I choose to enable. Backstage media must stay out of the audience stream and replay.</Text></View>
      <View style={styles.consent}><Switch accessibilityLabel="Allow admission and on-air recording" value={programConsent} onValueChange={setProgramConsent} disabled={disabled} /><Text style={[styles.consentText, { color: palette.text }]}>The host may bring me on air. My enabled media will then be visible or audible to viewers and may be recorded in the replay.</Text></View>
      <View style={styles.consent}><Switch accessibilityLabel="Allow optional producer screening" value={producerConsent} onValueChange={setProducerConsent} disabled={disabled} /><Text style={[styles.consentText, { color: palette.text }]}>Optional: I also allow the host's assigned producer to see my guest request, privately preview my enabled media, and admit, mute or remove me. Leave this off for host-only screening. It grants no access to my account or other records.</Text></View>
      {button("Request to join", { action: "join", displayName: name.trim(), previewConsent, programConsent,
        ...(producerConsent ? { producerPreviewConsent: true } : {}), consentVersion: "backstage-preview-and-program-v1" }, !view.queueOpen || !name.trim() || !previewConsent || !programConsent)}
    </>}
  </View>;
}

const styles = StyleSheet.create({
  panel: { padding: 16, gap: 12, borderWidth: 1, borderRadius: 12, width: "100%" },
  heading: { fontSize: 18, fontWeight: "700" },
  guest: { gap: 8, paddingVertical: 12 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  button: { minHeight: 44, borderWidth: 1, borderRadius: 8, padding: 12, justifyContent: "center", flexShrink: 1 },
  input: { minHeight: 44, borderWidth: 1, borderRadius: 8, padding: 10 },
  consent: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  consentText: { flex: 1, flexShrink: 1 }
});
