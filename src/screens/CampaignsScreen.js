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
  Alert
} from "react-native";
import {
  getCampaigns,
  addCampaign,
  updateCampaign,
  removeCampaign,
  getCampaignAnalytics
} from "../api/campaigns.js";
import { useAuth } from "../context/AuthContext.js";

export default function CampaignsScreen() {
  const { token } = useAuth();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editCampaign, setEditCampaign] = useState(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  useEffect(() => {
    fetchCampaigns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchCampaigns = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCampaigns(token);
      setCampaigns(Array.isArray(data) ? data : data?.campaigns || []);
    } catch (err) {
      let details = err.message || "Error loading campaigns";
      if (err.status || err.data) {
        details = `API Error${err.status ? ` (${err.status})` : ""}${err.data?.endpoint ? ` – ${err.data.endpoint}` : ""}${err.data?.message ? ` – ${err.data.message}` : ""}`;
      }
      setError(details);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditCampaign(null);
    setName("");
    setModalVisible(true);
  };

  const openEditModal = (campaign) => {
    setEditCampaign(campaign);
    setName(campaign.name);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (editCampaign) {
        await updateCampaign(editCampaign.id, { name }, token);
      } else {
        await addCampaign({ name }, token);
      }
      setModalVisible(false);
      fetchCampaigns();
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to save campaign");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (campaign) => {
    Alert.alert(
      "Remove Campaign",
      `Are you sure you want to remove '${campaign.name}'?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await removeCampaign(campaign.id, token);
              fetchCampaigns();
            } catch (err) {
              Alert.alert("Error", err.message || "Failed to remove campaign");
            }
          }
        }
      ]
    );
  };

  const handleShowAnalytics = async (campaign) => {
    setAnalyticsLoading(true);
    setAnalytics(null);
    try {
      const data = await getCampaignAnalytics(campaign.id, token);
      setAnalytics(data);
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to load analytics");
    } finally {
      setAnalyticsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Campaigns</Text>
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
        <FlatList
          data={campaigns}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.campaignRow}>
              <View>
                <Text style={styles.campaignName}>{item.name}</Text>
                <Button title="Analytics" onPress={() => handleShowAnalytics(item)} />
              </View>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Button title="Edit" onPress={() => openEditModal(item)} />
                <Button
                  title="Remove"
                  color="#ef4444"
                  onPress={() => handleDelete(item)}
                />
              </View>
            </View>
          )}
          ListEmptyComponent={<Text>No campaigns available.</Text>}
        />
      )}
      <View style={styles.actions}>
        <Button title="Add Campaign" onPress={openAddModal} />
      </View>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editCampaign ? "Edit Campaign" : "Add Campaign"}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Name"
              value={name}
              onChangeText={setName}
              autoFocus
            />
            <View style={{ flexDirection: "row", gap: 12, marginTop: 20 }}>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Save"}</Text>
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

      <Modal
        visible={!!analytics}
        transparent
        animationType="slide"
        onRequestClose={() => setAnalytics(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Campaign Analytics</Text>
            {analyticsLoading ? (
              <ActivityIndicator size="small" color="#10B981" style={{ marginTop: 20 }} />
            ) : analytics ? (
              <Text style={{ marginTop: 8 }}>{JSON.stringify(analytics, null, 2)}</Text>
            ) : null}
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setAnalytics(null)}>
              <Text style={styles.cancelBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  header: { fontSize: 24, fontWeight: "bold", marginBottom: 16 },
  campaignRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#eee"
  },
  campaignName: { fontSize: 18 },
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
    width: 300,
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
