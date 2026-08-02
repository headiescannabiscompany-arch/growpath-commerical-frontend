import React, { useEffect, useMemo, useState } from "react";
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
  Platform
} from "react-native";
import {
  getTeam,
  addTeamMember,
  updateTeamMember,
  removeTeamMember
} from "../api/team.js";
import { useAuth } from "@/auth/AuthContext";
import { useAppTheme } from "@/theme/appTheme";
import { radius } from "../theme/theme";

export default function TeamScreen() {
  const { token } = useAuth();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createTeamScreenStyles(palette), [palette]);
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
      <Text accessibilityRole="header" aria-level={1} style={styles.header}>
        Team
      </Text>
      {loading ? (
        <ActivityIndicator size="small" color={palette.accent} style={styles.loading} />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
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
                <Button
                  title="Edit"
                  color={palette.accent}
                  onPress={() => openEditModal(item)}
                />
                <Button
                  title="Remove"
                  color={palette.danger}
                  onPress={() => handleDelete(item)}
                />
              </View>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No team members available.</Text>
          }
        />
      )}
      <View style={styles.actions}>
        <Button title="Add Member" color={palette.accent} onPress={openAddModal} />
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
              placeholderTextColor={palette.textMuted}
              selectionColor={palette.accent}
              autoFocus
            />
            <TextInput
              style={styles.input}
              placeholder="Role"
              value={role}
              onChangeText={setRole}
              placeholderTextColor={palette.textMuted}
              selectionColor={palette.accent}
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

export const createTeamScreenStyles = (palette) =>
  StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: palette.page },
    header: {
      color: palette.heroText,
      fontSize: 24,
      fontWeight: "bold",
      marginBottom: 16
    },
    loading: { marginTop: 40 },
    errorText: { color: palette.danger, marginTop: 40 },
    emptyText: { color: palette.textMuted },
    memberRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderColor: palette.border
    },
    memberName: { color: palette.text, fontSize: 18 },
    memberRole: { fontSize: 16, color: palette.textMuted },
    actions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      marginTop: 24
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: palette.shadow,
      justifyContent: "center",
      alignItems: "center"
    },
    modalContent: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderWidth: 1,
      borderRadius: radius.card,
      padding: 24,
      width: 300,
      alignItems: "center",
      elevation: 4,
      ...(Platform.OS === "web"
        ? { boxShadow: `0px 6px 24px ${palette.shadow}` }
        : {
            shadowColor: palette.shadow,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.18,
            shadowRadius: 12
          })
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: palette.text,
      marginBottom: 12
    },
    input: {
      width: "100%",
      backgroundColor: palette.surfaceMuted,
      color: palette.text,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      padding: 10,
      marginBottom: 12,
      fontSize: 16
    },
    saveBtn: {
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      paddingHorizontal: 18,
      paddingVertical: 10
    },
    saveBtnText: { color: palette.accentText, fontWeight: "bold", fontSize: 15 },
    cancelBtn: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderWidth: 1,
      borderRadius: radius.card,
      paddingHorizontal: 18,
      paddingVertical: 10
    },
    cancelBtnText: { color: palette.text, fontWeight: "bold", fontSize: 15 }
  });
