import { Picker } from "@react-native-picker/picker";
import React, { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { radius } from "@/theme/theme";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";

type DateMode = "date" | "datetime";

type CalendarDateFieldProps = {
  value: string;
  onChange: (value: string) => void;
  accessibilityLabel: string;
  label?: string;
  placeholder?: string;
  mode?: DateMode;
  minYear?: number;
  maxYear?: number;
  minimumDate?: string;
  maximumDate?: string;
  initialYear?: number;
  disabled?: boolean;
  optional?: boolean;
  testID?: string;
};

type DateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function localDateKey(year: number, month: number, day: number) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function validParts(year: number, month: number, day: number) {
  const candidate = new Date(year, month - 1, day);
  return (
    candidate.getFullYear() === year &&
    candidate.getMonth() === month - 1 &&
    candidate.getDate() === day
  );
}

function parseParts(value: string, initialYear?: number): DateParts {
  const match = String(value || "").match(
    /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/
  );
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (validParts(year, month, day)) {
      return {
        year,
        month,
        day,
        hour: Math.min(23, Number(match[4] || 9)),
        minute: Math.min(59, Number(match[5] || 0))
      };
    }
  }

  const today = new Date();
  const year = initialYear || today.getFullYear();
  const month = today.getMonth() + 1;
  const day = Math.min(today.getDate(), new Date(year, month, 0).getDate());
  return { year, month, day, hour: 9, minute: 0 };
}

function calendarDays(year: number, month: number) {
  const first = new Date(year, month - 1, 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const value = new Date(start);
    value.setDate(start.getDate() + index);
    return value;
  });
}

function displayValue(value: string, mode: DateMode) {
  const match = String(value || "").match(
    /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/
  );
  if (!match) return "";
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const dateLabel = date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
  if (mode !== "datetime" || !match[4]) return dateLabel;
  const time = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5] || 0)
  ).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${dateLabel} at ${time}`;
}

export default function CalendarDateField({
  value,
  onChange,
  accessibilityLabel,
  label,
  placeholder = "Choose date",
  mode = "date",
  minYear,
  maxYear,
  minimumDate,
  maximumDate,
  initialYear,
  disabled = false,
  optional = true,
  testID
}: CalendarDateFieldProps) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const currentYear = new Date().getFullYear();
  const storedYear =
    Number(String(value || "").slice(0, 4)) || initialYear || currentYear;
  const resolvedMinYear = minYear ?? Math.min(currentYear - 50, storedYear);
  const resolvedMaxYear = maxYear ?? Math.max(currentYear + 30, storedYear);
  const timezone =
    mode === "datetime"
      ? Intl.DateTimeFormat?.().resolvedOptions?.().timeZone || "device local time"
      : "";
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateParts>(() => parseParts(value, initialYear));

  const years = useMemo(
    () =>
      Array.from(
        { length: Math.max(1, resolvedMaxYear - resolvedMinYear + 1) },
        (_, index) => resolvedMinYear + index
      ),
    [resolvedMaxYear, resolvedMinYear]
  );
  const days = useMemo(
    () => calendarDays(draft.year, draft.month),
    [draft.month, draft.year]
  );
  const selectedKey = localDateKey(draft.year, draft.month, draft.day);
  const shownValue = displayValue(value, mode);

  function showCalendar() {
    setDraft(parseParts(value, initialYear));
    setOpen(true);
  }

  function changeYear(year: number) {
    setDraft((current) => ({
      ...current,
      year,
      day: Math.min(current.day, new Date(year, current.month, 0).getDate())
    }));
  }

  function changeMonth(month: number) {
    setDraft((current) => ({
      ...current,
      month,
      day: Math.min(current.day, new Date(current.year, month, 0).getDate())
    }));
  }

  function moveMonth(offset: number) {
    const next = new Date(draft.year, draft.month - 1 + offset, 1);
    if (next.getFullYear() < resolvedMinYear || next.getFullYear() > resolvedMaxYear) {
      return;
    }
    changeYear(next.getFullYear());
    changeMonth(next.getMonth() + 1);
  }

  function dateAllowed(dateKey: string) {
    if (minimumDate && dateKey < minimumDate.slice(0, 10)) return false;
    if (maximumDate && dateKey > maximumDate.slice(0, 10)) return false;
    return true;
  }

  function commit() {
    const date = localDateKey(draft.year, draft.month, draft.day);
    if (!dateAllowed(date)) return;
    onChange(
      mode === "datetime" ? `${date}T${pad(draft.hour)}:${pad(draft.minute)}` : date
    );
    setOpen(false);
  }

  return (
    <View style={styles.fieldWrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={showCalendar}
        style={[styles.fieldButton, disabled && styles.disabled]}
      >
        <Text style={[styles.fieldValue, !shownValue && styles.placeholder]}>
          {shownValue || placeholder}
        </Text>
        <Text style={styles.fieldAction}>Choose</Text>
      </Pressable>

      <Modal
        animationType="fade"
        transparent
        visible={open}
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.backdrop}>
          <ScrollView
            accessibilityLabel={`${accessibilityLabel} calendar`}
            accessibilityViewIsModal
            contentContainerStyle={styles.panel}
            keyboardShouldPersistTaps="handled"
            style={styles.panelScroll}
          >
            <Text style={styles.title}>{label || "Choose date"}</Text>
            <Text style={styles.guidance}>
              Select the year, month, and day
              {mode === "datetime" ? `, then time. Timezone: ${timezone}.` : "."}
            </Text>

            <View style={styles.selectRow}>
              <View style={styles.selectWrap}>
                <Text style={styles.selectLabel}>Year</Text>
                <Picker
                  accessibilityLabel={`${accessibilityLabel} year`}
                  selectedValue={draft.year}
                  onValueChange={(next) => changeYear(Number(next))}
                  style={styles.picker}
                >
                  {years.map((year) => (
                    <Picker.Item key={year} label={String(year)} value={year} />
                  ))}
                </Picker>
              </View>
              <View style={styles.selectWrap}>
                <Text style={styles.selectLabel}>Month</Text>
                <Picker
                  accessibilityLabel={`${accessibilityLabel} month`}
                  selectedValue={draft.month}
                  onValueChange={(next) => changeMonth(Number(next))}
                  style={styles.picker}
                >
                  {MONTHS.map((month, index) => (
                    <Picker.Item key={month} label={month} value={index + 1} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.monthHeader}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${accessibilityLabel} previous month`}
                onPress={() => moveMonth(-1)}
                style={styles.monthButton}
              >
                <Text style={styles.monthButtonText}>{"<"}</Text>
              </Pressable>
              <Text style={styles.monthTitle}>
                {MONTHS[draft.month - 1]} {draft.year}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${accessibilityLabel} next month`}
                onPress={() => moveMonth(1)}
                style={styles.monthButton}
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
              {days.map((day) => {
                const dateKey = localDateKey(
                  day.getFullYear(),
                  day.getMonth() + 1,
                  day.getDate()
                );
                const inMonth =
                  day.getMonth() === draft.month - 1 && day.getFullYear() === draft.year;
                const selected = dateKey === selectedKey;
                const allowed = dateAllowed(dateKey);
                return (
                  <Pressable
                    key={dateKey}
                    accessibilityRole="button"
                    accessibilityLabel={`${accessibilityLabel} day ${dateKey}`}
                    accessibilityState={{ disabled: !allowed, selected }}
                    disabled={!allowed}
                    onPress={() =>
                      setDraft((current) => ({
                        ...current,
                        year: day.getFullYear(),
                        month: day.getMonth() + 1,
                        day: day.getDate()
                      }))
                    }
                    style={[
                      styles.dayButton,
                      selected && styles.dayButtonSelected,
                      !allowed && styles.disabled
                    ]}
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

            {mode === "datetime" ? (
              <View style={styles.selectRow}>
                <View style={styles.selectWrap}>
                  <Text style={styles.selectLabel}>Hour</Text>
                  <Picker
                    accessibilityLabel={`${accessibilityLabel} hour`}
                    selectedValue={draft.hour}
                    onValueChange={(next) =>
                      setDraft((current) => ({ ...current, hour: Number(next) }))
                    }
                    style={styles.picker}
                  >
                    {Array.from({ length: 24 }, (_, hour) => (
                      <Picker.Item key={hour} label={pad(hour)} value={hour} />
                    ))}
                  </Picker>
                </View>
                <View style={styles.selectWrap}>
                  <Text style={styles.selectLabel}>Minute</Text>
                  <Picker
                    accessibilityLabel={`${accessibilityLabel} minute`}
                    selectedValue={draft.minute}
                    onValueChange={(next) =>
                      setDraft((current) => ({ ...current, minute: Number(next) }))
                    }
                    style={styles.picker}
                  >
                    {Array.from({ length: 60 }, (_, minute) => (
                      <Picker.Item key={minute} label={pad(minute)} value={minute} />
                    ))}
                  </Picker>
                </View>
              </View>
            ) : null}

            <View style={styles.actions}>
              {optional ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${accessibilityLabel} clear`}
                  onPress={() => {
                    onChange("");
                    setOpen(false);
                  }}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryText}>Clear</Text>
                </Pressable>
              ) : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${accessibilityLabel} cancel`}
                onPress={() => setOpen(false)}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryText}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${accessibilityLabel} use selected date`}
                onPress={commit}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryText}>
                  Use {mode === "datetime" ? "date and time" : "date"}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    fieldWrap: { gap: 6 },
    label: { color: palette.text, fontSize: 13, fontWeight: "800" },
    fieldButton: {
      alignItems: "center",
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      flexDirection: "row",
      gap: 10,
      justifyContent: "space-between",
      minHeight: 46,
      paddingHorizontal: 12,
      paddingVertical: 10
    },
    fieldValue: { color: palette.text, flex: 1, fontSize: 14, fontWeight: "700" },
    placeholder: { color: palette.textMuted, fontWeight: "600" },
    fieldAction: { color: palette.link, fontSize: 13, fontWeight: "900" },
    disabled: { opacity: 0.45 },
    backdrop: {
      alignItems: "center",
      backgroundColor: "rgba(15, 23, 42, 0.58)",
      flex: 1,
      justifyContent: "center",
      padding: 18
    },
    panelScroll: {
      maxHeight: "94%",
      maxWidth: 520,
      width: "100%"
    },
    panel: {
      backgroundColor: palette.surface,
      borderRadius: radius.card,
      padding: 16
    },
    title: { color: palette.text, fontSize: 20, fontWeight: "900" },
    guidance: { color: palette.textMuted, fontSize: 12, marginBottom: 10, marginTop: 3 },
    selectRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    selectWrap: { flex: 1, minWidth: 150 },
    selectLabel: { color: palette.text, fontSize: 12, fontWeight: "900" },
    picker: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      color: palette.text,
      minHeight: 44
    },
    monthHeader: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 8,
      marginTop: 10
    },
    monthButton: { paddingHorizontal: 14, paddingVertical: 8 },
    monthButtonText: { color: palette.text, fontSize: 20, fontWeight: "900" },
    monthTitle: { color: palette.text, fontSize: 16, fontWeight: "900" },
    weekRow: { flexDirection: "row" },
    weekDay: {
      color: palette.textMuted,
      flexBasis: "14.2857%",
      fontSize: 10,
      fontWeight: "900",
      textAlign: "center"
    },
    calendarGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: 4 },
    dayButton: {
      alignItems: "center",
      aspectRatio: 1,
      flexBasis: "14.2857%",
      justifyContent: "center"
    },
    dayButtonSelected: { backgroundColor: palette.accent, borderRadius: 999 },
    dayText: { color: palette.text, fontSize: 13, fontWeight: "800" },
    dayTextOutside: { color: palette.textMuted },
    dayTextSelected: { color: palette.accentText },
    actions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      justifyContent: "flex-end",
      marginTop: 14
    },
    secondaryButton: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 9
    },
    secondaryText: { color: palette.textMuted, fontSize: 12, fontWeight: "900" },
    primaryButton: {
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      paddingHorizontal: 14,
      paddingVertical: 10
    },
    primaryText: { color: palette.accentText, fontSize: 12, fontWeight: "900" }
  });
