import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
  businessDeskWorkspaceKey,
  type BusinessDeskRecord,
  type BusinessDeskWorkspace
} from "@/api/businessDesk";
import CalendarDateField from "@/components/forms/CalendarDateField";
import AppCard from "@/components/layout/AppCard";
import {
  AuthorizedRelatedRecordPicker,
  useAuthorizedBusinessDeskRecords
} from "@/features/businessDesk/AuthorizedRelatedRecordPicker";
import {
  LabeledInput,
  RecordSaveArchiveActions,
  StatusSelector
} from "@/features/businessDesk/RecordFormControls";
import ProtectedAttachmentField from "@/features/businessDesk/ProtectedAttachmentField";
import RecordToolScaffold from "@/features/businessDesk/RecordToolScaffold";
import {
  businessDeskRecordId,
  isoToLocalDateTime,
  localDateTimeToIso,
  useBusinessDeskRecordCollection
} from "@/features/businessDesk/recordWorkflow";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";

type JobStatus =
  | "requested"
  | "estimating"
  | "approved"
  | "scheduled"
  | "in_progress"
  | "waiting"
  | "complete"
  | "cancelled";

const JOB_STATUSES: Array<{ value: JobStatus; label: string }> = [
  { value: "requested", label: "Requested" },
  { value: "estimating", label: "Estimating" },
  { value: "approved", label: "Approved" },
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In progress" },
  { value: "waiting", label: "Waiting" },
  { value: "complete", label: "Complete" },
  { value: "cancelled", label: "Cancelled" }
];

const JOB_RELATED_KINDS = ["quote"] as const;

const JOB_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  requested: ["estimating", "cancelled"],
  estimating: ["approved", "waiting", "cancelled"],
  approved: ["scheduled", "in_progress", "cancelled"],
  scheduled: ["in_progress", "waiting", "cancelled"],
  in_progress: ["waiting", "complete", "cancelled"],
  waiting: ["scheduled", "in_progress", "cancelled"],
  complete: [],
  cancelled: []
};

export function allowedJobTransitions(status: JobStatus) {
  return JOB_TRANSITIONS[status];
}

function jobStatusLabel(status: JobStatus) {
  return JOB_STATUSES.find((option) => option.value === status)?.label || status;
}

type JobNotesToolProps = {
  workspace: BusinessDeskWorkspace;
  workspaceLabel: "Commercial" | "Facility";
  basePath: string;
};

function jobPayload(record: BusinessDeskRecord | null) {
  return (record?.payload?.job || {}) as any;
}

function validEmail(value: string) {
  return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function dirtySetter<T>(
  setter: React.Dispatch<React.SetStateAction<T>>,
  markDirty: () => void
) {
  return (value: T) => {
    setter(value);
    markDirty();
  };
}

function relatedQuoteId(record: BusinessDeskRecord | null) {
  const source = record?.sourceLinks?.find(
    (candidate) => candidate.entityType === "quote"
  );
  return String(source?.entityId || jobPayload(record).relatedQuoteId || "");
}

function manualProviderReference(
  provider: string,
  referenceId: string,
  referenceUrl: string
) {
  const normalizedProvider = provider.trim();
  const normalizedReferenceId = referenceId.trim();
  const normalizedReferenceUrl = referenceUrl.trim();
  if (!normalizedProvider && !normalizedReferenceId && !normalizedReferenceUrl)
    return null;
  if (!normalizedProvider || !normalizedReferenceId) {
    throw new Error(
      "An external reference needs both the provider name and reference ID."
    );
  }
  if (normalizedReferenceUrl && !/^https?:\/\/[^\s]+$/i.test(normalizedReferenceUrl)) {
    throw new Error("External reference URL must start with http:// or https://.");
  }
  return {
    provider: normalizedProvider,
    referenceId: normalizedReferenceId,
    referenceUrl: normalizedReferenceUrl
  };
}

export default function JobNotesTool({
  workspace,
  workspaceLabel,
  basePath
}: JobNotesToolProps) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const collection = useBusinessDeskRecordCollection(workspace, "job");
  const relatedQuotes = useAuthorizedBusinessDeskRecords(workspace, JOB_RELATED_KINDS);
  const workspaceKey = businessDeskWorkspaceKey(workspace);
  const [selected, setSelected] = useState<BusinessDeskRecord | null>(null);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<JobStatus>("requested");
  const [customerName, setCustomerName] = useState("");
  const [customerCompany, setCustomerCompany] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [projectName, setProjectName] = useState("");
  const [privateLocation, setPrivateLocation] = useState("");
  const [scope, setScope] = useState("");
  const [scheduledStartAt, setScheduledStartAt] = useState("");
  const [scheduledEndAt, setScheduledEndAt] = useState("");
  const [notes, setNotes] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [completionNotes, setCompletionNotes] = useState("");
  const [relatedQuoteIds, setRelatedQuoteIds] = useState<string[]>([]);
  const [provider, setProvider] = useState("");
  const [providerReferenceId, setProviderReferenceId] = useState("");
  const [providerReferenceUrl, setProviderReferenceUrl] = useState("");
  const [providerVerificationStatus, setProviderVerificationStatus] = useState("");
  const [nextStatus, setNextStatus] = useState<JobStatus | "">("");
  const [archiveReason, setArchiveReason] = useState("");
  const [formError, setFormError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [contentDirty, setContentDirty] = useState(false);
  const [attachmentDraft, setAttachmentDraft] = useState({
    workspaceKey,
    ids: [] as string[],
    session: 0,
    blocking: false
  });
  const activeAttachmentDraft =
    attachmentDraft.workspaceKey === workspaceKey
      ? attachmentDraft
      : {
          workspaceKey,
          ids: [] as string[],
          session: attachmentDraft.session,
          blocking: false
        };

  const reset = () => {
    setSelected(null);
    setTitle("");
    setStatus("requested");
    setCustomerName("");
    setCustomerCompany("");
    setCustomerEmail("");
    setCustomerPhone("");
    setProjectName("");
    setPrivateLocation("");
    setScope("");
    setScheduledStartAt("");
    setScheduledEndAt("");
    setNotes("");
    setNextAction("");
    setCompletionNotes("");
    setRelatedQuoteIds([]);
    setProvider("");
    setProviderReferenceId("");
    setProviderReferenceUrl("");
    setProviderVerificationStatus("");
    setNextStatus("");
    setArchiveReason("");
    setFormError("");
    setFeedback("");
    setContentDirty(false);
    setAttachmentDraft((current) => ({
      workspaceKey,
      ids: [],
      session: current.session + 1,
      blocking: false
    }));
  };

  const open = (record: BusinessDeskRecord) => {
    const job = jobPayload(record);
    setSelected(record);
    setTitle(record.title || "");
    setStatus((record.status || job.stage || "requested") as JobStatus);
    setCustomerName(String(job.customer?.name || ""));
    setCustomerCompany(String(job.customer?.company || ""));
    setCustomerEmail(String(job.customer?.email || ""));
    setCustomerPhone(String(job.customer?.phone || ""));
    setProjectName(String(job.projectName || ""));
    setPrivateLocation(String(job.privateLocation || ""));
    setScope(String(job.scope || ""));
    setScheduledStartAt(isoToLocalDateTime(job.scheduledStartAt));
    setScheduledEndAt(isoToLocalDateTime(job.scheduledEndAt));
    setNotes(String(job.notes || ""));
    setNextAction(String(job.nextAction || ""));
    setCompletionNotes(String(job.completionNotes || ""));
    const quoteId = relatedQuoteId(record);
    setRelatedQuoteIds(quoteId ? [quoteId] : []);
    setProvider(String(job.externalProviderRef?.provider || ""));
    setProviderReferenceId(String(job.externalProviderRef?.referenceId || ""));
    setProviderReferenceUrl(String(job.externalProviderRef?.referenceUrl || ""));
    setProviderVerificationStatus(
      String(job.externalProviderRef?.verificationStatus || "")
    );
    const attachmentIds = Array.isArray(job.attachmentRefs)
      ? job.attachmentRefs.reduce((result: string[], reference: any) => {
          const id = String(reference?.assetId || "").trim();
          if (id && !result.includes(id)) result.push(id);
          return result;
        }, [] as string[])
      : [];
    setAttachmentDraft((current) => ({
      workspaceKey,
      ids: attachmentIds,
      session: current.session + 1,
      blocking: false
    }));
    setNextStatus("");
    setArchiveReason("");
    setFormError("");
    setFeedback("");
    setContentDirty(false);
  };

  const save = async () => {
    setFormError("");
    setFeedback("");
    try {
      if (activeAttachmentDraft.blocking) {
        throw new Error(
          "Finish, cancel, or remove pending protected job attachments before saving."
        );
      }
      if (!title.trim()) throw new Error("Give this job a clear record title.");
      if (!projectName.trim() && !scope.trim() && !notes.trim()) {
        throw new Error("Enter a request, scope, or factual job note before saving.");
      }
      if (!validEmail(customerEmail.trim())) {
        throw new Error("Enter a valid customer email or leave it blank.");
      }
      const start = localDateTimeToIso(scheduledStartAt);
      const end = localDateTimeToIso(scheduledEndAt);
      if (end && !start) throw new Error("Choose a scheduled start before an end time.");
      if (start && end && new Date(end).getTime() < new Date(start).getTime()) {
        throw new Error("Scheduled end cannot be before scheduled start.");
      }
      if (selected && status === "complete" && !completionNotes.trim()) {
        throw new Error("A completed job must retain nonblank completion notes.");
      }
      const externalProviderRef = manualProviderReference(
        provider,
        providerReferenceId,
        providerReferenceUrl
      );
      const selectedQuoteId = relatedQuoteIds[0] || "";
      const selectedQuote = relatedQuotes.records.find(
        (record) => businessDeskRecordId(record) === selectedQuoteId
      );
      if (selectedQuoteId && !selectedQuote) {
        throw new Error(
          "The related quote is no longer available in this workspace. Remove it or choose an authorized quote before saving."
        );
      }
      const savedStatus = selected ? status : "requested";

      const record = await collection.save(
        {
          title: title.trim(),
          status: savedStatus,
          payload: {
            job: {
              customer: {
                name: customerName.trim(),
                company: customerCompany.trim(),
                email: customerEmail.trim().toLowerCase(),
                phone: customerPhone.trim()
              },
              projectName: projectName.trim(),
              scheduledStartAt: start,
              scheduledEndAt: end,
              privateLocation: privateLocation.trim(),
              scope: scope.trim(),
              attachmentRefs: activeAttachmentDraft.ids.map((assetId) => ({
                assetId
              })),
              relatedQuoteId: selectedQuoteId,
              ...(externalProviderRef ? { externalProviderRef } : {}),
              completionNotes: completionNotes.trim(),
              notes: notes.trim(),
              nextAction: nextAction.trim()
            }
          },
          sourceLinks: selectedQuote
            ? [
                {
                  entityType: "quote",
                  entityId: selectedQuoteId,
                  label: selectedQuote.title
                }
              ]
            : []
        },
        selected
      );
      open(record);
      setFeedback(
        selected
          ? `Job content saved as revision ${record.version}; status stayed ${jobStatusLabel(
              record.status as JobStatus
            )}.`
          : `Job created as Requested, revision ${record.version}.`
      );
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "The job could not be saved."
      );
    }
  };

  const transitionStatus = async () => {
    setFormError("");
    setFeedback("");
    try {
      if (!selected)
        throw new Error("Save the Requested job before changing its status.");
      if (contentDirty) {
        throw new Error(
          "Save or discard the unsaved job changes before changing its status."
        );
      }
      if (!nextStatus || !allowedJobTransitions(status).includes(nextStatus)) {
        throw new Error("Choose an allowed next job status.");
      }
      if (
        nextStatus === "complete" &&
        !String(jobPayload(selected).completionNotes || "").trim()
      ) {
        throw new Error(
          "Save completion notes on this exact revision before marking the job Complete."
        );
      }
      const transitioned = await collection.transition(selected, { status: nextStatus });
      const priorStatus = status;
      open(transitioned);
      setFeedback(
        `Job moved from ${jobStatusLabel(priorStatus)} to ${jobStatusLabel(
          transitioned.status as JobStatus
        )} at revision ${transitioned.version}.`
      );
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "The job status could not be changed."
      );
    }
  };

  const archive = async () => {
    setFormError("");
    try {
      if (!selected) return;
      if (archiveReason.trim().length < 3) {
        throw new Error("Enter an archive reason with at least three characters.");
      }
      await collection.archive(selected, archiveReason.trim());
      reset();
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "The job could not be archived."
      );
    }
  };

  return (
    <RecordToolScaffold
      title="Job Notes"
      workspaceLabel={workspaceLabel}
      basePath={basePath}
      description="Keep the customer request, scope, schedule, evidence, references, and completion record together without turning a note into an automatic assignment or payment."
      records={collection.records}
      selectedRecord={selected}
      loading={collection.loading}
      error={collection.error}
      onRetry={() => void collection.reload()}
      onNew={reset}
      onSelect={open}
    >
      <AppCard
        title={selected ? `Edit revision ${selected.version}` : "New job note"}
        titleLevel={2}
        subtitle="Saving records what an authorized operator entered. It does not contact a customer, assign a worker, charge a payment, or change inventory."
      >
        <View style={styles.fieldGrid}>
          <LabeledInput
            label="Record title"
            accessibilityLabel="Job record title"
            value={title}
            onChangeText={dirtySetter(setTitle, () => setContentDirty(true))}
            placeholder="Greenhouse irrigation repair"
          />
          <LabeledInput
            label="Request or project"
            accessibilityLabel="Job project name"
            value={projectName}
            onChangeText={dirtySetter(setProjectName, () => setContentDirty(true))}
            placeholder="Short customer request or project name"
          />
        </View>
        <View style={styles.lifecycleBox}>
          <Text style={styles.lifecycleTitle}>
            Current status: {jobStatusLabel(status)}
          </Text>
          {!selected ? (
            <Text style={styles.lifecycleHint}>
              New jobs always start as Requested. Save the intake first, then use an
              allowed status transition.
            </Text>
          ) : allowedJobTransitions(status).length ? (
            <>
              <StatusSelector
                label="Next job status"
                value={nextStatus}
                options={[
                  { value: "" as const, label: "Choose next status" },
                  ...JOB_STATUSES.filter((option) =>
                    allowedJobTransitions(status).includes(option.value)
                  )
                ]}
                onChange={setNextStatus}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Change job status"
                accessibilityState={{
                  disabled: collection.saving || !nextStatus,
                  busy: collection.saving
                }}
                disabled={collection.saving || !nextStatus}
                onPress={() => void transitionStatus()}
                style={[
                  styles.transitionButton,
                  (collection.saving || !nextStatus) && styles.disabled
                ]}
              >
                <Text style={styles.transitionButtonText}>Change status</Text>
              </Pressable>
              {contentDirty ? (
                <Text style={styles.lifecycleWarning}>
                  Save or discard the unsaved content before changing status.
                </Text>
              ) : null}
            </>
          ) : (
            <Text style={styles.lifecycleHint}>
              This status has no next transition. Corrected content can still be saved as
              a new audited revision.
            </Text>
          )}
        </View>
        <View style={styles.fieldGrid}>
          <LabeledInput
            label="Customer name"
            accessibilityLabel="Job customer name"
            value={customerName}
            onChangeText={dirtySetter(setCustomerName, () => setContentDirty(true))}
            placeholder="Optional"
          />
          <LabeledInput
            label="Customer business"
            accessibilityLabel="Job customer business"
            value={customerCompany}
            onChangeText={dirtySetter(setCustomerCompany, () => setContentDirty(true))}
            placeholder="Optional"
          />
          <LabeledInput
            label="Customer email"
            accessibilityLabel="Job customer email"
            keyboardType="email-address"
            autoCapitalize="none"
            value={customerEmail}
            onChangeText={dirtySetter(setCustomerEmail, () => setContentDirty(true))}
            placeholder="Optional"
          />
          <LabeledInput
            label="Customer phone"
            accessibilityLabel="Job customer phone"
            keyboardType="phone-pad"
            value={customerPhone}
            onChangeText={dirtySetter(setCustomerPhone, () => setContentDirty(true))}
            placeholder="Optional"
          />
        </View>
        <LabeledInput
          label="Private job location"
          accessibilityLabel="Job private location"
          value={privateLocation}
          onChangeText={dirtySetter(setPrivateLocation, () => setContentDirty(true))}
          placeholder="Workspace-private address, room, or site reference"
          hint="This stays private to the selected workspace and is not published."
        />
        <LabeledInput
          label="Scope"
          accessibilityLabel="Job scope"
          multiline
          value={scope}
          onChangeText={dirtySetter(setScope, () => setContentDirty(true))}
          placeholder="Known work, boundaries, requested materials, and open questions"
          hint="Only reviewed facts belong here. AI-generated scope will remain a separate draft."
        />
        <View style={styles.fieldGrid}>
          <View style={styles.dateField}>
            <CalendarDateField
              label="Scheduled start"
              accessibilityLabel="Job scheduled start date and time"
              mode="datetime"
              value={scheduledStartAt}
              onChange={dirtySetter(setScheduledStartAt, () => setContentDirty(true))}
              placeholder="Not scheduled"
            />
          </View>
          <View style={styles.dateField}>
            <CalendarDateField
              label="Scheduled end"
              accessibilityLabel="Job scheduled end date and time"
              mode="datetime"
              value={scheduledEndAt}
              onChange={dirtySetter(setScheduledEndAt, () => setContentDirty(true))}
              placeholder="No end time"
            />
          </View>
          <LabeledInput
            label="Next action"
            accessibilityLabel="Job next action"
            value={nextAction}
            onChangeText={dirtySetter(setNextAction, () => setContentDirty(true))}
            placeholder="Review scope, confirm date, gather materials…"
          />
        </View>
        <LabeledInput
          label="Factual notes"
          accessibilityLabel="Job notes"
          multiline
          value={notes}
          onChangeText={dirtySetter(setNotes, () => setContentDirty(true))}
          placeholder="Intake, meeting, work, decision, and follow-up notes"
        />
        <LabeledInput
          label="Completion notes"
          accessibilityLabel="Job completion notes"
          multiline
          value={completionNotes}
          onChangeText={dirtySetter(setCompletionNotes, () => setContentDirty(true))}
          placeholder="Save these before moving an In progress job to Complete"
        />
        <View style={styles.safetyNotice}>
          <Text style={styles.safetyTitle}>Assignment is not configured</Text>
          <Text style={styles.safetyText}>
            Free-text user IDs are not accepted. GrowPathAI will show an authorized
            workspace-member picker here only after the assignment service is connected.
          </Text>
        </View>
      </AppCard>

      <AppCard
        title="Evidence and related records"
        titleLevel={2}
        subtitle="Workspace records are selected from authorized results. External references remain explicitly unverified manual notes."
      >
        <AuthorizedRelatedRecordPicker
          label="Related quote"
          hint="Only quotes returned from this authorized workspace can be linked. The server verifies the quote again when the job is saved."
          records={relatedQuotes.records}
          loading={relatedQuotes.loading}
          error={relatedQuotes.error}
          selectedIds={relatedQuoteIds}
          multiple={false}
          onChange={(ids) => {
            setRelatedQuoteIds(ids);
            setContentDirty(true);
          }}
          onRetry={() => void relatedQuotes.reload()}
        />
        <View style={styles.attachmentBox}>
          <ProtectedAttachmentField
            key={`${workspaceKey}:${activeAttachmentDraft.session}`}
            workspace={workspace}
            purpose="job_attachment"
            maxCount={10}
            attachmentIds={activeAttachmentDraft.ids}
            title="Protected job photos and documents"
            hint="Attach up to ten workspace-private photos or PDFs. GrowPathAI does not accept pasted asset IDs or file URLs."
            onChange={(ids) => {
              setAttachmentDraft((current) => ({
                ...(current.workspaceKey === workspaceKey
                  ? current
                  : {
                      workspaceKey,
                      ids: [] as string[],
                      session: current.session,
                      blocking: false
                    }),
                workspaceKey,
                ids
              }));
              setContentDirty(true);
            }}
            onUserEdit={() => setContentDirty(true)}
            onBlockingChange={(blocking) =>
              setAttachmentDraft((current) =>
                current.workspaceKey === workspaceKey ? { ...current, blocking } : current
              )
            }
          />
        </View>
        <View style={styles.providerBox}>
          <Text style={styles.safetyTitle}>Unverified manual external reference</Text>
          <Text style={styles.safetyText}>
            This records a pointer only. GrowPathAI does not verify provider ownership,
            payment, invoice, customer acceptance, or assignment, and never fetches the
            URL automatically.
          </Text>
          <View style={styles.fieldGrid}>
            <LabeledInput
              label="Provider name"
              accessibilityLabel="Job unverified external provider"
              value={provider}
              onChangeText={(value) => {
                setProvider(value);
                setProviderVerificationStatus("");
                setContentDirty(true);
              }}
              placeholder="Required with a manual reference"
            />
            <LabeledInput
              label="Provider reference ID"
              accessibilityLabel="Job unverified external reference ID"
              value={providerReferenceId}
              onChangeText={(value) => {
                setProviderReferenceId(value);
                setProviderVerificationStatus("");
                setContentDirty(true);
              }}
              placeholder="Required with a provider name"
            />
            <LabeledInput
              label="Provider reference URL"
              accessibilityLabel="Job unverified external reference URL"
              autoCapitalize="none"
              value={providerReferenceUrl}
              onChangeText={(value) => {
                setProviderReferenceUrl(value);
                setProviderVerificationStatus("");
                setContentDirty(true);
              }}
              placeholder="Optional http(s) URL; stored, never fetched"
            />
          </View>
          {providerVerificationStatus ? (
            <Text style={styles.providerStatus}>
              Saved server label: {providerVerificationStatus.replace(/_/g, " ")}
            </Text>
          ) : null}
        </View>
        {feedback ? (
          <Text accessibilityLiveRegion="polite" style={styles.feedbackText}>
            {feedback}
          </Text>
        ) : null}
        {formError ? <Text style={styles.errorText}>{formError}</Text> : null}
        <RecordSaveArchiveActions
          saving={collection.saving}
          hasRecord={Boolean(businessDeskRecordId(selected))}
          saveLabel="Save job record"
          archiveReason={archiveReason}
          onArchiveReasonChange={setArchiveReason}
          onSave={() => void save()}
          onArchive={() => void archive()}
        />
      </AppCard>
    </RecordToolScaffold>
  );
}

function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    attachmentBox: { marginTop: 12 },
    dateField: { flexBasis: 250, flexGrow: 1, minWidth: 220 },
    disabled: { opacity: 0.6 },
    errorText: { color: palette.danger, fontSize: 13, fontWeight: "800" },
    feedbackText: { color: palette.success, fontSize: 13, fontWeight: "800" },
    fieldGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    lifecycleBox: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: 10,
      borderWidth: 1,
      gap: 9,
      marginBottom: 12,
      padding: 12
    },
    lifecycleHint: { color: palette.textMuted, fontSize: 12, lineHeight: 17 },
    lifecycleTitle: { color: palette.text, fontSize: 13, fontWeight: "900" },
    lifecycleWarning: { color: palette.warning, fontSize: 12, fontWeight: "800" },
    providerBox: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: 10,
      borderWidth: 1,
      gap: 10,
      marginTop: 12,
      padding: 12
    },
    providerStatus: {
      color: palette.textMuted,
      fontSize: 12,
      fontWeight: "800",
      textTransform: "capitalize"
    },
    safetyNotice: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: 10,
      borderWidth: 1,
      gap: 4,
      marginTop: 12,
      padding: 12
    },
    safetyText: { color: palette.textMuted, fontSize: 12, lineHeight: 17 },
    safetyTitle: { color: palette.text, fontSize: 13, fontWeight: "900" },
    transitionButton: {
      alignItems: "center",
      alignSelf: "flex-start",
      backgroundColor: palette.accent,
      borderRadius: 10,
      minHeight: 42,
      paddingHorizontal: 14,
      paddingVertical: 10
    },
    transitionButtonText: { color: palette.accentText, fontSize: 13, fontWeight: "900" }
  });
}
