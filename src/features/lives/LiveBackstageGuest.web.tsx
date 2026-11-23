import React, { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { LiveBackstageConnectedPanel } from "./LiveBackstageConnectedPanel";
import { createBackstagePublisher, type PublisherTransport } from "./liveBackstagePublisher";
import type { BackstageDeviceDependencies } from "./liveBackstageDeviceController";

type Props = {
  identityKey: string; liveId: string; signaling: PublisherTransport;
  controls: Pick<BackstageDeviceDependencies, "read" | "send" | "getUserMedia" | "clock">;
  createPeerConnection: () => RTCPeerConnection; newRequestId: () => string;
  privatePreview?: React.ReactNode;
  privateTalkback?: React.ReactNode;
};
// No route mount or default authenticated transport. Guests need a browser, not
// OBS/XSplit. Stable account-bound dependencies must be supplied by the app entry.
export function LiveBackstageGuest(props: Props) {
  return <GuestSurface key={JSON.stringify([props.identityKey, props.liveId])} {...props} />;
}
function GuestSurface({ identityKey, liveId, signaling, controls, createPeerConnection, newRequestId, privatePreview, privateTalkback }: Props) {
  const [attempt, setAttempt] = useState(0);
  const [stopped, setStopped] = useState(false);
  const [operator, setOperator] = useState<"guest" | "host" | "producer">("guest");
  const [binding, setBinding] = useState<{ signaling: PublisherTransport; controls: Props["controls"];
    createPeerConnection: Props["createPeerConnection"]; newRequestId: Props["newRequestId"];
    attempt: number; operator: "guest" | "host" | "producer"; transport: Omit<BackstageDeviceDependencies, "changed"> } | null>(null);
  useEffect(() => {
    let active = true;
    if (operator === "producer") {
      // Producer control mode owns no publisher endpoint or capture device.
      // Dispose the previous guest composition on the role transition instead of
      // polling a now-ineligible publisher and hiding the new producer controls.
      const unavailable = async () => { throw new Error("Guest devices are unavailable in producer controls"); };
      setStopped(false);
      setBinding({ signaling, controls, createPeerConnection, newRequestId, attempt, operator,
        transport: { ...controls, openSource: unavailable, getUserMedia: unavailable } });
      return () => { active = false; };
    }
    const publisher = createBackstagePublisher({ liveId, transport: signaling, createPeerConnection, newRequestId,
      now: controls.clock, changed: state => { if (active && state === "stopped") setStopped(true); } });
    setStopped(false);
    setBinding({ signaling, controls, createPeerConnection, newRequestId, attempt, operator,
      transport: { ...controls, openSource: publisher.openSource, stopPendingSources: publisher.stopPendingSources,
        waitForSourceClosures: publisher.waitForSourceClosures,
        subscribeSourceInvalidation: publisher.subscribeSourceInvalidation } });
    return () => { active = false; publisher.dispose(); };
  }, [liveId, signaling, controls, createPeerConnection, newRequestId, attempt, operator]);
  const current = binding?.signaling === signaling && binding.controls === controls &&
    binding.createPeerConnection === createPeerConnection && binding.newRequestId === newRequestId && binding.attempt === attempt && binding.operator === operator;
  return <View style={{ gap: 12 }}>
    <Text>{operator !== "guest" ? "Screen guests from your browser. Private preview and talkback must stay out of the broadcast capture." : "Join from your browser. OBS or XSplit is only needed by a host who chooses that broadcasting app."}</Text>
    {stopped ? <>
      <Text accessibilityRole="alert">Your local camera and microphone are stopped. Reconnect to check access again. Server cleanup may still block a new connection.</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Reconnect guest media"
        onPress={() => { setStopped(false); setAttempt(value => value + 1); }} style={{ minHeight: 44, padding: 12 }}>
        <Text>Reconnect guest media</Text>
      </Pressable>
    </> : current && binding ? <LiveBackstageConnectedPanel key={attempt} identityKey={identityKey}
      sessionId={liveId} transport={binding.transport} privatePreview={privatePreview} privateTalkback={privateTalkback}
      onRole={setOperator} /> : <Text>Preparing guest controls…</Text>}
  </View>;
}
