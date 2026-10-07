import React, { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { useAuth } from "@/auth/AuthContext";
import { useAppTheme } from "@/theme/appTheme";
import { ApiError } from "@/api/apiRequest";
import {
  findFacilityDocument,
  getFacilityDocument,
  listRecentFacilityDocuments,
  getDocumentUploadPolicy,
  DOCUMENT_FORMATS,
  promoteFacilityDocument,
  uploadFacilityDocument,
  validateFacilityDocumentInput,
  newDocumentRequestKey,
  type DocumentStatus,
  type DocumentUploadPolicy,
  type RecentDocument
} from "@/api/facilityDocuments";

type Props = {
  facilityId: string;
  contextId: string;
  disabled?: boolean;
  permissionGranted?: boolean;
  attachmentKind?: "lesson" | "course";
  onReady: (
    url: string,
    file?: { name: string; size?: number; mimeType?: string }
  ) => void;
  onBusy: (busy: boolean) => void;
};
export default function FacilityLessonDocument(props: Props) {
  const auth = useAuth();
  // A context change remounts the state machine and aborts its requests. Tokens
  // are used only in memory; never rendered, logged or persisted as an upload key.
  if (!auth.token || auth.isHydrating || auth.meStatus !== "ready") return null;
  return (
    <DocumentControl
      key={JSON.stringify([
        props.facilityId,
        props.contextId,
        auth.user?.id || auth.user?._id,
        auth.token,
        props.permissionGranted
      ])}
      {...props}
      bearer={auth.token}
    />
  );
}
function DocumentControl({
  facilityId,
  disabled,
  attachmentKind = "lesson",
  onReady,
  onBusy,
  bearer
}: Props & { bearer: string }) {
  const { palette } = useAppTheme();
  const [policy, setPolicy] = useState<DocumentUploadPolicy | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("Checking document availability…");
  const [key, setKey] = useState(""),
    [record, setRecord] = useState<DocumentStatus | null>(null);
  const [resumeId, setResumeId] = useState("");
  const [recent, setRecent] = useState<RecentDocument[] | null>(null);
  const hasAttempt = Boolean(key || resumeId);
  const enabled = Boolean(policy);
  const formats = Object.entries(DOCUMENT_FORMATS)
    .filter(([mime]) => policy?.mimeTypes.includes(mime))
    .map(([, extension]) => extension.toUpperCase())
    .join(", ");
  const alive = useRef(true),
    lock = useRef(false),
    controller = useRef(new AbortController());
  const callbacks = useRef({ onReady, onBusy });
  const selectedFile = useRef<
    { name: string; size?: number; mimeType?: string } | undefined
  >(undefined);
  callbacks.current = { onReady, onBusy };
  async function operation(work: (signal: AbortSignal) => Promise<void>) {
    if (lock.current || disabled || !alive.current) return;
    const signal = controller.current.signal;
    lock.current = true;
    setBusy(true);
    callbacks.current.onBusy(true);
    try {
      await work(signal);
    } catch {
      if (alive.current && !signal.aborted)
        setMessage(
          "Document verification is unavailable. Use the check button below before retrying. Existing lesson content is unchanged."
        );
    } finally {
      if (alive.current && !signal.aborted) {
        lock.current = false;
        setBusy(false);
        callbacks.current.onBusy(false);
      }
    }
  }
  function accept(next: DocumentStatus, signal: AbortSignal) {
    if (!alive.current || signal.aborted) return;
    setRecord(next);
    if (next.status === "active" && next.url) {
      callbacks.current.onReady(next.url, selectedFile.current);
      setMessage(
        `Document verified and selected: ${selectedFile.current?.name || "selected file"}. Save the ${attachmentKind} to attach it. This does not publish the course.`
      );
    } else
      setMessage(
        next.status === "held" || next.status === "released"
          ? "This document cannot be attached. It remains unavailable; ask an administrator to review it."
          : "Document received privately. Scanning is still pending. Check document status before attaching it."
      );
  }
  async function availability() {
    await operation(async (signal) => {
      const ready = await getDocumentUploadPolicy(facilityId, bearer, signal);
      if (!alive.current || signal.aborted) return;
      setPolicy(ready);
      setMessage(
        ready
          ? "Choose a supported document up to 10 MB. It uploads privately now, then needs a completed scan before you can attach it."
          : "Facility document uploads are temporarily unavailable until secure file scanning is enabled. Existing documents are preserved."
      );
    });
  }
  useEffect(() => {
    alive.current = true;
    controller.current = new AbortController();
    lock.current = false;
    void availability();
    return () => {
      alive.current = false;
      controller.current.abort();
      callbacks.current.onBusy(false);
    };
    // The parent remounts this control for every identity/permission change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Identity is the keyed component lifetime.
  async function choose() {
    if (!policy || hasAttempt) return;
    await operation(async (signal) => {
      const picked = await DocumentPicker.getDocumentAsync({
        type: policy.mimeTypes,
        multiple: false,
        copyToCacheDirectory: true
      });
      if (!alive.current || signal.aborted || picked.canceled || !picked.assets?.[0])
        return;
      const asset = picked.assets[0];
      let mimeType;
      try {
        mimeType = validateFacilityDocumentInput(asset, policy.mimeTypes);
      } catch {
        if (alive.current)
          setMessage(
            `Choose ${formats} of 10 MB or less with its original file extension and matching type. No upload was started.`
          );
        return;
      }
      // Keep one attempt key even after an ambiguous response. Check by key reads
      // the existing reservation; it never resends file bytes or creates a new one.
      const attemptKey = newDocumentRequestKey();
      selectedFile.current = {
        name: asset.name,
        size: asset.size,
        mimeType
      };
      setKey(attemptKey);
      setMessage("Uploading document privately…");
      try {
        accept(
          await uploadFacilityDocument(
            facilityId,
            asset,
            attemptKey,
            bearer,
            signal,
            policy.mimeTypes
          ),
          signal
        );
      } catch (error) {
        if (error instanceof ApiError && error.code === "DOCUMENT_FILE_REJECTED") {
          if (!alive.current || signal.aborted) return;
          // Only this explicit server pre-reservation rejection permits a new
          // file choice. Lost replies retain the original correlation key.
          setKey("");
          selectedFile.current = undefined;
          setMessage(
            "This file is invalid or uses unsupported content. No attachment was selected. Office files with macros, external links, embedded objects or unsupported formulas are rejected. Choose another supported file; the original was not rewritten."
          );
          return;
        }
        throw error;
      }
    });
  }
  async function check() {
    if (!hasAttempt) return;
    await operation(async (signal) => {
      const current = resumeId
        ? await getFacilityDocument(facilityId, resumeId, bearer, signal)
        : await findFacilityDocument(facilityId, key, bearer, signal);
      if (!alive.current || signal.aborted) return;
      if (["active", "held", "released"].includes(current.status))
        return accept(current, signal);
      accept(
        await promoteFacilityDocument(facilityId, current.assetId, bearer, signal),
        signal
      );
    });
  }
  async function showRecent() {
    if (!enabled || hasAttempt) return;
    await operation(async (signal) => {
      const items = await listRecentFacilityDocuments(facilityId, bearer, signal);
      if (!alive.current || signal.aborted) return;
      setRecent(items);
      setMessage(
        items.length
          ? "Up to 10 of your most recent document uploads are shown below. Select one to recheck it; nothing is attached automatically."
          : "No previous document uploads were found for your account in this Facility."
      );
    });
  }
  async function resume(item: RecentDocument) {
    if (hasAttempt) return;
    await operation(async (signal) => {
      // Record the selected identity before I/O, retaining it if the reply is lost.
      setResumeId(item.assetId);
      selectedFile.current = {
        name: item.filename,
        size: item.bytes,
        mimeType: item.mimeType
      };
      const current = await getFacilityDocument(facilityId, item.assetId, bearer, signal);
      if (!alive.current || signal.aborted) return;
      accept(current, signal);
    });
  }
  return (
    <View style={{ paddingVertical: 12, gap: 8 }}>
      <Text style={{ color: palette.text, fontWeight: "700" }}>
        {attachmentKind === "course" ? "Course documents" : "Lesson documents"}
      </Text>
      {enabled ? (
        <Text style={{ color: palette.textMuted }}>
          Supported here: {formats}. Maximum 10 MB per file.
          {policy?.mimeTypes.some((mime) => mime.includes("openxmlformats"))
            ? " Word and Excel support is restricted: no macros, external links, embedded objects or unsupported formulas. Some otherwise valid Office files will be rejected; files are never rewritten. Legacy DOC/XLS files are not accepted."
            : ""}
        </Text>
      ) : null}
      <Text accessibilityLiveRegion="polite" style={{ color: palette.textMuted }}>
        {message}
      </Text>
      {!hasAttempt ? (
        <Pressable
          accessibilityRole="button"
          disabled={busy || disabled}
          onPress={enabled ? choose : availability}
        >
          <Text style={{ color: palette.accent }}>
            {busy
              ? "Checking…"
              : enabled
                ? "Choose and scan document"
                : "Check document availability"}
          </Text>
        </Pressable>
      ) : (
        <Pressable
          accessibilityRole="button"
          disabled={busy || disabled || record?.status === "released"}
          onPress={check}
        >
          <Text style={{ color: palette.accent }}>
            {busy ? "Checking…" : "Check document status"}
          </Text>
        </Pressable>
      )}
      {enabled && !hasAttempt ? (
        <>
          <Pressable
            accessibilityRole="button"
            disabled={busy || disabled}
            onPress={showRecent}
          >
            <Text style={{ color: palette.accent }}>
              Recover a previous document upload
            </Text>
          </Pressable>
          {recent?.map((item) => (
            <Pressable
              key={item.assetId}
              accessibilityRole="button"
              disabled={busy || disabled}
              onPress={() => resume(item)}
            >
              <Text style={{ color: palette.accent }}>
                Recheck {item.filename} ·{" "}
                {item.createdAt
                  ? new Date(item.createdAt).toLocaleString()
                  : "date unavailable"}{" "}
                · {item.assetId.slice(-6)}
              </Text>
            </Pressable>
          ))}
        </>
      ) : null}
      {hasAttempt ? (
        <Text style={{ color: palette.textMuted }}>
          Leaving does not delete this upload. Reopen an editor in this Facility and
          choose “Recover a previous document upload” using the same account.
        </Text>
      ) : null}
    </View>
  );
}
