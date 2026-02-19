import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import api from "../api/client.js";

function getRole() {
  try {
    const r = global?.user?.role || global?.user?.accountRole || global?.user?.planRole;
    return r ? String(r) : "";
  } catch {
    return "";
  }
}

export default function LiveSessionScreen() {
  const params = (useLocalSearchParams && useLocalSearchParams()) || {};
  const sessionId = useMemo(() => {
    const raw = params.sessionId ?? params.id ?? "session-1";
    return String(raw || "session-1");
  }, [params.sessionId, params.id]);

  const role = getRole();
  const isAdmin = /admin|owner|manager/i.test(role);

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setErr("");
      setSession(null);

      try {
        const res = await api.get(`/live/sessions/${encodeURIComponent(sessionId)}`);
        if (!alive) return;
        setSession(res || null);
      } catch (e) {
        const msg = String(e?.message || e || "No session found");
        if (!alive) return;
        if (/no session found/i.test(msg)) setErr("No session found");
        else setErr(msg);
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [sessionId]);

  const moderationUrl =
    session?.twitchModerationUrl ||
    session?.moderationUrl ||
    "https://twitch.tv/moderator";

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Live Session</Text>

      {loading ? (
        <View style={styles.row}>
          <ActivityIndicator />
          <Text style={styles.meta}>Loading…</Text>
        </View>
      ) : null}

      {err ? <Text style={styles.error}>{err}</Text> : null}

      {session ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{String(session.title || "Untitled Session")}</Text>
          {session.twitchChannel ? (
            <Text style={styles.meta}>Channel: {String(session.twitchChannel)}</Text>
          ) : null}

          {isAdmin ? (
            <Pressable
              accessibilityRole="button"
              style={styles.btn}
              onPress={() => {
                try {
                  Linking.openURL(moderationUrl);
                } catch {}
              }}
            >
              <Text style={styles.btnText}>Open Twitch Moderation</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 14 },
  title: { fontSize: 20, fontWeight: "800", marginBottom: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  meta: { marginTop: 6, fontSize: 13, opacity: 0.8 },
  error: { color: "crimson", marginBottom: 10 },
  card: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#ddd" },
  cardTitle: { fontWeight: "800" },
  btn: { marginTop: 10, paddingVertical: 10 },
  btnText: { fontWeight: "900" }
});
