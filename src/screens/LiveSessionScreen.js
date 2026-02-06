import React, { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import { handleApiError } from "@/utils/handleApiError";
import { useLiveSession } from "@/hooks/useLiveSession";

export default function LiveSessionScreen({ route }) {
  const mode = route?.params?.mode || "join"; // "host" | "join"
  const [sessionCode, setSessionCode] = useState("");
  const [displayName, setDisplayName] = useState("Guest");
  const [session, setSession] = useState(null);

  const { hostAsync, joinAsync, endAsync, isWorking } = useLiveSession();

  const title = useMemo(
    () => (mode === "host" ? "Host Live Session" : "Join Live Session"),
    [mode]
  );

  const isLive = Boolean(session);

  async function host() {
    if (isWorking) return;
    try {
      const s = await hostAsync({ displayName });
      setSession(s);
    } catch (e) {
      handleApiError(e);
      Alert.alert("Host failed", e?.message || "Could not start session.");
    }
  }

  async function join() {
    if (isWorking) return;
    const code = sessionCode.trim();
    if (!code) return Alert.alert("Join", "Enter a session code.");

    try {
      const s = await joinAsync({ code, displayName });
      setSession(s);
    } catch (e) {
      handleApiError(e);
      Alert.alert("Join failed", e?.message || "Could not join session.");
    }
  }

  async function end() {
    Alert.alert("End session", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "End",
        style: "destructive",
        onPress: async () => {
          try {
            const sessionId = String(session?.id || session?._id || "");
            if (sessionId) await endAsync({ sessionId });
          } catch (e) {
            // Ending is best-effort; still route errors
            handleApiError(e);
          } finally {
            setSession(null);
            setSessionCode("");
          }
        }
      }
    ]);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>{title}</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Display name</Text>
        <TextInput
          value={displayName}
          onChangeText={setDisplayName}
          style={styles.input}
        />

        {mode !== "host" && (
          <>
            <Text style={styles.label}>Session code</Text>
            <TextInput
              value={sessionCode}
              onChangeText={setSessionCode}
              style={styles.input}
              autoCapitalize="characters"
              placeholder="e.g. GP-7K2Q"
            />
          </>
        )}

        {isLive ? (
          <View style={{ gap: 10 }}>
            <View style={styles.liveBox}>
              <Text style={styles.liveTitle}>LIVE</Text>
              <Text style={styles.muted}>
                Session: {session?.code || session?.id || session?._id || "—"}
              </Text>
              <Text style={styles.muted}>
                This screen is ready for your next step: WebRTC / Twitch embed / realtime
                chat.
              </Text>
            </View>

            <Pressable style={styles.dangerBtn} onPress={end} disabled={isWorking}>
              <Text style={styles.dangerText}>End Session</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={[styles.btn, isWorking && styles.btnDisabled]}
            onPress={mode === "host" ? host : join}
            disabled={isWorking}
          >
            <Text style={styles.btnText}>
              {isWorking ? "Working…" : mode === "host" ? "Start" : "Join"}
            </Text>
          </Pressable>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>What this screen is for</Text>
        <Text style={styles.muted}>
          This is the “live test” feature for your app drop: host a session, invite
          friends, capture feedback in realtime. It’s also the foundation for creator-led
          walkthroughs and facility SOP training sessions.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, padding: 14 },
  title: { fontSize: 22, fontWeight: "900" },
  card: {
    marginTop: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff"
  },
  label: { marginTop: 10, fontSize: 12, color: "#6B7280", fontWeight: "800" },
  input: {
    marginTop: 8,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    backgroundColor: "#fff"
  },
  btn: {
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#111827",
    alignItems: "center"
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontWeight: "900" },
  muted: { color: "#6B7280", marginTop: 8, lineHeight: 18 },
  sectionTitle: { fontSize: 14, fontWeight: "900" },
  liveBox: { borderRadius: 14, borderWidth: 1, borderColor: "#111827", padding: 12 },
  liveTitle: { fontWeight: "900", fontSize: 16 },
  dangerBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EF4444",
    alignItems: "center"
  },
  dangerText: { color: "#EF4444", fontWeight: "900" }
});
