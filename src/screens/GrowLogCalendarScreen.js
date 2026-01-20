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
  // --- Calendar logic helpers and state ---
  // selectedKey: formatted date string for selectedDate
  const formatDate = (date) => date.toISOString().slice(0, 10);
  const selectedKey = selectedDate
    ? formatDate(new Date(year, month, selectedDate))
    : null;

  // entriesByDate and tasksByDate: group entries/tasks by date string
  const entriesByDate = useMemo(() => groupItemsByDate(entries), [entries]);
  const tasksByDate = useMemo(() => groupItemsByDate(tasks), [tasks]);

  // selectedEntries and selectedTasks for selectedKey
  const selectedEntries = selectedKey ? entriesByDate[selectedKey] || [] : [];
  const selectedTasks = selectedKey ? tasksByDate[selectedKey] || [] : [];

  // entriesAndTasks: combine for legacy UI (if needed)
  const entriesAndTasks = selectedKey
    ? [...(entriesByDate[selectedKey] || []), ...(tasksByDate[selectedKey] || [])]
    : [];

  // Calendar grid: datesArray for current month
  // ...existing code for hooks and helpers...

  return (
    <ScreenContainer scroll innerRef={scrollRef}>
      <View>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Calendar vs Schedule</Text>
          <Text style={styles.infoCopy}>
            Calendar reflects what happened (grow logs) plus due tasks. Use the schedule
            below to revisit intent, adjust plans, and mark work complete.
          </Text>
        </View>
        <View>
          {selectedKey ? (
            entriesAndTasks.length > 0 ? (
              entriesAndTasks.map((item, idx) => (
                // ...existing code for rendering entries/tasks...
                <Text key={idx}>{item.title || item.name}</Text>
              ))
            ) : (
              <Text style={styles.emptySelectedState}>
                No entries or tasks for this day yet. Add one below to start planning.
              </Text>
            )
          ) : null}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.addButton, { flex: 1, marginRight: 8 }]}
              onPress={() => navigation.navigate("GrowLogEntry", { date: selectedKey })}
            >
              <Text style={styles.addButtonText}>+ Add Entry</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.addButton,
                { flex: 1, marginLeft: 8, backgroundColor: "#f39c12" }
              ]}
              onPress={() => navigation.navigate("CreateTask", { dueDate: selectedKey })}
            >
              <Text style={styles.addButtonText}>+ Add Task</Text>
            </TouchableOpacity>
          </View>
        </View>
        {/* SCHEDULE SECTIONS */}
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
        {/* Calendar legend and grid */}
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
        <View style={styles.weekRow}>
          {"Sun,Mon,Tue,Wed,Thu,Fri,Sat".split(",").map((d) => (
            <Text key={d} style={styles.weekLabel}>
              {d}
            </Text>
          ))}
        </View>
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
        {selectedDate && (
          <View style={[styles.selectedBox, { marginBottom: 80 }]}>
            Selected day details here
          </View>
        )}
      </View>
    </ScreenContainer>
  );
}
