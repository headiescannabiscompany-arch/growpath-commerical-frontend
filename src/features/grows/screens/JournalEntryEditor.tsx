import React, { useEffect, useMemo, useRef, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import {
  Image,
  Pressable,
  Text,
  TextInput,
  useWindowDimensions,
  View
} from "react-native";
import { type PersonalLog, type updatePersonalLog } from "@/api/logs";
import CalendarDateField from "@/components/forms/CalendarDateField";
import { useAppTheme } from "@/theme/appTheme";
import {
  persistImageUris,
  resolveImageUri,
  type UploadedPhotoMetadata
} from "@/utils/photoUploads";
import { createLogDetailStyles } from "./logDetailStyles";

function dateOnly(value?: string) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function splitTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export default function JournalEntryEditor({
  log,
  saveLog,
  onSaved,
  onCancel,
  changedFieldsOnly = false,
  onBusyChange
}: {
  log: PersonalLog;
  saveLog: (
    patch: Parameters<typeof updatePersonalLog>[1]
  ) => Promise<PersonalLog | null>;
  onSaved: (updated: PersonalLog) => void;
  onCancel: () => void;
  changedFieldsOnly?: boolean;
  onBusyChange?: (busy: boolean) => void;
}) {
  const logId = log.id;
  const { palette } = useAppTheme();
  const styles = useMemo(() => createLogDetailStyles(palette), [palette]);
  const { width } = useWindowDimensions();
  const photoTileWidth = Math.max(132, Math.min(180, Math.floor((width - 56) / 2)));
  const [saving, setSaving] = useState(false);
  const [pickingPhotos, setPickingPhotos] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const photoOperationInProgress = useRef(false);
  const [feedback, setFeedback] = useState("");
  const [addedPhotos, setAddedPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [initialForm] = useState(() => ({
    title: log.title || "",
    date: dateOnly(log.date || log.createdAt),
    type: log.type || "other",
    notes: log.notes || "",
    tags: Array.isArray(log.tags) ? log.tags.join(", ") : ""
  }));
  const [form, setForm] = useState(initialForm);

  async function pickPhotos() {
    if (photoOperationInProgress.current) return;
    photoOperationInProgress.current = true;
    setPickingPhotos(true);
    onBusyChange?.(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setFeedback("Photo-library permission is required to attach images.");
        return;
      }
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        allowsEditing: false,
        quality: 0.8
      });
      if (!picked.canceled) {
        setAddedPhotos((current) => [
          ...current,
          ...picked.assets.filter((photo) => photo.uri)
        ]);
        setFeedback("");
      }
    } catch {
      setFeedback("Unable to open photos. Please try again.");
    } finally {
      photoOperationInProgress.current = false;
      setPickingPhotos(false);
      onBusyChange?.(false);
    }
  }

  async function save() {
    if (photoOperationInProgress.current) return;
    if (!logId || !form.title.trim() || !form.date.trim()) {
      setFeedback("Title and date are required.");
      return;
    }
    photoOperationInProgress.current = true;
    setSaving(true);
    onBusyChange?.(true);
    setFeedback("");
    try {
      const uploaded: string[] = [];
      const savedMetadata = new Map<string, UploadedPhotoMetadata>();
      for (const [index, photo] of addedPhotos.entries()) {
        const [url] = await persistImageUris([photo.uri], {
          prepareForJournal: true,
          onUploaded: (_sourceUri, savedUrl, metadata) => {
            savedMetadata.set(savedUrl, metadata);
          }
        });
        if (!url) throw new Error("Image upload did not return a URL.");
        uploaded.push(url);
        // Retain each upload even if a later photo or the journal PATCH fails.
        setAddedPhotos((current) =>
          current.map((candidate, candidateIndex) =>
            candidateIndex === index && candidate.uri === photo.uri
              ? {
                  ...candidate,
                  ...savedMetadata.get(url),
                  mimeType: savedMetadata.get(url)?.mimeType || candidate.mimeType,
                  width: savedMetadata.get(url)?.width === null ? 0 : candidate.width,
                  height: savedMetadata.get(url)?.height === null ? 0 : candidate.height,
                  fileSize: savedMetadata.get(url)?.sizeBytes ?? candidate.fileSize,
                  uri: url
                }
              : candidate
          )
        );
      }
      const photoPatch = uploaded.length
        ? {
            photos: [...(log?.photos || []), ...uploaded],
            photoMetadata: [
              ...(log?.photos || []).map((url) => ({
                ...log?.photoMetadata?.find((metadata) => metadata.url === url),
                url
              })),
              ...uploaded.map((url, index) => ({
                url,
                growId: log?.growId,
                plantId: log?.plantId || null,
                logId,
                mimeType: addedPhotos[index]?.mimeType || null,
                width: addedPhotos[index]?.width || null,
                height: addedPhotos[index]?.height || null,
                sizeBytes: addedPhotos[index]?.fileSize || null,
                ...savedMetadata.get(url),
                consentForAI: false,
                consentForTraining: false
              }))
            ]
          }
        : {};
      if (!mounted.current) return;
      const values = {
        title: form.title.trim(),
        date: form.date.trim() === dateOnly(log?.date) ? log?.date : form.date.trim(),
        type: form.type.trim() || "other",
        notes: form.notes.trim(),
        tags: splitTags(form.tags)
      };
      // Compare what the grower edited before trimming or converting display defaults.
      // Otherwise a title correction can silently normalize old tags, dates or notes.
      const fields = changedFieldsOnly
        ? Object.fromEntries(
            (Object.keys(initialForm) as (keyof typeof initialForm)[])
              .filter((field) => form[field] !== initialForm[field])
              .map((field) => [field, values[field]])
          )
        : values;
      const patch = { ...fields, ...photoPatch };
      const updated = Object.keys(patch).length ? await saveLog(patch) : log;
      if (!mounted.current) return;
      if (!updated) {
        setFeedback("Unable to save journal entry.");
        return;
      }
      onSaved(updated);
    } catch {
      setFeedback(
        "Unable to upload photos or save this entry. Your changes are still here; please try again."
      );
    } finally {
      photoOperationInProgress.current = false;
      setSaving(false);
      onBusyChange?.(false);
    }
  }

  return (
    <View style={styles.card}>
      {feedback ? (
        <Text accessibilityRole="alert" style={styles.feedback}>
          {feedback}
        </Text>
      ) : null}
      <Text style={styles.label}>Title</Text>
      <TextInput
        style={styles.input}
        value={form.title}
        editable={!saving}
        onChangeText={(title) => setForm((current) => ({ ...current, title }))}
        placeholderTextColor={palette.textMuted}
        selectionColor={palette.accent}
        accessibilityLabel="Edit log title"
      />
      <CalendarDateField
        label="Date"
        value={form.date}
        onChange={(date) => setForm((current) => ({ ...current, date }))}
        placeholder="Choose log date"
        accessibilityLabel="Edit log date"
        optional={false}
        disabled={saving}
      />
      <Text style={styles.label}>Type</Text>
      <TextInput
        style={styles.input}
        value={form.type}
        editable={!saving}
        onChangeText={(type) => setForm((current) => ({ ...current, type }))}
        placeholderTextColor={palette.textMuted}
        selectionColor={palette.accent}
        accessibilityLabel="Edit log type"
      />
      <Text style={styles.label}>Notes</Text>
      <TextInput
        style={styles.notesInput}
        value={form.notes}
        editable={!saving}
        onChangeText={(notes) => setForm((current) => ({ ...current, notes }))}
        multiline
        placeholderTextColor={palette.textMuted}
        selectionColor={palette.accent}
        accessibilityLabel="Edit log notes"
      />
      <Text style={styles.label}>Tags</Text>
      <TextInput
        style={styles.input}
        value={form.tags}
        editable={!saving}
        onChangeText={(tags) => setForm((current) => ({ ...current, tags }))}
        placeholder="watering, deficiency, follow-up"
        placeholderTextColor={palette.textMuted}
        selectionColor={palette.accent}
        accessibilityLabel="Edit log tags"
      />
      <Text style={styles.label}>Photos</Text>
      <Text style={styles.cardText}>
        {log.photos?.length || 0} saved photos. New photos are added when you save.
        Published timeline copies stay unchanged until you review and publish again.
      </Text>
      <Pressable
        style={styles.secondaryButton}
        onPress={pickPhotos}
        disabled={saving || pickingPhotos}
        accessibilityRole="button"
        accessibilityLabel="Add photos to journal entry"
      >
        <Text style={styles.secondaryButtonText}>
          {pickingPhotos ? "Opening photos..." : "Add Photos"}
        </Text>
      </Pressable>
      <View style={styles.photoGrid}>
        {addedPhotos.map((photo, index) => (
          <View key={`${photo.uri}-${index}`} style={styles.photoTile}>
            <Image
              source={{ uri: resolveImageUri(photo.uri) }}
              style={[styles.photoThumb, { width: photoTileWidth }]}
              accessibilityLabel={`New journal photo ${index + 1}`}
            />
            <Pressable
              onPress={() =>
                setAddedPhotos((current) => current.filter((_, i) => i !== index))
              }
              disabled={saving || pickingPhotos}
              accessibilityRole="button"
              accessibilityLabel={`Remove new photo ${index + 1}`}
            >
              <Text style={styles.secondaryButtonText}>Remove</Text>
            </Pressable>
          </View>
        ))}
      </View>
      <View style={styles.row}>
        <Pressable
          style={[styles.primaryButton, (saving || pickingPhotos) && styles.disabled]}
          disabled={saving || pickingPhotos}
          onPress={save}
          accessibilityRole="button"
          accessibilityLabel="Save log changes"
        >
          <Text style={styles.primaryButtonText}>
            {saving ? "Saving..." : "Save Changes"}
          </Text>
        </Pressable>
        <Pressable
          style={styles.secondaryButton}
          disabled={saving || pickingPhotos}
          onPress={() => {
            if (photoOperationInProgress.current) return;
            onCancel();
          }}
          accessibilityRole="button"
          accessibilityLabel="Cancel log editing"
        >
          <Text style={styles.secondaryButtonText}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}
