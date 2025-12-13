import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";

import ScreenContainer from "../components/ScreenContainer";
import { getEntries } from "../api/growlog";
import { getTasks, completeTask } from "../api/tasks";

export default function GrowLogCalendarScreen({ navigation }) {
  const [entries, setEntries] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);

  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth()); // 0-11

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const entriesRes = await getEntries();
      setEntries(entriesRes.data || entriesRes || []);

      // Load tasks too
      try {
        const tasksRes = await getTasks();
        setTasks(tasksRes.data || tasksRes || []);
      } catch (err) {
        console.log("Tasks not loaded:", err);
      }
    } catch (err) {
      Alert.alert("Error", "Failed to load calendar data");
    }
  }

  async function handleCompleteTask(taskId) {
    try {
      await completeTask(taskId);
      load(); // Reload
    } catch (err) {
      Alert.alert("Error", "Failed to complete task");
    }
  }

  // Helper: returns "YYYY-MM-DD"
  function formatDate(date) {
    return date.toISOString().split("T")[0];
  }

  // All entries indexed by date
  const entriesByDate = {};
  entries.forEach((e) => {
    const d = new Date(e.date);
    const key = formatDate(d);

    if (!entriesByDate[key]) entriesByDate[key] = [];
    entriesByDate[key].push(e);
  });

  // All tasks indexed by due date
  const tasksByDate = {};
  tasks.forEach((t) => {
    if (!t.dueDate) return;
    const d = new Date(t.dueDate);
    const key = formatDate(d);

    if (!tasksByDate[key]) tasksByDate[key] = [];
    tasksByDate[key].push(t);
  });

  // Calendar generation
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const datesArray = [];
  for (let i = 0; i < firstDay; i++) {
    datesArray.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    datesArray.push(d);
  }

  function moveMonth(direction) {
    let newMonth = month + direction;
    let newYear = year;

    if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    }

    setMonth(newMonth);
    setYear(newYear);
    setSelectedDate(null);
  }

  // Determine stage color for a day
  function getStageColor(entries) {
    if (!entries || entries.length === 0) return "#eee";

    const stage = entries[0].stage;

    switch (stage) {
      case "seedling":
        return "#a3e4d7";
      case "veg":
        return "#2ecc71";
      case "flower":
        return "#af7ac5";
      default:
        return "#eee";
    }
  }

  // Entries and tasks for the selected date
  const selectedKey = selectedDate
    ? formatDate(new Date(year, month, selectedDate))
    : null;

  const selectedEntries = selectedKey ? entriesByDate[selectedKey] || [] : [];
  const selectedTasks = selectedKey ? tasksByDate[selectedKey] || [] : [];

  return (
    <ScreenContainer scroll>
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
          Your calendar is a reflection, not a rulebook.
        </Text>
        <Text style={{ color: "#222", fontSize: 13 }}>
          Use the calendar to notice patterns, not to judge yourself.{"\n"}
          Growth is about observation and learning, not perfect routines.
        </Text>
      </View>
      {/* LEGEND */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#2ecc71" }]} />
          <Text style={styles.legendText}>Grow Log Entry</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#f39c12" }]} />
          <Text style={styles.legendText}>Task/Reminder</Text>
        </View>
      </View>

      {/* MONTH HEADER */}
      <View style={styles.monthHeader}>
        <TouchableOpacity onPress={() => moveMonth(-1)}>
          <Text style={styles.monthNav}>‹</Text>
        </TouchableOpacity>

        <Text style={styles.monthTitle}>
          {new Date(year, month).toLocaleString("default", {
            month: "long",
            year: "numeric"
          })}
        </Text>

        <TouchableOpacity onPress={() => moveMonth(1)}>
          <Text style={styles.monthNav}>›</Text>
        </TouchableOpacity>
      </View>

      {/* DAYS OF WEEK */}
      <View style={styles.weekRow}>
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <Text key={d} style={styles.weekLabel}>
            {d}
          </Text>
        ))}
      </View>

      {/* CALENDAR GRID */}
      <View style={styles.grid}>
        {datesArray.map((day, idx) => {
          if (!day) return <View key={idx} style={styles.cell} />;

          const key = formatDate(new Date(year, month, day));
          const hasEntries = entriesByDate[key];
          const hasTasks = tasksByDate[key];

          const color = hasEntries ? getStageColor(hasEntries) : "#eaeaea";

          const isSelected = selectedDate === day;

          return (
            <TouchableOpacity
              key={idx}
              style={[
                styles.cell,
                {
                  backgroundColor: color,
                  borderWidth: isSelected ? 2 : 0,
                  borderColor: "#2ecc71"
                }
              ]}
              onPress={() => setSelectedDate(day)}
            >
              <Text style={styles.dayNum}>{day}</Text>

              <View style={styles.indicators}>
                {hasEntries && (
                  <View style={[styles.dot, { backgroundColor: "#2ecc71" }]} />
                )}
                {hasTasks && (
                  <View style={[styles.dot, { backgroundColor: "#f39c12" }]} />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* SELECTED DAY DATA */}
      {(selectedEntries.length > 0 || selectedTasks.length > 0) && (
        <View style={styles.selectedBox}>
          <Text style={styles.selectedTitle}>{selectedKey}</Text>

          {/* GROW LOG ENTRIES */}
          {selectedEntries.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🌱 Grow Log Entries</Text>
              {selectedEntries.map((e) => (
                <TouchableOpacity
                  key={e._id}
                  style={styles.entryItem}
                  onPress={() => navigation.navigate("GrowLogDetail", { id: e._id })}
                >
                  <Text style={styles.entryTitle}>{e.title || "Untitled Entry"}</Text>
                  <Text style={styles.entryNotes} numberOfLines={1}>
                    {e.notes}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* TASKS */}
          {selectedTasks.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>✅ Tasks & Reminders</Text>
              {selectedTasks.map((t) => (
                <View key={t._id} style={styles.taskItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.taskTitle}>{t.title}</Text>
                    {t.description && (
                      <Text style={styles.taskDesc} numberOfLines={2}>
                        {t.description}
                      </Text>
                    )}
                    {t.plant && <Text style={styles.taskPlant}>🌿 {t.plant.name}</Text>}
                  </View>
                  {!t.completed && (
                    <TouchableOpacity
                      style={styles.completeBtn}
                      onPress={() => handleCompleteTask(t._id)}
                    >
                      <Text style={styles.completeBtnText}>✓</Text>
                    </TouchableOpacity>
                  )}
                  {t.completed && <Text style={styles.completedBadge}>✓ Done</Text>}
                </View>
              ))}
            </View>
          )}

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.addButton, { flex: 1, marginRight: 8 }]}
              onPress={() =>
                navigation.navigate("GrowLogEntry", {
                  date: selectedKey
                })
              }
            >
              <Text style={styles.addButtonText}>+ Add Entry</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.addButton,
                { flex: 1, marginLeft: 8, backgroundColor: "#f39c12" }
              ]}
              onPress={() =>
                navigation.navigate("CreateTask", {
                  dueDate: selectedKey
                })
              }
            >
              <Text style={styles.addButtonText}>+ Add Task</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    marginBottom: 12,
    paddingVertical: 8
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5
  },
  legendText: {
    fontSize: 12,
    color: "#666"
  },
  monthHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 15
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: "700"
  },
  monthNav: {
    fontSize: 26,
    paddingHorizontal: 10
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8
  },
  weekLabel: {
    width: "14.28%",
    textAlign: "center",
    color: "#666"
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap"
  },
  cell: {
    width: "14.28%",
    aspectRatio: 1,
    borderRadius: 8,
    marginBottom: 8,
    justifyContent: "center",
    alignItems: "center"
  },
  dayNum: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333"
  },
  indicators: {
    flexDirection: "row",
    gap: 3,
    marginTop: 2
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5
  },
  selectedBox: {
    marginTop: 20,
    padding: 12,
    backgroundColor: "#f7f7f7",
    borderRadius: 10
  },
  selectedTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center"
  },
  section: {
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333"
  },
  entryItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd"
  },
  entryTitle: {
    fontSize: 16,
    fontWeight: "600"
  },
  entryNotes: {
    color: "#666",
    fontSize: 14
  },
  taskItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd"
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2
  },
  taskDesc: {
    fontSize: 13,
    color: "#666",
    marginBottom: 4
  },
  taskPlant: {
    fontSize: 12,
    color: "#27ae60",
    fontWeight: "500"
  },
  completeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#2ecc71",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8
  },
  completeBtnText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "bold"
  },
  completedBadge: {
    color: "#27ae60",
    fontSize: 14,
    fontWeight: "600"
  },
  buttonRow: {
    flexDirection: "row",
    marginTop: 12
  },
  addButton: {
    backgroundColor: "#27ae60",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center"
  },
  addButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600"
  }
});
