/**
 * FacilityTasks Screen - Basic CRUD Implementation
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl
} from "react-native";
import { useAuth } from "../../context/AuthContext.js";
import { hasGlobalFacilityAccess } from "../../types/facility.js";
import { getTasks, createCustomTask, completeTask, deleteTask } from "../../api/tasks.js";

const FacilityTasks = () => {
  const { selectedFacilityId, facilitiesAccess, token } = useAuth();
  const [activeTab, setActiveTab] = useState("all");
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const today = new Date();
  const defaultDueDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(today.getDate()).padStart(2, "0")}`;
  const [newTaskDueDate, setNewTaskDueDate] = useState(defaultDueDate);
  const [newTaskAssignee, setNewTaskAssignee] = useState("");
  const [newTaskRoom, setNewTaskRoom] = useState("");
  const [creating, setCreating] = useState(false);
  const currentUserId = useAuth()?.user?._id || useAuth()?.user?.id || null;

  const userAccess = facilitiesAccess?.find((f) => f.facilityId === selectedFacilityId);
  const userRole = userAccess?.role;
  const isAdmin = userRole ? hasGlobalFacilityAccess(userRole) : false;

  // Entitlement gating: Only allow admin/lead roles to create, complete, or delete tasks
  const notEntitled = !isAdmin;

  useEffect(() => {
    loadTasks();
  }, [selectedFacilityId]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const result = await getTasks(token);
      setTasks(Array.isArray(result) ? result : []);
    } catch (error) {
      console.log("Error loading tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  };

  const handleCreateTask = async () => {
    if (notEntitled) {
      Alert.alert(
        "Access Denied",
        "You do not have permission to create tasks in this facility."
      );
      return;
    }
    if (!newTaskTitle.trim()) {
      Alert.alert("Error", "Task title is required");
      return;
    }
    setCreating(true);
    try {
      let finalDate = newTaskDueDate;
      if (/^\d{4}-\d{2}-\d{2}$/.test(newTaskDueDate)) {
        const [y, m, d] = newTaskDueDate.split("-").map(Number);
        finalDate = new Date(y, m - 1, d).toISOString();
      }

      await createCustomTask(
        {
          title: newTaskTitle,
          description: newTaskDesc,
          dueDate: finalDate,
          facilityId: selectedFacilityId,
          assignedTo: newTaskAssignee?.trim() || currentUserId,
          roomId: newTaskRoom?.trim() || undefined
        },
        token
      );

      setShowCreateModal(false);
      setNewTaskTitle("");
      setNewTaskDesc("");
      setNewTaskDueDate(defaultDueDate);
      setNewTaskAssignee("");
      setNewTaskRoom("");
      await loadTasks();
    } catch (error) {
      Alert.alert("Error", "Failed to create task");
    } finally {
      setCreating(false);
    }
  };

  const handleCompleteTask = async (taskId) => {
    if (notEntitled) {
      Alert.alert(
        "Access Denied",
        "You do not have permission to complete tasks in this facility."
      );
      return;
    }
    try {
      await completeTask(taskId, token);
      await loadTasks();
    } catch (error) {
      Alert.alert("Error", "Failed to complete task");
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (notEntitled) {
      Alert.alert(
        "Access Denied",
        "You do not have permission to delete tasks in this facility."
      );
      return;
    }
    Alert.alert("Delete Task", "Are you sure you want to delete this task?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteTask(taskId, token);
            await loadTasks();
          } catch (error) {
            Alert.alert("Error", "Failed to delete task");
          }
        }
      }
    ]);
  };

  const tabs = [
    { id: "all", label: "All Tasks", adminOnly: false },
    { id: "byRoom", label: "By Room", adminOnly: true },
    { id: "byUser", label: "By User", adminOnly: true },
    { id: "verify", label: "Awaiting Verify", adminOnly: true }
  ];

  const visibleTabs = tabs.filter((tab) => !tab.adminOnly || isAdmin);

  const pendingTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Add Task Button */}
      <TouchableOpacity
        style={[styles.addButton, notEntitled && styles.disabledButton]}
        onPress={() => {
          if (notEntitled) {
            Alert.alert(
              "Access Denied",
              "You do not have permission to create tasks in this facility."
            );
            return;
          }
          setShowCreateModal(true);
        }}
        disabled={notEntitled}
      >
        <Text style={styles.addButtonText}>+ Add Task</Text>
      </TouchableOpacity>

      {/* Tab Navigation */}
      <View style={styles.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {visibleTabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.tabActive]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text
                style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {activeTab === "all" && (
          <>
            {pendingTasks.length === 0 && completedTasks.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📋</Text>
                <Text style={styles.emptyText}>No tasks yet</Text>
                <Text style={styles.emptySubtext}>Tap + Add Task to create one</Text>
              </View>
            ) : (
              <>
                {pendingTasks.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                      Pending ({pendingTasks.length})
                    </Text>
                    {pendingTasks.map((task) => (
                      <View key={task._id} style={styles.taskItem}>
                        <TouchableOpacity
                          style={styles.taskCheckbox}
                          onPress={() => handleCompleteTask(task._id)}
                          disabled={notEntitled}
                        >
                          <Text style={styles.checkboxEmpty}>○</Text>
                        </TouchableOpacity>
                        <View style={styles.taskContent}>
                          <Text style={styles.taskTitle}>{task.title}</Text>
                          {task.description && (
                            <Text style={styles.taskDesc}>{task.description}</Text>
                          )}
                          {task.dueDate && (
                            <Text style={styles.taskMeta}>
                              Due: {new Date(task.dueDate).toLocaleDateString()}
                            </Text>
                          )}
                          {task.assignedTo && (
                            <Text style={styles.taskMeta}>
                              Assigned to:{" "}
                              {task.assignedTo.displayName ||
                                task.assignedTo.email ||
                                task.assignedTo}
                            </Text>
                          )}
                        </View>
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => handleDeleteTask(task._id)}
                          disabled={notEntitled}
                        >
                          <Text style={styles.deleteButtonText}>×</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                {completedTasks.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                      Completed ({completedTasks.length})
                    </Text>
                    {completedTasks.map((task) => (
                      <View
                        key={task._id}
                        style={[styles.taskItem, styles.taskCompleted]}
                      >
                        <View style={styles.taskCheckbox}>
                          <Text style={styles.checkboxChecked}>✓</Text>
                        </View>
                        <View style={styles.taskContent}>
                          <Text style={[styles.taskTitle, styles.taskTitleCompleted]}>
                            {task.title}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => handleDeleteTask(task._id)}
                          disabled={notEntitled}
                        >
                          <Text style={styles.deleteButtonText}>×</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}
          </>
        )}

        {activeTab !== "all" && (
          <View style={styles.placeholderContainer}>
            <Text style={styles.placeholderIcon}>🚧</Text>
            <Text style={styles.placeholderTitle}>Coming in Phase 2</Text>
            <Text style={styles.placeholderText}>
              Advanced filtering and grouping features will be available soon.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Create Task Modal */}
      <Modal
        visible={showCreateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Task</Text>
            <TextInput
              style={styles.input}
              placeholder="Task title"
              value={newTaskTitle}
              onChangeText={setNewTaskTitle}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description (optional)"
              value={newTaskDesc}
              onChangeText={setNewTaskDesc}
              multiline
              numberOfLines={3}
            />
            <TextInput
              style={styles.input}
              placeholder="Assign to (email or name) — optional"
              value={newTaskAssignee}
              onChangeText={setNewTaskAssignee}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Room (id or name) — optional"
              value={newTaskRoom}
              onChangeText={setNewTaskRoom}
            />
            <TextInput
              style={styles.input}
              placeholder="Due date (YYYY-MM-DD)"
              value={newTaskDueDate}
              onChangeText={setNewTaskDueDate}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowCreateModal(false);
                  setNewTaskTitle("");
                  setNewTaskDesc("");
                  setNewTaskAssignee("");
                  setNewTaskRoom("");
                  setNewTaskDueDate(defaultDueDate);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.createButton,
                  creating && styles.disabledButton,
                  notEntitled && styles.disabledButton
                ]}
                onPress={handleCreateTask}
                disabled={creating || notEntitled}
              >
                <Text style={styles.createButtonText}>
                  {creating ? "Creating..." : "Create"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb"
  },
  addButton: {
    backgroundColor: "#0ea5e9",
    margin: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 8,
    alignItems: "center"
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600"
  },
  tabBar: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingHorizontal: 16
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 8
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: "#0ea5e9"
  },
  tabText: {
    fontSize: 14,
    color: "#6b7280"
  },
  tabTextActive: {
    color: "#0ea5e9",
    fontWeight: "600"
  },
  content: {
    flex: 1,
    padding: 16
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 4
  },
  emptySubtext: {
    fontSize: 14,
    color: "#9ca3af"
  },
  section: {
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 12
  },
  taskItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#0ea5e9"
  },
  taskCompleted: {
    opacity: 0.6,
    borderLeftColor: "#10b981"
  },
  taskCheckbox: {
    marginRight: 12,
    marginTop: 2
  },
  checkboxEmpty: {
    fontSize: 20,
    color: "#9ca3af"
  },
  checkboxChecked: {
    fontSize: 20,
    color: "#10b981"
  },
  taskContent: {
    flex: 1
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: "500",
    color: "#1f2937",
    marginBottom: 4
  },
  taskTitleCompleted: {
    textDecorationLine: "line-through",
    color: "#6b7280"
  },
  taskDesc: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 4
  },
  taskMeta: {
    fontSize: 12,
    color: "#9ca3af"
  },
  deleteButton: {
    marginLeft: 8,
    padding: 4
  },
  deleteButtonText: {
    fontSize: 24,
    color: "#ef4444",
    fontWeight: "300"
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60
  },
  placeholderIcon: {
    fontSize: 48,
    marginBottom: 12
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 8
  },
  placeholderText: {
    fontSize: 14,
    color: "#9ca3af",
    textAlign: "center"
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
    color: "#1f2937"
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12
  },
  textArea: {
    height: 80,
    textAlignVertical: "top"
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center"
  },
  cancelButton: {
    backgroundColor: "#f3f4f6"
  },
  cancelButtonText: {
    color: "#374151",
    fontWeight: "600"
  },
  createButton: {
    backgroundColor: "#0ea5e9"
  },
  createButtonText: {
    color: "#fff",
    fontWeight: "600"
  },
  disabledButton: {
    opacity: 0.5
  }
});

export default FacilityTasks;
