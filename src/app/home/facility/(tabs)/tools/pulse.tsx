import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useRouter } from "expo-router";

import {
  createIntegrationConnection,
  listIntegrationDevices,
  testIntegrationConnection
} from "@/api/integrations";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import { useFacility } from "@/state/useFacility";
import { radius } from "@/theme/theme";

function deviceName(device: any, index: number) {
  return String(
    device?.name ??
      device?.deviceName ??
      device?.displayName ??
      device?.label ??
      device?.guid ??
      device?.id ??
      `Pulse device ${index + 1}`
  );
}

export default function FacilityPulseConnectionRoute() {
  const router = useRouter();
  const { selectedId: facilityId } = useFacility();
  const [apiKey, setApiKey] = useState("");
  const [label, setLabel] = useState("Pulse facility telemetry");
  const [devices, setDevices] = useState<any[]>([]);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function connect() {
    if (!apiKey.trim()) {
      setStatus("Enter the API key created in the Pulse grow account.");
      return;
    }
    setBusy(true);
    setStatus("");
    try {
      const connection = await createIntegrationConnection({
        provider: "pulse",
        label: label.trim() || "Pulse facility telemetry",
        credentials: { apiKey: apiKey.trim() },
        config: { facilityId: String(facilityId || "") }
      });
      await testIntegrationConnection(connection.id);
      const discovered = await listIntegrationDevices(connection.id);
      setDevices(discovered);
      setApiKey("");
      setStatus(
        discovered.length
          ? `${discovered.length} Pulse device${discovered.length === 1 ? "" : "s"} discovered. Review the room mapping next.`
          : "Pulse connected, but this grow-scoped key returned no devices. Check the key's Pulse grow and device access."
      );
    } catch (error: any) {
      setStatus(String(error?.message || "Pulse connection failed."));
    } finally {
      setBusy(false);
    }
  }

  function mapRooms() {
    const names = devices.map(deviceName).join("\n");
    router.push({
      pathname: "/home/facility/rooms",
      params: { importProvider: "Pulse", importDevices: names }
    } as any);
  }

  return (
    <ScreenBoundary
      title="Connect Pulse"
      showBack
      backFallbackHref="/home/facility/integrations"
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text accessibilityRole="header" style={styles.title}>
            Pulse read-only telemetry
          </Text>
          <Text style={styles.body}>
            In Pulse, open Account, create an API key for the grow you want to connect,
            and paste it here. Pulse keys are grow-scoped; GrowPath encrypts the key and
            uses it only for authorized device metadata and readings.
          </Text>
          <TextInput
            accessibilityLabel="Pulse connection label"
            value={label}
            onChangeText={setLabel}
            placeholder="Connection name"
            style={styles.input}
          />
          <TextInput
            accessibilityLabel="Pulse API key"
            value={apiKey}
            onChangeText={setApiKey}
            placeholder="Pulse API key"
            autoCapitalize="none"
            secureTextEntry
            style={styles.input}
          />
          <Pressable
            disabled={busy}
            onPress={connect}
            style={[styles.primary, busy && styles.disabled]}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryText}>Verify and discover devices</Text>
            )}
          </Pressable>
          {status ? (
            <Text accessibilityRole="alert" style={styles.status}>
              {status}
            </Text>
          ) : null}
        </View>

        {devices.length ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Discovered devices</Text>
            {devices.map((device, index) => (
              <Text
                key={String(device?.id ?? device?.guid ?? index)}
                style={styles.device}
              >
                {deviceName(device, index)}
              </Text>
            ))}
            <Pressable onPress={mapRooms} style={styles.primary}>
              <Text style={styles.primaryText}>Review room mappings</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </ScreenBoundary>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40, gap: 12 },
  card: {
    backgroundColor: "#fff",
    borderColor: "#d8e2d4",
    borderRadius: radius.card,
    borderWidth: 1,
    padding: 16
  },
  title: { color: "#172317", fontSize: 24, fontWeight: "900", marginBottom: 8 },
  cardTitle: { color: "#172317", fontSize: 18, fontWeight: "900", marginBottom: 8 },
  body: { color: "#425044", lineHeight: 21, marginBottom: 14 },
  input: {
    backgroundColor: "#fff",
    borderColor: "#c9d4c6",
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
    minHeight: 46,
    paddingHorizontal: 12
  },
  primary: {
    alignItems: "center",
    backgroundColor: "#176b3a",
    borderRadius: 10,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: 14
  },
  primaryText: { color: "#fff", fontWeight: "900" },
  disabled: { opacity: 0.55 },
  status: { color: "#24462e", marginTop: 12 },
  device: {
    borderBottomColor: "#edf1eb",
    borderBottomWidth: 1,
    color: "#27342a",
    paddingVertical: 9
  }
});
