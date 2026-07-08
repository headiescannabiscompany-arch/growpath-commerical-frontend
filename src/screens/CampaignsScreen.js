import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import { useCampaigns } from "@/hooks/useCampaigns";
import { radius } from "@/theme/theme";

function itemId(item, idx) {
  return String(item?.id || item?._id || `campaign-${idx}`);
}

function metricValue(item, keys) {
  for (const key of keys) {
    const value = item?.[key];
    if (value !== undefined && value !== null && value !== "") return Number(value) || 0;
  }
  return 0;
}

export default function CampaignsScreen() {
  const [name, setName] = useState("");
  const [linkedTarget, setLinkedTarget] = useState("");
  const [launchDate, setLaunchDate] = useState("");
  const [notes, setNotes] = useState("");
  const { data, isLoading, error, createCampaign, creating } = useCampaigns();

  const campaigns = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    await createCampaign({
      name: trimmed,
      status: "draft",
      objective: "content_plan",
      linkedTarget: linkedTarget.trim() || undefined,
      launchDate: launchDate.trim() || undefined,
      notes: notes.trim() || undefined
    });
    setName("");
    setLinkedTarget("");
    setLaunchDate("");
    setNotes("");
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Marketing Planner</Text>
      <Text style={styles.subtitle}>
        Plan product drops, course announcements, product trial evidence updates, feed
        campaigns, and external links. Track clicks for ads/marketing links here; use
        Feed / Campaigns when you are ready to publish promotional placements.
      </Text>
      {error ? <Text style={styles.error}>Failed to load campaigns.</Text> : null}

      <View style={styles.form}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Plan name"
          style={styles.input}
        />
        <TextInput
          value={linkedTarget}
          onChangeText={setLinkedTarget}
          placeholder="Linked product, course, evidence run, or store URL"
          autoCapitalize="none"
          style={styles.input}
        />
        <TextInput
          value={launchDate}
          onChangeText={setLaunchDate}
          placeholder="Launch date or window"
          style={styles.input}
        />
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Content notes, platform notes, budget notes, or CTA"
          multiline
          style={[styles.input, styles.textArea]}
        />
        <Pressable onPress={submit} style={styles.button}>
          <Text style={styles.buttonText}>
            {creating ? "Adding..." : "Add Marketing Plan"}
          </Text>
        </Pressable>
      </View>

      <FlatList
        data={campaigns}
        keyExtractor={itemId}
        ListEmptyComponent={<Text style={styles.empty}>No marketing plans yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item?.name || "Untitled Plan"}</Text>
            <Text style={styles.meta}>{item?.status || "draft"}</Text>
            {item?.linkedTarget ? (
              <Text style={styles.meta}>Linked: {item.linkedTarget}</Text>
            ) : null}
            {item?.launchDate ? (
              <Text style={styles.meta}>Launch: {item.launchDate}</Text>
            ) : null}
            <View style={styles.metrics}>
              <View style={styles.metricPill}>
                <Text style={styles.metricLabel}>Ad clicks</Text>
                <Text style={styles.metricValue}>
                  {metricValue(item, ["adClicks", "clicks"])}
                </Text>
              </View>
              <View style={styles.metricPill}>
                <Text style={styles.metricLabel}>Link clicks</Text>
                <Text style={styles.metricValue}>
                  {metricValue(item, ["linkClicks", "externalLinkClicks"])}
                </Text>
              </View>
              <View style={styles.metricPill}>
                <Text style={styles.metricLabel}>Impressions</Text>
                <Text style={styles.metricValue}>
                  {metricValue(item, ["impressions"])}
                </Text>
              </View>
            </View>
            {item?.notes ? <Text style={styles.meta}>{item.notes}</Text> : null}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "800", marginBottom: 10 },
  subtitle: { color: "#64748B", lineHeight: 19, marginBottom: 10 },
  form: { gap: 8, marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: radius.card,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  textArea: { minHeight: 76, textAlignVertical: "top" },
  button: {
    alignSelf: "flex-start",
    backgroundColor: "#0f766e",
    borderRadius: radius.card,
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  buttonText: { color: "#fff", fontWeight: "700" },
  card: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: radius.card,
    padding: 12,
    marginBottom: 10,
    backgroundColor: "#fff"
  },
  cardTitle: { fontWeight: "700", fontSize: 15 },
  meta: { opacity: 0.7, marginTop: 4, fontSize: 13 },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  metricPill: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: radius.card,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  metricLabel: { color: "#64748B", fontSize: 11, fontWeight: "800" },
  metricValue: { color: "#0f172a", fontSize: 16, fontWeight: "900", marginTop: 2 },
  empty: { opacity: 0.7, paddingTop: 8 },
  error: { color: "#b91c1c", marginBottom: 8 }
});
