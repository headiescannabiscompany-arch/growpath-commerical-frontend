import React, { useMemo, useState } from "react";
import * as DocumentPicker from "expo-document-picker";
import { Link } from "expo-router";
import {
  FlatList,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import { API_URL } from "@/api/apiRequest";
import { normalizeApiError } from "@/api/errors";
import type { SOPAttachment, SOPTemplate } from "@/api/sop";
import { uploadSopDocument } from "@/api/uploads";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import {
  STANDARD_SOP_LIBRARY,
  standardSopContent,
  type StandardSopTemplate
} from "@/features/sops/standardSopLibrary";
import { useSopTemplates } from "@/hooks/useSopTemplates";
import { useFacility } from "@/state/useFacility";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

type PendingDocument = {
  uri: string;
  name: string;
  mimeType?: string;
  size?: number;
};

const CATEGORY_OPTIONS = [
  { value: "other", label: "General operations" },
  { value: "ipm", label: "IPM and scouting" },
  { value: "transplant", label: "Intake and transplant" },
  { value: "feed", label: "Feeding" },
  { value: "water", label: "Water and irrigation" },
  { value: "harvest", label: "Harvest and post-harvest" },
  { value: "dry_cure", label: "Dry and cure" },
  { value: "reset", label: "Sanitation and reset" },
  { value: "defol", label: "Canopy work" }
] as const;

function pickId(template: SOPTemplate, index: number) {
  return String(template?.id ?? template?._id ?? `template-${index}`);
}

function getErrorMessage(error: unknown, fallback: string) {
  return normalizeApiError(error).message || fallback;
}

function absoluteUploadUrl(url: string) {
  if (/^https?:\/\//i.test(url)) return url;
  const suffix = url.startsWith("/") ? url : `/${url}`;
  return `${API_URL}${suffix}`;
}

function checklistContent(template: SOPTemplate) {
  if (Array.isArray(template.checklist) && template.checklist.length) {
    return template.checklist
      .map((item) => String(item?.step || "").trim())
      .filter(Boolean)
      .join("\n");
  }
  return String(template.content || template.description || "");
}

function attachmentLabel(attachment: SOPAttachment) {
  const size = Number(attachment.bytes || 0);
  const sizeLabel = size > 0 ? ` · ${(size / 1024 / 1024).toFixed(1)} MB` : "";
  return `${attachment.filename || "SOP document"}${sizeLabel}`;
}

export default function FacilitySopRunsPresetsRoute() {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createFacilitySopLibraryStyles(palette), [palette]);
  const { selectedId: facilityId } = useFacility();
  const entitlements = useEntitlements();
  const canManage = Boolean(entitlements?.can?.(CAPABILITY_KEYS.SOP_RUNS_WRITE));
  const {
    templates,
    isLoading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    creating,
    updating,
    deleting,
    refetch
  } = useSopTemplates(facilityId);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [sourceKey, setSourceKey] = useState<string | null>(null);
  const [sourceVersion, setSourceVersion] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("other");
  const [content, setContent] = useState("");
  const [safetyNotes, setSafetyNotes] = useState("");
  const [duration, setDuration] = useState("");
  const [existingAttachments, setExistingAttachments] = useState<SOPAttachment[]>([]);
  const [pendingDocuments, setPendingDocuments] = useState<PendingDocument[]>([]);
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [retireTarget, setRetireTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const saving = creating || updating || uploading;
  const parsedSteps = useMemo(
    () =>
      content
        .split(/\r?\n/)
        .map((line) => line.replace(/^[-*0-9.)\s]+/, "").trim())
        .filter(Boolean),
    [content]
  );
  const canSave = Boolean(
    canManage &&
    facilityId &&
    title.trim() &&
    parsedSteps.length &&
    reviewConfirmed &&
    !saving
  );

  function resetForm() {
    setEditingId(null);
    setSourceKey(null);
    setSourceVersion(null);
    setTitle("");
    setCategory("other");
    setContent("");
    setSafetyNotes("");
    setDuration("");
    setExistingAttachments([]);
    setPendingDocuments([]);
    setReviewConfirmed(false);
    setMessage(null);
  }

  function loadStarter(template: StandardSopTemplate) {
    setEditingId(null);
    setSourceKey(template.key);
    setSourceVersion(template.version);
    setTitle(template.title);
    setCategory(template.category);
    setContent(standardSopContent(template));
    setSafetyNotes(template.safetyNotes);
    setDuration(String(template.estimatedDurationMinutes));
    setExistingAttachments([]);
    setPendingDocuments([]);
    setReviewConfirmed(false);
    setMessage(
      "Starter loaded. Review every step, adjust it for this facility, and confirm the review before saving."
    );
  }

  function editTemplate(template: SOPTemplate, index: number) {
    setEditingId(pickId(template, index));
    setSourceKey(template.sourceKey || null);
    setSourceVersion(template.sourceVersion || null);
    setTitle(String(template.title || ""));
    setCategory(String(template.category || "other"));
    setContent(checklistContent(template));
    setSafetyNotes(String(template.safetyNotes || ""));
    setDuration(
      template.estimatedDurationMinutes == null
        ? ""
        : String(template.estimatedDurationMinutes)
    );
    setExistingAttachments(
      Array.isArray(template.attachments) ? template.attachments : []
    );
    setPendingDocuments([]);
    setReviewConfirmed(false);
    setMessage(
      "Editing creates a new version and preserves the prior version for historical evidence."
    );
  }

  async function chooseDocument() {
    if (pendingDocuments.length + existingAttachments.length >= 10) {
      setMessage("Use no more than 10 documents on one SOP.");
      return;
    }
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
        "text/markdown",
        "application/rtf",
        "image/jpeg",
        "image/png"
      ],
      multiple: false,
      copyToCacheDirectory: true
    });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset?.uri) {
      setMessage("The selected document could not be read.");
      return;
    }
    setPendingDocuments((current) => [
      ...current,
      {
        uri: asset.uri,
        name: asset.name || "sop-document",
        mimeType: asset.mimeType || undefined,
        size: asset.size
      }
    ]);
    setMessage(null);
  }

  async function save() {
    if (!facilityId) {
      setMessage("Select a facility first.");
      return;
    }
    if (!canSave) {
      setMessage("Add a title and checklist, then confirm your facility review.");
      return;
    }
    setMessage(null);
    setUploading(true);
    try {
      const uploaded: SOPAttachment[] = [];
      for (const document of pendingDocuments) {
        const attachment = await uploadSopDocument(facilityId, document);
        uploaded.push(attachment as SOPAttachment);
      }
      const attachments = [...existingAttachments, ...uploaded];
      const payload = {
        title: title.trim(),
        category,
        content: parsedSteps.join("\n"),
        checklist: parsedSteps.map((step) => ({
          step,
          required: true,
          requiresPhoto: false
        })),
        safetyNotes: safetyNotes.trim() || undefined,
        estimatedDurationMinutes: duration.trim()
          ? Math.max(0, Number(duration) || 0)
          : undefined,
        sourceKey: sourceKey || undefined,
        sourceVersion: sourceKey ? sourceVersion || 1 : undefined,
        reviewConfirmed: true,
        attachments
      };
      if (editingId) {
        await updateTemplate({ id: editingId, patch: payload });
      } else {
        await createTemplate(payload);
      }
      await refetch();
      resetForm();
      setMessage(editingId ? "New SOP version saved." : "Approved SOP saved.");
    } catch (error: unknown) {
      setMessage(getErrorMessage(error, "Failed to save SOP"));
    } finally {
      setUploading(false);
    }
  }

  async function retireTemplate() {
    if (!facilityId || !retireTarget || deleting) return;
    setMessage(null);
    try {
      await deleteTemplate(retireTarget.id);
      await refetch();
      if (editingId === retireTarget.id) resetForm();
      setMessage(
        `Retired "${retireTarget.title}". Historical versions and completed runs remain available as evidence.`
      );
      setRetireTarget(null);
    } catch (error: unknown) {
      setMessage(getErrorMessage(error, "Failed to retire SOP"));
    }
  }

  return (
    <ScreenBoundary
      title="SOP Library"
      showBack
      backFallbackHref="/home/facility/sop-runs"
    >
      <FlatList
        data={templates}
        keyExtractor={pickId}
        contentContainerStyle={styles.container}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text accessibilityRole="header" aria-level={1} style={styles.h1}>
              SOP Library
            </Text>
            <Text style={styles.lead}>
              Start from a cautious operations template or write your own. Uploads support
              PDF, Word, text, and scanned JPG/PNG documents. A document supplements the
              executable checklist—it does not replace it.
            </Text>

            <Text accessibilityRole="header" aria-level={2} style={styles.h2}>
              Standard starter templates
            </Text>
            <Text style={styles.sub}>
              These are editable, setpoint-free starting points—not legal certification or
              automatic facility policy.
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator
              contentContainerStyle={styles.starterRow}
            >
              {STANDARD_SOP_LIBRARY.map((template) => (
                <View key={template.key} style={styles.starterCard}>
                  <Text style={styles.starterTitle}>{template.title}</Text>
                  <Text style={styles.starterMeta}>
                    {template.checklist.length} steps · about{" "}
                    {template.estimatedDurationMinutes} minutes
                  </Text>
                  <Text style={styles.starterBody}>{template.summary}</Text>
                  {canManage ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Use ${template.title} starter`}
                      onPress={() => loadStarter(template)}
                      style={styles.secondaryButton}
                    >
                      <Text style={styles.secondaryButtonText}>Use and customize</Text>
                    </Pressable>
                  ) : null}
                </View>
              ))}
            </ScrollView>

            {canManage ? (
              <View style={styles.editorCard}>
                <View style={styles.editorHeadingRow}>
                  <View style={styles.flex}>
                    <Text accessibilityRole="header" aria-level={2} style={styles.h2}>
                      {editingId ? "Create a revised version" : "Create facility SOP"}
                    </Text>
                    <Text style={styles.sub}>
                      {sourceKey
                        ? "Loaded from the standard starter library. Customize it before approval."
                        : "Write a facility-specific procedure or select a starter above."}
                    </Text>
                  </View>
                  {editingId || title || content ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Clear SOP editor"
                      onPress={resetForm}
                      style={styles.textButton}
                    >
                      <Text style={styles.textButtonText}>Clear</Text>
                    </Pressable>
                  ) : null}
                </View>

                <Text style={styles.label}>Title</Text>
                <TextInput
                  accessibilityLabel="SOP title"
                  style={styles.input}
                  placeholder="Room opening, sanitation, scouting..."
                  value={title}
                  onChangeText={setTitle}
                />

                <Text style={styles.label}>Category</Text>
                <View
                  accessibilityRole="radiogroup"
                  accessibilityLabel="SOP category"
                  style={styles.choiceRow}
                >
                  {CATEGORY_OPTIONS.map((option) => {
                    const selected = category === option.value;
                    return (
                      <Pressable
                        key={option.value}
                        accessibilityRole="radio"
                        accessibilityLabel={`SOP category ${option.label}`}
                        accessibilityState={{ checked: selected }}
                        onPress={() => setCategory(option.value)}
                        style={[styles.choice, selected && styles.choiceSelected]}
                      >
                        <Text
                          style={[
                            styles.choiceText,
                            selected && styles.choiceTextSelected
                          ]}
                        >
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles.label}>Executable checklist</Text>
                <Text style={styles.help}>One reviewed action per line.</Text>
                <TextInput
                  accessibilityLabel="SOP checklist steps"
                  style={[styles.input, styles.stepsInput]}
                  placeholder={
                    "Confirm the correct room\nRecord observations\nCreate follow-up work"
                  }
                  value={content}
                  onChangeText={setContent}
                  multiline
                />
                <Text style={styles.count}>{parsedSteps.length} checklist steps</Text>

                <Text style={styles.label}>Safety and escalation notes</Text>
                <TextInput
                  accessibilityLabel="SOP safety notes"
                  style={[styles.input, styles.notesInput]}
                  placeholder="Stop conditions, required approvals, label or PPE reminders..."
                  value={safetyNotes}
                  onChangeText={setSafetyNotes}
                  multiline
                />

                <Text style={styles.label}>Estimated minutes</Text>
                <TextInput
                  accessibilityLabel="SOP estimated minutes"
                  style={styles.input}
                  placeholder="Optional"
                  value={duration}
                  onChangeText={setDuration}
                  keyboardType="number-pad"
                />

                <Text accessibilityRole="header" aria-level={3} style={styles.h3}>
                  Supporting documents
                </Text>
                <Text style={styles.help}>
                  Upload the current approved reference. Files stay scoped to this
                  Facility.
                </Text>
                {[...existingAttachments].map((attachment) => (
                  <View key={attachment.assetId} style={styles.documentRow}>
                    <Pressable
                      accessibilityRole="link"
                      accessibilityLabel={`Open SOP document ${attachment.filename}`}
                      onPress={() => Linking.openURL(absoluteUploadUrl(attachment.url))}
                      style={styles.documentLink}
                    >
                      <Text style={styles.documentLinkText}>
                        {attachmentLabel(attachment)}
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove SOP document ${attachment.filename}`}
                      onPress={() =>
                        setExistingAttachments((current) =>
                          current.filter((item) => item.assetId !== attachment.assetId)
                        )
                      }
                      style={styles.removeButton}
                    >
                      <Text style={styles.removeButtonText}>Remove</Text>
                    </Pressable>
                  </View>
                ))}
                {pendingDocuments.map((document, index) => (
                  <View key={`${document.uri}-${index}`} style={styles.documentRow}>
                    <Text style={styles.pendingDocument}>
                      {document.name} · ready to upload
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove pending SOP document ${document.name}`}
                      onPress={() =>
                        setPendingDocuments((current) =>
                          current.filter((_, itemIndex) => itemIndex !== index)
                        )
                      }
                      style={styles.removeButton}
                    >
                      <Text style={styles.removeButtonText}>Remove</Text>
                    </Pressable>
                  </View>
                ))}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Choose SOP document"
                  onPress={chooseDocument}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>Choose document</Text>
                </Pressable>

                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityLabel="Confirm SOP facility review"
                  accessibilityState={{ checked: reviewConfirmed }}
                  onPress={() => setReviewConfirmed((current) => !current)}
                  style={styles.reviewRow}
                >
                  <View
                    style={[styles.checkbox, reviewConfirmed && styles.checkboxSelected]}
                  >
                    <Text style={styles.checkmark}>{reviewConfirmed ? "✓" : ""}</Text>
                  </View>
                  <Text style={styles.reviewText}>
                    I reviewed this checklist, attachments, safety notes, and facility
                    responsibilities. It is ready to become the active facility version.
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    editingId ? "Save SOP revision" : "Save facility SOP"
                  }
                  accessibilityState={{ disabled: !canSave }}
                  disabled={!canSave}
                  onPress={save}
                  style={[styles.primaryButton, !canSave && styles.disabled]}
                >
                  <Text style={styles.primaryButtonText}>
                    {saving
                      ? uploading
                        ? "Uploading documents..."
                        : "Saving..."
                      : editingId
                        ? "Save revised version"
                        : "Save approved SOP"}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.readOnlyCard}>
                <Text style={styles.readOnlyTitle}>Read-only SOP access</Text>
                <Text style={styles.sub}>
                  Facility owners and managers create and revise templates. You can open
                  active procedures and perform assigned runs.
                </Text>
              </View>
            )}

            {message ? <Text style={styles.message}>{message}</Text> : null}
            <Text accessibilityRole="header" aria-level={2} style={styles.h2}>
              Active facility SOPs
            </Text>
            {isLoading ? <Text style={styles.sub}>Loading SOPs...</Text> : null}
          </View>
        }
        ListEmptyComponent={
          !isLoading ? (
            <Text style={styles.empty}>
              No active facility SOPs yet. An owner or manager can customize a standard
              starter or create one above.
            </Text>
          ) : null
        }
        renderItem={({ item, index }) => {
          const id = pickId(item, index);
          const titleText = String(item?.title || "Untitled SOP");
          const attachments = Array.isArray(item.attachments) ? item.attachments : [];
          const stepCount = Array.isArray(item.checklist)
            ? item.checklist.length
            : checklistContent(item).split(/\r?\n/).filter(Boolean).length;
          return (
            <View style={styles.savedCard}>
              <View style={styles.savedHeading}>
                <View style={styles.flex}>
                  <Text style={styles.savedTitle}>{titleText}</Text>
                  <Text style={styles.savedMeta}>
                    Version {item.version || 1} · {stepCount} steps ·{" "}
                    {CATEGORY_OPTIONS.find((option) => option.value === item.category)
                      ?.label || "General operations"}
                  </Text>
                </View>
                {item.sourceKey ? (
                  <Text style={styles.starterBadge}>starter-based</Text>
                ) : null}
              </View>
              <Text style={styles.savedBody} numberOfLines={4}>
                {checklistContent(item)}
              </Text>
              {item.safetyNotes ? (
                <Text style={styles.safetySummary}>Safety: {item.safetyNotes}</Text>
              ) : null}
              {attachments.map((attachment) => (
                <Pressable
                  key={attachment.assetId}
                  accessibilityRole="link"
                  accessibilityLabel={`Open SOP document ${attachment.filename}`}
                  onPress={() => Linking.openURL(absoluteUploadUrl(attachment.url))}
                  style={styles.savedDocumentLink}
                >
                  <Text style={styles.documentLinkText}>
                    {attachmentLabel(attachment)}
                  </Text>
                </Pressable>
              ))}
              <View style={styles.savedActions}>
                <Link
                  accessibilityRole="button"
                  accessibilityLabel={`Start run from SOP ${titleText}`}
                  href={{
                    pathname: "/home/facility/sop-runs/start",
                    params: { templateId: id, templateTitle: titleText }
                  }}
                  style={styles.startLink}
                >
                  Start run
                </Link>
                {canManage ? (
                  <>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Revise SOP ${titleText}`}
                      onPress={() => editTemplate(item, index)}
                      style={styles.textButton}
                    >
                      <Text style={styles.textButtonText}>Revise</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Retire SOP ${titleText}`}
                      accessibilityState={{ disabled: deleting }}
                      disabled={deleting}
                      onPress={() => setRetireTarget({ id, title: titleText })}
                      style={[styles.retireButton, deleting && styles.disabled]}
                    >
                      <Text style={styles.retireButtonText}>Retire</Text>
                    </Pressable>
                  </>
                ) : null}
              </View>
              {retireTarget?.id === id ? (
                <View
                  accessibilityLabel={`Retire confirmation ${titleText}`}
                  style={styles.retireConfirm}
                >
                  <Text style={styles.retireTitle}>Retire {titleText}?</Text>
                  <Text style={styles.retireCopy}>
                    This removes the SOP from new runs. Historical versions, completed
                    runs, attachments, and audit evidence are preserved.
                  </Text>
                  <View style={styles.savedActions}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Cancel retirement ${titleText}`}
                      disabled={deleting}
                      onPress={() => setRetireTarget(null)}
                      style={[styles.textButton, deleting && styles.disabled]}
                    >
                      <Text style={styles.textButtonText}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Confirm retire SOP ${titleText}`}
                      accessibilityState={{ disabled: deleting }}
                      disabled={deleting}
                      onPress={retireTemplate}
                      style={[styles.retireConfirmButton, deleting && styles.disabled]}
                    >
                      <Text style={styles.retireConfirmButtonText}>
                        {deleting ? "Retiring..." : "Confirm retirement"}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}
            </View>
          );
        }}
      />
    </ScreenBoundary>
  );
}

export function createFacilitySopLibraryStyles(palette: ThemePalette) {
  return StyleSheet.create({
    container: { padding: 16, paddingBottom: 48 },
    header: { gap: 10 },
    h1: { color: palette.text, fontSize: 26, fontWeight: "900" },
    h2: { color: palette.text, fontSize: 19, fontWeight: "900", marginTop: 8 },
    h3: { color: palette.text, fontSize: 16, fontWeight: "900", marginTop: 4 },
    lead: { color: palette.textMuted, fontWeight: "700", lineHeight: 21 },
    sub: { color: palette.textMuted, fontWeight: "700", lineHeight: 19 },
    starterRow: { gap: 10, paddingVertical: 4, paddingRight: 16 },
    starterCard: {
      width: 280,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      padding: 12,
      gap: 7,
      backgroundColor: palette.card
    },
    starterTitle: { color: palette.text, fontSize: 16, fontWeight: "900" },
    starterMeta: { color: palette.success, fontSize: 12, fontWeight: "900" },
    starterBody: { color: palette.textMuted, lineHeight: 18, minHeight: 72 },
    editorCard: {
      borderWidth: 1,
      borderColor: palette.borderSoft,
      borderRadius: radius.card,
      padding: 14,
      gap: 9,
      backgroundColor: palette.surfaceMuted
    },
    editorHeadingRow: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: 10,
      justifyContent: "space-between"
    },
    flex: { flex: 1 },
    label: { color: palette.text, fontWeight: "900", marginTop: 4 },
    help: { color: palette.textMuted, fontSize: 12, fontWeight: "700" },
    input: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      padding: 10,
      backgroundColor: palette.surface,
      color: palette.text
    },
    stepsInput: { minHeight: 180, textAlignVertical: "top" },
    notesInput: { minHeight: 90, textAlignVertical: "top" },
    count: { color: palette.success, fontSize: 12, fontWeight: "900" },
    choiceRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
    choice: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.pill,
      paddingHorizontal: 10,
      paddingVertical: 7,
      backgroundColor: palette.surface
    },
    choiceSelected: { borderColor: palette.accent, backgroundColor: palette.accentSoft },
    choiceText: { color: palette.textMuted, fontSize: 12, fontWeight: "800" },
    choiceTextSelected: { color: palette.link },
    primaryButton: {
      alignItems: "center",
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      padding: 12
    },
    primaryButtonText: { color: palette.accentText, fontWeight: "900" },
    secondaryButton: {
      alignItems: "center",
      alignSelf: "flex-start",
      borderWidth: 1,
      borderColor: palette.accent,
      borderRadius: radius.card,
      paddingHorizontal: 11,
      paddingVertical: 8,
      backgroundColor: palette.surface
    },
    secondaryButtonText: { color: palette.link, fontWeight: "900" },
    textButton: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      paddingHorizontal: 10,
      paddingVertical: 7,
      backgroundColor: palette.surface
    },
    textButtonText: { color: palette.text, fontWeight: "900" },
    retireButton: {
      borderWidth: 1,
      borderColor: palette.danger,
      borderRadius: radius.card,
      paddingHorizontal: 10,
      paddingVertical: 7,
      backgroundColor: palette.surface
    },
    retireButtonText: { color: palette.danger, fontWeight: "900" },
    retireConfirm: {
      borderWidth: 1,
      borderColor: palette.danger,
      borderRadius: radius.card,
      padding: 11,
      gap: 8,
      backgroundColor: palette.surfaceMuted
    },
    retireTitle: { color: palette.danger, fontWeight: "900" },
    retireCopy: { color: palette.textMuted, fontWeight: "700", lineHeight: 19 },
    retireConfirmButton: {
      borderRadius: radius.card,
      paddingHorizontal: 10,
      paddingVertical: 8,
      backgroundColor: palette.danger
    },
    retireConfirmButtonText: { color: palette.accentText, fontWeight: "900" },
    disabled: { opacity: 0.45 },
    reviewRow: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: 10,
      paddingVertical: 6
    },
    checkbox: {
      alignItems: "center",
      borderWidth: 2,
      borderColor: palette.border,
      borderRadius: 4,
      height: 22,
      justifyContent: "center",
      width: 22,
      backgroundColor: palette.surface
    },
    checkboxSelected: { borderColor: palette.accent, backgroundColor: palette.accent },
    checkmark: { color: palette.accentText, fontWeight: "900" },
    reviewText: { color: palette.textMuted, flex: 1, fontWeight: "700", lineHeight: 19 },
    documentRow: {
      alignItems: "center",
      borderWidth: 1,
      borderColor: palette.borderSoft,
      borderRadius: radius.card,
      flexDirection: "row",
      gap: 8,
      justifyContent: "space-between",
      padding: 9,
      backgroundColor: palette.surfaceMuted
    },
    documentLink: { flex: 1 },
    documentLinkText: { color: palette.link, fontWeight: "900" },
    pendingDocument: { color: palette.text, flex: 1, fontWeight: "800" },
    removeButton: { padding: 6 },
    removeButtonText: { color: palette.danger, fontSize: 12, fontWeight: "900" },
    readOnlyCard: {
      borderWidth: 1,
      borderColor: palette.borderSoft,
      borderRadius: radius.card,
      padding: 12,
      gap: 5,
      backgroundColor: palette.surfaceMuted
    },
    readOnlyTitle: { color: palette.link, fontWeight: "900" },
    message: {
      borderRadius: radius.card,
      color: palette.text,
      fontWeight: "800",
      padding: 10,
      backgroundColor: palette.surfaceMuted
    },
    empty: { color: palette.textMuted, fontWeight: "700", paddingVertical: 18 },
    savedCard: {
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      padding: 12,
      backgroundColor: palette.card,
      marginTop: 10,
      gap: 8
    },
    savedHeading: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: 8,
      justifyContent: "space-between"
    },
    savedTitle: { color: palette.text, fontSize: 17, fontWeight: "900" },
    savedMeta: {
      color: palette.textMuted,
      fontSize: 12,
      fontWeight: "800",
      marginTop: 2
    },
    starterBadge: {
      borderRadius: radius.pill,
      color: palette.success,
      fontSize: 11,
      fontWeight: "900",
      overflow: "hidden",
      paddingHorizontal: 8,
      paddingVertical: 4,
      backgroundColor: palette.accentSoft
    },
    savedBody: { color: palette.textMuted, lineHeight: 19 },
    safetySummary: { color: palette.warning, fontSize: 12, fontWeight: "800" },
    savedDocumentLink: {
      alignSelf: "flex-start",
      borderRadius: radius.card,
      paddingVertical: 5
    },
    savedActions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    startLink: {
      color: palette.accentText,
      fontWeight: "900",
      overflow: "hidden",
      borderRadius: radius.card,
      paddingHorizontal: 10,
      paddingVertical: 8,
      backgroundColor: palette.accent
    }
  });
}
