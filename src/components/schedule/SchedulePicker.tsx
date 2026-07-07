import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

type SchedulePickerProps = {
  dueDate: string;
  reminder: string;
  recurrence: string;
  allDay?: boolean;
  timezone?: string;
  lightsOnTime?: string;
  lightsOffTime?: string;
  onDueDateChange: (value: string) => void;
  onReminderChange: (value: string) => void;
  onRecurrenceChange: (value: string) => void;
  onAllDayChange?: (value: boolean) => void;
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

function nextTimeKey(time: string) {
  const normalized = String(time || "").trim();
  if (!/^\d{2}:\d{2}$/.test(normalized)) return "";
  const now = new Date();
  const candidate = new Date();
  const [hours, minutes] = normalized.split(":").map(Number);
  candidate.setHours(hours, minutes, 0, 0);
  if (candidate <= now) candidate.setDate(candidate.getDate() + 1);
  return `${candidate.toISOString().slice(0, 10)}T${normalized}`;
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
  allDay = false,
  timezone,
  lightsOnTime,
  lightsOffTime,
  onDueDateChange,
  onReminderChange,
  onRecurrenceChange,
  onAllDayChange,
  accessibilityPrefix = "Schedule",
  dueDateAccessibilityLabel,
  reminderAccessibilityLabel,
  recurrenceAccessibilityLabel,
  dueDatePlaceholder = "YYYY-MM-DD or ISO date",
  reminderPlaceholder = "Reminder, e.g. 24 hours before",
  recurrencePlaceholder = "Recurrence, e.g. every 7 days"
}: SchedulePickerProps) {
  const resolvedTimezone =
    timezone || Intl.DateTimeFormat?.().resolvedOptions?.().timeZone || "local time";
  const quickDates = [
    ["Today", dateKey(0)],
    ["This evening", eveningKey()],
    ["Tomorrow", dateKey(1)],
    lightsOnTime ? ["Next lights on", nextTimeKey(lightsOnTime)] : null,
    lightsOffTime ? ["Next lights off", nextTimeKey(lightsOffTime)] : null,
    ["In 3 days", dateKey(3)],
    ["In 7 days", dateKey(7)],
    ["In 14 days", dateKey(14)],
    ["In 21 days", dateKey(21)],
    ["Next week", nextWeekKey()]
  ].filter((row): row is string[] => Array.isArray(row) && Boolean(row[1]));
  const reminderPresets = [
    "no reminder",
    "at due time",
    "15 minutes before",
    "1 hour before",
    "24 hours before",
    "custom"
  ];
  const recurrencePresets = [
    "does not repeat",
    "daily",
    "every 2 days",
    "weekly",
    "every 14 days",
    "every 21 days",
    "monthly",
    "custom"
  ];
  const scheduleSummary = [
    dueDate ? `Due ${dueDate}` : "No due date selected",
    allDay ? "All day" : "Timed",
    reminder ? `Reminder: ${reminder}` : "No reminder",
    recurrence ? `Repeats: ${recurrence}` : "Does not repeat",
    `Timezone: ${resolvedTimezone}`
  ].join(" | ");

  function clearSchedule() {
    onDueDateChange("");
    onReminderChange("");
    onRecurrenceChange("");
    onAllDayChange?.(false);
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.summaryRow}>
        <Text style={styles.summary}>{scheduleSummary}</Text>
        <Pressable
          style={styles.clearButton}
          accessibilityRole="button"
          accessibilityLabel={`${accessibilityPrefix} clear schedule`}
          onPress={clearSchedule}
        >
          <Text style={styles.clearText}>Clear</Text>
        </Pressable>
      </View>
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
      {onAllDayChange ? (
        <View style={styles.chipRow}>
          <Pressable
            style={[styles.chip, allDay && styles.chipSelected]}
            accessibilityRole="button"
            accessibilityLabel={`${accessibilityPrefix} all day toggle`}
            onPress={() => onAllDayChange(!allDay)}
          >
            <Text style={[styles.chipText, allDay && styles.chipTextOn]}>All day</Text>
          </Pressable>
        </View>
      ) : null}

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
            style={[
              styles.chip,
              (label === "no reminder" ? !reminder : reminder === label) &&
                styles.chipSelected
            ]}
            accessibilityRole="button"
            accessibilityLabel={`${accessibilityPrefix} reminder preset ${label}`}
            onPress={() => onReminderChange(label === "no reminder" ? "" : label)}
          >
            <Text
              style={[
                styles.chipText,
                (label === "no reminder" ? !reminder : reminder === label) &&
                  styles.chipTextOn
              ]}
            >
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
  summaryRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-between"
  },
  summary: {
    color: "#334155",
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    minWidth: 220
  },
  clearButton: {
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  clearText: { color: "#475569", fontSize: 12, fontWeight: "900" },
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
