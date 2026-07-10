import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, FlatList } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import { getDiagnosisHistory } from "../api/diagnose";
import { radius } from "../theme/theme";

export default function DiagnosisHistoryScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await getDiagnosisHistory();
      setItems(Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []);
    } catch (err) {
      setError(err?.message || "Unable to load diagnosis history.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  function cropLabel(item) {
    const identity = item.cropIdentity || item.aiResult?.cropIdentity || {};
    const common = item.cropCommonName || identity.commonName || "";
    const scientific = item.scientificName || identity.scientificName || "";
    const cultivar =
      item.cultivarOrStrain || item.strain || identity.cultivarOrStrain || "";
    return (
      [common, scientific, cultivar].filter(Boolean).join(" / ") || "Crop not specified"
    );
  }

  function providerLabel(item) {
    const provider = item.providerName || item.aiResult?.providerName || "unverified";
    const model = item.providerModel || item.aiResult?.providerModel || "";
    return model ? `${provider} · ${model}` : provider;
  }

  function feedbackLabel(item) {
    const summary = item.feedbackSummary || null;
    if (!summary && !item.feedbackCount) return "No outcome feedback yet";
    const verdict = summary?.latestVerdict || "feedback saved";
    const change = summary?.latestSymptomChange || "";
    return [`${item.feedbackCount || 1} feedback`, verdict, change]
      .filter(Boolean)
      .join(" · ");
  }

  function statusLabel(item) {
    const severity = item.severity ? `Severity ${item.severity}/5` : "Severity unknown";
    const urgency = item.urgency ? `Urgency ${item.urgency}` : "";
    return [severity, urgency].filter(Boolean).join(" · ");
  }

  function renderItem({ item }) {
    const id = String(item._id || item.id || "");
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          navigation.navigate("DiagnoseScreen", {
            diagnosisId: id,
            notes: item.notes,
            photos: item.photos,
            feedbackSummary: item.feedbackSummary || null
          })
        }
        accessibilityRole="button"
        accessibilityLabel={`Open diagnosis ${item.issueSummary || "Diagnosis"}`}
      >
        <Text style={styles.title}>{item.issueSummary || "Diagnosis"}</Text>
        <Text style={styles.sub}>{cropLabel(item)}</Text>
        <Text style={styles.sub}>{statusLabel(item)}</Text>
        <Text style={styles.sub}>Provider: {providerLabel(item)}</Text>
        <Text style={styles.feedback}>{feedbackLabel(item)}</Text>
        {item.feedbackSummary?.latestNotes ? (
          <Text style={styles.notes} numberOfLines={2}>
            Latest note: {item.feedbackSummary.latestNotes}
          </Text>
        ) : null}
        <Text style={styles.date}>
          {item.createdAt ? new Date(item.createdAt).toLocaleString() : "Date unknown"}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <ScreenContainer>
      <Text style={styles.header}>Diagnosis History</Text>
      <Text style={styles.help}>
        Saved AI/provider results, GrowPath context, and your outcome feedback.
      </Text>

      {loading ? <Text style={styles.sub}>Loading diagnosis history...</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={items}
        keyExtractor={(i, index) => String(i._id || i.id || `diagnosis-${index}`)}
        renderItem={renderItem}
        ListEmptyComponent={
          !loading && !error ? (
            <View style={styles.empty}>
              <Text style={styles.title}>No diagnoses yet</Text>
              <Text style={styles.sub}>
                Run a diagnosis and save feedback to build useful grow evidence.
              </Text>
            </View>
          ) : null
        }
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </ScreenContainer>
  );
}

const styles = {
  header: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 12
  },
  help: {
    color: "#64748B",
    lineHeight: 20,
    marginBottom: 12
  },
  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: radius.card,
    padding: 12,
    marginBottom: 10
  },
  title: {
    fontSize: 16,
    fontWeight: "600"
  },
  sub: {
    color: "#64748B",
    marginTop: 2
  },
  feedback: {
    color: "#166534",
    marginTop: 6,
    fontWeight: "700"
  },
  notes: {
    color: "#334155",
    marginTop: 6,
    lineHeight: 18
  },
  date: {
    color: "#94A3B8",
    marginTop: 8,
    fontSize: 12
  },
  empty: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: radius.card,
    padding: 14,
    backgroundColor: "#F8FAFC"
  },
  error: {
    color: "#9A3412",
    backgroundColor: "#FFF7ED",
    padding: 10,
    borderRadius: radius.card,
    marginBottom: 10
  }
};
