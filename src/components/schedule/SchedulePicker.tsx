import React, { useMemo, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { radius } from "@/theme/theme";

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

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function initialCalendarMonth(value: string) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return new Date(Number(match[1]), Number(match[2]) - 1, 1);
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function calendarDays(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const value = new Date(start);
    value.setDate(start.getDate() + index);
    return value;
  });
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
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => initialCalendarMonth(dueDate));
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
  const monthDays = useMemo(() => calendarDays(calendarMonth), [calendarMonth]);
  const monthLabel = calendarMonth.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric"
  });
  const selectedDateKey = String(dueDate || "").slice(0, 10);

  function openCalendar() {
    setCalendarMonth(initialCalendarMonth(dueDate));
    setCalendarOpen(true);
  }

  function moveMonth(offset: number) {
    setCalendarMonth(
      (current) => new Date(current.getFullYear(), current.getMonth() + offset, 1)
    );
  }

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
        <Pressable
          style={styles.calendarButton}
          accessibilityRole="button"
          accessibilityLabel={`${accessibilityPrefix} open calendar`}
          onPress={openCalendar}
        >
          <Text style={styles.calendarButtonText}>Choose date</Text>
        </Pressable>
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
      <Modal
        animationType="fade"
        transparent
        visible={calendarOpen}
        onRequestClose={() => setCalendarOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={styles.calendarPanel}
            accessibilityLabel={`${accessibilityPrefix} calendar`}
          >
            <View style={styles.calendarHeader}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${accessibilityPrefix} previous month`}
                style={styles.monthButton}
                onPress={() => moveMonth(-1)}
              >
                <Text style={styles.monthButtonText}>{"<"}</Text>
              </Pressable>
              <Text style={styles.monthTitle}>{monthLabel}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${accessibilityPrefix} next month`}
                style={styles.monthButton}
                onPress={() => moveMonth(1)}
              >
                <Text style={styles.monthButtonText}>{">"}</Text>
              </Pressable>
            </View>
            <View style={styles.weekRow}>
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <Text key={day} style={styles.weekDay}>
                  {day}
                </Text>
              ))}
            </View>
            <View style={styles.calendarGrid}>
              {monthDays.map((day) => {
                const value = localDateKey(day);
                const inMonth = day.getMonth() === calendarMonth.getMonth();
                const selected = value === selectedDateKey;
                return (
                  <Pressable
                    key={value}
                    accessibilityRole="button"
                    accessibilityLabel={`${accessibilityPrefix} calendar date ${value}`}
                    onPress={() => {
                      onDueDateChange(value);
                      setCalendarOpen(false);
                    }}
                    style={[styles.dayButton, selected && styles.dayButtonSelected]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        !inMonth && styles.dayTextOutside,
                        selected && styles.dayTextSelected
                      ]}
                    >
                      {day.getDate()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.calendarFooter}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${accessibilityPrefix} calendar today`}
                style={styles.clearButton}
                onPress={() => {
                  onDueDateChange(localDateKey(new Date()));
                  setCalendarOpen(false);
                }}
              >
                <Text style={styles.clearText}>Today</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${accessibilityPrefix} close calendar`}
                style={styles.clearButton}
                onPress={() => setCalendarOpen(false)}
              >
                <Text style={styles.clearText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  clearText: { color: "#475569", fontSize: 12, fontWeight: "900" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  flexInput: {
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    borderWidth: 1,
    flex: 1,
    minWidth: 180,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  calendarButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    borderWidth: 1,
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  calendarButtonText: { color: "#334155", fontSize: 12, fontWeight: "900" },
  modalBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    flex: 1,
    justifyContent: "center",
    padding: 20
  },
  calendarPanel: {
    backgroundColor: "#FFFFFF",
    borderRadius: radius.card,
    maxWidth: 420,
    padding: 16,
    width: "100%"
  },
  calendarHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12
  },
  monthButton: { paddingHorizontal: 14, paddingVertical: 8 },
  monthButtonText: { color: "#0F172A", fontSize: 20, fontWeight: "900" },
  monthTitle: { color: "#0F172A", fontSize: 17, fontWeight: "900" },
  weekRow: { flexDirection: "row" },
  weekDay: {
    color: "#64748B",
    flexBasis: "14.2857%",
    fontSize: 10,
    fontWeight: "900",
    textAlign: "center"
  },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: 6 },
  dayButton: {
    alignItems: "center",
    aspectRatio: 1,
    flexBasis: "14.2857%",
    justifyContent: "center"
  },
  dayButtonSelected: { backgroundColor: "#16A34A", borderRadius: 999 },
  dayText: { color: "#0F172A", fontSize: 13, fontWeight: "800" },
  dayTextOutside: { color: "#CBD5E1" },
  dayTextSelected: { color: "#FFFFFF" },
  calendarFooter: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "flex-end",
    marginTop: 12
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
