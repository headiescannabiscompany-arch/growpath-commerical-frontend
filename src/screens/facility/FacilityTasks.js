import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  Button,
  ActivityIndicator,
  FlatList,
  TextInput,
  Pressable,
  Modal,
  StyleSheet,
  ScrollView,
  RefreshControl
} from "react-native";
import { useFacility } from "../../facility/FacilityProvider";
import { can } from "../../facility/roleGates";
import { handleApiError } from "../../ui/handleApiError";
import { useTasks } from "../../hooks/useTasks";

// Canonical Tasks screen:
// - No direct API imports
// - Facility context from useFacility()
// - Role gating via can()
// - Error handling via handleApiError()

export default function FacilityTasks() {
  const { activeFacilityId, facilityRole } = useFacility();
  const { data, isLoading, error, refetch, createTask, creating } = useTasks();

  // Minimal local UI state for creating tasks
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handlers = useMemo(
    () => ({
      onAuthRequired: () => {
        // TODO: call your logout + navigate to login
        console.log("AUTH_REQUIRED: route to login");
      },
      onFacilityDenied: () => {
        // TODO: route to a "No access to this facility" screen, or show inline state
        console.log("FACILITY_ACCESS_DENIED: show no-access state");
      },
      toast: (msg: string) => {
        // TODO: replace with your toast implementation
        console.log(msg);
      }
    }),
    []
  );

  // Facility not selected yet
  if (!activeFacilityId) {
    return (
      <View style={styles.container}>
        <Text style={styles.heading}>Tasks</Text>
        <Text style={styles.placeholderText}>Select a facility to view tasks.</Text>
      </View>
    );
  }

  // Standardized error handling
  if (error) handleApiError(error, handlers);

  const tasks = Array.isArray(data) ? data : [];

  const allowCreate = can(facilityRole, "TASKS_CREATE");
  const allowDelete = can(facilityRole, "TASKS_DELETE");
  const allowUpdate = can(facilityRole, "TASKS_UPDATE");
  const allowComplete = can(facilityRole, "TASKS_UPDATE"); // Complete is an update action

  async function onCreate() {
    if (!allowCreate) return handlers.toast("You don't have permission to create tasks.");
    const t = title.trim();
    if (!t) return handlers.toast("Enter a task title.");
    try {
      await createTask({ title: t, description: description.trim() || undefined });
      setTitle("");
      setDescription("");
      setShowCreateModal(false);
    } catch (e) {
      handleApiError(e, handlers);
    }
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

        {/* Action row */}
        <View style={styles.actionRow}>
          {section === "pending" && allowComplete ? (
            <Pressable
              onPress={() => handlers.toast(`Mark as complete for ${taskId} (hook mutation needed)`)}
              style={styles.actionButton}
            >
              <Text style={styles.actionButtonText}>✓</Text>
            </Pressable>
          ) : null}

          {allowUpdate ? (
            <Pressable
              onPress={() => handlers.toast(`Edit flow for ${taskId} (modal/navigation needed)`)}
              style={styles.actionButton}
            >
              <Text style={styles.actionButtonText}>✎</Text>
            </Pressable>
          ) : null}

          {allowDelete ? (
            <Pressable
              onPress={() => handlers.toast(`Delete flow for ${taskId} (hook mutation needed)`)}
              style={styles.actionButton}
            >
              <Text style={styles.actionButtonText}>×</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with refresh */}
      <View style={styles.header}>
        <Text style={styles.heading}>Tasks</Text>
        <Button title="Refresh" onPress={() => refetch()} />
      </View>

      {/* Create button */}
      {allowCreate ? (
        <Pressable
          style={styles.createButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Text style={styles.createButtonText}>+ Add Task</Text>
        </Pressable>
      ) : null}

      {/* Task list or empty state */}
      <ScrollView
        style={styles.listContainer}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
      >
        {isLoading && !tasks.length ? (
          <ActivityIndicator style={{ marginTop: 20 }} />
        ) : tasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>No tasks yet</Text>
            {allowCreate && (
              <Text style={styles.emptySubtext}>Tap + Add Task to create one</Text>
            )}
          </View>
        ) : (
          <>
            {pendingTasks.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Pending ({pendingTasks.length})
                </Text>
                {pendingTasks.map((task: any) => renderTaskItem(task, "pending"))}
              </View>
            )}

            {completedTasks.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Completed ({completedTasks.length})
                </Text>
                {completedTasks.map((task: any) =>
                  renderTaskItem({ ...task, title: `[✓] ${task.title}` }, "completed")
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Create task modal */}
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
                <Text style={styles.confirmButtonText}>
                  {creating ? "Creating..." : "Create"}
                </Text>
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
    fontSize: 16,
    color: "#374151",
    fontWeight: "500"
  },
  emptyState: {
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
  placeholderText: {
    fontSize: 14,
    color: "#9ca3af",
    marginTop: 12
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
