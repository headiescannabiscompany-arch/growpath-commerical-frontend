import React, { useEffect, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useRouter } from "expo-router";

import {
  listIntegrationConnections,
  type IntegrationConnection
} from "@/api/integrations";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import { radius } from "@/theme/theme";
import { useEntitlements } from "@/entitlements";

const PLANNED = [
  "Growlink",
  "AROYA",
  "SensorPush",
  "UbiBot",
  "Aranet",
  "ZENTRA",
  "HOBOlink",
  "Monnit"
];

export default function FacilityIntegrationsRoute() {
  const router = useRouter();
  const entitlements = useEntitlements();
  const role = String(entitlements.facilityRole || "VIEWER").toUpperCase();
  const canConfigure = role === "OWNER" || role === "MANAGER";
  const [selected, setSelected] = useState<"pulse" | "trolmaster">("pulse");
  const [connections, setConnections] = useState<IntegrationConnection[]>([]);

  useEffect(() => {
    Promise.resolve(listIntegrationConnections())
      .then((rows) => setConnections(rows || []))
      .catch(() => setConnections([]));
  }, []);

  function requestProvider(provider: string) {
    Alert.alert(
      `${provider} is not enabled yet`,
      "Email GrowPath to request this integration for your facility.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Email GrowPath",
          onPress: () =>
            Linking.openURL(
              `mailto:support@growpathai.com?subject=${encodeURIComponent(`${provider} facility integration`)}`
            )
        }
      ]
    );
  }

  return (
    <ScreenBoundary
      title="Integrations"
      showBack
      backFallbackHref="/home/facility/dashboard"
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.kicker}>Facility setup</Text>
          <Text style={styles.title}>Connect rooms and sensor data</Text>
          <Text style={styles.subtitle}>
            Start with Pulse or TrolMaster. GrowPath keeps connections read-only and uses
            discovered devices to build room mappings, environment history, alerts, and AI
            context.
          </Text>
        </View>

        <View style={styles.choiceRow}>
          {(["pulse", "trolmaster"] as const).map((provider) => (
            <Pressable
              key={provider}
              accessibilityRole="button"
              accessibilityLabel={`Select ${provider} integration`}
              onPress={() => setSelected(provider)}
              style={[
                styles.providerChoice,
                selected === provider && styles.providerChoiceActive
              ]}
            >
              <Text style={styles.providerChoiceTitle}>
                {provider === "pulse" ? "Pulse" : "TrolMaster"}
              </Text>
              <Text style={styles.providerChoiceText}>
                {provider === "pulse" ? "Available" : "Developer access required"}
              </Text>
            </Pressable>
          ))}
        </View>

        {selected === "pulse" ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Pulse read-only telemetry</Text>
            <Text style={styles.body}>
              Verify a Pulse API key, choose devices, create telemetry sources, and pull
              environment history.
            </Text>
            <Pressable
              disabled={!canConfigure}
              style={[styles.primaryAction, !canConfigure && styles.disabled]}
              onPress={() => router.push("/home/facility/tools/pulse" as any)}
            >
              <Text style={styles.primaryActionText}>Connect Pulse</Text>
            </Pressable>
            {!canConfigure ? (
              <Text style={styles.body}>
                Owners and managers can add connections. Your role can view connected
                facility data.
              </Text>
            ) : null}
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>TrolMaster developer access</Text>
            <Text style={styles.body}>
              TrolMaster publishes an official developer portal for API subscriptions,
              credentials, usage, documentation, and live API testing. GrowPath will
              enable this connection after its read-only adapter is implemented and
              verified.
            </Text>
            <Pressable
              style={styles.primaryAction}
              onPress={() => Linking.openURL("https://developer.trolmaster.com/")}
            >
              <Text style={styles.primaryActionText}>Open developer portal</Text>
            </Pressable>
            <Pressable
              style={styles.secondaryAction}
              onPress={() => requestProvider("TrolMaster")}
            >
              <Text style={styles.secondaryActionText}>Ask GrowPath to enable it</Text>
            </Pressable>
          </View>
        )}

        {connections.length ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Connected sources</Text>
            {connections.map((connection) => (
              <View key={connection.id} style={styles.connectionRow}>
                <Text style={styles.connectionTitle}>{connection.label}</Text>
                <Text style={styles.body}>
                  {connection.provider} · {connection.status}
                </Text>
              </View>
            ))}
            <Pressable
              style={styles.secondaryAction}
              onPress={() => router.push("/home/facility/rooms" as any)}
            >
              <Text style={styles.secondaryActionText}>Review room mappings</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>More providers</Text>
          <Text style={styles.body}>
            These connectors are visible for planning but disabled until their production
            contract is enabled.
          </Text>
          <View style={styles.providerGrid}>
            {PLANNED.map((provider) => (
              <Pressable
                key={provider}
                onPress={() => requestProvider(provider)}
                style={styles.disabledProvider}
              >
                <Text style={styles.disabledProviderText}>{provider}</Text>
                <Text style={styles.comingSoon}>Email to request</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
    </ScreenBoundary>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: "#f6f7f2", gap: 14, padding: 16, paddingBottom: 32 },
  header: { gap: 6 },
  kicker: {
    color: "#5f6f5f",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  title: { color: "#172317", fontSize: 28, fontWeight: "900" },
  subtitle: { color: "#4b5a4b", fontSize: 15, lineHeight: 22, maxWidth: 820 },
  choiceRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  providerChoice: {
    backgroundColor: "white",
    borderColor: "#cbd5e1",
    borderRadius: radius.card,
    borderWidth: 1,
    minWidth: 180,
    padding: 14
  },
  providerChoiceActive: { borderColor: "#166534", borderWidth: 2 },
  providerChoiceTitle: { color: "#172317", fontSize: 18, fontWeight: "900" },
  providerChoiceText: { color: "#166534", fontSize: 12, fontWeight: "800", marginTop: 4 },
  card: {
    backgroundColor: "#fffdf7",
    borderColor: "#dde6d5",
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 10,
    padding: 14
  },
  cardTitle: { color: "#172317", fontSize: 18, fontWeight: "900" },
  body: { color: "#4b5a4b", fontSize: 14, lineHeight: 20 },
  input: {
    backgroundColor: "white",
    borderColor: "#cbd5e1",
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 11
  },
  primaryAction: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#166534",
    borderRadius: radius.card,
    paddingHorizontal: 16,
    paddingVertical: 11
  },
  primaryActionText: { color: "white", fontWeight: "900" },
  secondaryAction: {
    alignSelf: "flex-start",
    borderColor: "#166534",
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  secondaryActionText: { color: "#166534", fontWeight: "900" },
  status: {
    backgroundColor: "#ecfdf5",
    borderRadius: radius.card,
    color: "#166534",
    fontWeight: "800",
    padding: 12
  },
  connectionRow: {
    borderBottomColor: "#e2e8f0",
    borderBottomWidth: 1,
    paddingVertical: 8
  },
  connectionTitle: { color: "#172317", fontWeight: "900" },
  providerGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  disabledProvider: {
    backgroundColor: "#e5e7eb",
    borderRadius: radius.card,
    opacity: 0.7,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  disabledProviderText: { color: "#475569", fontWeight: "800" },
  comingSoon: { color: "#64748b", fontSize: 10, marginTop: 2 },
  disabled: { opacity: 0.5 }
});
