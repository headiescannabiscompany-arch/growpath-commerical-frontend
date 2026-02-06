import React, { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";

import { handleApiError } from "@/ui/handleApiError";
import { useDebugApi } from "@/hooks/useDebugApi";

export default function DebugScreen() {
  const [ping, setPing] = useState(null);
  const [serverInfo, setServerInfo] = useState(null);

  const { pingAsync, infoAsync, isWorking } = useDebugApi();

  const deviceInfo = useMemo(() => {
    return {
      platform: "react-native",
      ts: new Date().toISOString()
    };
  }, []);

  async function doPing() {
    if (isWorking) return;
    try {
      const data = await pingAsync();
      setPing(data);
    } catch (e) {
      handleApiError(e);
      Alert.alert("Ping failed", e?.message || "Could not reach server.");
    }
  }

  async function loadInfo() {
    if (isWorking) return;
    try {
      const data = await infoAsync();
      setServerInfo(data);
    } catch (e) {
      handleApiError(e);
      Alert.alert("Info failed", e?.message || "Could not load debug info.");
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>Debug</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Quick actions</Text>
        <View style={styles.row}>
          <Pressable
            style={[styles.btn, isWorking && styles.btnDisabled]}
            onPress={doPing}
            disabled={isWorking}
          >
            <Text style={styles.btnText}>Ping API</Text>
          </Pressable>

          <Pressable
            style={[styles.btn, isWorking && styles.btnDisabled]}
            onPress={loadInfo}
            disabled={isWorking}
          >
            <Text style={styles.btnText}>Server Info</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Device</Text>
          <Text style={styles.mono}>{JSON.stringify(deviceInfo, null, 2)}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Ping result</Text>
          <Text style={styles.mono}>{ping ? JSON.stringify(ping, null, 2) : "—"}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Server info</Text>
          <Text style={styles.mono}>
            {serverInfo ? JSON.stringify(serverInfo, null, 2) : "—"}
          </Text>
        </View>
      </ScrollView>
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
  sectionTitle: { fontSize: 14, fontWeight: "900" },
  row: { flexDirection: "row", gap: 10, marginTop: 12 },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#111827",
    alignItems: "center"
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontWeight: "900" },
  mono: { marginTop: 10, fontFamily: "monospace", color: "#111827" }
});
