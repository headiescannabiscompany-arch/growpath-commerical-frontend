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
  Switch
} from "react-native";
import {
  getTasks,
  createCustomTask,
  completeTask,
  reopenTask,
  deleteTask
} from "../api/tasks.js";
import { useAuth } from "@/auth/AuthContext";

export default function TasksScreen() {
  const { token } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [title, setTitle] = useState("");
  const [completed, setCompleted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const fetchTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTasks(token);
      setTasks(Array.isArray(data) ? data : data?.tasks || []);
    } catch (err) {
      setError(err.message || "Error loading tasks");
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditTask(null);
    setTitle("");
    setCompleted(false);
    setModalVisible(true);
  };

  const openEditModal = (task) => {
    setEditTask(task);
    setTitle(task.title);
    setCompleted(task.completed);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      if (editTask) {
        // No direct updateTask API, so use complete/reopen for status, and delete+create for edit
        if (editTask.completed !== completed) {
          if (!editTask.id) {
            Alert.alert("Error", "Task is missing an ID and cannot be updated.");
            setSaving(false);
            return;
          }
          if (completed) {
            await completeTask(editTask.id, token);
          } else {
            await reopenTask(editTask.id, token);
          }
        }
        // For title change, delete and re-create (workaround for demo)
        if (editTask.title !== title) {
          await deleteTask(editTask.id, token);
          await createCustomTask({ title, completed }, token);
        }
      } else {
        await createCustomTask({ title, completed }, token);
      }
      setModalVisible(false);
      fetchTasks();
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to save task");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (task) => {
    Alert.alert("Remove Task", `Are you sure you want to remove '${task.title}'?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteTask(task.id, token);
            fetchTasks();
          } catch (err) {
            Alert.alert("Error", err.message || "Failed to remove task");
          }
        }
      }
    ]);
  };

  const handleToggleComplete = async (task) => {
    if (!task || !task.id) {
      Alert.alert("Error", "Task is missing an ID and cannot be updated.");
      return;
    }
    try {
      if (task.completed) {
        await reopenTask(task.id, token);
      } else {
        await completeTask(task.id, token);
      }
      fetchTasks();
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to update task");
    }
  };

  const filteredTasks = tasks.filter((t) =>
    filter === "all" ? true : filter === "done" ? t.completed : !t.completed
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Tasks</Text>
      <View style={styles.filterRow}>
        <Button
          title="All"
          onPress={() => setFilter("all")}
          color={filter === "all" ? "#10B981" : undefined}
        />
        <Button
          title="Pending"
          onPress={() => setFilter("pending")}
          color={filter === "pending" ? "#10B981" : undefined}
        />
        <Button
          title="Done"
          onPress={() => setFilter("done")}
          color={filter === "done" ? "#10B981" : undefined}
        />
      </View>
      {loading ? (
        <ActivityIndicator size="small" color="#10B981" style={{ marginTop: 40 }} />
      ) : error ? (
        <Text style={{ color: "#ef4444", marginTop: 40 }}>{error}</Text>
      ) : (
        <FlatList
          data={filteredTasks}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.taskRow}>
              <TouchableOpacity onPress={() => handleToggleComplete(item)}>
                <Text style={[styles.taskStatus, item.completed && styles.taskDone]}>
                  {item.completed ? "☑" : "☐"}
                </Text>
              </TouchableOpacity>
              <Text style={[styles.taskTitle, item.completed && styles.taskDone]}>
                {item.title}
              </Text>
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
          ListEmptyComponent={<Text>No tasks available.</Text>}
        />
      )}
      <View style={styles.actions}>
        <Button title="Add Task" onPress={openAddModal} />
      </View>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editTask ? "Edit Task" : "Add Task"}</Text>
            <TextInput
              style={styles.input}
              placeholder="Title"
              value={title}
              onChangeText={setTitle}
              autoFocus
            />
            <View style={styles.switchRow}>
              <Text style={{ fontSize: 16 }}>Completed:</Text>
              <Switch value={completed} onValueChange={setCompleted} />
            </View>
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
  filterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#eee"
  },
  taskTitle: { fontSize: 18, flex: 1 },
  taskStatus: { fontSize: 22, marginRight: 12, color: "#10B981" },
  taskDone: { textDecorationLine: "line-through", color: "#888" },
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
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 12
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
