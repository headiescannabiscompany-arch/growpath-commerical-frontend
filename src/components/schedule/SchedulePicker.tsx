import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

type SchedulePickerProps = {
  dueDate: string;
  reminder: string;
  recurrence: string;
  onDueDateChange: (value: string) => void;
  onReminderChange: (value: string) => void;
  onRecurrenceChange: (value: string) => void;
  accessibilityPrefix?: string;
  dueDateAccessibilityLabel?: string;
  reminderAccessibilityLabel?: string;
  recurrenceAccessibilityLabel?: string;
  dueDatePlaceholder?: string;
  reminderPlaceholder?: string;
  recurrencePlaceholder?: string;
};

function dateKey(daysFromToday = 0) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  return date.toISOString().slice(0, 10);
}

function eveningKey() {
  return `${dateKey(0)}T18:00`;
}

function nextWeekKey() {
  const date = new Date();
  const day = date.getDay();
  const daysUntilNextMonday = (8 - day) % 7 || 7;
  date.setDate(date.getDate() + daysUntilNextMonday);
  return date.toISOString().slice(0, 10);
}

export default function SchedulePicker({
  dueDate,
  reminder,
  recurrence,
  onDueDateChange,
  onReminderChange,
  onRecurrenceChange,
  accessibilityPrefix = "Schedule",
  dueDateAccessibilityLabel,
  reminderAccessibilityLabel,
  recurrenceAccessibilityLabel,
  dueDatePlaceholder = "YYYY-MM-DD or ISO date",
  reminderPlaceholder = "Reminder, e.g. 24 hours before",
  recurrencePlaceholder = "Recurrence, e.g. every 7 days"
}: SchedulePickerProps) {
  const quickDates = [
    ["Today", dateKey(0)],
    ["This evening", eveningKey()],
    ["Tomorrow", dateKey(1)],
    ["In 3 days", dateKey(3)],
    ["In 7 days", dateKey(7)],
    ["In 14 days", dateKey(14)],
    ["In 21 days", dateKey(21)],
    ["Next week", nextWeekKey()]
  ];
  const reminderPresets = [
    "at due time",
    "15 minutes before",
    "1 hour before",
    "24 hours before"
  ];
  const recurrencePresets = [
    "does not repeat",
    "daily",
    "weekly",
    "every 14 days",
    "every 21 days"
  ];

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <TextInput
          style={styles.flexInput}
          placeholder={dueDatePlaceholder}
          value={dueDate}
          onChangeText={onDueDateChange}
          accessibilityLabel={
            dueDateAccessibilityLabel || `${accessibilityPrefix} due date`
          }
          autoCapitalize="none"
        />
        <TextInput
          style={styles.flexInput}
          placeholder={reminderPlaceholder}
          value={reminder}
          onChangeText={onReminderChange}
          accessibilityLabel={
            reminderAccessibilityLabel || `${accessibilityPrefix} reminder`
          }
        />
      </View>

      <Text style={styles.label}>Quick schedule</Text>
      <View style={styles.chipRow}>
        {quickDates.map(([label, value]) => (
          <Pressable
            key={label}
            style={[styles.chip, dueDate === value && styles.chipSelected]}
            accessibilityRole="button"
            accessibilityLabel={`${accessibilityPrefix} quick date ${label}`}
            onPress={() => onDueDateChange(value)}
          >
            <Text style={[styles.chipText, dueDate === value && styles.chipTextOn]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.chipRow}>
        {reminderPresets.map((label) => (
          <Pressable
            key={label}
            style={[styles.chip, reminder === label && styles.chipSelected]}
            accessibilityRole="button"
            accessibilityLabel={`${accessibilityPrefix} reminder preset ${label}`}
            onPress={() => onReminderChange(label)}
          >
            <Text style={[styles.chipText, reminder === label && styles.chipTextOn]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.row}>
        <TextInput
          style={styles.flexInput}
          placeholder={recurrencePlaceholder}
          value={recurrence}
          onChangeText={onRecurrenceChange}
          accessibilityLabel={
            recurrenceAccessibilityLabel || `${accessibilityPrefix} recurrence`
          }
        />
      </View>
      <View style={styles.chipRow}>
        {recurrencePresets.map((label) => {
          const active = label === "does not repeat" ? !recurrence : recurrence === label;
          return (
            <Pressable
              key={label}
              style={[styles.chip, active && styles.chipSelected]}
              accessibilityRole="button"
              accessibilityLabel={`${accessibilityPrefix} recurrence preset ${label}`}
              onPress={() => onRecurrenceChange(label === "does not repeat" ? "" : label)}
            >
              <Text style={[styles.chipText, active && styles.chipTextOn]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  flexInput: {
    borderColor: "#CBD5E1",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    minWidth: 180,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  label: { color: "#334155", fontSize: 13, fontWeight: "900" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    backgroundColor: "#F8FAFC",
    borderColor: "#CBD5E1",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  chipSelected: { backgroundColor: "#DCFCE7", borderColor: "#16A34A" },
  chipText: { color: "#475569", fontSize: 12, fontWeight: "800" },
  chipTextOn: { color: "#14532D" }
});
