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
  getTeam,
  addTeamMember,
  updateTeamMember,
  removeTeamMember
} from "../api/team.js";
import { useAuth } from "../context/AuthContext.js";

export default function TeamScreen() {
  const { token } = useAuth();
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMember, setEditMember] = useState(null);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTeam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchTeam = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTeam(token);
      setTeam(Array.isArray(data) ? data : data?.team || []);
    } catch (err) {
      setError(err.message || "Error loading team");
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditMember(null);
    setName("");
    setRole("");
    setModalVisible(true);
  };

  const openEditModal = (member) => {
    setEditMember(member);
    setName(member.name);
    setRole(member.role);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !role.trim()) return;
    setSaving(true);
    try {
      if (editMember) {
        await updateTeamMember(editMember.id, { name, role }, token);
      } else {
        await addTeamMember({ name, role }, token);
      }
      setModalVisible(false);
      fetchTeam();
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to save member");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (member) => {
    Alert.alert("Remove Member", `Are you sure you want to remove ${member.name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await removeTeamMember(member.id, token);
            fetchTeam();
          } catch (err) {
            Alert.alert("Error", err.message || "Failed to remove member");
          }
        }
      }
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Team</Text>
      {loading ? (
        <ActivityIndicator size="small" color="#10B981" style={{ marginTop: 40 }} />
      ) : error ? (
        <Text style={{ color: "#ef4444", marginTop: 40 }}>{error}</Text>
      ) : (
        <FlatList
          data={team}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.memberRow}>
              <View>
                <Text style={styles.memberName}>{item.name}</Text>
                <Text style={styles.memberRole}>{item.role}</Text>
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
          ListEmptyComponent={<Text>No team members available.</Text>}
        />
      )}
      <View style={styles.actions}>
        <Button title="Add Member" onPress={openAddModal} />
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
              {editMember ? "Edit Member" : "Add Member"}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Name"
              value={name}
              onChangeText={setName}
              autoFocus
            />
            <TextInput
              style={styles.input}
              placeholder="Role"
              value={role}
              onChangeText={setRole}
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
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#eee"
  },
  memberName: { fontSize: 18 },
  memberRole: { fontSize: 16, color: "#888" },
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
