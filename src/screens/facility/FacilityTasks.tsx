import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  Button,
  Alert,
  ActivityIndicator,
  TextInput,
  Pressable,
  Modal,
  StyleSheet,
  ScrollView,
  RefreshControl
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useFacility } from "../../facility/FacilityProvider";
import { can, type FacilityRole } from "../../facility/roleGates";
import { handleApiError } from "../../ui/handleApiError";
import { useTasks } from "../../hooks/useTasks";

// Canonical Tasks screen:
// - No direct API imports
// - Facility context from useFacility()
// - Role gating via can()
// - Error handling via handleApiError()

export default function FacilityTasks() {
  const { activeFacilityId, facilityRole: rawRole } = useFacility();
  const navigation = useNavigation<any>();
  const facilityRole = rawRole as FacilityRole | null;
  const {
    data,
    isLoading,
    error,
    refetch,
    createTask,
    creating,
    updateTask,
    updating,
    deleteTask,
    deleting
  } = useTasks();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deniedMessage, setDeniedMessage] = useState<string | null>(null);

  const handlers = useMemo(
    () => ({
      onAuthRequired: () => {
        navigation.reset({ index: 0, routes: [{ name: "Login" }] });
      },
      onFacilityDenied: () => {
        setDeniedMessage("You do not have access to perform this task action.");
      },
      toast: (msg: string) => {
        Alert.alert("Notice", msg);
      }
    }),
    [navigation]
  );

  if (!activeFacilityId) {
    return (
      <View style={styles.container}>
        <Text style={styles.heading}>Tasks</Text>
        <Text style={styles.placeholderText}>Select a facility to view tasks.</Text>
      </View>
    );
  }

  if (error) handleApiError(error, "Failed to load tasks");

  const tasks = Array.isArray(data) ? data : [];

  const allowCreate = can(facilityRole, "TASKS_CREATE");
  const allowDelete = can(facilityRole, "TASKS_DELETE");
  const allowUpdate = can(facilityRole, "TASKS_UPDATE");
  const allowComplete = can(facilityRole, "TASKS_UPDATE");

  async function onCreate() {
    if (!allowCreate) {
      handlers.onFacilityDenied();
      return;
    }
    const t = title.trim();
    if (!t) return handlers.toast("Enter a task title.");
    try {
      await createTask({ title: t, description: description.trim() || undefined });
      setTitle("");
      setDescription("");
      setShowCreateModal(false);
    } catch (e: any) {
      if (e?.status === 401) return handlers.onAuthRequired();
      if (e?.status === 403) return handlers.onFacilityDenied();
      handleApiError(e, "Failed to create task");
    }
  }

  async function onMarkComplete(taskId: string) {
    if (!allowComplete) {
      handlers.onFacilityDenied();
      return;
    }
    if (!taskId) return;
    try {
      await updateTask({ id: taskId, patch: { completed: true } });
    } catch (e: any) {
      if (e?.status === 401) return handlers.onAuthRequired();
      if (e?.status === 403) return handlers.onFacilityDenied();
      handleApiError(e, "Failed to mark task complete");
    }
  }

  async function onDelete(taskId: string) {
    if (!allowDelete) {
      handlers.onFacilityDenied();
      return;
    }
    if (!taskId) return;

    Alert.alert("Delete Task", "This action cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteTask(taskId);
          } catch (e: any) {
            if (e?.status === 401) return handlers.onAuthRequired();
            if (e?.status === 403) return handlers.onFacilityDenied();
            handleApiError(e, "Failed to delete task");
          }
        }
      }
    ]);
  }

  const pendingTasks = tasks.filter((t: any) => !t.completed);
  const completedTasks = tasks.filter((t: any) => t.completed);

  function renderTaskItem(item: any, section: "pending" | "completed") {
    const taskTitle = item?.title ?? item?.name ?? "(untitled)";
    const taskId = item?.id ?? item?._id ?? "";

    return (
      <View key={taskId} style={styles.taskItem}>
        <View style={styles.taskContent}>
          <Text style={styles.taskTitle}>{taskTitle}</Text>
          {item?.description ? (
            <Text style={styles.taskDesc}>{item.description}</Text>
          ) : null}
          {item?.dueDate || item?.dueAt ? (
            <Text style={styles.taskMeta}>
              Due: {new Date(item.dueDate || item.dueAt).toLocaleDateString()}
            </Text>
          ) : null}
          {item?.assignedTo ? (
            <Text style={styles.taskMeta}>
              Assigned to: {item.assignedTo.displayName || item.assignedTo.email || item.assignedTo}
            </Text>
          ) : null}
        </View>

        <View style={styles.actionRow}>
          {section === "pending" && allowComplete ? (
            <Pressable
              onPress={() => onMarkComplete(taskId)}
              disabled={updating}
              style={styles.actionButton}
            >
              <Text style={styles.actionButtonText}>{updating ? "..." : "Complete"}</Text>
            </Pressable>
          ) : null}

          {allowUpdate ? (
            <Pressable disabled style={[styles.actionButton, styles.disabledActionButton]}>
              <Text style={styles.disabledActionText}>Edit (Unavailable in v1)</Text>
            </Pressable>
          ) : null}

          {allowDelete ? (
            <Pressable
              onPress={() => onDelete(taskId)}
              disabled={deleting}
              style={styles.actionButton}
            >
              <Text style={styles.actionButtonText}>{deleting ? "..." : "Delete"}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>Tasks</Text>
        <Button title="Refresh" onPress={() => refetch()} />
      </View>

      {deniedMessage ? (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>{deniedMessage}</Text>
        </View>
      ) : null}

      {allowCreate ? (
        <Pressable style={styles.createButton} onPress={() => setShowCreateModal(true)}>
          <Text style={styles.createButtonText}>+ Add Task</Text>
        </Pressable>
      ) : null}

      <ScrollView
        style={styles.listContainer}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
      >
        {isLoading && !tasks.length ? (
          <ActivityIndicator style={{ marginTop: 20 }} />
        ) : tasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No tasks yet</Text>
            {allowCreate && (
              <Text style={styles.emptySubtext}>Tap + Add Task to create one</Text>
            )}
          </View>
        ) : (
          <>
            {pendingTasks.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Pending ({pendingTasks.length})</Text>
                {pendingTasks.map((task: any) => renderTaskItem(task, "pending"))}
              </View>
            )}

            {completedTasks.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Completed ({completedTasks.length})</Text>
                {completedTasks.map((task: any) =>
                  renderTaskItem({ ...task, title: `[Done] ${task.title}` }, "completed")
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>

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
              value={title}
              onChangeText={setTitle}
              placeholderTextColor="#999"
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description (optional)"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              placeholderTextColor="#999"
            />

            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowCreateModal(false);
                  setTitle("");
                  setDescription("");
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.modalButton,
                  styles.confirmButton,
                  creating && styles.disabledButton
                ]}
                onPress={onCreate}
                disabled={creating}
              >
                <Text style={styles.confirmButtonText}>{creating ? "Creating..." : "Create"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb"
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12
  },
  heading: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937"
  },
  createButton: {
    backgroundColor: "#0ea5e9",
    marginHorizontal: 16,
    marginVertical: 8,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center"
  },
  createButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600"
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 16
  },
  section: {
    marginVertical: 16
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
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#0ea5e9"
  },
  taskContent: {
    flex: 1,
    marginHorizontal: 12
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: "500",
    color: "#1f2937",
    marginBottom: 4
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
  actionRow: {
    flexDirection: "row",
    gap: 8
  },
  actionButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center"
  },
  actionButtonText: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "500"
  },
  disabledActionButton: {
    opacity: 0.55
  },
  disabledActionText: {
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "500"
  },
  emptyState: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60
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
  placeholderText: {
    fontSize: 14,
    color: "#9ca3af",
    marginTop: 12
  },
  warningBanner: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#fecaca",
    backgroundColor: "#fef2f2",
    padding: 10
  },
  warningText: {
    color: "#991b1b",
    fontSize: 13
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end"
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingBottom: 40
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
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 12,
    color: "#1f2937"
  },
  textArea: {
    height: 80,
    textAlignVertical: "top"
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
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
  confirmButton: {
    backgroundColor: "#0ea5e9"
  },
  confirmButtonText: {
    color: "#fff",
    fontWeight: "600"
  },
  disabledButton: {
    opacity: 0.5
  }
});
