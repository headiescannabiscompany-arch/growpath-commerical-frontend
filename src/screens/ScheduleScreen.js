import { View, Text } from "react-native";
import { useEffect, useState } from "react";
import { groupTasks } from "../utils/schedule";
import TaskRow from "../components/TaskRow";
import { getTasks } from "../api/tasks";
import ScreenContainer from "../components/ScreenContainer";

export default function ScheduleScreen() {
  const [groups, setGroups] = useState(null);
  const [error, setError] = useState(null);

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
      <Section title="Overdue" tasks={groups.overdue} />
      <Section title="Today" tasks={groups.today} />
      <Section title="Upcoming" tasks={groups.upcoming.slice(0, 14)} />
      <Section title="Completed" tasks={groups.completed} collapsed />
    </ScreenContainer>
  );
}

function Section({ title, tasks, collapsed }) {
  if (!tasks.length) return null;

  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={{ fontSize: 18, fontWeight: "600", marginBottom: 8 }}>{title}</Text>
      {tasks.map((task) => (
        <TaskRow key={task._id} task={task} />
      ))}
    </View>
  );
}
