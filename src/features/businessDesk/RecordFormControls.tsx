import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps
} from "react-native";

import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

export type LabeledInputProps = TextInputProps & {
  label: string;
  hint?: string;
};

export function LabeledInput({ label, hint, ...props }: LabeledInputProps) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createRecordFormStyles(palette), [palette]);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        accessibilityLabel={props.accessibilityLabel || label}
        placeholderTextColor={palette.textMuted}
        style={[styles.input, props.multiline && styles.inputMultiline, props.style]}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function StatusSelector<TStatus extends string>({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: TStatus;
  options: Array<{ value: TStatus; label: string }>;
  onChange: (value: TStatus) => void;
}) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createRecordFormStyles(palette), [palette]);
  return (
    <View style={styles.selectorWrap}>
      <Text style={styles.label}>{label}</Text>
      <View accessibilityRole="radiogroup" style={styles.choices}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityLabel={`${label} ${option.label}`}
              accessibilityState={{ checked: selected }}
              onPress={() => onChange(option.value)}
              style={[styles.choice, selected && styles.choiceSelected]}
            >
              <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function RecordSaveArchiveActions({
  saving,
  saveDisabled = false,
  hasRecord,
  saveLabel = "Save record",
  archiveReason,
  onArchiveReasonChange,
  onSave,
  onArchive
}: {
  saving: boolean;
  saveDisabled?: boolean;
  hasRecord: boolean;
  saveLabel?: string;
  archiveReason: string;
  onArchiveReasonChange: (value: string) => void;
  onSave: () => void;
  onArchive: () => void;
}) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createRecordFormStyles(palette), [palette]);
  return (
    <View style={styles.actionStack}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={saveLabel}
        accessibilityState={{ busy: saving, disabled: saving || saveDisabled }}
        disabled={saving || saveDisabled}
        onPress={onSave}
        style={[styles.primaryButton, (saving || saveDisabled) && styles.disabled]}
      >
        {saving ? (
          <ActivityIndicator color={palette.accentText} />
        ) : (
          <Text style={styles.primaryButtonText}>{saveLabel}</Text>
        )}
      </Pressable>
      {hasRecord ? (
        <View style={styles.archiveBox}>
          <LabeledInput
            label="Archive reason"
            accessibilityLabel="Business Desk archive reason"
            value={archiveReason}
            onChangeText={onArchiveReasonChange}
            placeholder="Why this record is no longer active"
            hint="Archived records keep their audit history and cannot be edited."
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Archive Business Desk record"
            accessibilityState={{ busy: saving, disabled: saving }}
            disabled={saving}
            onPress={onArchive}
            style={[styles.archiveButton, saving && styles.disabled]}
          >
            <Text style={styles.archiveButtonText}>Archive record</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

export function createRecordFormStyles(palette: ThemePalette) {
  return StyleSheet.create({
    actionStack: { gap: 14 },
    archiveBox: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 10,
      padding: 12
    },
    archiveButton: {
      alignItems: "center",
      backgroundColor: palette.surface,
      borderColor: palette.danger,
      borderRadius: radius.card,
      borderWidth: 1,
      justifyContent: "center",
      minHeight: 44,
      paddingHorizontal: 14,
      paddingVertical: 10
    },
    archiveButtonText: { color: palette.danger, fontSize: 13, fontWeight: "900" },
    choice: {
      alignItems: "center",
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: 999,
      borderWidth: 1,
      minHeight: 42,
      paddingHorizontal: 12,
      paddingVertical: 9
    },
    choiceSelected: { backgroundColor: palette.accent, borderColor: palette.accent },
    choiceText: { color: palette.text, fontSize: 12, fontWeight: "800" },
    choiceTextSelected: { color: palette.accentText },
    choices: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
    disabled: { opacity: 0.65 },
    field: { flexBasis: 230, flexGrow: 1, gap: 5, minWidth: 210 },
    hint: { color: palette.textMuted, fontSize: 11, lineHeight: 16 },
    input: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      color: palette.text,
      fontSize: 14,
      minHeight: 46,
      paddingHorizontal: 12,
      paddingVertical: 10
    },
    inputMultiline: { minHeight: 100, textAlignVertical: "top" },
    label: { color: palette.text, fontSize: 13, fontWeight: "800" },
    primaryButton: {
      alignItems: "center",
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      justifyContent: "center",
      minHeight: 48,
      paddingHorizontal: 16,
      paddingVertical: 12
    },
    primaryButtonText: { color: palette.accentText, fontSize: 14, fontWeight: "900" },
    selectorWrap: { gap: 7 }
  });
}
