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

async function safeFetchJson(url, opts) {
  const res = await fetch(url, {
    ...(opts || {}),
    headers: { "Content-Type": "application/json", ...(opts?.headers || {}) }
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (!res.ok) throw new Error(json?.message || `Request failed (${res.status})`);
  return json;
}

export default function LiveSessionScreen({ route }) {
  const mode = route?.params?.mode || "join"; // "host" | "join"
  const [sessionCode, setSessionCode] = useState("");
  const [displayName, setDisplayName] = useState("Guest");
  const [status, setStatus] = useState("idle"); // idle | working | live
  const [session, setSession] = useState(null);

  const title = useMemo(
    () => (mode === "host" ? "Host Live Session" : "Join Live Session"),
    [mode]
  );

  async function host() {
    setStatus("working");
    try {
      const data = await safeFetchJson("https://example.com/api/live/host", {
        method: "POST",
        body: JSON.stringify({ displayName })
      });
      setSession(data?.session || data);
      setStatus("live");
    } catch (e) {
      Alert.alert("Host failed", e.message || "Could not start session.");
      setStatus("idle");
    }
  }

  async function join() {
    const code = sessionCode.trim();
    if (!code) return Alert.alert("Join", "Enter a session code.");
    setStatus("working");
    try {
      const data = await safeFetchJson("https://example.com/api/live/join", {
        method: "POST",
        body: JSON.stringify({ code, displayName })
      });
      setSession(data?.session || data);
      setStatus("live");
    } catch (e) {
      Alert.alert("Join failed", e.message || "Could not join session.");
      setStatus("idle");
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
            await safeFetchJson("https://example.com/api/live/end", {
              method: "POST",
              body: JSON.stringify({ sessionId: session?.id })
            });
          } catch {}
          setSession(null);
          setStatus("idle");
          setSessionCode("");
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

        {status === "live" ? (
          <View style={{ gap: 10 }}>
            <View style={styles.liveBox}>
              <Text style={styles.liveTitle}>LIVE</Text>
              <Text style={styles.muted}>
                Session: {session?.code || session?.id || "—"}
              </Text>
              <Text style={styles.muted}>
                This screen is ready for your next step: WebRTC / Twitch embed / realtime
                chat.
              </Text>
            </View>
            <Pressable style={styles.dangerBtn} onPress={end}>
              <Text style={styles.dangerText}>End Session</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={[styles.btn, status === "working" && styles.btnDisabled]}
            onPress={mode === "host" ? host : join}
            disabled={status === "working"}
          >
            <Text style={styles.btnText}>
              {status === "working" ? "Working…" : mode === "host" ? "Start" : "Join"}
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
