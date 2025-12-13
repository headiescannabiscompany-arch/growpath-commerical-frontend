import { View, Text, ScrollView } from "react-native";
import { useEffect, useState } from "react";
import api from "../api";
import { groupTasks } from "../utils/schedule";
import TaskRow from "../components/TaskRow";

export default function ScheduleScreen() {
  const [groups, setGroups] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data } = await api.get("/tasks");
    setGroups(groupTasks(data));
  }

  if (!groups) {
    return <Text style={{ padding: 16 }}>Loading schedule…</Text>;
  }

  return (
    <ScrollView style={{ flex: 1, padding: 12 }}>
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
    </ScrollView>
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
