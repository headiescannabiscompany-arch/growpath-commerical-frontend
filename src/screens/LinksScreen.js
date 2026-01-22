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
  Linking
} from "react-native";
import { getLinks, addLink, updateLink, removeLink } from "../api/links.js";
import { useAuth } from "../context/AuthContext.js";

export default function LinksScreen() {
  const { token } = useAuth();
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editLink, setEditLink] = useState(null);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchLinks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchLinks = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getLinks(token);
      setLinks(Array.isArray(data) ? data : data?.links || []);
    } catch (err) {
      let details = err.message || "Error loading links";
      if (err.status || err.data) {
        details = `API Error${err.status ? ` (${err.status})` : ""}${err.data?.endpoint ? ` – ${err.data.endpoint}` : ""}${err.data?.message ? ` – ${err.data.message}` : ""}`;
      }
      setError(details);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditLink(null);
    setLabel("");
    setUrl("");
    setModalVisible(true);
  };

  const openEditModal = (link) => {
    setEditLink(link);
    setLabel(link.label);
    setUrl(link.url);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!label.trim() || !url.trim()) return;
    setSaving(true);
    try {
      if (editLink) {
        await updateLink(editLink.id, { label, url }, token);
      } else {
        await addLink({ label, url }, token);
      }
      setModalVisible(false);
      fetchLinks();
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to save link");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (link) => {
    Alert.alert("Remove Link", `Are you sure you want to remove '${link.label}'?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await removeLink(link.id, token);
            fetchLinks();
          } catch (err) {
            Alert.alert("Error", err.message || "Failed to remove link");
          }
        }
      }
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Links</Text>
      {loading ? (
        <ActivityIndicator size="small" color="#10B981" style={{ marginTop: 40 }} />
      ) : error ? (
        <Text style={{ color: "#ef4444", marginTop: 40 }}>{error}</Text>
      ) : (
        <FlatList
          data={links}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.linkRow}>
              <Text style={styles.linkLabel}>{item.label}</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Button title="Open" onPress={() => Linking.openURL(item.url)} />
                <Button title="Edit" onPress={() => openEditModal(item)} />
                <Button
                  title="Remove"
                  color="#ef4444"
                  onPress={() => handleDelete(item)}
                />
              </View>
            </View>
          )}
          ListEmptyComponent={<Text>No links available.</Text>}
        />
      )}
      <View style={styles.actions}>
        <Button title="Add Link" onPress={openAddModal} />
      </View>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editLink ? "Edit Link" : "Add Link"}</Text>
            <TextInput
              style={styles.input}
              placeholder="Label"
              value={label}
              onChangeText={setLabel}
              autoFocus
            />
            <TextInput
              style={styles.input}
              placeholder="URL (e.g. https://...)"
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
              keyboardType="url"
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  header: { fontSize: 24, fontWeight: "bold", marginBottom: 16 },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#eee"
  },
  linkLabel: { fontSize: 18 },
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
