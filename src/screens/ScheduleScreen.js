import { View, Text, Modal, TouchableOpacity, ScrollView, Alert } from "react-native";
import { useEffect, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { groupTasks } from "../utils/schedule";
import TaskRow from "../components/TaskRow";
import { getTasks, completeTask } from "../api/tasks";
import ScreenContainer from "../components/ScreenContainer";
import { useAuth } from "../context/AuthContext";

export default function ScheduleScreen() {
  const [groups, setGroups] = useState(null);
  const [error, setError] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const { isPro } = useAuth();
  const navigation = useNavigation();

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setError(null);
      const res = await getTasks();
      const payload = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setGroups(groupTasks(payload));
    } catch (err) {
      console.warn("Failed to load schedule:", err?.message || err);
      setError("Unable to load schedule. Please try again.");
      setGroups({
        overdue: [],
        today: [],
        upcoming: [],
        completed: []
      });
    }
  }

  function handleSelectTask(task) {
    setSelectedTask(task);
    setModalVisible(true);
  }

  function handleCloseModal() {
    setModalVisible(false);
    // Optional: Clear selectedTask after animation, but not strictly necessary if we just hide it.
    // If we clear it immediately, we get the "ghost" content issue.
  }

  async function handleComplete(task) {
    if (!isPro) {
      Alert.alert(
        "Pro Feature",
        "Marking tasks as complete is a Pro feature. Upgrade to track your progress!",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Upgrade", onPress: () => {
              setModalVisible(false);
              navigation.navigate("Subscription");
            } 
          }
        ]
      );
      return;
    }

    try {
      await completeTask(task._id);
      setModalVisible(false);
      load(); // Refresh the list
    } catch (err) {
      console.error("Failed to complete task:", err);
      Alert.alert("Error", "Could not mark task as complete. Please try again.");
    }
  }

  if (!groups) {
    return (
      <ScreenContainer>
        <Text style={{ padding: 16 }}>Loading schedule…</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll contentContainerStyle={{ padding: 12 }}>
      {error && (
        <View
          style={{
            backgroundColor: "#FEF2F2",
            borderRadius: 8,
            padding: 12,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: "#FECACA"
          }}
        >
          <Text style={{ color: "#B91C1C" }}>{error}</Text>
          <Text
            style={{ color: "#B91C1C", textDecorationLine: "underline", marginTop: 6 }}
            onPress={load}
          >
            Retry
          </Text>
        </View>
      )}
      <View
        style={{
          marginBottom: 18,
          backgroundColor: "#F0FDF4",
          borderRadius: 8,
          padding: 12
        }}
      >
        <Text
          style={{ color: "#10B981", fontWeight: "600", fontSize: 15, marginBottom: 2 }}
        >
          Your schedule reflects intent, not obligation.
        </Text>
        <Text style={{ color: "#222", fontSize: 13 }}>
          Tasks are reminders of what you planned — not commands you must follow. Your
          plants decide the pace.
        </Text>
      </View>
      <Section title="Overdue" tasks={groups.overdue} onSelect={handleSelectTask} />
      <Section title="Today" tasks={groups.today} onSelect={handleSelectTask} />
      <Section title="Upcoming" tasks={groups.upcoming.slice(0, 14)} onSelect={handleSelectTask} />
      <Section title="Completed" tasks={groups.completed} collapsed onSelect={handleSelectTask} />

      {/* TASK DETAIL MODAL */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{selectedTask?.title}</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {selectedTask?.plant && (
                <Text style={styles.modalMeta}>🌱 {selectedTask.plant.name}</Text>
              )}
              {selectedTask?.description ? (
                <Text style={styles.modalBody}>{selectedTask.description}</Text>
              ) : (
                <Text style={[styles.modalBody, { fontStyle: "italic", color: "#666" }]}>
                  No additional details.
                </Text>
              )}
              <View style={styles.divider} />
              <Text style={styles.modalInfo}>
                Due: {selectedTask?.dueDate ? new Date(selectedTask.dueDate).toLocaleDateString() : "No due date"}
              </Text>
              {selectedTask?.completed ? (
                 <Text style={[styles.modalInfo, { color: "#10B981", fontWeight: "bold" }]}>
                   Completed on {new Date(selectedTask.completedAt).toLocaleDateString()}
                 </Text>
              ) : (
                <TouchableOpacity
                  style={styles.completeBtn}
                  onPress={() => handleComplete(selectedTask)}
                >
                  <Text style={styles.completeBtnText}>Mark as Complete</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={handleCloseModal}
            >
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

function Section({ title, tasks, collapsed, onSelect }) {
  if (!tasks.length) return null;

  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 8 }}>{title}</Text>
      {tasks.map((task) => (
        <TaskRow key={task._id} task={task} onPress={() => onSelect(task)} />
      ))}
    </View>
  );
}

const styles = {
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20
  },
  modalContent: {
    backgroundColor: "white",
    width: "100%",
    maxWidth: 340,
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
    color: "#111827"
  },
  modalMeta: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 12
  },
  modalBody: {
    fontSize: 16,
    color: "#374151",
    marginBottom: 16,
    lineHeight: 22
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 12
  },
  modalInfo: {
    fontSize: 14,
    color: "#4B5563",
    marginBottom: 4
  },
  completeBtn: {
    backgroundColor: "#10B981",
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 10,
    alignItems: "center"
  },
  completeBtnText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16
  },
  closeBtn: {
    marginTop: 10,
    backgroundColor: "#E5E7EB",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center"
  },
  closeBtnText: {
    color: "#374151",
    fontWeight: "600",
    fontSize: 16
  }
};
