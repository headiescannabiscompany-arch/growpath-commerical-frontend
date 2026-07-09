import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Button,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";

import { getSocialAccounts, getSocialMetrics, schedulePost } from "../api/socialMedia.js";
import { radius } from "../theme/theme";

export default function SocialToolsScreen() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [metrics, setMetrics] = useState({});
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [content, setContent] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [scheduledTime, setScheduledTime] = useState("");
  const [saving, setSaving] = useState(false);

  async function fetchAccounts() {
    setLoading(true);
    setError(null);
    try {
      const data = await getSocialAccounts();
      setAccounts(Array.isArray(data) ? data : data?.accounts || []);
    } catch (err) {
      let details = err.message || "Error loading external channel accounts";
      if (err.status || err.data) {
        const status = err.status ? ` (${err.status})` : "";
        const endpoint = err.data?.endpoint ? ` - ${err.data.endpoint}` : "";
        const message = err.data?.message ? ` - ${err.data.message}` : "";
        details = `API Error${status}${endpoint}${message}`;
      }
      setError(details);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAccounts();
  }, []);

  async function handleShowMetrics(platform) {
    setMetricsLoading(true);
    try {
      const data = await getSocialMetrics(platform);
      setMetrics((prev) => ({ ...prev, [platform]: data }));
    } catch (err) {
      Alert.alert("Error", err.message || `Failed to load ${platform} metrics`);
    } finally {
      setMetricsLoading(false);
    }
  }

  function openScheduleModal() {
    setContent("");
    setSelectedPlatforms([]);
    setScheduledTime("");
    setModalVisible(true);
  }

  function handleTogglePlatform(platform) {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((item) => item !== platform)
        : [...prev, platform]
    );
  }

  async function handleSchedule() {
    if (!content.trim() || selectedPlatforms.length === 0) return;
    setSaving(true);
    try {
      await schedulePost(selectedPlatforms, content, scheduledTime || undefined);
      setModalVisible(false);
      Alert.alert("Success", "External channel post scheduled.");
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to schedule external post");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>External Channels</Text>
      <Text style={styles.subheader}>
        Schedule and review off-platform channel posts. GrowPath Feed / Campaigns is the
        in-app advertising surface, and Forum/Q&A is where discussion lives.
      </Text>

      {loading ? (
        <ActivityIndicator size="small" color="#10B981" style={styles.loader} />
      ) : error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>
            {error.includes("403")
              ? "Access denied"
              : error.includes("404")
                ? "Not found"
                : "API error"}
          </Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <>
          <Text style={styles.sectionTitle}>Connected Accounts</Text>
          {accounts.length ? (
            accounts.map((account) => (
              <View key={account.platform} style={styles.accountRow}>
                <Text style={styles.accountName}>{account.platform}</Text>
                <Button
                  title="Metrics"
                  onPress={() => handleShowMetrics(account.platform)}
                />
                {metrics[account.platform] ? (
                  <Text style={styles.metricsText}>
                    {JSON.stringify(metrics[account.platform], null, 2)}
                  </Text>
                ) : null}
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No external channel accounts connected.</Text>
          )}
        </>
      )}

      <View style={styles.actions}>
        <Button title="Schedule External Post" onPress={openScheduleModal} />
      </View>
      {metricsLoading ? <Text style={styles.loadingText}>Loading metrics...</Text> : null}

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Schedule External Post</Text>
            <TextInput
              style={styles.input}
              placeholder="Content"
              value={content}
              onChangeText={setContent}
              autoFocus
              multiline
            />
            <Text style={styles.label}>Platforms</Text>
            <View style={styles.platformList}>
              {accounts.map((account) => {
                const selected = selectedPlatforms.includes(account.platform);
                return (
                  <TouchableOpacity
                    key={account.platform}
                    style={selected ? styles.platformSelected : styles.platformBtn}
                    onPress={() => handleTogglePlatform(account.platform)}
                  >
                    <Text
                      style={selected ? styles.platformTextSelected : styles.platformText}
                    >
                      {account.platform}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TextInput
              style={styles.input}
              placeholder="Scheduled time (optional ISO)"
              value={scheduledTime}
              onChangeText={setScheduledTime}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSchedule}
                disabled={saving}
              >
                <Text style={styles.saveBtnText}>
                  {saving ? "Scheduling..." : "Schedule"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  header: { color: "#111827", fontSize: 24, fontWeight: "800", marginBottom: 8 },
  subheader: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 19,
    marginBottom: 16
  },
  sectionTitle: { color: "#111827", fontSize: 18, fontWeight: "800", marginBottom: 8 },
  loader: { marginTop: 40 },
  errorBox: {
    marginTop: 24,
    padding: 20,
    borderRadius: radius.card,
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FCA5A5"
  },
  errorTitle: { color: "#B91C1C", fontSize: 18, fontWeight: "800", marginBottom: 4 },
  errorText: { color: "#B91C1C" },
  accountRow: {
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 12
  },
  accountName: { color: "#111827", fontSize: 18, fontWeight: "700" },
  metricsText: { color: "#475569", fontSize: 13, marginTop: 6 },
  emptyText: { color: "#64748B", fontWeight: "600" },
  actions: { alignItems: "flex-end", marginTop: 24 },
  loadingText: { color: "#047857", fontWeight: "700", marginTop: 8 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center"
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: radius.card,
    padding: 24,
    width: 320,
    alignItems: "center",
    elevation: 4,
    ...(Platform.OS === "web"
      ? { boxShadow: "0px 6px 24px rgba(0,0,0,0.18)" }
      : {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.18,
          shadowRadius: 12
        })
  },
  modalTitle: { color: "#111827", fontSize: 18, fontWeight: "800", marginBottom: 12 },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    padding: 10,
    marginBottom: 12,
    fontSize: 15
  },
  label: {
    alignSelf: "flex-start",
    color: "#111827",
    fontWeight: "800",
    marginBottom: 8
  },
  platformList: { flexDirection: "row", flexWrap: "wrap", marginBottom: 8 },
  platformBtn: {
    backgroundColor: "#E5E7EB",
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8
  },
  platformSelected: {
    backgroundColor: "#10B981",
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8
  },
  platformText: { color: "#111827", fontWeight: "700" },
  platformTextSelected: { color: "#FFFFFF", fontWeight: "800" },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 12 },
  saveBtn: {
    backgroundColor: "#10B981",
    borderRadius: radius.card,
    paddingHorizontal: 18,
    paddingVertical: 10
  },
  saveBtnText: { color: "white", fontWeight: "800", fontSize: 15 },
  cancelBtn: {
    backgroundColor: "#E5E7EB",
    borderRadius: radius.card,
    paddingHorizontal: 18,
    paddingVertical: 10
  },
  cancelBtnText: { color: "#334155", fontWeight: "800", fontSize: 15 }
});
