import React, { useEffect, useState } from "react";
import { Text, TouchableOpacity, FlatList, View, Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import ScreenContainer from "../components/ScreenContainer";
import TaskCompleteModal from "../components/TaskCompleteModal";
import { getTodayTasks, completeTask } from "../api/tasks";
import {
  requestNotificationPermission,
  setupAndroidChannel,
  scheduleTaskReminder,
  canUseReminders
} from "../utils/notifications";
import FeatureGate from "../components/FeatureGate";
import { useAuth } from "../context/AuthContext";

export default function TasksTodayScreen() {
  const [tasks, setTasks] = useState([]);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const { isPro } = useAuth();
  const navigation = useNavigation();
  // user initialization moved inside useCallback for correct dependency handling

  // Removed duplicate load function; using useCallback version below
  const load = React.useCallback(async () => {
    const user = global.user || { role: "free" }; // Replace with your actual user context
    const res = await getTodayTasks();
    const data = res?.data ?? res ?? [];
    const taskList = Array.isArray(data) ? data : [];
    setTasks(taskList);

    // Schedule reminders for all tasks if allowed (mobile only)
    if (Platform.OS !== "web" && canUseReminders(user) && permissionGranted) {
      for (const task of taskList) {
        if (task.dueDate) {
          await scheduleTaskReminder(task);
        }
      }
    }
  }, [permissionGranted]);

  useEffect(() => {
    async function init() {
      if (Platform.OS !== "web") {
        await setupAndroidChannel();
        const granted = await requestNotificationPermission();
        setPermissionGranted(granted);
      }
      load();
    }
    init();
  }, [load]);

  async function finish(id) {
    if (!id) {
      Alert.alert("Error", "Task is missing an ID and cannot be completed.");
      return;
    }
    await completeTask(id);
    setShowCompleteModal(true);
    load();
  }

  return (
    <ScreenContainer>
      <View
        style={{
          backgroundColor: "#F0FDF4",
          borderRadius: 8,
          padding: 12,
          marginBottom: 12
        }}
      >
        <Text
          style={{ color: "#10B981", fontWeight: "600", fontSize: 15, marginBottom: 2 }}
        >
          🌱 Gentle Reminders
        </Text>
        <Text style={{ color: "#222", fontSize: 13 }}>
          Reminders are here to support—not pressure—you. Use them as gentle nudges, not
          demands. Your growth is unique: skip, snooze, or adjust reminders as needed.
          Progress is personal, and every step counts.
        </Text>
      </View>
      <Text style={styles.header}>Today&apos;s Tasks</Text>

      <TaskCompleteModal
        visible={showCompleteModal}
        onClose={() => setShowCompleteModal(false)}
      />

      {tasks.length === 0 ? (
        <View style={{ alignItems: "center", marginTop: 40 }}>
          <Text style={{ fontSize: 20, fontWeight: "700", marginBottom: 10 }}>
            No tasks yet.
          </Text>
          <Text
            style={{ fontSize: 15, color: "#444", textAlign: "center", marginBottom: 18 }}
          >
            Add tasks when you want structure.{"\n"}
            Skip them when observation matters more.{"\n\n"}
            There’s no “right” schedule — only what fits your grow.
          </Text>
          <TouchableOpacity
            style={[styles.doneBtn, { paddingHorizontal: 18, marginTop: 8 }]}
          >
            <Text style={styles.doneText}>Create your first task</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(t) => t._id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.title}>{item.title}</Text>
              {item.plant && (
                <Text style={styles.plant}>
                  Plant: {item.plant.name} ({item.plant.strain})
                </Text>
              )}
              <Text style={styles.desc}>{item.description}</Text>

              <FeatureGate plan="pro" navigation={navigation}>
                <TouchableOpacity style={styles.doneBtn} onPress={() => finish(item._id)}>
                  <Text style={styles.doneText}>Complete</Text>
                </TouchableOpacity>
              </FeatureGate>
            </View>
          )}
        />
      )}
    </ScreenContainer>
  );
}

const styles = {
  header: { fontSize: 26, fontWeight: "700", marginBottom: 12 },
  card: { backgroundColor: "white", padding: 14, borderRadius: 10, marginBottom: 12 },
  title: { fontSize: 16, fontWeight: "700" },
  plant: { fontSize: 12, color: "#555", marginVertical: 4 },
  desc: { marginBottom: 8 },
  doneBtn: {
    backgroundColor: "#2ecc71",
    padding: 8,
    borderRadius: 8,
    alignSelf: "flex-end"
  },
  doneText: { color: "white" }
};
