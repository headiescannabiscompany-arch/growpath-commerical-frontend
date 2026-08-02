import React, { useMemo } from "react";
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import {
  LESSON_MEDIA_SOURCE_OPTIONS,
  LessonMediaAccessibility,
  LessonMediaAvailability,
  LessonMediaDraft,
  LessonMediaSourceType,
  lessonMediaPublishIssues,
  normalizeLessonMediaDraft
} from "@/features/learning/lessonMedia";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

type Props = {
  value: LessonMediaDraft;
  onChange: (next: LessonMediaDraft) => void;
  disabled?: boolean;
  onPickUpload?: () => void;
  pendingUploadName?: string;
  onRemove?: () => void;
};

const AVAILABILITY_OPTIONS: Array<{
  value: LessonMediaAvailability;
  label: string;
}> = [
  { value: "available", label: "Available" },
  { value: "link_only", label: "Link only" },
  { value: "restricted", label: "Restricted" },
  { value: "unavailable", label: "Unavailable" }
];

const ACCESSIBILITY_OPTIONS: Array<{
  value: LessonMediaAccessibility;
  label: string;
}> = [
  { value: "provided", label: "Provided" },
  { value: "not_provided", label: "Not provided" },
  { value: "not_applicable", label: "Not applicable" }
];

function ChoiceRow<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled
}: {
  label: string;
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (next: T) => void;
  disabled?: boolean;
}) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.choiceRow}>
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected, disabled: Boolean(disabled) }}
              accessibilityLabel={`${label}: ${option.label}`}
              disabled={disabled}
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

function AccessibleToggle({
  label,
  value,
  onChange,
  disabled
}: {
  label: string;
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={() => onChange(!value)}
      style={[styles.toggle, value && styles.toggleOn, disabled && styles.disabled]}
    >
      <Text style={[styles.toggleText, value && styles.toggleTextOn]}>
        {value ? "On" : "Off"}
      </Text>
    </Pressable>
  );
}

export default function LessonMediaSourceEditor({
  value,
  onChange,
  disabled = false,
  onPickUpload,
  pendingUploadName,
  onRemove
}: Props) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const normalized = useMemo(() => normalizeLessonMediaDraft(value), [value]);
  const media = normalized.mediaSource;
  const publishIssues = useMemo(
    () => (media ? lessonMediaPublishIssues(media) : []),
    [media]
  );

  function patch(next: Partial<LessonMediaDraft>) {
    onChange({ ...value, ...next });
  }

  function selectSource(sourceType: LessonMediaSourceType) {
    patch({
      sourceType,
      originalUrl: sourceType === value.sourceType ? value.originalUrl : "",
      allowEmbed:
        sourceType === "youtube" || sourceType === "vimeo" ? value.allowEmbed : false,
      availabilityStatus: "unchecked",
      lastCheckedAt: ""
    });
  }

  function updateUrl(originalUrl: string) {
    const next = { ...value, originalUrl };
    const detected = normalizeLessonMediaDraft(next).mediaSource;
    onChange({
      ...next,
      sourceType: detected?.sourceType || next.sourceType,
      availabilityStatus: "unchecked",
      lastCheckedAt: ""
    });
  }

  function recordAvailability(availabilityStatus: LessonMediaAvailability) {
    patch({ availabilityStatus, lastCheckedAt: new Date().toISOString() });
  }

  const sourceUrl = media?.externalLinkFallback || "";
  const sourceSelected = Boolean(media || pendingUploadName);

  return (
    <View style={styles.card} accessibilityLabel="Lesson video source editor">
      <Text style={styles.title}>Lesson video source</Text>
      <Text style={styles.help}>
        Choose where the video lives. GrowPath stores only GrowPath uploads; third-party
        videos remain owned, hosted, and controlled by their provider.
      </Text>

      <ChoiceRow
        label="Video provider"
        options={LESSON_MEDIA_SOURCE_OPTIONS}
        value={value.sourceType}
        onChange={selectSource}
        disabled={disabled}
      />

      {value.sourceType === "growpath_upload" ? (
        <View style={styles.fieldGroup}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Choose GrowPath lesson video upload"
            disabled={disabled || !onPickUpload}
            onPress={onPickUpload}
            style={[styles.primaryButton, (disabled || !onPickUpload) && styles.disabled]}
          >
            <Text style={styles.primaryButtonText}>
              {pendingUploadName || value.originalUrl
                ? "Replace GrowPath video"
                : "Choose video to upload"}
            </Text>
          </Pressable>
          {pendingUploadName ? (
            <Text style={styles.status}>Selected: {pendingUploadName}</Text>
          ) : value.originalUrl ? (
            <Text style={styles.status}>Saved GrowPath upload: {value.originalUrl}</Text>
          ) : (
            <Text style={styles.help}>
              The selected file uploads when the lesson is saved.
            </Text>
          )}
        </View>
      ) : (
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Video page URL</Text>
          <TextInput
            accessibilityLabel="Lesson video page URL"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!disabled}
            onChangeText={updateUrl}
            placeholder="Paste the video page URL, not embed code"
            placeholderTextColor={palette.textMuted}
            selectionColor={palette.accent}
            style={styles.input}
            value={value.originalUrl}
          />
          {normalized.errors.map((error) => (
            <Text key={error} style={styles.error}>
              {error}
            </Text>
          ))}
        </View>
      )}

      {media ? (
        <View style={styles.preview}>
          <Text style={styles.previewTitle}>{media.providerLabel} detected</Text>
          <Text style={styles.help} numberOfLines={2}>
            Canonical source: {media.canonicalUrl}
          </Text>
          <Text style={styles.status}>
            {media.embedCapability === "supported"
              ? "Approved privacy-aware embed is available."
              : media.embedCapability === "native"
                ? "First-party GrowPath playback with link fallback."
                : "Link-only playback; GrowPath will not guess or store provider embed code."}
          </Text>
        </View>
      ) : null}

      {sourceSelected ? (
        <>
          <View style={styles.actionRow}>
            {sourceUrl ? (
              <Pressable
                accessibilityRole="link"
                accessibilityLabel="Open lesson video source to verify it"
                onPress={() => Linking.openURL(sourceUrl)}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>Open source to verify</Text>
              </Pressable>
            ) : null}
            {onRemove ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Remove lesson video"
                disabled={disabled}
                onPress={onRemove}
                style={styles.dangerButton}
              >
                <Text style={styles.dangerButtonText}>Remove video</Text>
              </Pressable>
            ) : null}
          </View>

          <TextInput
            accessibilityLabel="Lesson video display title"
            editable={!disabled}
            onChangeText={(title) => patch({ title })}
            placeholder="Optional video title shown to learners"
            placeholderTextColor={palette.textMuted}
            selectionColor={palette.accent}
            style={styles.input}
            value={value.title}
          />
          <TextInput
            accessibilityLabel="Lesson video thumbnail URL"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!disabled}
            onChangeText={(thumbnailUrl) => patch({ thumbnailUrl })}
            placeholder="Optional thumbnail URL (YouTube fills this automatically)"
            placeholderTextColor={palette.textMuted}
            selectionColor={palette.accent}
            style={styles.input}
            value={value.thumbnailUrl}
          />

          <ChoiceRow
            label="Current availability"
            options={AVAILABILITY_OPTIONS}
            value={value.availabilityStatus}
            onChange={recordAvailability}
            disabled={disabled}
          />
          <Text style={styles.help}>
            Open the source first, then record what a learner can access now. GrowPath
            stores the check time but does not continuously monitor third-party videos.
          </Text>

          <TextInput
            accessibilityLabel="Lesson video availability note"
            editable={!disabled}
            onChangeText={(availabilityNote) => patch({ availabilityNote })}
            placeholder="Optional: region, age gate, login, embed, or removal note"
            placeholderTextColor={palette.textMuted}
            selectionColor={palette.accent}
            style={styles.input}
            value={value.availabilityNote}
          />

          <View style={styles.switchRow}>
            <View style={styles.switchCopy}>
              <Text style={styles.fieldLabel}>Rights or permission confirmed</Text>
              <Text style={styles.help}>
                Confirm you own this media or have permission to use it in the course.
              </Text>
            </View>
            <AccessibleToggle
              label="Confirm rights or permission for lesson video"
              disabled={disabled}
              onChange={(creatorRightsConfirmed) => patch({ creatorRightsConfirmed })}
              value={value.creatorRightsConfirmed}
            />
          </View>

          {media?.embedCapability === "supported" ? (
            <View style={styles.switchRow}>
              <View style={styles.switchCopy}>
                <Text style={styles.fieldLabel}>
                  Allow privacy-aware in-course player
                </Text>
                <Text style={styles.help}>
                  The provider loads only after the learner chooses to load it. An
                  external-link fallback remains available.
                </Text>
              </View>
              <AccessibleToggle
                label="Allow privacy-aware lesson video embed"
                disabled={disabled || value.availabilityStatus !== "available"}
                onChange={(allowEmbed) => patch({ allowEmbed })}
                value={value.allowEmbed}
              />
            </View>
          ) : null}

          <ChoiceRow
            label="Captions"
            options={ACCESSIBILITY_OPTIONS}
            value={value.captionsStatus}
            onChange={(captionsStatus) => patch({ captionsStatus })}
            disabled={disabled}
          />
          <ChoiceRow
            label="Transcript"
            options={ACCESSIBILITY_OPTIONS}
            value={value.transcriptStatus}
            onChange={(transcriptStatus) => patch({ transcriptStatus })}
            disabled={disabled}
          />

          <Text style={styles.fieldLabel}>Learner-visible video summary</Text>
          <TextInput
            accessibilityLabel="Learner-visible lesson video summary"
            editable={!disabled}
            multiline
            onChangeText={(textSummary) => patch({ textSummary })}
            placeholder="Summarize what the learner should understand if the video cannot load"
            placeholderTextColor={palette.textMuted}
            selectionColor={palette.accent}
            style={[styles.input, styles.textArea]}
            value={value.textSummary}
          />

          {!media ? (
            <View style={styles.warningBox}>
              <Text style={styles.warningTitle}>Upload validation happens on save</Text>
              <Text style={styles.warningText}>
                GrowPath will validate the uploaded video URL before this lesson can be
                published.
              </Text>
            </View>
          ) : publishIssues.length ? (
            <View style={styles.warningBox}>
              <Text style={styles.warningTitle}>Before this course can publish</Text>
              {publishIssues.map((issue) => (
                <Text key={issue} style={styles.warningText}>
                  • {issue}
                </Text>
              ))}
            </View>
          ) : (
            <View style={styles.readyBox}>
              <Text style={styles.readyText}>
                Video source is ready for course publishing.
              </Text>
            </View>
          )}
        </>
      ) : null}
    </View>
  );
}

export function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    card: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      padding: 14,
      marginVertical: 12,
      backgroundColor: palette.surface,
      gap: 10
    },
    title: { fontSize: 18, fontWeight: "800", color: palette.text },
    fieldGroup: { gap: 7 },
    fieldLabel: { fontSize: 14, fontWeight: "700", color: palette.text },
    help: { fontSize: 12, lineHeight: 17, color: palette.textMuted },
    choiceRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
    choice: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 999,
      paddingHorizontal: 11,
      paddingVertical: 8,
      backgroundColor: palette.surfaceMuted
    },
    choiceSelected: { borderColor: palette.accent, backgroundColor: palette.accentSoft },
    choiceText: { color: palette.text, fontWeight: "600", fontSize: 12 },
    choiceTextSelected: { color: palette.link },
    input: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      paddingHorizontal: 11,
      paddingVertical: 10,
      backgroundColor: palette.surfaceMuted,
      color: palette.text
    },
    textArea: { minHeight: 92, textAlignVertical: "top" },
    preview: {
      borderLeftWidth: 4,
      borderLeftColor: palette.info,
      paddingLeft: 10,
      gap: 4
    },
    previewTitle: { fontWeight: "800", color: palette.info },
    status: { color: palette.textMuted, fontSize: 12, lineHeight: 17 },
    actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    primaryButton: {
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      paddingHorizontal: 14,
      paddingVertical: 11,
      alignItems: "center"
    },
    primaryButtonText: { color: palette.accentText, fontWeight: "800" },
    secondaryButton: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      paddingHorizontal: 12,
      paddingVertical: 9,
      backgroundColor: palette.surfaceMuted
    },
    secondaryButtonText: { color: palette.link, fontWeight: "700" },
    dangerButton: {
      borderWidth: 1,
      borderColor: palette.danger,
      borderRadius: radius.card,
      paddingHorizontal: 12,
      paddingVertical: 9,
      backgroundColor: palette.surfaceMuted
    },
    dangerButtonText: { color: palette.danger, fontWeight: "700" },
    switchRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 14,
      paddingVertical: 3
    },
    switchCopy: { flex: 1 },
    toggle: {
      minWidth: 58,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
      alignItems: "center",
      backgroundColor: palette.surfaceMuted
    },
    toggleOn: { borderColor: palette.accent, backgroundColor: palette.accentSoft },
    toggleText: { color: palette.textMuted, fontWeight: "800", fontSize: 12 },
    toggleTextOn: { color: palette.link },
    warningBox: {
      borderWidth: 1,
      borderColor: palette.warning,
      backgroundColor: palette.surfaceMuted,
      borderRadius: radius.card,
      padding: 11,
      gap: 3
    },
    warningTitle: { color: palette.warning, fontWeight: "800" },
    warningText: { color: palette.text, fontSize: 12, lineHeight: 17 },
    readyBox: {
      borderWidth: 1,
      borderColor: palette.success,
      backgroundColor: palette.accentSoft,
      borderRadius: radius.card,
      padding: 11
    },
    readyText: { color: palette.success, fontWeight: "700", fontSize: 12 },
    error: { color: palette.danger, fontSize: 12, fontWeight: "600" },
    disabled: { opacity: 0.5 }
  });
}
