import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type {
  GrowTimelinePublicEvent,
  GrowTimelineTextOverride
} from "@/api/growTimelineCopies";
import { useAppTheme } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

export default function TimelinePreviewWording({
  event,
  override,
  disabled,
  onApply,
  onEditingChange
}: {
  event: GrowTimelinePublicEvent;
  override?: GrowTimelineTextOverride;
  disabled?: boolean;
  onApply: (next: GrowTimelineTextOverride) => void;
  onEditingChange?: (editing: boolean) => void;
}) {
  const { palette } = useAppTheme();
  const [activeId, setActiveId] = useState("");
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const editing = activeId === event.id;
  const editingCallback = useRef(onEditingChange);
  editingCallback.current = onEditingChange;
  useEffect(() => {
    if (!editing) return;
    const report = editingCallback.current;
    report?.(true);
    return () => report?.(false);
  }, [editing, event.id]);
  const originalTitle = override?.title ?? event.title;
  const originalCaption = override?.summary ?? event.summary ?? "";
  const buttonStyle = [
    styles.button,
    { borderColor: palette.border, backgroundColor: palette.surface }
  ];
  const action = (
    label: string,
    onPress: () => void,
    blocked = false,
    accessibilityLabel = label
  ) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled || blocked}
      onPress={onPress}
      style={buttonStyle}
    >
      <Text
        style={{
          color: disabled || blocked ? palette.textMuted : palette.link,
          fontWeight: "700"
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
  if (!editing) {
    return action(
      "Edit entry wording",
      () => {
        setTitle(originalTitle);
        setCaption(originalCaption);
        setActiveId(event.id);
      },
      false,
      `Edit wording: ${event.title}`
    );
  }
  const input = [
    styles.input,
    { color: palette.text, backgroundColor: palette.surface, borderColor: palette.border }
  ];
  return (
    <View style={styles.form}>
      <Text style={{ color: palette.text }}>
        These words appear on the public copy. Your journal keeps its original wording.
      </Text>
      <Text style={{ color: palette.text }}>Public entry title</Text>
      <TextInput
        accessibilityLabel="Public entry title"
        editable={!disabled}
        maxLength={160}
        value={title}
        onChangeText={setTitle}
        style={input}
      />
      <Text style={{ color: palette.text }}>Public entry caption</Text>
      <TextInput
        accessibilityLabel="Public entry caption"
        editable={!disabled}
        maxLength={700}
        multiline
        value={caption}
        onChangeText={setCaption}
        style={input}
      />
      {!title.trim() ? (
        <Text accessibilityRole="alert" style={{ color: palette.danger }}>
          Enter a title for this public entry.
        </Text>
      ) : null}
      <View style={styles.actions}>
        {action(
          "Update preview wording",
          () => {
            const next: GrowTimelineTextOverride = { ...override, eventId: event.id };
            if (title !== originalTitle) next.title = title;
            if (caption !== originalCaption) next.summary = caption;
            setActiveId("");
            if (title !== originalTitle || caption !== originalCaption) onApply(next);
          },
          !title.trim()
        )}
        {action("Cancel wording edit", () => setActiveId(""))}
        {override &&
          action("Use journal wording", () => {
            setActiveId("");
            onApply({ eventId: event.id });
          })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 8, marginTop: 10 },
  actions: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  button: {
    minHeight: 44,
    alignSelf: "flex-start",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: radius.card,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: radius.card,
    paddingHorizontal: 10,
    paddingVertical: 8
  }
});
