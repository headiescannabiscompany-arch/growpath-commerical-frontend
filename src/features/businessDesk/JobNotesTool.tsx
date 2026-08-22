import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import {
  businessDeskWorkspaceKey,
  type BusinessDeskRecord,
  type BusinessDeskWorkspace
} from "@/api/businessDesk";
import { BUSINESS_DESK_ARTIFACT_REDACTION_PROFILES } from "@/api/businessDeskArtifacts";
import { listTeamMembers, type TeamMember } from "@/api/team";
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
import ReviewedArtifactPanel from "@/features/businessDesk/ReviewedArtifactPanel";
import {
  businessDeskRecordId,
  useBusinessDeskRecordCollection
} from "@/features/businessDesk/recordWorkflow";
import {
  useBusinessDeskWorkspaceTimeZone,
  WorkspaceTimeZoneControl,
  workspaceTimeZoneReady
} from "@/features/businessDesk/WorkspaceTimeZoneControl";
import {
  isoInstantToZonedLocalDateTime,
  zonedLocalDateTimeToIsoStrict
} from "@/features/businessDesk/zonedDateTime";
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
  canConfigureTimeZone?: boolean;
  currentUser?: { userId: string; label: string } | null;
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

const ACTIVE_JOB_ASSIGNEE_ROLES = new Set(["OWNER", "MANAGER", "STAFF", "VIEWER"]);

type JobAssigneeOption = {
  userId: string;
  role: string;
  label: string;
};

function activeFacilityAssigneeOptions(members: TeamMember[]): JobAssigneeOption[] {
  const seen = new Set<string>();
  return members.flatMap((member, index) => {
    const userId = String(member?.userId || "").trim();
    const role = String(member?.role || "")
      .trim()
      .toUpperCase();
    if (
      !userId ||
      seen.has(userId) ||
      !ACTIVE_JOB_ASSIGNEE_ROLES.has(role) ||
      member.invited === true ||
      String(member.invited || "").toLowerCase() === "true" ||
      Boolean(member.deletedAt)
    ) {
      return [];
    }
    seen.add(userId);
    const name = String(member.name || "").trim();
    const email = String(member.email || "").trim();
    const identity = name && email ? `${name} (${email})` : name || email;
    return [
      {
        userId,
        role,
        label: identity || `Current Facility member ${index + 1}`
      }
    ];
  });
}

function validIsoInstant(value: unknown) {
  const candidate = typeof value === "string" ? value.trim() : "";
  return candidate && Number.isFinite(new Date(candidate).getTime()) ? candidate : "";
}

function jobWallTimeToIso(
  label: string,
  value: string,
  timeZone: string,
  exactIsoHint = ""
) {
  try {
    return zonedLocalDateTimeToIsoStrict(value, timeZone, exactIsoHint);
  } catch (error) {
    throw new Error(
      `${label}: ${error instanceof Error ? error.message : "choose a valid date and time."}`
    );
  }
}

function businessDeskErrorCode(error: unknown) {
  return typeof (error as any)?.code === "string" ? String((error as any).code) : "";
}

export default function JobNotesTool({
  workspace,
  workspaceLabel,
  basePath,
  canConfigureTimeZone = workspace.workspaceType === "commercial",
  currentUser = null
}: JobNotesToolProps) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const collection = useBusinessDeskRecordCollection(workspace, "job");
  const relatedQuotes = useAuthorizedBusinessDeskRecords(workspace, JOB_RELATED_KINDS);
  const workspaceKey = businessDeskWorkspaceKey(workspace);
  const workspaceType = workspace.workspaceType;
  const facilityId = workspaceType === "facility" ? workspace.facilityId : "";
  const workspaceTimeZoneState = useBusinessDeskWorkspaceTimeZone(workspace);
  const authoritativeTimeZone = workspaceTimeZoneState.value?.configured
    ? workspaceTimeZoneState.value.timeZone
    : null;
  const authoritativeTimeZoneVersion = workspaceTimeZoneState.value?.configured
    ? workspaceTimeZoneState.value.version
    : 0;
  const currentWorkspaceKey = useRef(workspaceKey);
  const resetWorkspaceKey = useRef(workspaceKey);
  currentWorkspaceKey.current = workspaceKey;
  const appliedTimeZone = useRef<{
    workspaceKey: string;
    timeZone: string;
    version: number;
  } | null>(null);
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
  const [scheduledStartAtIsoHint, setScheduledStartAtIsoHint] = useState("");
  const [scheduledEndAtIsoHint, setScheduledEndAtIsoHint] = useState("");
  const [scheduleTimeZone, setScheduleTimeZone] = useState("");
  const [scheduleTimeZoneVersion, setScheduleTimeZoneVersion] = useState(0);
  const [scheduleReviewRequired, setScheduleReviewRequired] = useState(false);
  const [assigneeUserId, setAssigneeUserId] = useState("");
  const [assigneeEvidence, setAssigneeEvidence] = useState<Record<string, any> | null>(
    null
  );
  const [facilityAssignees, setFacilityAssignees] = useState<JobAssigneeOption[]>([]);
  const [assigneeLoading, setAssigneeLoading] = useState(
    workspace.workspaceType === "facility"
  );
  const [assigneeLoadError, setAssigneeLoadError] = useState("");
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
  const [formErrorCode, setFormErrorCode] = useState("");
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

  const loadFacilityAssignees = useCallback(async () => {
    if (workspaceType !== "facility") {
      setFacilityAssignees([]);
      setAssigneeLoading(false);
      setAssigneeLoadError("");
      return;
    }
    const requestWorkspaceKey = workspaceKey;
    setAssigneeLoading(true);
    setAssigneeLoadError("");
    try {
      const members = await listTeamMembers(facilityId);
      if (currentWorkspaceKey.current !== requestWorkspaceKey) return;
      setFacilityAssignees(activeFacilityAssigneeOptions(members));
    } catch (error) {
      if (currentWorkspaceKey.current !== requestWorkspaceKey) return;
      setFacilityAssignees([]);
      setAssigneeLoadError(
        error instanceof Error
          ? error.message
          : "Current Facility members could not be loaded."
      );
    } finally {
      if (currentWorkspaceKey.current === requestWorkspaceKey) {
        setAssigneeLoading(false);
      }
    }
  }, [facilityId, workspaceKey, workspaceType]);

  useEffect(() => {
    void loadFacilityAssignees();
  }, [loadFacilityAssignees]);

  const reset = useCallback(() => {
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
    setScheduledStartAtIsoHint("");
    setScheduledEndAtIsoHint("");
    setScheduleTimeZone(authoritativeTimeZone || "");
    setScheduleTimeZoneVersion(authoritativeTimeZoneVersion);
    setScheduleReviewRequired(false);
    setAssigneeUserId("");
    setAssigneeEvidence(null);
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
    setFormErrorCode("");
    setFeedback("");
    setContentDirty(false);
    setAttachmentDraft((current) => ({
      workspaceKey,
      ids: [],
      session: current.session + 1,
      blocking: false
    }));
  }, [authoritativeTimeZone, authoritativeTimeZoneVersion, workspaceKey]);

  useEffect(() => {
    if (resetWorkspaceKey.current === workspaceKey) return;
    resetWorkspaceKey.current = workspaceKey;
    appliedTimeZone.current = null;
    reset();
  }, [reset, workspaceKey]);

  useEffect(() => {
    if (!authoritativeTimeZone || authoritativeTimeZoneVersion < 1) return;
    const prior = appliedTimeZone.current;
    if (
      prior?.workspaceKey === workspaceKey &&
      prior.timeZone === authoritativeTimeZone &&
      prior.version === authoritativeTimeZoneVersion
    ) {
      return;
    }
    appliedTimeZone.current = {
      workspaceKey,
      timeZone: authoritativeTimeZone,
      version: authoritativeTimeZoneVersion
    };
    setScheduleTimeZone(authoritativeTimeZone);
    setScheduleTimeZoneVersion(authoritativeTimeZoneVersion);
    const priorTimeZone =
      prior?.workspaceKey === workspaceKey ? prior.timeZone : scheduleTimeZone;
    if (priorTimeZone && priorTimeZone !== authoritativeTimeZone) {
      const startHint = validIsoInstant(scheduledStartAtIsoHint);
      const endHint = validIsoInstant(scheduledEndAtIsoHint);
      setScheduleReviewRequired(
        Boolean((scheduledStartAt && !startHint) || (scheduledEndAt && !endHint))
      );
      setScheduledStartAt(
        startHint ? isoInstantToZonedLocalDateTime(startHint, authoritativeTimeZone) : ""
      );
      setScheduledEndAt(
        endHint ? isoInstantToZonedLocalDateTime(endHint, authoritativeTimeZone) : ""
      );
      if (selected) setContentDirty(true);
      setFormError(
        "The authoritative workspace time zone changed. Exact saved instants were converted; enter every cleared schedule time and review the job before saving."
      );
      setFormErrorCode("BUSINESS_DESK_WORKSPACE_TIME_ZONE_CHANGED");
    }
  }, [
    authoritativeTimeZone,
    authoritativeTimeZoneVersion,
    scheduledEndAt,
    scheduledEndAtIsoHint,
    scheduledStartAt,
    scheduledStartAtIsoHint,
    scheduleTimeZone,
    selected,
    workspaceKey
  ]);

  const open = (record: BusinessDeskRecord) => {
    const job = jobPayload(record);
    const savedTimeZone = String(job.scheduleTimeZone || "").trim();
    const displayTimeZone = authoritativeTimeZone || savedTimeZone;
    const startHint = validIsoInstant(job.scheduledStartAt);
    const endHint = validIsoInstant(job.scheduledEndAt);
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
    setScheduledStartAt(
      startHint && displayTimeZone
        ? isoInstantToZonedLocalDateTime(startHint, displayTimeZone)
        : ""
    );
    setScheduledEndAt(
      endHint && displayTimeZone
        ? isoInstantToZonedLocalDateTime(endHint, displayTimeZone)
        : ""
    );
    setScheduledStartAtIsoHint(startHint);
    setScheduledEndAtIsoHint(endHint);
    setScheduleTimeZone(displayTimeZone);
    setScheduleTimeZoneVersion(
      authoritativeTimeZoneVersion ||
        (Number.isSafeInteger(job.scheduleTimeZoneVersion)
          ? job.scheduleTimeZoneVersion
          : 0)
    );
    setScheduleReviewRequired(false);
    setAssigneeUserId(String(job.assigneeUserId || "").trim());
    setAssigneeEvidence(
      job.assigneeProposalEvidence && typeof job.assigneeProposalEvidence === "object"
        ? job.assigneeProposalEvidence
        : null
    );
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
    setFormErrorCode("");
    setFeedback("");
    setContentDirty(false);
  };

  const assigneeOptions = useMemo<JobAssigneeOption[]>(() => {
    if (workspace.workspaceType === "facility") return facilityAssignees;
    const userId = String(currentUser?.userId || "").trim();
    if (!userId) return [];
    return [
      {
        userId,
        role: "SELF",
        label: String(currentUser?.label || "Commercial workspace owner").trim()
      }
    ];
  }, [currentUser, facilityAssignees, workspace.workspaceType]);

  const scheduleWriteBlocked =
    scheduleReviewRequired ||
    (Boolean(scheduledStartAt || scheduledEndAt) &&
      (!workspaceTimeZoneReady(workspaceTimeZoneState) ||
        scheduleTimeZone !== authoritativeTimeZone ||
        scheduleTimeZoneVersion !== authoritativeTimeZoneVersion));

  const save = async () => {
    setFormError("");
    setFormErrorCode("");
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
      if (scheduledEndAt && !scheduledStartAt) {
        throw new Error("Choose a scheduled start before an end time.");
      }
      let start: string | null = null;
      let end: string | null = null;
      if (scheduledStartAt || scheduledEndAt) {
        if (
          !workspaceTimeZoneReady(workspaceTimeZoneState) ||
          !authoritativeTimeZone ||
          scheduleTimeZone !== authoritativeTimeZone ||
          scheduleTimeZoneVersion !== authoritativeTimeZoneVersion
        ) {
          throw new Error(
            "The workspace owner must configure and reload the authoritative time zone before a schedule can be saved."
          );
        }
        start = jobWallTimeToIso(
          "Scheduled start",
          scheduledStartAt,
          authoritativeTimeZone,
          scheduledStartAtIsoHint
        );
        end = jobWallTimeToIso(
          "Scheduled end",
          scheduledEndAt,
          authoritativeTimeZone,
          scheduledEndAtIsoHint
        );
      }
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
      const proposedAssigneeUserId = selected ? assigneeUserId.trim() : "";
      if (
        proposedAssigneeUserId &&
        !assigneeOptions.some((option) => option.userId === proposedAssigneeUserId)
      ) {
        throw new Error(
          "The proposed assignee is not in the current authorized workspace-member list. Reload members or clear the proposal before saving."
        );
      }

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
              scheduleTimeZone: start || end ? authoritativeTimeZone : "",
              scheduleTimeZoneVersion: start || end ? authoritativeTimeZoneVersion : null,
              ...(selected ? { assigneeUserId: proposedAssigneeUserId } : {}),
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
      const savedJob = jobPayload(record);
      const scheduleWasSaved = Boolean(start || end);
      const pinnedTimeZone = String(savedJob.scheduleTimeZone || "").trim();
      const pinnedTimeZoneVersion = Number(savedJob.scheduleTimeZoneVersion);
      open(record);
      if (
        scheduleWasSaved &&
        (pinnedTimeZone !== authoritativeTimeZone ||
          pinnedTimeZoneVersion !== authoritativeTimeZoneVersion)
      ) {
        setContentDirty(true);
        await workspaceTimeZoneState.reload();
        setFormErrorCode("BUSINESS_DESK_WORKSPACE_TIME_ZONE_CHANGED");
        setFormError(
          "The workspace time zone changed while this job was saving. The server-pinned revision was retained; reload the setting and review the displayed schedule before another write."
        );
        setFeedback(`Job content was saved as revision ${record.version}.`);
        return;
      }
      const proposalEvidence = jobPayload(record).assigneeProposalEvidence;
      const proposalMessage =
        proposalEvidence?.authorizationStatus === "authorized_proposal"
          ? " The assignee proposal was reauthorized for this revision; no notification, task, contact, or assignment side effect was performed."
          : "";
      setFeedback(
        (selected
          ? `Job content saved as revision ${record.version}; status stayed ${jobStatusLabel(
              record.status as JobStatus
            )}.`
          : `Job created as Requested, revision ${record.version}.`) + proposalMessage
      );
    } catch (error) {
      setFormErrorCode(businessDeskErrorCode(error));
      setFormError(
        error instanceof Error ? error.message : "The job could not be saved."
      );
    }
  };

  const transitionStatus = async () => {
    setFormError("");
    setFormErrorCode("");
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
      setFormErrorCode(businessDeskErrorCode(error));
      setFormError(
        error instanceof Error ? error.message : "The job status could not be changed."
      );
    }
  };

  const archive = async () => {
    setFormError("");
    setFormErrorCode("");
    try {
      if (!selected) return;
      if (archiveReason.trim().length < 3) {
        throw new Error("Enter an archive reason with at least three characters.");
      }
      await collection.archive(selected, archiveReason.trim());
      reset();
    } catch (error) {
      setFormErrorCode(businessDeskErrorCode(error));
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
      <WorkspaceTimeZoneControl
        state={workspaceTimeZoneState}
        workspaceLabel={workspaceLabel}
        canConfigure={canConfigureTimeZone}
      />
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
              onChange={(value) => {
                setScheduledStartAt(value);
                setScheduledStartAtIsoHint("");
                setScheduleReviewRequired(false);
                setContentDirty(true);
              }}
              placeholder="Not scheduled"
              disabled={!workspaceTimeZoneReady(workspaceTimeZoneState)}
              timeZoneLabel={scheduleTimeZone || undefined}
            />
          </View>
          <View style={styles.dateField}>
            <CalendarDateField
              label="Scheduled end"
              accessibilityLabel="Job scheduled end date and time"
              mode="datetime"
              value={scheduledEndAt}
              onChange={(value) => {
                setScheduledEndAt(value);
                setScheduledEndAtIsoHint("");
                setScheduleReviewRequired(false);
                setContentDirty(true);
              }}
              placeholder="No end time"
              disabled={!workspaceTimeZoneReady(workspaceTimeZoneState)}
              timeZoneLabel={scheduleTimeZone || undefined}
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
        <Text style={styles.lifecycleHint}>
          Schedule display and editing use {scheduleTimeZone || "no configured zone"}
          {scheduleTimeZoneVersion > 0
            ? `, workspace setting version ${scheduleTimeZoneVersion}`
            : ""}
          . Nonexistent or ambiguous clock-change times are rejected rather than guessed.
        </Text>
        {!workspaceTimeZoneReady(workspaceTimeZoneState) ? (
          <Text style={styles.lifecycleWarning}>
            Scheduling is disabled until the workspace owner configures the authoritative
            IANA time zone. An unscheduled job can still be saved.
          </Text>
        ) : null}
        {scheduleReviewRequired ? (
          <View style={styles.choiceStack}>
            <Text style={styles.lifecycleWarning}>
              A wall time without an exact instant was cleared after the workspace time
              zone changed. Choose the schedule again, or explicitly keep this job
              unscheduled before saving.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Keep job unscheduled after time zone change"
              onPress={() => {
                setScheduledStartAt("");
                setScheduledEndAt("");
                setScheduledStartAtIsoHint("");
                setScheduledEndAtIsoHint("");
                setScheduleReviewRequired(false);
                setContentDirty(true);
              }}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>Keep job unscheduled</Text>
            </Pressable>
          </View>
        ) : null}
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
          <Text style={styles.safetyTitle}>Proposed assignee · review only</Text>
          <Text style={styles.safetyText}>
            Free-text IDs are never accepted. Saving a proposal rechecks the exact current
            workspace member and record version. It performs no notification, task,
            customer contact, or assignment side effect.
          </Text>
          {!selected ? (
            <Text style={styles.lifecycleHint}>
              Save the job first. The backend requires a persisted record and exact
              version before an assignee proposal can be reviewed.
            </Text>
          ) : assigneeLoading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={palette.accent} />
              <Text style={styles.safetyText}>Loading current workspace members…</Text>
            </View>
          ) : assigneeLoadError ? (
            <View style={styles.choiceStack}>
              <Text style={styles.errorText}>{assigneeLoadError}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Retry current Facility members"
                onPress={() => void loadFacilityAssignees()}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>Retry members</Text>
              </Pressable>
            </View>
          ) : (
            <View accessibilityRole="radiogroup" style={styles.choiceStack}>
              <Pressable
                accessibilityRole="radio"
                accessibilityLabel="No proposed job assignee"
                accessibilityState={{ checked: !assigneeUserId }}
                onPress={() => {
                  setAssigneeUserId("");
                  setAssigneeEvidence(null);
                  setContentDirty(true);
                }}
                style={[
                  styles.assigneeChoice,
                  !assigneeUserId && styles.assigneeChoiceSelected
                ]}
              >
                <Text
                  style={[
                    styles.assigneeChoiceText,
                    !assigneeUserId && styles.assigneeChoiceTextSelected
                  ]}
                >
                  No proposed assignee
                </Text>
              </Pressable>
              {assigneeOptions.map((option) => {
                const chosen = assigneeUserId === option.userId;
                return (
                  <Pressable
                    key={option.userId}
                    accessibilityRole="radio"
                    accessibilityLabel={`Propose job assignee ${option.label}`}
                    accessibilityState={{ checked: chosen }}
                    onPress={() => {
                      setAssigneeUserId(option.userId);
                      setAssigneeEvidence(null);
                      setContentDirty(true);
                    }}
                    style={[
                      styles.assigneeChoice,
                      chosen && styles.assigneeChoiceSelected
                    ]}
                  >
                    <Text
                      style={[
                        styles.assigneeChoiceText,
                        chosen && styles.assigneeChoiceTextSelected
                      ]}
                    >
                      {option.label} · {option.role}
                    </Text>
                  </Pressable>
                );
              })}
              {assigneeUserId &&
              !assigneeOptions.some((option) => option.userId === assigneeUserId) ? (
                <Text style={styles.lifecycleWarning}>
                  The saved proposal is not in the current authorized member list. Reload
                  members or clear it; GrowPathAI will not substitute a nearby identity.
                </Text>
              ) : null}
              {workspace.workspaceType === "commercial" && !assigneeOptions.length ? (
                <Text style={styles.lifecycleWarning}>
                  The current Commercial identity is unavailable, so a self proposal
                  cannot be offered yet.
                </Text>
              ) : null}
            </View>
          )}
          {assigneeEvidence?.authorizationStatus ? (
            <Text style={styles.providerStatus}>
              Saved proposal evidence:{" "}
              {String(assigneeEvidence.authorizationStatus).replace(/_/g, " ")}
              {assigneeEvidence.assigneeRole
                ? ` · member role ${assigneeEvidence.assigneeRole}`
                : ""}
              {assigneeEvidence.authorizationCheckedAt
                ? ` · checked ${assigneeEvidence.authorizationCheckedAt}`
                : ""}
              . Side effects performed: none.
            </Text>
          ) : null}
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
        {new Set([
          "BUSINESS_DESK_WORKSPACE_ACCESS_CHANGED",
          "BUSINESS_DESK_JOB_ASSIGNEE_INVALID",
          "BUSINESS_DESK_VERSION_CONFLICT",
          "BUSINESS_DESK_WORKSPACE_TIME_ZONE_REQUIRED",
          "BUSINESS_DESK_WORKSPACE_TIME_ZONE_CHANGED"
        ]).has(formErrorCode) ? (
          <View style={styles.choiceStack}>
            <Text style={styles.lifecycleWarning}>
              Your unsaved job draft remains on screen. Reload current permissions,
              members, records, and the workspace time zone before comparing or retrying.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Reload job authorization data"
              onPress={() => {
                void collection.reload();
                void loadFacilityAssignees();
                void workspaceTimeZoneState.reload();
              }}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>Reload authorization data</Text>
            </Pressable>
          </View>
        ) : null}
        <RecordSaveArchiveActions
          saving={collection.saving}
          saveDisabled={scheduleWriteBlocked}
          hasRecord={Boolean(businessDeskRecordId(selected))}
          saveLabel="Save job record"
          archiveReason={archiveReason}
          onArchiveReasonChange={setArchiveReason}
          onSave={() => void save()}
          onArchive={() => void archive()}
        />
      </AppCard>

      <ReviewedArtifactPanel
        workspace={workspace}
        artifactKind="job_redacted_csv"
        revisionSelections={
          selected && !contentDirty
            ? [
                {
                  recordId: businessDeskRecordId(selected),
                  revisionNumber: selected.version
                }
              ]
            : []
        }
        expectedRedactionProfile={
          BUSINESS_DESK_ARTIFACT_REDACTION_PROFILES.job_redacted_csv
        }
        title="PII-redacted job CSV"
        selectionLabel={
          selected && !contentDirty
            ? `Pinned to unchanged saved job revision ${selected.version}.`
            : "Select an unchanged saved job revision to preview."
        }
        disclosure="This redacted operational CSV intentionally omits direct customer contact PII and the private job location. Protected attachments are not embedded. Review the returned field manifest and exact preview because redaction does not make every remaining business detail public. No customer update, assignment, completion, delivery, or payment is implied."
        disabled={
          !selected || contentDirty || activeAttachmentDraft.blocking || collection.saving
        }
        disabledReason={
          contentDirty || activeAttachmentDraft.blocking
            ? "Unsaved or pending job changes are distinct from the saved revision. Finish, save, or discard them before previewing a redacted export."
            : "Save and select one exact job revision before previewing its redacted CSV."
        }
        previewButtonLabel="Preview PII-redacted job CSV"
        prepareButtonLabel="Confirm and export redacted job CSV"
        stalenessKey={`${businessDeskRecordId(selected)}:${selected?.version || 0}:${contentDirty || activeAttachmentDraft.blocking ? "changed" : "saved"}`}
      />
    </RecordToolScaffold>
  );
}

function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    assigneeChoice: {
      borderColor: palette.border,
      borderRadius: 10,
      borderWidth: 1,
      minHeight: 42,
      paddingHorizontal: 12,
      paddingVertical: 10
    },
    assigneeChoiceSelected: {
      backgroundColor: palette.accent,
      borderColor: palette.accent
    },
    assigneeChoiceText: { color: palette.text, fontSize: 12, fontWeight: "800" },
    assigneeChoiceTextSelected: { color: palette.accentText },
    attachmentBox: { marginTop: 12 },
    choiceStack: { gap: 8 },
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
    loadingRow: { alignItems: "center", flexDirection: "row", gap: 8 },
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
    secondaryButton: {
      alignItems: "center",
      alignSelf: "flex-start",
      borderColor: palette.border,
      borderRadius: 10,
      borderWidth: 1,
      minHeight: 42,
      paddingHorizontal: 14,
      paddingVertical: 10
    },
    secondaryButtonText: { color: palette.text, fontSize: 12, fontWeight: "900" },
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
