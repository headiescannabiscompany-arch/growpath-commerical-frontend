import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { BusinessDeskRecord, BusinessDeskWorkspace } from "@/api/businessDesk";
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
import RecordToolScaffold from "@/features/businessDesk/RecordToolScaffold";
import { parseMoneyInput, resolveCurrencyContext } from "@/features/businessDesk/money";
import {
  businessDeskRecordId,
  isoToLocalDateTime,
  localDateTimeToIso,
  useBusinessDeskRecordCollection
} from "@/features/businessDesk/recordWorkflow";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";

type LeadStatus =
  | "new"
  | "contacted"
  | "quote_requested"
  | "quote_sent"
  | "considering"
  | "won"
  | "lost"
  | "on_hold";

const LEAD_STATUSES: Array<{ value: LeadStatus; label: string }> = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "quote_requested", label: "Quote requested" },
  { value: "quote_sent", label: "Quote sent" },
  { value: "considering", label: "Considering" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
  { value: "on_hold", label: "On hold" }
];

const LEAD_RELATED_KINDS = [
  "quote",
  "lead",
  "job",
  "expense",
  "vendor_comparison",
  "cash_flow_snapshot",
  "assistant_draft"
] as const;

const LEAD_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  new: ["contacted", "quote_requested", "lost", "on_hold"],
  contacted: ["quote_requested", "quote_sent", "considering", "lost", "on_hold"],
  quote_requested: ["quote_sent", "considering", "lost", "on_hold"],
  quote_sent: ["considering", "won", "lost", "on_hold"],
  considering: ["quote_sent", "won", "lost", "on_hold"],
  won: [],
  lost: ["contacted", "on_hold"],
  on_hold: ["contacted", "quote_requested", "considering", "lost"]
};

export function allowedLeadTransitions(status: LeadStatus) {
  return LEAD_TRANSITIONS[status];
}

function leadStatusLabel(status: LeadStatus) {
  return LEAD_STATUSES.find((option) => option.value === status)?.label || status;
}

function relatedSourceIds(record: BusinessDeskRecord | null) {
  if (!record?.sourceLinks) return [];
  const allowed = new Set<string>(LEAD_RELATED_KINDS);
  return record.sourceLinks
    .filter((source) => allowed.has(String(source.entityType || "")))
    .map((source) => String(source.entityId || ""))
    .filter(Boolean);
}

export type LeadFollowUpState =
  | "closed"
  | "missing_action"
  | "missing_date"
  | "overdue"
  | "scheduled";

export function getLeadFollowUpState(
  status: LeadStatus,
  nextAction: string,
  nextActionAt: string,
  now = Date.now()
): LeadFollowUpState {
  if (status === "won" || status === "lost") return "closed";
  if (!nextAction.trim()) return "missing_action";
  if (!nextActionAt.trim()) return "missing_date";
  const scheduledAt = Date.parse(nextActionAt);
  if (!Number.isFinite(scheduledAt)) return "missing_date";
  return scheduledAt < now ? "overdue" : "scheduled";
}

type LeadFollowUpToolProps = {
  workspace: BusinessDeskWorkspace;
  workspaceLabel: "Commercial" | "Facility";
  basePath: string;
};

function leadPayload(record: BusinessDeskRecord | null) {
  return (record?.payload?.lead || {}) as any;
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

function moneyMinorToInput(value: unknown, minorUnitDigits: unknown) {
  if (!Number.isSafeInteger(value)) return "";
  const digits = Number.isInteger(minorUnitDigits) ? Number(minorUnitDigits) : 2;
  const scale = 10 ** digits;
  const absolute = Math.abs(Number(value));
  const whole = Math.floor(absolute / scale);
  const fraction = digits ? `.${String(absolute % scale).padStart(digits, "0")}` : "";
  return `${Number(value) < 0 ? "-" : ""}${whole}${fraction}`;
}

function parseEstimatedValue(value: string, currency: string) {
  const context = resolveCurrencyContext(currency);
  const fraction = /^\d+(?:\.(\d+))?$/.exec(value.trim())?.[1] || "";
  if (fraction.length > context.minorUnitDigits) {
    throw new Error(
      `Estimated value supports at most ${context.minorUnitDigits} decimal place${
        context.minorUnitDigits === 1 ? "" : "s"
      } in ${context.currency}.`
    );
  }
  return {
    amountMinor: parseMoneyInput(value, context, { label: "Estimated value" }),
    currency: context.currency,
    minorUnitDigits: context.minorUnitDigits
  };
}

export default function LeadFollowUpTool({
  workspace,
  workspaceLabel,
  basePath
}: LeadFollowUpToolProps) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const collection = useBusinessDeskRecordCollection(workspace, "lead");
  const related = useAuthorizedBusinessDeskRecords(workspace, LEAD_RELATED_KINDS);
  const [selected, setSelected] = useState<BusinessDeskRecord | null>(null);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<LeadStatus>("new");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [contactProvidedVoluntarily, setContactProvidedVoluntarily] = useState(false);
  const [interest, setInterest] = useState("");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [currency, setCurrency] = useState("");
  const [source, setSource] = useState("");
  const [lastContactedAt, setLastContactedAt] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [nextFollowUpAt, setNextFollowUpAt] = useState("");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");
  const [relatedRecordIds, setRelatedRecordIds] = useState<string[]>([]);
  const [nextStatus, setNextStatus] = useState<LeadStatus | "">("");
  const [archiveReason, setArchiveReason] = useState("");
  const [formError, setFormError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [contentDirty, setContentDirty] = useState(false);

  const followUpState = getLeadFollowUpState(
    status,
    nextAction,
    localDateTimeToIso(nextFollowUpAt) || ""
  );

  const reset = () => {
    setSelected(null);
    setTitle("");
    setStatus("new");
    setName("");
    setCompany("");
    setEmail("");
    setPhone("");
    setContactProvidedVoluntarily(false);
    setInterest("");
    setEstimatedValue("");
    setCurrency("");
    setSource("");
    setLastContactedAt("");
    setNextAction("");
    setNextFollowUpAt("");
    setNotes("");
    setTags("");
    setRelatedRecordIds([]);
    setNextStatus("");
    setArchiveReason("");
    setFormError("");
    setFeedback("");
    setContentDirty(false);
  };

  const open = (record: BusinessDeskRecord) => {
    const lead = leadPayload(record);
    setSelected(record);
    setTitle(record.title || "");
    setStatus((record.status || lead.stage || "new") as LeadStatus);
    setName(String(lead.contact?.name || ""));
    setCompany(String(lead.contact?.company || ""));
    setEmail(String(lead.contact?.email || ""));
    setPhone(String(lead.contact?.phone || ""));
    setContactProvidedVoluntarily(Boolean(lead.contactProvidedVoluntarily));
    setInterest(String(lead.interest || ""));
    const digits = lead.estimatedValueMinorUnitDigits ?? lead.minorUnitDigits;
    setEstimatedValue(moneyMinorToInput(lead.estimatedValueMinor, digits));
    setCurrency(String(lead.estimatedValueCurrency || lead.currency || ""));
    setSource(String(lead.source || ""));
    setLastContactedAt(isoToLocalDateTime(lead.lastContactedAt));
    setNextAction(String(lead.nextAction || ""));
    setNextFollowUpAt(isoToLocalDateTime(lead.nextActionAt || lead.nextFollowUpAt));
    setNotes(String(lead.notes || ""));
    setTags(Array.isArray(lead.tags) ? lead.tags.join(", ") : "");
    setRelatedRecordIds(relatedSourceIds(record));
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
      if (!title.trim()) throw new Error("Give this lead a clear record title.");
      if (!name.trim() && !company.trim()) {
        throw new Error("Enter the voluntarily supplied person or business name.");
      }
      if (!validEmail(email.trim()))
        throw new Error("Enter a valid email or leave it blank.");
      if ((email.trim() || phone.trim()) && !contactProvidedVoluntarily) {
        throw new Error(
          "Confirm that the lead voluntarily supplied the email or phone before saving it."
        );
      }
      let estimatedValueMinor: number | null = null;
      let normalizedCurrency = "";
      let minorUnitDigits: number | null = null;
      if (estimatedValue.trim()) {
        const parsed = parseEstimatedValue(estimatedValue, currency);
        estimatedValueMinor = parsed.amountMinor;
        normalizedCurrency = parsed.currency;
        minorUnitDigits = parsed.minorUnitDigits;
      } else if (currency.trim()) {
        throw new Error(
          "Remove the currency or enter the estimated value it belongs to."
        );
      }
      const parsedTags = tags
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      if (parsedTags.length > 30) throw new Error("Use at most 30 lead tags.");

      const authorizedRecords = new Map(
        related.records.map((record) => [businessDeskRecordId(record), record])
      );
      const sourceLinks = relatedRecordIds.map((recordId) => {
        const record = authorizedRecords.get(recordId);
        if (!record || businessDeskRecordId(record) === businessDeskRecordId(selected)) {
          throw new Error(
            "A related record is no longer available in this workspace. Remove it or choose an authorized record before saving."
          );
        }
        return {
          entityType: record.kind,
          entityId: recordId,
          label: record.title
        };
      });

      const savedStatus = selected ? status : "new";

      const record = await collection.save(
        {
          title: title.trim(),
          status: savedStatus,
          payload: {
            lead: {
              contact: {
                name: name.trim(),
                company: company.trim(),
                email: email.trim().toLowerCase(),
                phone: phone.trim()
              },
              contactProvidedVoluntarily,
              interest: interest.trim(),
              estimatedValueMinor,
              estimatedValueCurrency: normalizedCurrency,
              estimatedValueMinorUnitDigits: minorUnitDigits,
              source: source.trim(),
              lastContactedAt: localDateTimeToIso(lastContactedAt),
              nextAction: nextAction.trim(),
              nextActionAt: localDateTimeToIso(nextFollowUpAt),
              notes: notes.trim(),
              tags: parsedTags
            }
          },
          sourceLinks
        },
        selected
      );
      open(record);
      setFeedback(
        selected
          ? `Lead content saved as revision ${record.version}; status stayed ${leadStatusLabel(
              record.status as LeadStatus
            )}.`
          : `Lead created as New, revision ${record.version}.`
      );
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "The lead could not be saved."
      );
    }
  };

  const transitionStatus = async () => {
    setFormError("");
    setFeedback("");
    try {
      if (!selected) throw new Error("Save the New lead before changing its status.");
      if (contentDirty) {
        throw new Error(
          "Save or discard the unsaved lead changes before changing its status."
        );
      }
      if (!nextStatus || !allowedLeadTransitions(status).includes(nextStatus)) {
        throw new Error("Choose an allowed next lead status.");
      }
      const transitioned = await collection.transition(selected, { status: nextStatus });
      const priorStatus = status;
      open(transitioned);
      setFeedback(
        `Lead moved from ${leadStatusLabel(priorStatus)} to ${leadStatusLabel(
          transitioned.status as LeadStatus
        )} at revision ${transitioned.version}.`
      );
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "The lead status could not be changed."
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
        error instanceof Error ? error.message : "The lead could not be archived."
      );
    }
  };

  return (
    <RecordToolScaffold
      title="Lead Follow-up"
      workspaceLabel={workspaceLabel}
      basePath={basePath}
      description="Keep a small, voluntary opportunity record and the next human-reviewed action—without profiling people or becoming a full CRM."
      records={collection.records}
      selectedRecord={selected}
      loading={collection.loading}
      error={collection.error}
      onRetry={() => void collection.reload()}
      onNew={reset}
      onSelect={open}
    >
      <AppCard
        title={selected ? `Edit revision ${selected.version}` : "New lead"}
        titleLevel={2}
        subtitle="Nothing here contacts the lead automatically. AI drafting will remain a separate reviewed action."
      >
        <View style={styles.fieldGrid}>
          <LabeledInput
            label="Record title"
            accessibilityLabel="Lead record title"
            value={title}
            onChangeText={dirtySetter(setTitle, () => setContentDirty(true))}
            placeholder="Spring landscape estimate"
          />
          <LabeledInput
            label="Person name"
            accessibilityLabel="Lead person name"
            value={name}
            onChangeText={dirtySetter(setName, () => setContentDirty(true))}
            placeholder="Voluntarily supplied name"
          />
          <LabeledInput
            label="Business name"
            accessibilityLabel="Lead business name"
            value={company}
            onChangeText={dirtySetter(setCompany, () => setContentDirty(true))}
            placeholder="Business or organization"
          />
          <LabeledInput
            label="Email"
            accessibilityLabel="Lead email"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={dirtySetter(setEmail, () => setContentDirty(true))}
            placeholder="name@example.com"
          />
          <LabeledInput
            label="Phone"
            accessibilityLabel="Lead phone"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={dirtySetter(setPhone, () => setContentDirty(true))}
            placeholder="Optional"
          />
          <LabeledInput
            label="Source"
            accessibilityLabel="Lead source"
            value={source}
            onChangeText={dirtySetter(setSource, () => setContentDirty(true))}
            placeholder="Referral, website, event…"
          />
        </View>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityLabel="Lead contact details were supplied voluntarily"
          accessibilityState={{ checked: contactProvidedVoluntarily }}
          onPress={() => {
            setContactProvidedVoluntarily((current) => !current);
            setContentDirty(true);
          }}
          style={styles.checkboxRow}
        >
          <View
            style={[
              styles.checkbox,
              contactProvidedVoluntarily && styles.checkboxChecked
            ]}
          />
          <View style={styles.checkboxCopy}>
            <Text style={styles.checkboxLabel}>
              Contact details were supplied voluntarily
            </Text>
            <Text style={styles.checkboxHint}>
              Required before saving an email or phone. GrowPathAI never contacts the lead
              automatically.
            </Text>
          </View>
        </Pressable>
        <View style={styles.lifecycleBox}>
          <Text style={styles.lifecycleTitle}>
            Current status: {leadStatusLabel(status)}
          </Text>
          {!selected ? (
            <Text style={styles.lifecycleHint}>
              New leads always start as New. Save the voluntary record first, then use an
              allowed status transition.
            </Text>
          ) : allowedLeadTransitions(status).length ? (
            <>
              <StatusSelector
                label="Next lead status"
                value={nextStatus}
                options={[
                  { value: "" as const, label: "Choose next status" },
                  ...LEAD_STATUSES.filter((option) =>
                    allowedLeadTransitions(status).includes(option.value)
                  )
                ]}
                onChange={setNextStatus}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Change lead status"
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
              This status has no next transition. Content corrections still create an
              audited revision.
            </Text>
          )}
        </View>
        <View style={styles.fieldGrid}>
          <LabeledInput
            label="Interest or request"
            accessibilityLabel="Lead interest"
            multiline
            value={interest}
            onChangeText={dirtySetter(setInterest, () => setContentDirty(true))}
            placeholder="What they asked about"
          />
          <LabeledInput
            label="Estimated value (optional)"
            accessibilityLabel="Lead estimated value"
            keyboardType="decimal-pad"
            value={estimatedValue}
            onChangeText={dirtySetter(setEstimatedValue, () => setContentDirty(true))}
            placeholder="0.00"
            hint="Planning value only; it is not a sale or payment."
          />
          <LabeledInput
            label="Estimated value currency"
            accessibilityLabel="Lead estimated value currency"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={3}
            value={currency}
            onChangeText={dirtySetter(setCurrency, () => setContentDirty(true))}
            placeholder="Required only with a value"
          />
        </View>
        <View style={styles.fieldGrid}>
          <View style={styles.dateField}>
            <CalendarDateField
              label="Last contacted"
              accessibilityLabel="Lead last contacted date and time"
              mode="datetime"
              value={lastContactedAt}
              onChange={dirtySetter(setLastContactedAt, () => setContentDirty(true))}
              placeholder="No recorded contact"
            />
          </View>
          <View style={styles.dateField}>
            <CalendarDateField
              label="Next follow-up"
              accessibilityLabel="Lead next follow-up date and time"
              mode="datetime"
              value={nextFollowUpAt}
              onChange={dirtySetter(setNextFollowUpAt, () => setContentDirty(true))}
              placeholder="No follow-up scheduled"
            />
          </View>
          <LabeledInput
            label="Next action"
            accessibilityLabel="Lead next action"
            value={nextAction}
            onChangeText={dirtySetter(setNextAction, () => setContentDirty(true))}
            placeholder="Call, prepare quote, answer question…"
          />
          <LabeledInput
            label="Tags"
            accessibilityLabel="Lead tags"
            value={tags}
            onChangeText={dirtySetter(setTags, () => setContentDirty(true))}
            placeholder="Comma-separated, optional"
          />
        </View>
        <LabeledInput
          label="Notes"
          accessibilityLabel="Lead notes"
          multiline
          value={notes}
          onChangeText={dirtySetter(setNotes, () => setContentDirty(true))}
          placeholder="Record facts and context; do not infer sensitive traits."
        />
        <AuthorizedRelatedRecordPicker
          label="Related workspace records"
          hint="Choose only records returned from this authorized workspace. GrowPathAI verifies every selected link again on save."
          records={related.records}
          loading={related.loading}
          error={related.error}
          selectedIds={relatedRecordIds}
          multiple
          excludeId={businessDeskRecordId(selected)}
          onChange={(ids) => {
            setRelatedRecordIds(ids);
            setContentDirty(true);
          }}
          onRetry={() => void related.reload()}
        />
        <View
          accessibilityLiveRegion="polite"
          style={[
            styles.followUpStatus,
            followUpState === "overdue" && styles.followUpStatusUrgent
          ]}
        >
          <Text style={styles.followUpStatusTitle}>
            {followUpState === "closed"
              ? "Outcome recorded"
              : followUpState === "overdue"
                ? "Follow-up overdue"
                : followUpState === "scheduled"
                  ? "Follow-up scheduled"
                  : "Follow-up needed"}
          </Text>
          <Text style={styles.followUpStatusText}>
            {followUpState === "closed"
              ? "Won and lost leads do not require another action unless you reopen them."
              : followUpState === "missing_action"
                ? "Record the next human action so this opportunity does not disappear from view."
                : followUpState === "missing_date"
                  ? "The next action has no follow-up date or time."
                  : followUpState === "overdue"
                    ? "The recorded next follow-up time has passed; update it after handling the action."
                    : "The next action and follow-up time are both recorded."}
          </Text>
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
          saveLabel="Save lead record"
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
    checkbox: {
      borderColor: palette.border,
      borderRadius: 4,
      borderWidth: 2,
      height: 19,
      marginTop: 2,
      width: 19
    },
    checkboxChecked: { backgroundColor: palette.accent, borderColor: palette.accent },
    checkboxCopy: { flex: 1, gap: 2 },
    checkboxHint: { color: palette.textMuted, fontSize: 11, lineHeight: 16 },
    checkboxLabel: { color: palette.text, fontSize: 13, fontWeight: "800" },
    checkboxRow: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: 9,
      marginBottom: 12,
      marginTop: 4
    },
    dateField: { flexBasis: 250, flexGrow: 1, minWidth: 220 },
    errorText: { color: palette.danger, fontSize: 13, fontWeight: "800" },
    feedbackText: { color: palette.success, fontSize: 13, fontWeight: "800" },
    fieldGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    followUpStatus: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: 10,
      borderWidth: 1,
      gap: 3,
      marginBottom: 12,
      padding: 12
    },
    followUpStatusText: { color: palette.textMuted, fontSize: 12, lineHeight: 17 },
    followUpStatusTitle: { color: palette.text, fontSize: 13, fontWeight: "900" },
    followUpStatusUrgent: { borderColor: palette.danger },
    disabled: { opacity: 0.6 },
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
