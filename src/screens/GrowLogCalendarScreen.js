import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import ScreenContainer from "../components/ScreenContainer";
import { getEntries } from "../api/growlog";
import { listGrows } from "../api/grows";
import { getTasks, completeTask } from "../api/tasks";
import { groupItemsByDate } from "../utils/calendar";
import { groupTasks } from "../utils/schedule";

export default function GrowLogCalendarScreen({ navigation }) {
  const [entries, setEntries] = useState([]);
  const [growMap, setGrowMap] = useState({});
  const [tasks, setTasks] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const scrollRef = useRef(null);

  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth()); // 0-11
  const [collapsedSections, setCollapsedSections] = useState({
    upcoming: true,
    completed: true
  });

  useEffect(() => {
    load();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [])
  );

  async function load() {
    try {
      const entriesRes = await getEntries();
      setEntries(entriesRes.data || entriesRes || []);

      // Fetch grow metadata so we can label entries
      try {
        const growsRes = await listGrows();
        const growList = growsRes.data || growsRes || [];
        const nextMap = {};
        growList.forEach((grow) => {
          if (grow?._id) {
            nextMap[grow._id] = grow.name || "Untitled Grow";
          }
        });
        setGrowMap(nextMap);
      } catch (err) {
        console.log("Grows not loaded:", err?.message || err);
      }

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

  function renderScheduleTask(task, sectionKey) {
    const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No due date";

    return (
      <View key={task._id} style={styles.scheduleTask}>
        <View style={{ flex: 1 }}>
          <Text style={styles.scheduleTaskTitle}>{task.title}</Text>
          {task.plant && (
            <Text style={styles.taskPlant}>🌿 {task.plant.name}</Text>
          )}
          <Text style={styles.taskDue}>Due {dueDate}</Text>
        </View>
        {!task.completed ? (
          <TouchableOpacity
            style={styles.taskCompleteBtn}
            onPress={() => handleCompleteTask(task._id)}
          >
            <Text style={styles.taskCompleteBtnText}>✓</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.taskDoneLabel}>Done</Text>
        )}
      </View>
    );
  }

  function renderScheduleSection({ key, title, tasks, collapsible, collapsed, toggle }) {
    if (!tasks || tasks.length === 0) return null;
    const limit = key === "completed" ? 5 : tasks.length;
    const visibleTasks = (!collapsible || !collapsed) ? tasks.slice(0, limit) : [];

    return (
      <View key={key} style={styles.scheduleSection}>
        <View style={styles.scheduleSectionHeader}>
          <Text style={styles.scheduleSectionTitle}>
            {title}{" "}
            <Text style={styles.scheduleCount}>({tasks.length})</Text>
          </Text>
          {collapsible ? (
            <TouchableOpacity onPress={() => toggle(key)} style={styles.collapseButton}>
              <Text style={styles.collapseButtonText}>{collapsed ? "Show" : "Hide"}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        {!collapsible || !collapsed ? (
          <View style={{ gap: 8 }}>
            {visibleTasks.map((task) => renderScheduleTask(task, key))}
            {key === "completed" && tasks.length > limit ? (
              <Text style={styles.scheduleHint}>
                Showing latest {limit} completed tasks
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  }

  // Helper: returns "YYYY-MM-DD"
  function formatDate(date) {
    return date.toISOString().split("T")[0];
  }

  const entriesByDate = useMemo(
    () => groupItemsByDate(entries, (entry) => entry.date || entry.createdAt),
    [entries]
  );

  const tasksByDate = useMemo(
    () => groupItemsByDate(tasks, (task) => task.dueDate),
    [tasks]
  );

  const scheduleGroups = useMemo(
    () => groupTasks(Array.isArray(tasks) ? tasks : []),
    [tasks]
  );

  const toggleScheduleSection = useCallback((key) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  }, []);

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

  useEffect(() => {
    if (selectedDate) {
      console.log(
        "Calendar selection:",
        selectedKey,
        "| entries:",
        selectedEntries.length,
        "| tasks:",
        selectedTasks.length
      );
    }
  }, [selectedDate, selectedKey, selectedEntries.length, selectedTasks.length]);

  useEffect(() => {
    if (selectedDate && scrollRef.current?.scrollTo) {
      scrollRef.current.scrollToEnd({ animated: true });
    }
  }, [selectedDate]);

  return (
    <ScreenContainer scroll innerRef={scrollRef}>
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Calendar vs Schedule</Text>
        <Text style={styles.infoCopy}>
          Calendar reflects what happened (grow logs) plus due tasks. Use the schedule
          below to revisit intent, adjust plans, and mark work complete.
        </Text>
      </View>
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

      {/* INLINE SCHEDULE SUMMARY */}
      <View style={styles.scheduleCard}>
        <Text style={styles.scheduleTitle}>Schedule</Text>
        <Text style={styles.scheduleCopy}>
          Overdue items stay visible until addressed. Upcoming and completed sections can
          be expanded when you need them.
        </Text>
        {renderScheduleSection({
          key: "overdue",
          title: "Overdue",
          tasks: scheduleGroups.overdue,
          collapsible: false,
          collapsed: false,
          toggle: toggleScheduleSection
        })}
        {renderScheduleSection({
          key: "today",
          title: "Today",
          tasks: scheduleGroups.today,
          collapsible: false,
          collapsed: false,
          toggle: toggleScheduleSection
        })}
        {renderScheduleSection({
          key: "upcoming",
          title: "Upcoming",
          tasks: scheduleGroups.upcoming,
          collapsible: true,
          collapsed: collapsedSections.upcoming,
          toggle: toggleScheduleSection
        })}
        {renderScheduleSection({
          key: "completed",
          title: "Completed",
          tasks: scheduleGroups.completed,
          collapsible: true,
          collapsed: collapsedSections.completed,
          toggle: toggleScheduleSection
        })}
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
      {selectedDate && (
        <View style={[styles.selectedBox, { marginBottom: 80 }]}>
          <Text style={styles.selectedTitle}>{selectedKey}</Text>

          {/* GROW LOG ENTRIES */}
          {selectedEntries.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🌱 Grow Log Entries</Text>
              {selectedEntries.map((e) => {
                const growId = typeof e.grow === "object" ? e.grow?._id : e.grow;
                const growName =
                  (typeof e.grow === "object" ? e.grow?.name : growMap[growId]) || null;
                return (
                <TouchableOpacity
                  key={e._id}
                  style={styles.entryItem}
                  onPress={() => navigation.navigate("GrowLogDetail", { id: e._id })}
                >
                  <View style={styles.entryHeader}>
                    <Text style={styles.entryTitle}>{e.title || "Untitled Entry"}</Text>
                    {growName ? (
                      <View style={styles.entryPill}>
                        <Text style={styles.entryPillText}>{growName}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.entryNotes} numberOfLines={1}>
                    {e.notes}
                  </Text>
                </TouchableOpacity>
              );
              })}
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
          {selectedEntries.length === 0 && selectedTasks.length === 0 && (
            <Text style={styles.emptySelectedState}>
              No entries or tasks for this day yet. Add one below to start planning.
            </Text>
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
  entryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
    flexWrap: "wrap"
  },
  entryPill: {
    alignSelf: "flex-start",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    marginBottom: 4
  },
  entryPillText: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "600"
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
  },
  emptySelectedState: {
    textAlign: "center",
    color: "#6B7280",
    fontStyle: "italic",
    marginBottom: 12
  },
  infoCard: {
    backgroundColor: "#EEF2FF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#312E81",
    marginBottom: 6
  },
  infoCopy: {
    color: "#4338CA",
    marginBottom: 12,
    lineHeight: 20
  },
  scheduleCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 20
  },
  scheduleTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
    color: "#111827"
  },
  scheduleCopy: {
    color: "#4B5563",
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 18
  },
  scheduleSection: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6"
  },
  scheduleSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8
  },
  scheduleSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937"
  },
  scheduleCount: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500"
  },
  collapseButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#F3F4F6"
  },
  collapseButtonText: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "600"
  },
  scheduleTask: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 12
  },
  scheduleTaskTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827"
  },
  taskDue: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2
  },
  taskCompleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center"
  },
  taskCompleteBtnText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700"
  },
  taskDoneLabel: {
    color: "#10B981",
    fontWeight: "600"
  },
  scheduleHint: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 6
  }
});
