import React, { useMemo } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useAuth } from "@/auth/AuthContext";

function ErrorCard({ status, message, details }) {
  const title =
    status === 403 ? "Access Denied" : status === 404 ? "Not Found" : "API Error";
  return (
    <View style={styles.errorCard}>
      <Text style={styles.errorIcon}>🚫</Text>
      <Text style={styles.errorTitle}>{title}</Text>
      <Text style={styles.errorMessage}>{message || "Something went wrong."}</Text>
      {!!details && <Text style={styles.errorDetails}>{String(details)}</Text>}
    </View>
  );
}

function LockedCard({ capabilityKey }) {
  return (
    <View style={styles.lockedCard}>
      <Text style={styles.lockedTitle}>Locked</Text>
      <Text style={styles.lockedText}>
        Your account doesn’t have access to this page yet.
      </Text>
      <Text style={styles.lockedMeta}>Requires: {capabilityKey}</Text>
    </View>
  );
}

export default function GrowLogScreen() {
  const { user, mode, facilityId, capabilities } = useAuth();
  const capabilityKey = "facility.growlog";
  const canView = useMemo(() => {
    if (!capabilities) return true;
    return !!capabilities[capabilityKey];
  }, [capabilities]);
  const apiError = null;
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Grow Log</Text>
      <Text style={styles.sub}>
        View and manage your grow logs, notes, and activity history.
      </Text>
      <View style={styles.metaCard}>
        <Text style={styles.metaTitle}>Context</Text>
        <Text style={styles.metaLine}>mode: {String(mode || "")}</Text>
        <Text style={styles.metaLine}>facilityId: {String(facilityId || "")}</Text>
        <Text style={styles.metaLine}>user: {String(user?.email || "")}</Text>
      </View>
      {!canView ? (
        <LockedCard capabilityKey={capabilityKey} />
      ) : apiError ? (
        <ErrorCard status={apiError.status} message={apiError.message} details={apiError.details} />
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Planned content</Text>
          <Text style={styles.li}>• Log entries</Text>
          <Text style={styles.li}>• Notes and attachments</Text>
          <Text style={styles.li}>• Activity timeline</Text>
          <View style={styles.hr} />
          <Text style={styles.small}>Next step: add a “New Entry” button and a basic list UI.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 6 },
  sub: { fontSize: 14, opacity: 0.8, marginBottom: 12 },
  metaCard: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#fff",
    marginBottom: 12,
  },
  metaTitle: { fontSize: 14, fontWeight: "700", marginBottom: 6 },
  metaLine: { fontSize: 13, marginBottom: 4, opacity: 0.9 },
  card: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#fff",
  },
  cardTitle: { fontSize: 16, fontWeight: "700", marginBottom: 8 },
  li: { fontSize: 14, marginBottom: 6 },
  hr: {
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 10,
  },
  small: { fontSize: 13, opacity: 0.85 },
  lockedCard: {
    borderWidth: 1,
    borderColor: "#f0d58a",
    backgroundColor: "#fff7db",
    borderRadius: 12,
    padding: 12,
  },
  lockedTitle: { fontSize: 16, fontWeight: "800", marginBottom: 6 },
  lockedText: { fontSize: 14, marginBottom: 6 },
  lockedMeta: { fontSize: 12, opacity: 0.8 },
  errorCard: {
    borderWidth: 1,
    borderColor: "#f0b4b4",
    backgroundColor: "#ffecec",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  errorIcon: { fontSize: 26, marginBottom: 6 },
  errorTitle: { fontSize: 16, fontWeight: "800", marginBottom: 6 },
  errorMessage: { fontSize: 14, textAlign: "center", marginBottom: 6 },
  errorDetails: { fontSize: 12, color: "#a40000", textAlign: "center" },
});