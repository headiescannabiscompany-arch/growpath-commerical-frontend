import * as DocumentPicker from "expo-document-picker";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import {
  cancelBusinessDeskAttachment,
  completeBusinessDeskAttachment,
  getBusinessDeskAttachment,
  prepareBusinessDeskAttachmentDownload,
  reserveBusinessDeskAttachment,
  uploadBusinessDeskAttachmentBytes,
  type BusinessDeskAttachment,
  type BusinessDeskAttachmentPacket,
  type BusinessDeskAttachmentPurpose,
  type BusinessDeskAttachmentQuota,
  type BusinessDeskSelectedFile
} from "@/api/businessDeskAttachments";
import type { BusinessDeskWorkspace } from "@/api/businessDesk";
import { newBusinessDeskOperationKey } from "@/features/businessDesk/recordWorkflow";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

const ACCEPTED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf"
] as const;
const ACCEPTED_MIME_TYPE_SET = new Set<string>(ACCEPTED_MIME_TYPES);
const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const PDF_MAX_BYTES = 10 * 1024 * 1024;

type EntryBusyState =
  | "loading"
  | "reserving"
  | "uploading"
  | "checking"
  | "canceling"
  | "downloading"
  | null;

type AttachmentEntry = {
  localKey: string;
  id: string | null;
  source: "saved" | "new";
  included: boolean;
  attachment: BusinessDeskAttachment | null;
  file: BusinessDeskSelectedFile | null;
  reserveKey: string | null;
  completeKeys: Record<string, string>;
  cancelKey: string | null;
  busy: EntryBusyState;
  progress: number;
  error: string;
  retry: "upload" | "complete" | "status" | null;
  cleanupPending: boolean;
};

type ProtectedAttachmentFieldProps = {
  workspace: BusinessDeskWorkspace;
  purpose: BusinessDeskAttachmentPurpose;
  maxCount: number;
  attachmentIds: string[];
  title: string;
  hint: string;
  onChange: (attachmentIds: string[]) => void;
  onReadyAttachmentIdsChange?: (attachmentIds: string[]) => void;
  onUserEdit?: () => void;
  onBlockingChange?: (blocked: boolean) => void;
};

function uniqueIds(values: string[]) {
  const seen = new Set<string>();
  return values.reduce<string[]>((result, value) => {
    const id = String(value || "").trim();
    if (id && !seen.has(id)) {
      seen.add(id);
      result.push(id);
    }
    return result;
  }, []);
}

function savedEntry(id: string): AttachmentEntry {
  return {
    localKey: `saved:${id}`,
    id,
    source: "saved",
    included: true,
    attachment: null,
    file: null,
    reserveKey: null,
    completeKeys: {},
    cancelKey: null,
    busy: "loading",
    progress: 0,
    error: "",
    retry: null,
    cleanupPending: false
  };
}

function formatBytes(value: number) {
  if (value >= 1024 ** 3) return `${(value / 1024 ** 3).toFixed(1)} GB`;
  if (value >= 1024 ** 2) return `${(value / 1024 ** 2).toFixed(1)} MB`;
  if (value >= 1024) return `${Math.round(value / 1024)} KB`;
  return `${value} B`;
}

function selectedFileFrom(asset: any): BusinessDeskSelectedFile {
  const filename = typeof asset?.name === "string" ? asset.name.trim() : "";
  const mimeType =
    typeof asset?.mimeType === "string" ? asset.mimeType.trim().toLowerCase() : "";
  const bytes = asset?.size;
  const uri = typeof asset?.uri === "string" ? asset.uri.trim() : "";
  if (!filename) {
    throw new Error("The selected file did not provide a filename. Choose it again.");
  }
  if (!ACCEPTED_MIME_TYPE_SET.has(mimeType)) {
    throw new Error("Choose a JPEG, PNG, WebP, or PDF with a known file type.");
  }
  if (!Number.isSafeInteger(bytes) || bytes <= 0) {
    throw new Error(
      "The selected file did not provide a trustworthy size. Choose another copy."
    );
  }
  if (!uri) {
    throw new Error("The selected file did not provide readable file data.");
  }
  const maxBytes = mimeType === "application/pdf" ? PDF_MAX_BYTES : IMAGE_MAX_BYTES;
  if (bytes > maxBytes) {
    throw new Error(
      `${mimeType === "application/pdf" ? "PDFs" : "Images"} must be ${formatBytes(
        maxBytes
      )} or smaller.`
    );
  }
  return {
    filename,
    mimeType,
    bytes,
    uri,
    ...(asset?.file ? { body: asset.file as Blob } : {})
  };
}

function lifecycleCopy(entry: AttachmentEntry) {
  if (entry.cleanupPending) {
    return "Cancellation was accepted. Protected-storage cleanup is still pending.";
  }
  if (entry.busy === "loading") return "Checking protected attachment status…";
  if (entry.busy === "reserving") return "Reserving private protected storage…";
  if (entry.busy === "uploading") {
    return `Uploading to protected storage: ${Math.round(entry.progress * 100)}%.`;
  }
  if (entry.busy === "checking") {
    return "Checking file type, structure, and security status…";
  }
  if (entry.busy === "canceling") return "Canceling this private upload…";
  if (entry.busy === "downloading") {
    return "Preparing an authorized five-minute download…";
  }
  if (!entry.attachment) {
    return entry.source === "saved"
      ? "Current status has not been verified. The saved reference is preserved."
      : "This selected file has not reached protected storage.";
  }
  switch (entry.attachment.lifecycle) {
    case "uploading":
      return "Protected storage is waiting for the file or completion check.";
    case "quarantined":
      return "Uploaded and quarantined while security checks finish. It cannot be saved with this record or downloaded yet.";
    case "ready":
      return entry.included
        ? "Security checks passed. This file is included in the current draft."
        : "Security checks passed. This file is not included in the current draft.";
    case "rejected":
      return "Security checks rejected this file. It cannot be used or downloaded.";
    case "deleted":
      return "This private upload was deleted.";
  }
}

function displayName(entry: AttachmentEntry) {
  return entry.attachment?.originalFilename || entry.file?.filename || "Saved attachment";
}

function ensurePurpose(
  packet: BusinessDeskAttachmentPacket,
  purpose: BusinessDeskAttachmentPurpose
) {
  if (packet.attachment.purpose !== purpose) {
    throw new Error("This attachment belongs to a different protected workflow.");
  }
  return packet;
}

export default function ProtectedAttachmentField({
  workspace,
  purpose,
  maxCount,
  attachmentIds,
  title,
  hint,
  onChange,
  onReadyAttachmentIdsChange,
  onUserEdit,
  onBlockingChange
}: ProtectedAttachmentFieldProps) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const facilityId = workspace.workspaceType === "facility" ? workspace.facilityId : "";
  const stableWorkspace = useMemo<BusinessDeskWorkspace>(
    () =>
      workspace.workspaceType === "facility"
        ? { workspaceType: "facility", facilityId }
        : { workspaceType: "commercial" },
    [facilityId, workspace.workspaceType]
  );
  const initialIds = useRef(uniqueIds(attachmentIds));
  const boundIds = useRef(initialIds.current);
  const callbacks = useRef({
    onChange,
    onReadyAttachmentIdsChange,
    onUserEdit,
    onBlockingChange
  });
  callbacks.current = {
    onChange,
    onReadyAttachmentIdsChange,
    onUserEdit,
    onBlockingChange
  };
  const [entries, setEntriesState] = useState<AttachmentEntry[]>(() =>
    initialIds.current.map(savedEntry)
  );
  const entriesRef = useRef(entries);
  const [quota, setQuota] = useState<BusinessDeskAttachmentQuota | null>(null);
  const [pickerError, setPickerError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [pickerBusy, setPickerBusy] = useState(false);
  const operationGeneration = useRef(new Map<string, number>());
  const controllers = useRef(new Map<string, AbortController>());
  const mounted = useRef(true);

  const setEntries = useCallback(
    (update: (current: AttachmentEntry[]) => AttachmentEntry[]) => {
      const next = update(entriesRef.current);
      entriesRef.current = next;
      setEntriesState(next);
    },
    []
  );

  const patchEntry = useCallback(
    (
      localKey: string,
      update: Partial<AttachmentEntry> | ((entry: AttachmentEntry) => AttachmentEntry),
      generation?: number
    ) => {
      if (
        generation !== undefined &&
        operationGeneration.current.get(localKey) !== generation
      ) {
        return;
      }
      setEntries((current) =>
        current.map((entry) => {
          if (entry.localKey !== localKey) return entry;
          return typeof update === "function" ? update(entry) : { ...entry, ...update };
        })
      );
    },
    [setEntries]
  );

  const beginOperation = useCallback((localKey: string) => {
    const generation = (operationGeneration.current.get(localKey) || 0) + 1;
    operationGeneration.current.set(localKey, generation);
    controllers.current.get(localKey)?.abort();
    const controller = new AbortController();
    controllers.current.set(localKey, controller);
    return { generation, controller };
  }, []);

  const isCurrent = useCallback(
    (localKey: string, generation: number) =>
      mounted.current && operationGeneration.current.get(localKey) === generation,
    []
  );

  const notifyBoundIds = useCallback((nextValues: string[], userEdit: boolean) => {
    const next = uniqueIds(nextValues);
    boundIds.current = next;
    callbacks.current.onChange(next);
    if (userEdit) callbacks.current.onUserEdit?.();
  }, []);

  const bindReady = useCallback(
    (entry: AttachmentEntry, attachment: BusinessDeskAttachment) => {
      if (
        attachment.lifecycle !== "ready" ||
        !entry.included ||
        boundIds.current.includes(attachment.id)
      ) {
        return;
      }
      notifyBoundIds([...boundIds.current, attachment.id], true);
    },
    [notifyBoundIds]
  );

  const applyPacket = useCallback(
    (
      localKey: string,
      packet: BusinessDeskAttachmentPacket,
      generation: number,
      retry: AttachmentEntry["retry"] = null
    ) => {
      ensurePurpose(packet, purpose);
      if (!isCurrent(localKey, generation)) return;
      setQuota(packet.quota);
      const current = entriesRef.current.find((entry) => entry.localKey === localKey);
      if (!current) return;
      const nextEntry = {
        ...current,
        id: packet.attachment.id,
        attachment: packet.attachment,
        busy: null,
        progress: packet.attachment.lifecycle === "ready" ? 1 : current.progress,
        error: "",
        retry,
        cleanupPending: Boolean(packet.cleanupPending)
      } satisfies AttachmentEntry;
      patchEntry(localKey, nextEntry, generation);
      bindReady(nextEntry, packet.attachment);
    },
    [bindReady, isCurrent, patchEntry, purpose]
  );

  useEffect(() => {
    mounted.current = true;
    const activeControllers = controllers.current;
    const ids = initialIds.current;
    ids.forEach((id) => {
      const localKey = `saved:${id}`;
      const { generation, controller } = beginOperation(localKey);
      void getBusinessDeskAttachment(stableWorkspace, id, {
        signal: controller.signal
      })
        .then((packet) => applyPacket(localKey, packet, generation))
        .catch((error) => {
          if (!isCurrent(localKey, generation)) return;
          patchEntry(
            localKey,
            {
              busy: null,
              error:
                error instanceof Error
                  ? error.message
                  : "The saved attachment status could not be checked.",
              retry: "status"
            },
            generation
          );
        });
    });
    return () => {
      mounted.current = false;
      activeControllers.forEach((controller) => controller.abort());
      activeControllers.clear();
    };
  }, [applyPacket, beginOperation, isCurrent, patchEntry, stableWorkspace]);

  const blocked = entries.some(
    (entry) =>
      entry.included && (!entry.attachment || entry.attachment.lifecycle !== "ready")
  );
  useEffect(() => {
    callbacks.current.onBlockingChange?.(blocked);
  }, [blocked]);

  const readyAttachmentIds = entries
    .filter(
      (entry) =>
        entry.included && entry.attachment?.lifecycle === "ready" && Boolean(entry.id)
    )
    .map((entry) => String(entry.id));
  const readyAttachmentSignature = readyAttachmentIds.join(":");
  useEffect(() => {
    const currentReadyIds = entriesRef.current
      .filter(
        (entry) =>
          entry.included && entry.attachment?.lifecycle === "ready" && Boolean(entry.id)
      )
      .map((entry) => String(entry.id));
    callbacks.current.onReadyAttachmentIdsChange?.(currentReadyIds);
  }, [readyAttachmentSignature]);

  const activeCount = entries.filter(
    (entry) => entry.included && entry.attachment?.lifecycle !== "deleted"
  ).length;

  const runUpload = async (localKey: string) => {
    const startingEntry = entriesRef.current.find((entry) => entry.localKey === localKey);
    if (!startingEntry?.file || !startingEntry.reserveKey) return;
    const { generation, controller } = beginOperation(localKey);
    let failureStage: AttachmentEntry["retry"] = "upload";
    patchEntry(
      localKey,
      { busy: "reserving", error: "", retry: null, cleanupPending: false },
      generation
    );
    try {
      const reservation = await reserveBusinessDeskAttachment(
        stableWorkspace,
        {
          purpose,
          filename: startingEntry.file.filename,
          declaredMimeType: startingEntry.file.mimeType,
          expectedBytes: startingEntry.file.bytes,
          idempotencyKey: startingEntry.reserveKey
        },
        { signal: controller.signal }
      );
      ensurePurpose(reservation, purpose);
      if (!isCurrent(localKey, generation)) return;
      setQuota(reservation.quota);
      patchEntry(
        localKey,
        {
          id: reservation.attachment.id,
          attachment: reservation.attachment,
          busy: reservation.attachment.lifecycle === "uploading" ? "uploading" : null,
          progress: 0,
          error: ""
        },
        generation
      );
      if (reservation.attachment.lifecycle !== "uploading") {
        applyPacket(
          localKey,
          reservation,
          generation,
          reservation.attachment.lifecycle === "quarantined" ? "complete" : null
        );
        return;
      }
      await uploadBusinessDeskAttachmentBytes(reservation, startingEntry.file, {
        signal: controller.signal,
        onProgress: (progress) =>
          patchEntry(localKey, { busy: "uploading", progress }, generation)
      });
      if (!isCurrent(localKey, generation)) return;
      failureStage = "complete";
      const versionKey = String(reservation.attachment.version);
      const latest = entriesRef.current.find((entry) => entry.localKey === localKey);
      const completeKey =
        latest?.completeKeys[versionKey] ||
        newBusinessDeskOperationKey(`${purpose}-complete`);
      patchEntry(
        localKey,
        (entry) => ({
          ...entry,
          busy: "checking",
          progress: 1,
          completeKeys: { ...entry.completeKeys, [versionKey]: completeKey }
        }),
        generation
      );
      const completed = await completeBusinessDeskAttachment(
        stableWorkspace,
        reservation.attachment.id,
        {
          expectedVersion: reservation.attachment.version,
          idempotencyKey: completeKey
        },
        { signal: controller.signal }
      );
      applyPacket(
        localKey,
        completed,
        generation,
        completed.attachment.lifecycle === "quarantined" ? "complete" : null
      );
      if (completed.attachment.lifecycle === "ready") {
        setFeedback(`${completed.attachment.originalFilename} passed security checks.`);
      }
    } catch (error) {
      if (!isCurrent(localKey, generation)) return;
      patchEntry(
        localKey,
        {
          busy: null,
          error:
            error instanceof Error
              ? error.message
              : "The protected upload could not be completed.",
          retry: failureStage
        },
        generation
      );
    } finally {
      if (controllers.current.get(localKey) === controller) {
        controllers.current.delete(localKey);
      }
    }
  };

  const pickFile = async () => {
    if (pickerBusy || activeCount >= maxCount) return;
    setPickerBusy(true);
    setPickerError("");
    setFeedback("");
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [...ACCEPTED_MIME_TYPES],
        multiple: false,
        copyToCacheDirectory: true
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset) throw new Error("The selected file could not be opened.");
      const file = selectedFileFrom(asset);
      const localKey = `new:${newBusinessDeskOperationKey(purpose)}`;
      const entry: AttachmentEntry = {
        localKey,
        id: null,
        source: "new",
        included: true,
        attachment: null,
        file,
        reserveKey: newBusinessDeskOperationKey(`${purpose}-reserve`),
        completeKeys: {},
        cancelKey: null,
        busy: null,
        progress: 0,
        error: "",
        retry: null,
        cleanupPending: false
      };
      setEntries((current) => [...current, entry]);
      callbacks.current.onUserEdit?.();
      await runUpload(localKey);
    } catch (error) {
      setPickerError(
        error instanceof Error ? error.message : "The selected file could not be opened."
      );
    } finally {
      if (mounted.current) setPickerBusy(false);
    }
  };

  const refreshStatus = async (localKey: string) => {
    const entry = entriesRef.current.find((candidate) => candidate.localKey === localKey);
    if (!entry?.id) return;
    const { generation, controller } = beginOperation(localKey);
    patchEntry(localKey, { busy: "loading", error: "", retry: null }, generation);
    try {
      const packet = await getBusinessDeskAttachment(stableWorkspace, entry.id, {
        signal: controller.signal
      });
      applyPacket(
        localKey,
        packet,
        generation,
        packet.attachment.lifecycle === "quarantined" ? "complete" : null
      );
    } catch (error) {
      if (!isCurrent(localKey, generation)) return;
      patchEntry(
        localKey,
        {
          busy: null,
          error:
            error instanceof Error
              ? error.message
              : "The protected attachment status could not be checked.",
          retry: "status"
        },
        generation
      );
    }
  };

  const retryCompletion = async (localKey: string) => {
    const entry = entriesRef.current.find((candidate) => candidate.localKey === localKey);
    if (!entry?.id || !entry.attachment) return;
    const { generation, controller } = beginOperation(localKey);
    const versionKey = String(entry.attachment.version);
    const completeKey =
      entry.completeKeys[versionKey] ||
      newBusinessDeskOperationKey(`${purpose}-complete`);
    patchEntry(
      localKey,
      (current) => ({
        ...current,
        busy: "checking",
        error: "",
        retry: null,
        completeKeys: { ...current.completeKeys, [versionKey]: completeKey }
      }),
      generation
    );
    try {
      const packet = await completeBusinessDeskAttachment(
        stableWorkspace,
        entry.id,
        { expectedVersion: entry.attachment.version, idempotencyKey: completeKey },
        { signal: controller.signal }
      );
      applyPacket(
        localKey,
        packet,
        generation,
        packet.attachment.lifecycle === "quarantined" ? "complete" : null
      );
    } catch (error) {
      if (!isCurrent(localKey, generation)) return;
      patchEntry(
        localKey,
        {
          busy: null,
          error:
            error instanceof Error
              ? error.message
              : "The protected attachment check could not be retried.",
          retry: "complete"
        },
        generation
      );
    }
  };

  const removeFromDraft = (localKey: string) => {
    const entry = entriesRef.current.find((candidate) => candidate.localKey === localKey);
    if (!entry) return;
    patchEntry(localKey, { included: false });
    if (entry.id && boundIds.current.includes(entry.id)) {
      notifyBoundIds(
        boundIds.current.filter((id) => id !== entry.id),
        true
      );
    } else {
      callbacks.current.onUserEdit?.();
    }
  };

  const restoreToDraft = (localKey: string) => {
    const entry = entriesRef.current.find((candidate) => candidate.localKey === localKey);
    if (!entry?.attachment || entry.attachment.lifecycle !== "ready") return;
    if (boundIds.current.length >= maxCount) {
      patchEntry(localKey, {
        error: `This record allows ${maxCount} protected attachment${
          maxCount === 1 ? "" : "s"
        }.`
      });
      return;
    }
    patchEntry(localKey, { included: true, error: "" });
    notifyBoundIds([...boundIds.current, entry.attachment.id], true);
  };

  const cancelEntry = async (localKey: string) => {
    operationGeneration.current.set(
      localKey,
      (operationGeneration.current.get(localKey) || 0) + 1
    );
    controllers.current.get(localKey)?.abort();
    const entry = entriesRef.current.find((candidate) => candidate.localKey === localKey);
    if (!entry) return;
    callbacks.current.onUserEdit?.();
    if (!entry.id || !entry.attachment) {
      setEntries((current) =>
        current.filter((candidate) => candidate.localKey !== localKey)
      );
      return;
    }
    if (entry.attachment.confirmedAt) {
      patchEntry(localKey, {
        error:
          "A saved attachment cannot be canceled. Remove it from a new draft instead."
      });
      return;
    }
    const { generation, controller } = beginOperation(localKey);
    const cancelKey = entry.cancelKey || newBusinessDeskOperationKey(`${purpose}-cancel`);
    patchEntry(
      localKey,
      { busy: "canceling", error: "", retry: null, cancelKey },
      generation
    );
    try {
      const packet = await cancelBusinessDeskAttachment(
        stableWorkspace,
        entry.id,
        {
          expectedVersion: entry.attachment.version,
          idempotencyKey: cancelKey
        },
        { signal: controller.signal }
      );
      ensurePurpose(packet, purpose);
      if (!isCurrent(localKey, generation)) return;
      setQuota(packet.quota);
      if (boundIds.current.includes(entry.id)) {
        notifyBoundIds(
          boundIds.current.filter((id) => id !== entry.id),
          false
        );
      }
      patchEntry(
        localKey,
        {
          included: false,
          attachment: packet.attachment,
          busy: null,
          error: "",
          retry: null,
          cleanupPending: Boolean(packet.cleanupPending)
        },
        generation
      );
    } catch (error) {
      if (!isCurrent(localKey, generation)) return;
      patchEntry(
        localKey,
        {
          busy: null,
          error:
            error instanceof Error
              ? error.message
              : "The private upload could not be canceled."
        },
        generation
      );
    }
  };

  const downloadEntry = async (localKey: string) => {
    const entry = entriesRef.current.find((candidate) => candidate.localKey === localKey);
    if (!entry?.id || entry.attachment?.lifecycle !== "ready") return;
    const { generation, controller } = beginOperation(localKey);
    patchEntry(localKey, { busy: "downloading", error: "" }, generation);
    try {
      const packet = await prepareBusinessDeskAttachmentDownload(
        stableWorkspace,
        entry.id,
        { signal: controller.signal }
      );
      if (packet.attachment.purpose !== purpose) {
        throw new Error("This attachment belongs to a different protected workflow.");
      }
      await Linking.openURL(packet.download.url);
      if (!isCurrent(localKey, generation)) return;
      patchEntry(localKey, { attachment: packet.attachment, busy: null }, generation);
      setFeedback(
        "The authorized five-minute download was opened. GrowPathAI cannot confirm file delivery."
      );
    } catch (error) {
      if (!isCurrent(localKey, generation)) return;
      patchEntry(
        localKey,
        {
          busy: null,
          error:
            error instanceof Error
              ? error.message
              : "The protected download could not be opened."
        },
        generation
      );
    }
  };

  return (
    <View style={styles.field}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.hint}>{hint}</Text>
      <Text style={styles.policy}>
        JPEG, PNG, and WebP images up to 5 MB; PDFs up to 10 MB. Files stay private to
        this workspace and must pass server security checks before use.
      </Text>
      {quota ? (
        <Text style={styles.quota}>
          Protected storage: {formatBytes(quota.remainingBytes)} remaining of{" "}
          {formatBytes(quota.limitBytes)}.
        </Text>
      ) : null}
      <View style={styles.stack}>
        {entries.map((entry) => {
          const name = displayName(entry);
          const ready = entry.attachment?.lifecycle === "ready";
          const canCancel = Boolean(
            entry.source === "new" &&
            !entry.attachment?.confirmedAt &&
            entry.attachment?.lifecycle !== "deleted"
          );
          return (
            <View key={entry.localKey} style={styles.entry}>
              <View style={styles.entryHeader}>
                <Text style={styles.filename}>{name}</Text>
                <Text style={styles.lifecycle}>
                  {entry.attachment?.lifecycle?.replace(/_/g, " ") ||
                    (entry.busy ? entry.busy.replace(/_/g, " ") : "not verified")}
                </Text>
              </View>
              <Text accessibilityLiveRegion="polite" style={styles.status}>
                {lifecycleCopy(entry)}
              </Text>
              {entry.error ? (
                <Text accessibilityLiveRegion="assertive" style={styles.error}>
                  {entry.source === "saved" && !entry.attachment
                    ? `${entry.error} The saved reference remains in this draft until you explicitly remove it.`
                    : entry.error}
                </Text>
              ) : null}
              <View style={styles.actions}>
                {entry.retry === "upload" ? (
                  <ActionButton
                    label={`Retry upload ${name}`}
                    text="Retry upload"
                    onPress={() => void runUpload(entry.localKey)}
                    styles={styles}
                  />
                ) : null}
                {entry.retry === "complete" ? (
                  <ActionButton
                    label={`Retry secure check ${name}`}
                    text="Retry secure check"
                    onPress={() => void retryCompletion(entry.localKey)}
                    styles={styles}
                  />
                ) : null}
                {entry.retry === "status" || entry.attachment ? (
                  <ActionButton
                    label={`Refresh status ${name}`}
                    text="Refresh status"
                    disabled={Boolean(entry.busy)}
                    onPress={() => void refreshStatus(entry.localKey)}
                    styles={styles}
                  />
                ) : null}
                {ready ? (
                  <ActionButton
                    label={`Download ${name}`}
                    text="Download (5-minute link)"
                    disabled={Boolean(entry.busy)}
                    onPress={() => void downloadEntry(entry.localKey)}
                    styles={styles}
                  />
                ) : null}
                {entry.included && !entry.busy ? (
                  <ActionButton
                    label={`Remove ${name} from current draft`}
                    text="Remove from current draft"
                    onPress={() => removeFromDraft(entry.localKey)}
                    styles={styles}
                  />
                ) : !entry.included && ready ? (
                  <ActionButton
                    label={`Restore ${name} to current draft`}
                    text="Restore to current draft"
                    onPress={() => restoreToDraft(entry.localKey)}
                    styles={styles}
                  />
                ) : null}
                {canCancel ? (
                  <ActionButton
                    label={`Cancel ${name}`}
                    text={entry.busy ? "Cancel upload" : "Cancel and delete upload"}
                    onPress={() => void cancelEntry(entry.localKey)}
                    danger
                    styles={styles}
                  />
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Add ${purpose === "expense_receipt" ? "expense receipt" : "job"} attachment`}
        accessibilityState={{
          disabled: pickerBusy || activeCount >= maxCount,
          busy: pickerBusy
        }}
        disabled={pickerBusy || activeCount >= maxCount}
        onPress={() => void pickFile()}
        style={[
          styles.addButton,
          (pickerBusy || activeCount >= maxCount) && styles.disabled
        ]}
      >
        <Text style={styles.addButtonText}>
          {pickerBusy
            ? "Opening file picker…"
            : `Add protected ${purpose === "expense_receipt" ? "receipt" : "attachment"}`}
        </Text>
      </Pressable>
      <Text style={styles.count}>
        {activeCount} of {maxCount} selected for this record.
      </Text>
      {pickerError ? (
        <Text accessibilityLiveRegion="assertive" style={styles.error}>
          {pickerError}
        </Text>
      ) : null}
      {feedback ? (
        <Text accessibilityLiveRegion="polite" style={styles.feedback}>
          {feedback}
        </Text>
      ) : null}
    </View>
  );
}

function ActionButton({
  label,
  text,
  onPress,
  styles,
  disabled = false,
  danger = false
}: {
  label: string;
  text: string;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.actionButton,
        danger && styles.dangerButton,
        disabled && styles.disabled
      ]}
    >
      <Text style={[styles.actionButtonText, danger && styles.dangerButtonText]}>
        {text}
      </Text>
    </Pressable>
  );
}

function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    actionButton: {
      alignItems: "center",
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      justifyContent: "center",
      minHeight: 40,
      paddingHorizontal: 11,
      paddingVertical: 8
    },
    actionButtonText: { color: palette.text, fontSize: 12, fontWeight: "900" },
    actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    addButton: {
      alignItems: "center",
      alignSelf: "flex-start",
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      justifyContent: "center",
      minHeight: 44,
      paddingHorizontal: 14,
      paddingVertical: 9
    },
    addButtonText: { color: palette.accentText, fontSize: 13, fontWeight: "900" },
    count: { color: palette.textMuted, fontSize: 12 },
    dangerButton: { borderColor: palette.danger },
    dangerButtonText: { color: palette.danger },
    disabled: { opacity: 0.55 },
    entry: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 8,
      padding: 12
    },
    entryHeader: {
      alignItems: "center",
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      justifyContent: "space-between"
    },
    error: { color: palette.danger, fontSize: 12, fontWeight: "800", lineHeight: 17 },
    feedback: {
      color: palette.success,
      fontSize: 12,
      fontWeight: "800",
      lineHeight: 17
    },
    field: { gap: 10 },
    filename: { color: palette.text, flexShrink: 1, fontSize: 13, fontWeight: "900" },
    hint: { color: palette.textMuted, fontSize: 13, lineHeight: 18 },
    lifecycle: {
      color: palette.accent,
      fontSize: 11,
      fontWeight: "900",
      textTransform: "uppercase"
    },
    policy: { color: palette.textMuted, fontSize: 12, lineHeight: 17 },
    quota: { color: palette.text, fontSize: 12, fontWeight: "800" },
    stack: { gap: 10 },
    status: { color: palette.textMuted, fontSize: 12, lineHeight: 17 },
    title: { color: palette.text, fontSize: 14, fontWeight: "900" }
  });
}

export const _test = { selectedFileFrom, uniqueIds };
