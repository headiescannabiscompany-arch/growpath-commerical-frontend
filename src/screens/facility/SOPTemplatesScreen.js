import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import {
  listSOPTemplates,
  createSOPTemplate,
  updateSOPTemplate,
  deleteSOPTemplate
} from "../../api/sop";

export default function SOPTemplatesScreen() {
  const { selectedFacilityId } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, [selectedFacilityId]);

  const loadTemplates = async () => {
    setLoading(true);
    const res = await listSOPTemplates(selectedFacilityId);
    if (res.success) setTemplates(res.data);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!title) {
      Alert.alert("Missing info", "Title is required.");
      return;
    }
    setSubmitting(true);
    let res;
    if (editingId) {
      res = await updateSOPTemplate(selectedFacilityId, editingId, { title, content });
    } else {
      res = await createSOPTemplate(selectedFacilityId, { title, content });
    }
    setSubmitting(false);
    if (res.success) {
      setTitle("");
      setContent("");
      setEditingId(null);
      loadTemplates();
    } else {
      Alert.alert("Error", res.message || "Failed to save template");
    }
  };

  const handleEdit = (tpl) => {
    setTitle(tpl.title);
    setContent(tpl.content);
    setEditingId(tpl._id || tpl.id);
  };

  const handleDelete = async (tpl) => {
    Alert.alert("Delete SOP", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setSubmitting(true);
          const res = await deleteSOPTemplate(selectedFacilityId, tpl._id || tpl.id);
          setSubmitting(false);
          if (res.success) loadTemplates();
          else Alert.alert("Error", res.message || "Failed to delete");
        }
      }
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>SOP Templates</Text>
      <Text style={styles.info}>
        Create and manage Standard Operating Procedure templates for your facility.
      </Text>

      <View style={styles.form}>
        <Text style={styles.formLabel}>Title</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="SOP Title"
        />
        <Text style={styles.formLabel}>Content</Text>
        <TextInput
          style={styles.input}
          value={content}
          onChangeText={setContent}
          placeholder="SOP Content"
          multiline
        />
        <TouchableOpacity
          style={styles.addBtn}
          onPress={handleSave}
          disabled={submitting}
        >
          <Text style={styles.addBtnText}>
            {submitting ? "Saving..." : editingId ? "Update SOP" : "Add SOP"}
          </Text>
        </TouchableOpacity>
        {editingId && (
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => {
              setTitle("");
              setContent("");
              setEditingId(null);
            }}
          >
            <Text style={styles.cancelBtnText}>Cancel Edit</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.sectionHeader}>SOP Template List</Text>
      {loading ? (
        <ActivityIndicator color="#0ea5e9" />
      ) : (
        <FlatList
          data={templates}
          keyExtractor={(item) => item._id || item.id || Math.random().toString()}
          renderItem={({ item }) => (
            <View style={styles.tplRow}>
              <Text style={styles.tplTitle}>{item.title}</Text>
              {item.content ? (
                <Text style={styles.tplContent}>{item.content}</Text>
              ) : null}
              <View style={styles.tplActions}>
                <TouchableOpacity
                  onPress={() => handleEdit(item)}
                  style={styles.tplActionBtn}
                >
                  <Text style={styles.tplActionText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDelete(item)}
                  style={styles.tplActionBtn}
                >
                  <Text style={[styles.tplActionText, { color: "#ef4444" }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No SOP templates yet</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb", padding: 24 },
  header: { fontSize: 22, fontWeight: "bold", marginBottom: 16 },
  info: { fontSize: 16, color: "#374151", marginBottom: 16 },
  form: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1
  },
  formLabel: { fontSize: 14, color: "#374151", marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 10,
    marginTop: 4
  },
  addBtn: {
    backgroundColor: "#0ea5e9",
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    alignItems: "center"
  },
  addBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  cancelBtn: { marginTop: 8, alignItems: "center" },
  cancelBtnText: { color: "#6b7280", fontSize: 15 },
  sectionHeader: { fontSize: 18, fontWeight: "bold", marginBottom: 8 },
  tplRow: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 1,
    elevation: 1
  },
  tplTitle: { fontSize: 16, fontWeight: "600" },
  tplContent: { fontSize: 14, color: "#374151", marginTop: 2 },
  tplActions: { flexDirection: "row", marginTop: 8 },
  tplActionBtn: { marginRight: 16 },
  tplActionText: { color: "#0ea5e9", fontWeight: "bold" },
  emptyText: { color: "#9ca3af", fontStyle: "italic", textAlign: "center", marginTop: 16 }
});
