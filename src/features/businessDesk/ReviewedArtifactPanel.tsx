import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { businessDeskWorkspaceKey, type BusinessDeskWorkspace } from "@/api/businessDesk";
import {
  prepareBusinessDeskArtifact,
  previewBusinessDeskArtifact,
  type BusinessDeskArtifactKind,
  type BusinessDeskArtifactPreview,
  type BusinessDeskArtifactRedactionProfile,
  type BusinessDeskArtifactRevisionSelection
} from "@/api/businessDeskArtifacts";
import AppCard from "@/components/layout/AppCard";
import { newBusinessDeskOperationKey } from "@/features/businessDesk/recordWorkflow";
import {
  resolveBusinessDeskRetryIdentity,
  type BusinessDeskRetryIdentity
} from "@/features/businessDesk/operationRetry";
import {
  handoffReviewedBusinessDeskArtifact,
  reviewedArtifactOutcomeMessage
} from "@/features/businessDesk/reviewedArtifactHandoff";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

export type ReviewedArtifactPanelProps = {
  workspace: BusinessDeskWorkspace;
  artifactKind: BusinessDeskArtifactKind;
  revisionSelections: BusinessDeskArtifactRevisionSelection[];
  expectedRedactionProfile: BusinessDeskArtifactRedactionProfile;
  title: string;
  disclosure: string;
  selectionLabel: string;
  previewButtonLabel?: string;
  prepareButtonLabel?: string;
  disabled?: boolean;
  disabledReason?: string;
  contextNotice?: string;
  stalenessKey?: string;
};

type ScopedPreview = {
  scope: string;
  value: BusinessDeskArtifactPreview;
};

function selectionSignature(selections: BusinessDeskArtifactRevisionSelection[]) {
  return JSON.stringify(
    selections.map((selection) => ({
      recordId: String(selection.recordId || ""),
      revisionNumber: Number(selection.revisionNumber)
    }))
  );
}

function defaultPrepareLabel(kind: BusinessDeskArtifactKind) {
  return kind === "quote_copy"
    ? "Confirm and copy exact preview"
    : "Confirm and export exact preview";
}

export default function ReviewedArtifactPanel({
  workspace,
  artifactKind,
  revisionSelections,
  expectedRedactionProfile,
  title,
  disclosure,
  selectionLabel,
  previewButtonLabel = "Preview exact artifact",
  prepareButtonLabel = defaultPrepareLabel(artifactKind),
  disabled = false,
  disabledReason,
  contextNotice,
  stalenessKey = ""
}: ReviewedArtifactPanelProps) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const workspaceKey = businessDeskWorkspaceKey(workspace);
  const revisionsSignature = selectionSignature(revisionSelections);
  const scope = `${workspaceKey}|${artifactKind}|${revisionsSignature}|${stalenessKey}`;
  const activeScope = useRef(scope);
  const abortRequest = useRef<AbortController | null>(null);
  const retryIdentity = useRef<BusinessDeskRetryIdentity | null>(null);
  const priorScope = useRef(scope);
  const previewRef = useRef<ScopedPreview | null>(null);
  const [previewState, setPreviewState] = useState<ScopedPreview | null>(null);
  const [busyState, setBusyState] = useState({ scope, value: false });
  const [errorState, setErrorState] = useState({ scope, value: "" });
  const [feedbackState, setFeedbackState] = useState({ scope, value: "" });

  activeScope.current = scope;
  previewRef.current = previewState;
  const activePreview = previewState?.scope === scope ? previewState.value : null;
  const busy = busyState.scope === scope && busyState.value;
  const error = errorState.scope === scope ? errorState.value : "";
  const feedback = feedbackState.scope === scope ? feedbackState.value : "";
  const hasSelection = revisionSelections.length > 0;
  const actionDisabled = disabled || !hasSelection || busy;

  useLayoutEffect(() => {
    if (priorScope.current === scope) return;
    const discardedPreview = Boolean(previewRef.current);
    priorScope.current = scope;
    abortRequest.current?.abort();
    abortRequest.current = null;
    retryIdentity.current = null;
    previewRef.current = null;
    setPreviewState(null);
    setBusyState({ scope, value: false });
    setErrorState({ scope, value: "" });
    setFeedbackState({
      scope,
      value: discardedPreview
        ? "The workspace or exact revision selection changed. The prior transient preview was cleared; preview again before confirming."
        : ""
    });
  }, [scope]);

  useLayoutEffect(
    () => () => {
      abortRequest.current?.abort();
      abortRequest.current = null;
      retryIdentity.current = null;
      previewRef.current = null;
    },
    []
  );

  const previewExactArtifact = async () => {
    if (actionDisabled) return;
    const requestScope = scope;
    abortRequest.current?.abort();
    const controller = new AbortController();
    abortRequest.current = controller;
    retryIdentity.current = null;
    setPreviewState(null);
    setErrorState({ scope: requestScope, value: "" });
    setFeedbackState({ scope: requestScope, value: "" });
    setBusyState({ scope: requestScope, value: true });
    try {
      const value = await previewBusinessDeskArtifact(
        workspace,
        {
          artifactKind,
          revisionSelections,
          expectedRedactionProfile
        },
        { signal: controller.signal }
      );
      if (activeScope.current !== requestScope) return;
      const next = { scope: requestScope, value };
      previewRef.current = next;
      setPreviewState(next);
      setFeedbackState({
        scope: requestScope,
        value:
          "Transient preview ready. Review its exact content and disclosure, then confirm or cancel. No preparation receipt has been recorded yet."
      });
    } catch (caught) {
      if (
        activeScope.current === requestScope &&
        (caught as any)?.name !== "AbortError"
      ) {
        setErrorState({
          scope: requestScope,
          value:
            caught instanceof Error
              ? caught.message
              : "The exact artifact preview could not be loaded."
        });
      }
    } finally {
      if (activeScope.current === requestScope) {
        setBusyState({ scope: requestScope, value: false });
        if (abortRequest.current === controller) abortRequest.current = null;
      }
    }
  };

  const cancelPreview = () => {
    abortRequest.current?.abort();
    abortRequest.current = null;
    retryIdentity.current = null;
    previewRef.current = null;
    setPreviewState(null);
    setBusyState({ scope, value: false });
    setErrorState({ scope, value: "" });
    setFeedbackState({
      scope,
      value:
        "Preview cancelled and transient content cleared. No artifact was prepared, shared, delivered, or accepted."
    });
  };

  const confirmAndPrepare = async () => {
    const preview = activePreview;
    if (!preview || actionDisabled) return;
    const requestScope = scope;
    setErrorState({ scope: requestScope, value: "" });
    setFeedbackState({ scope: requestScope, value: "" });
    setBusyState({ scope: requestScope, value: true });
    try {
      const retry = resolveBusinessDeskRetryIdentity(
        retryIdentity.current,
        {
          workspaceKey,
          artifactKind,
          revisionSelections,
          previewConfirmationSha256: preview.previewConfirmationSha256,
          confirmed: true
        },
        () => newBusinessDeskOperationKey(`artifact-${artifactKind}`)
      );
      retryIdentity.current = retry;
      const packet = await prepareBusinessDeskArtifact(workspace, {
        artifactKind,
        revisionSelections,
        expectedRedactionProfile,
        previewConfirmationSha256: preview.previewConfirmationSha256,
        confirmed: true,
        idempotencyKey: retry.key,
        expectedPreview: preview
      });
      if (activeScope.current !== requestScope) return;
      const outcome = await handoffReviewedBusinessDeskArtifact(packet.artifact);
      if (activeScope.current !== requestScope) return;
      retryIdentity.current = null;
      previewRef.current = null;
      setPreviewState(null);
      setFeedbackState({
        scope: requestScope,
        value: reviewedArtifactOutcomeMessage(
          packet.recordPins.length,
          packet.idempotentReplay,
          outcome
        )
      });
    } catch (caught) {
      if (activeScope.current === requestScope) {
        setErrorState({
          scope: requestScope,
          value:
            caught instanceof Error
              ? caught.message
              : "The reviewed artifact could not be prepared. Retry keeps the same operation key."
        });
      }
    } finally {
      if (activeScope.current === requestScope) {
        setBusyState({ scope: requestScope, value: false });
      }
    }
  };

  return (
    <AppCard
      title={title}
      titleLevel={2}
      subtitle="Preview first, then explicitly confirm the exact revision-bound preparation and local device handoff."
      accessibilityLabel={`${title} reviewed artifact workflow`}
    >
      <Text style={styles.selectionText}>{selectionLabel}</Text>
      <View style={styles.disclosureBox}>
        <Text style={styles.disclosureTitle}>Privacy and output disclosure</Text>
        <Text style={styles.disclosureText}>{disclosure}</Text>
      </View>
      {contextNotice ? <Text style={styles.contextNotice}>{contextNotice}</Text> : null}
      {disabled && disabledReason ? (
        <Text style={styles.disabledReason}>{disabledReason}</Text>
      ) : null}

      {!activePreview ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={previewButtonLabel}
          accessibilityState={{ busy, disabled: actionDisabled }}
          disabled={actionDisabled}
          onPress={() => void previewExactArtifact()}
          style={[styles.primaryButton, actionDisabled && styles.disabled]}
        >
          <Text style={styles.primaryButtonText}>
            {busy ? "Loading exact preview…" : previewButtonLabel}
          </Text>
        </Pressable>
      ) : (
        <View style={styles.previewStack}>
          <View style={styles.previewMetadata}>
            <Text style={styles.previewTitle}>Exact transient preview</Text>
            <Text style={styles.metadataText}>
              File: {activePreview.artifact.filename}
            </Text>
            <Text style={styles.metadataText}>
              Profile: {activePreview.artifact.redactionProfile}
            </Text>
            <Text style={styles.metadataText}>
              {activePreview.artifact.recordCount} record
              {activePreview.artifact.recordCount === 1 ? "" : "s"} ·{" "}
              {activePreview.artifact.rowCount} row
              {activePreview.artifact.rowCount === 1 ? "" : "s"} ·{" "}
              {activePreview.artifact.bytes} UTF-8 bytes
            </Text>
            {activePreview.recordPins.map((pin) => (
              <Text key={pin.revisionId} style={styles.metadataText}>
                Pinned {pin.recordKind.replace(/_/g, " ")} revision {pin.version}
              </Text>
            ))}
            <Text selectable style={styles.checksumText}>
              Content checksum: {activePreview.artifact.checksumSha256}
            </Text>
            <Text selectable style={styles.checksumText}>
              Preview confirmation: {activePreview.previewConfirmationSha256}
            </Text>
            <Text style={styles.manifestText}>
              Included fields: {activePreview.artifact.fieldManifest.join(", ")}
            </Text>
          </View>
          <View style={styles.contentBox}>
            <Text style={styles.contentLabel}>Review the exact content</Text>
            <Text
              accessibilityLabel={`${title} preview content`}
              selectable
              style={styles.previewContent}
            >
              {activePreview.artifact.content}
            </Text>
          </View>
          <Text style={styles.confirmBoundary}>
            The server-issued preview confirmation binds this artifact kind, the ordered
            saved-revision pins, projection and redaction metadata, and the independently
            verified content checksum. Confirming records an audited preparation receipt.
            It does not prove a file was saved or shared, a message was delivered, terms
            were accepted, or money was paid.
          </Text>
          <View style={styles.actionRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={prepareButtonLabel}
              accessibilityState={{ busy, disabled: actionDisabled }}
              disabled={actionDisabled}
              onPress={() => void confirmAndPrepare()}
              style={[styles.primaryButton, actionDisabled && styles.disabled]}
            >
              <Text style={styles.primaryButtonText}>
                {busy ? "Preparing exact artifact…" : prepareButtonLabel}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Cancel ${title} preview`}
              accessibilityState={{ disabled: busy }}
              disabled={busy}
              onPress={cancelPreview}
              style={[styles.secondaryButton, busy && styles.disabled]}
            >
              <Text style={styles.secondaryButtonText}>Cancel and clear preview</Text>
            </Pressable>
          </View>
        </View>
      )}

      {feedback ? (
        <Text accessibilityLiveRegion="polite" style={styles.feedbackText}>
          {feedback}
        </Text>
      ) : null}
      {error ? (
        <Text accessibilityLiveRegion="assertive" style={styles.errorText}>
          {error}
        </Text>
      ) : null}
      <Text style={styles.storageBoundary}>
        Artifact plaintext is held only in this transient review step. It is cleared on
        cancel, successful handoff, selection change, workspace change, or unmount and is
        never written to client recovery storage.
      </Text>
    </AppCard>
  );
}

function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
    checksumText: {
      color: palette.textMuted,
      fontFamily: "monospace",
      fontSize: 11,
      lineHeight: 17
    },
    confirmBoundary: { color: palette.text, fontSize: 13, lineHeight: 19 },
    contentBox: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 8,
      padding: 12
    },
    contentLabel: { color: palette.text, fontSize: 13, fontWeight: "900" },
    contextNotice: { color: palette.textMuted, fontSize: 13, lineHeight: 19 },
    disabled: { opacity: 0.55 },
    disabledReason: { color: palette.warning, fontSize: 13, fontWeight: "800" },
    disclosureBox: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.warning,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 5,
      padding: 12
    },
    disclosureText: { color: palette.text, fontSize: 13, lineHeight: 19 },
    disclosureTitle: { color: palette.text, fontSize: 13, fontWeight: "900" },
    errorText: { color: palette.danger, fontSize: 13, fontWeight: "800" },
    feedbackText: { color: palette.success, fontSize: 13, fontWeight: "800" },
    manifestText: { color: palette.text, fontSize: 12, lineHeight: 18 },
    metadataText: { color: palette.textMuted, fontSize: 12, lineHeight: 18 },
    previewContent: {
      color: palette.text,
      fontFamily: "monospace",
      fontSize: 12,
      lineHeight: 18
    },
    previewMetadata: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 3,
      padding: 12
    },
    previewStack: { gap: 12 },
    previewTitle: { color: palette.text, fontSize: 14, fontWeight: "900" },
    primaryButton: {
      alignItems: "center",
      alignSelf: "flex-start",
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      justifyContent: "center",
      minHeight: 46,
      paddingHorizontal: 15,
      paddingVertical: 10
    },
    primaryButtonText: { color: palette.accentText, fontSize: 13, fontWeight: "900" },
    secondaryButton: {
      alignItems: "center",
      alignSelf: "flex-start",
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      justifyContent: "center",
      minHeight: 46,
      paddingHorizontal: 15,
      paddingVertical: 10
    },
    secondaryButtonText: { color: palette.text, fontSize: 13, fontWeight: "900" },
    selectionText: { color: palette.text, fontSize: 13, fontWeight: "800" },
    storageBoundary: { color: palette.textMuted, fontSize: 11, lineHeight: 16 }
  });
}
