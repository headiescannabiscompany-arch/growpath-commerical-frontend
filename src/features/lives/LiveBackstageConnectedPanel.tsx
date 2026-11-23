import React, { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useAppTheme } from "@/theme/appTheme";
import { LiveBackstagePanel } from "./LiveBackstagePanel";
import { createBackstageDeviceController, type BackstageClientState, type BackstageDeviceDependencies } from "./liveBackstageDeviceController";

// Unmounted local integration surface. Supply one stable transport per identity
// and Live; there is deliberately no default network or camera implementation.
export function LiveBackstageConnectedPanel({ identityKey, sessionId, transport, privatePreview, privateTalkback, onRole }: {
  identityKey: string;
  sessionId: string;
  transport: Omit<BackstageDeviceDependencies, "changed">;
  // Existing receive-only preview surface, with its own account-bound transport.
  // Never supply program output here; no automatic connection/device acquisition.
  privatePreview?: React.ReactNode;
  privateTalkback?: React.ReactNode;
  onRole?: (role: "host" | "guest" | "producer") => void;
}) {
  const { palette } = useAppTheme();
  const scope = `${identityKey}:${sessionId}`;
  const current = useRef(scope);
  current.current = scope;
  const roleListener = useRef(onRole);
  roleListener.current = onRole;
  const controller = useRef<ReturnType<typeof createBackstageDeviceController> | null>(null);
  const [snapshot, setSnapshot] = useState<{ scope: string; transport: typeof transport; state: BackstageClientState } | null>(null);
  const [playbackStop, setPlaybackStop] = useState<{ scope: string; transport: typeof transport; revision: number } | null>(null);
  const state = snapshot?.scope === scope && snapshot.transport === transport ? snapshot.state : null;
  useEffect(() => {
    let active = true;
    const client = createBackstageDeviceController(sessionId, { ...transport, changed: (value) => {
      if (active && current.current === scope) {
        setSnapshot({ scope, transport, state: value });
        if (value.status === "ready" && value.view) roleListener.current?.(value.view.role);
      }
    } });
    controller.current = client;
    void client.refresh(); // Read only; never opens devices or joins a queue.
    const poll = setInterval(() => void client.refresh(), 2000);
    return () => {
      active = false;
      clearInterval(poll);
      client.dispose();
      if (controller.current === client) controller.current = null;
    };
  }, [scope, sessionId, transport]);

  return <View style={{ gap: 12 }}>
    <Text style={{ color: palette.text }}>Guest device controls do not change the host's broadcast in OBS or XSplit.</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Stop my camera and microphone"
      onPress={() => controller.current?.stopDevices()} style={{ minHeight: 44, padding: 12 }}>
      <Text style={{ color: palette.text }}>Stop my camera and microphone</Text>
    </Pressable>
    <Text accessibilityLiveRegion="polite" style={{ color: palette.text }}>
      Local microphone: {state?.microphone ? "on" : "off"}. Local camera: {state?.camera ? "on" : "off"}.
    </Text>
    {state?.status !== "ready" && <>
      <Text accessibilityRole="alert" style={{ color: palette.text }}>
        {state?.status === "uncertain" ? "Your local devices are stopped. The server connection is not confirmed." : "Checking the guest connection…"}
      </Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Refresh guest connection"
        onPress={() => void controller.current?.refresh()} style={{ minHeight: 44, padding: 12 }}>
        <Text style={{ color: palette.text }}>Refresh guest connection</Text>
      </Pressable>
    </>}
    {state?.view && <LiveBackstagePanel view={state.view} identityKey={identityKey}
      connectionReady={state.status === "ready"}
      onCommand={async (command) => {
        if (!controller.current || current.current !== scope) throw new Error("Guest session changed");
        if ((command.action === "talkback_listen" && !command.enabled) || ["leave", "disconnect", "accept_producer"].includes(command.action)) {
          setPlaybackStop({ scope, transport, revision: command.expectedRevision });
        }
        await controller.current.command(command);
      }} />}
    {state?.status === "ready" && !state.view?.closed &&
      (state.view?.role === "host" || state.view?.role === "producer") &&
      <React.Fragment key={scope}>{privatePreview}</React.Fragment>}
    {state?.status === "ready" && !state.view?.closed && state.view?.role === "guest" &&
      state.view.guests[0]?.position === "preview" && !state.view.guests[0]?.previewOperator && state.view.guests[0]?.talkbackListening === true &&
      !(playbackStop?.scope === scope && playbackStop.transport === transport && state.view.revision <= playbackStop.revision) &&
      <React.Fragment key={`${scope}:talkback`}>{privateTalkback}</React.Fragment>}
  </View>;
}
