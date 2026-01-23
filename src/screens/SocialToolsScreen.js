import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Button,
  TextInput,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView
} from "react-native";
import { getSocialAccounts, getSocialMetrics, schedulePost } from "../api/socialMedia.js";
import { useAuth } from "../context/AuthContext.js";

export default function SocialToolsScreen() {
  // const { token } = useAuth(); // Not used in current API, but available if needed
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

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSocialAccounts();
      setAccounts(Array.isArray(data) ? data : data?.accounts || []);
    } catch (err) {
      let details = err.message || "Error loading social accounts";
      if (err.status || err.data) {
        details = `API Error${err.status ? ` (${err.status})` : ""}${err.data?.endpoint ? ` – ${err.data.endpoint}` : ""}${err.data?.message ? ` – ${err.data.message}` : ""}`;
      }
      setError(details);
    } finally {
      setLoading(false);
    }
  };

  const handleShowMetrics = async (platform) => {
    setMetricsLoading(true);
    try {
      const data = await getSocialMetrics(platform);
      setMetrics((prev) => ({ ...prev, [platform]: data }));
    } catch (err) {
      Alert.alert("Error", err.message || `Failed to load ${platform} metrics`);
    } finally {
      setMetricsLoading(false);
    }
  };

  const openScheduleModal = () => {
    setContent("");
    setSelectedPlatforms([]);
    setScheduledTime("");
    setModalVisible(true);
  };

  const handleTogglePlatform = (platform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    );
  };

  const handleSchedule = async () => {
    if (!content.trim() || selectedPlatforms.length === 0) return;
    setSaving(true);
    try {
      await schedulePost(selectedPlatforms, content, scheduledTime || undefined);
      setModalVisible(false);
      Alert.alert("Success", "Post scheduled successfully.");
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to schedule post");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Social Tools</Text>
      {loading ? (
        <ActivityIndicator size="small" color="#10B981" style={{ marginTop: 40 }} />
      ) : error ? (
        <View
          style={{
            marginTop: 40,
            padding: 24,
            borderRadius: 12,
            backgroundColor: "#FEE2E2",
            alignItems: "center",
            borderWidth: 1,
            borderColor: "#FCA5A5"
          }}
        >
          <Text style={{ fontSize: 32, color: "#B91C1C", marginBottom: 8 }}>🚫</Text>
          <Text
            style={{
              color: "#B91C1C",
              fontWeight: "bold",
              fontSize: 18,
              marginBottom: 4
            }}
          >
            {error.includes("403")
              ? "Access Denied"
              : error.includes("404")
                ? "Not Found"
                : "API Error"}
          </Text>
          <Text style={{ color: "#B91C1C", textAlign: "center" }}>{error}</Text>
        </View>
      ) : (
        <>
          <Text style={styles.sectionTitle}>Connected Accounts</Text>
          <FlatList
            data={accounts}
            keyExtractor={(item) => item.platform}
            renderItem={({ item }) => (
              <View style={styles.accountRow}>
                <Text style={styles.accountName}>{item.platform}</Text>
                <Button
                  title="Metrics"
                  onPress={() => handleShowMetrics(item.platform)}
                />
                {metrics[item.platform] && (
                  <Text style={styles.metricsText}>
                    {JSON.stringify(metrics[item.platform], null, 2)}
                  </Text>
                )}
              </View>
            )}
            ListEmptyComponent={<Text>No social accounts connected.</Text>}
          />
        </>
      )}
      <View style={styles.actions}>
        <Button title="Schedule Post" onPress={openScheduleModal} />
      </View>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Schedule Social Post</Text>
            <TextInput
              style={styles.input}
              placeholder="Content"
              value={content}
              onChangeText={setContent}
              autoFocus
              multiline
            />
            <Text style={{ marginTop: 8, fontWeight: "bold" }}>Platforms:</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", marginVertical: 8 }}>
              {accounts.map((acc) => (
                <TouchableOpacity
                  key={acc.platform}
                  style={
                    selectedPlatforms.includes(acc.platform)
                      ? styles.platformSelected
                      : styles.platformBtn
                  }
                  onPress={() => handleTogglePlatform(acc.platform)}
                >
                  <Text
                    style={{
                      color: selectedPlatforms.includes(acc.platform) ? "#fff" : "#222"
                    }}
                  >
                    {acc.platform}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.input}
              placeholder="Scheduled Time (optional, ISO)"
              value={scheduledTime}
              onChangeText={setScheduledTime}
            />
            <View style={{ flexDirection: "row", gap: 12, marginTop: 20 }}>
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
  header: { fontSize: 24, fontWeight: "bold", marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginTop: 16, marginBottom: 8 },
  accountRow: {
    flexDirection: "column",
    alignItems: "flex-start",
    justifyContent: "flex-start",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#eee"
  },
  accountName: { fontSize: 18, fontWeight: "600" },
  metricsText: { fontSize: 14, color: "#555", marginTop: 4 },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 24
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center"
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 24,
    width: 320,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4
  },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#222", marginBottom: 12 },
  input: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
    fontSize: 16
  },
  platformBtn: {
    backgroundColor: "#eee",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8
  },
  platformSelected: {
    backgroundColor: "#10B981",
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8
  },
  saveBtn: {
    backgroundColor: "#10B981",
    borderRadius: 6,
    paddingHorizontal: 18,
    paddingVertical: 10
  },
  saveBtnText: { color: "white", fontWeight: "bold", fontSize: 15 },
  cancelBtn: {
    backgroundColor: "#ddd",
    borderRadius: 6,
    paddingHorizontal: 18,
    paddingVertical: 10
  },
  cancelBtnText: { color: "#333", fontWeight: "bold", fontSize: 15 }
});
