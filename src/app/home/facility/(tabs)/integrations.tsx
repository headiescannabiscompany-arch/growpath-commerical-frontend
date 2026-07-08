import { Link } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ScreenBoundary } from "@/components/ScreenBoundary";
import { radius } from "@/theme/theme";

const PROVIDERS = [
  "Pulse",
  "TrolMaster",
  "Growlink",
  "AROYA",
  "SensorPush",
  "UbiBot",
  "Aranet",
  "METER/ZENTRA",
  "HOBOlink",
  "Monnit"
];

function ActionLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href as any} asChild>
      <Pressable accessibilityRole="button" style={styles.primaryAction}>
        <Text style={styles.primaryActionText}>{label}</Text>
      </Pressable>
    </Link>
  );
}

export default function FacilityIntegrationsRoute() {
  return (
    <ScreenBoundary title="Integrations">
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.kicker}>Facility workspace</Text>
          <Text style={styles.title}>Sensor Integrations</Text>
          <Text style={styles.subtitle}>
            Connect or import controller structure without starting from a blank facility.
            GrowPath uses imported device names to suggest rooms, devices, and sensor
            streams before anything is saved.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Build rooms from controller data</Text>
          <Text style={styles.body}>
            The connected workflow lives in Facility Rooms. Paste detected controller,
            hub, module, or sensor names there to preview suggested rooms, normalized
            metrics, devices, and read-only integration mappings.
          </Text>
          <View style={styles.providerGrid}>
            {PROVIDERS.map((provider) => (
              <Text key={provider} style={styles.providerPill}>
                {provider}
              </Text>
            ))}
          </View>
          <ActionLink href="/home/facility/rooms" label="Open Room Import Preview" />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Guardrails</Text>
          <Text style={styles.bullet}>Read-only sync comes first.</Text>
          <Text style={styles.bullet}>
            Write/control endpoints stay disabled unless explicitly reviewed.
          </Text>
          <Text style={styles.bullet}>
            Unknown devices require manual mapping before they affect dashboards.
          </Text>
          <Text style={styles.bullet}>
            Imported data should power rooms, alerts, VPD/dew point review, AI summaries,
            and tasks.
          </Text>
        </View>
      </ScrollView>
    </ScreenBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f6f7f2",
    gap: 14,
    padding: 16
  },
  header: {
    gap: 6,
    paddingBottom: 2
  },
  kicker: {
    color: "#5f6f5f",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  title: {
    color: "#172317",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 0
  },
  subtitle: {
    color: "#4b5a4b",
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 820
  },
  card: {
    backgroundColor: "#fffdf7",
    borderColor: "#dde6d5",
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 10,
    padding: 14
  },
  cardTitle: {
    color: "#172317",
    fontSize: 18,
    fontWeight: "800"
  },
  body: {
    color: "#384538",
    fontSize: 14,
    lineHeight: 21
  },
  providerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  providerPill: {
    backgroundColor: "#edf3e8",
    borderColor: "#d6e2ce",
    borderRadius: 999,
    borderWidth: 1,
    color: "#314131",
    fontSize: 12,
    fontWeight: "700",
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  primaryAction: {
    alignSelf: "flex-start",
    backgroundColor: "#2f5d3a",
    borderRadius: radius.card,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  primaryActionText: {
    color: "#fffdf7",
    fontWeight: "800"
  },
  bullet: {
    color: "#384538",
    fontSize: 14,
    lineHeight: 21
  }
});
