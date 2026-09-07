import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Picker } from "@react-native-picker/picker";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import {
  addRestrictedCaseNote,
  getEvidenceVaultCapabilities,
  listRemovedAccounts,
  listRestrictedCaseRecords,
  listRestrictedCases,
  quarantineAccount,
  recordRestrictedExternalReport,
  restoreQuarantinedAccount,
  reviewAccountRemoval,
  reviewAccountRestore,
  type AccountRemovalCategory,
  type AccountRemovalInput,
  type AccountRemovalReview,
  type EvidenceVaultCapabilities,
  type RemovedAccountSummary,
  type RestoreReview,
  type RestrictedCaseRecord,
  type RestrictedCaseSummary
} from "@/api/adminEvidenceVault";
import AppCard from "@/components/layout/AppCard";
import { AdminEvidenceApprovalWorkspace } from "@/features/admin/AdminEvidenceApprovalPanel";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

export type AdminEvidenceVaultUser = {
  id: string;
  email: string;
  label?: string;
  role?: string;
};

const REMOVAL_CATEGORIES: Array<{ label: string; value: AccountRemovalCategory }> = [
  { label: "Test-account cleanup", value: "test_cleanup" },
  { label: "User request", value: "user_request" },
  { label: "Policy enforcement", value: "policy_enforcement" },
  { label: "Security or fraud", value: "security_fraud" },
  { label: "Legal process", value: "legal_process" },
  { label: "Other reviewed reason", value: "other" }
];

const BLOCKER_LABELS: Record<string, string> = {
  self: "You cannot remove the account currently performing this action.",
  sole_active_admin: "The sole active Platform Admin cannot be removed.",
  admin_safety_unverified:
    "GrowPath could not verify that another active Platform Admin would remain.",
  protected_platform_identity: "This immutable platform identity is protected.",
  already_quarantined_or_removed: "This account is already quarantined or removed.",
  active_or_unsettled_subscription:
    "The account has a live or unsettled recurring subscription.",
  active_gift_subscription: "The account has active gifted access.",
  stripe_subscription: "Stripe reports subscription state that must be resolved first.",
  stripe_unsettled_invoice: "Stripe reports an unsettled invoice.",
  stripe_connect_account: "A connected payout account must be handled separately.",
  stripe_reconciliation_unverified:
    "Stripe could not be verified. Removal fails closed and did not continue."
};

function dateLabel(value: string | null | undefined) {
  if (!value) return "not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "invalid date" : date.toLocaleString();
}

function errorLabel(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function AdminEvidenceVaultCard({
  users,
  requestedUser = null
}: {
  users: AdminEvidenceVaultUser[];
  requestedUser?: AdminEvidenceVaultUser | null;
}) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const capabilityLoadAttempted = useRef(false);
  const [busy, setBusy] = useState("");
  const [feedback, setFeedback] = useState("");
  const [capabilityState, setCapabilityState] =
    useState<EvidenceVaultCapabilities | null>(null);
  const [removed, setRemoved] = useState<RemovedAccountSummary[]>([]);
  const [restrictedCases, setRestrictedCases] = useState<RestrictedCaseSummary[]>([]);

  const [targetUserId, setTargetUserId] = useState("");
  const [expectedEmail, setExpectedEmail] = useState("");
  const [category, setCategory] = useState<AccountRemovalCategory>("test_cleanup");
  const [reason, setReason] = useState("");
  const [caseReference, setCaseReference] = useState("");
  const [removalReview, setRemovalReview] = useState<AccountRemovalReview | null>(null);
  const [removalConfirmation, setRemovalConfirmation] = useState("");

  const [restoreArchiveId, setRestoreArchiveId] = useState("");
  const [restoreReview, setRestoreReview] = useState<RestoreReview | null>(null);
  const [restoreConfirmation, setRestoreConfirmation] = useState("");

  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [caseRecords, setCaseRecords] = useState<RestrictedCaseRecord[]>([]);
  const [caseNote, setCaseNote] = useState("");
  const [caseNoteConfirmation, setCaseNoteConfirmation] = useState("");
  const [showExternalReport, setShowExternalReport] = useState(false);
  const [agencyCategory, setAgencyCategory] = useState<
    "local" | "state" | "federal" | "ncmec" | "other"
  >("local");
  const [agencyReference, setAgencyReference] = useState("");
  const [reportReference, setReportReference] = useState("");
  const [reportSubmittedAt, setReportSubmittedAt] = useState("");
  const [reportSummary, setReportSummary] = useState("");
  const [reportConfirmation, setReportConfirmation] = useState("");

  const removalInput: AccountRemovalInput = {
    expectedEmail: expectedEmail.trim().toLowerCase(),
    removalCategory: category,
    reason: reason.trim(),
    caseReference: caseReference.trim()
  };

  function invalidateRemovalReview() {
    setRemovalReview(null);
    setRemovalConfirmation("");
  }

  const refreshWorkspace = useCallback(async () => {
    setLoading(true);
    setFeedback("");
    try {
      const capabilities = await getEvidenceVaultCapabilities();
      setCapabilityState(capabilities);
      const [accounts, cases] = await Promise.all([
        capabilities.capabilities.accountRemovalOwner
          ? listRemovedAccounts()
          : Promise.resolve({ accounts: [], nextCursor: null }),
        capabilities.capabilities.severeHarmReview
          ? listRestrictedCases()
          : Promise.resolve([])
      ]);
      setRemoved(accounts.accounts);
      setRestrictedCases(cases);
    } catch (error) {
      setFeedback(errorLabel(error, "Unable to load restricted Admin controls."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!requestedUser) return;
    capabilityLoadAttempted.current = false;
    setExpanded(true);
    setTargetUserId(requestedUser.id);
    setExpectedEmail("");
    setCategory("test_cleanup");
    setReason("");
    setCaseReference("");
    setRemovalReview(null);
    setRemovalConfirmation("");
  }, [requestedUser]);

  useEffect(() => {
    if (expanded && !capabilityState && !loading && !capabilityLoadAttempted.current) {
      capabilityLoadAttempted.current = true;
      void refreshWorkspace();
    }
  }, [capabilityState, expanded, loading, refreshWorkspace]);

  function toggle() {
    setExpanded((current) => {
      if (current) return false;
      if (!capabilityState) capabilityLoadAttempted.current = false;
      return true;
    });
  }

  async function runRemovalReview() {
    if (busy || !targetUserId) return;
    setBusy("removal-review");
    setFeedback("");
    setRemovalReview(null);
    setRemovalConfirmation("");
    try {
      const review = await reviewAccountRemoval(targetUserId, removalInput);
      setRemovalReview(review);
      setFeedback(
        review.allowed
          ? "Safety review passed. No billing action occurred. Type the exact phrase to quarantine."
          : "Removal is blocked. No account, Stripe, gift, payout, or invoice state changed."
      );
    } catch (error) {
      setFeedback(errorLabel(error, "Account-removal review failed closed."));
    } finally {
      setBusy("");
    }
  }

  async function runQuarantine() {
    if (!removalReview?.reviewToken || busy) return;
    setBusy("quarantine");
    setFeedback("");
    try {
      const receipt = await quarantineAccount(targetUserId, {
        ...removalInput,
        reviewToken: removalReview.reviewToken,
        confirmation: removalConfirmation
      });
      setFeedback(
        `Account quarantined in private archive ${receipt.archiveId}. It remains reversible until retention permits verified finalization.`
      );
      setTargetUserId("");
      setExpectedEmail("");
      setReason("");
      setCaseReference("");
      setRemovalReview(null);
      setRemovalConfirmation("");
      const page = await listRemovedAccounts();
      setRemoved(page.accounts);
    } catch (error) {
      setFeedback(
        `${errorLabel(error, "Account quarantine failed.")} No automatic cancellation or refund was attempted.`
      );
    } finally {
      setBusy("");
    }
  }

  async function runRestoreReview() {
    if (busy || !restoreArchiveId.trim()) return;
    setBusy("restore-review");
    setFeedback("");
    setRestoreReview(null);
    setRestoreConfirmation("");
    try {
      const review = await reviewAccountRestore(restoreArchiveId.trim());
      setRestoreReview(review);
      setFeedback("Restore review passed. Type the exact phrase to restore the account.");
    } catch (error) {
      setFeedback(errorLabel(error, "Restore review failed closed."));
    } finally {
      setBusy("");
    }
  }

  async function runRestore() {
    if (!restoreReview?.reviewToken || busy) return;
    setBusy("restore");
    setFeedback("");
    try {
      await restoreQuarantinedAccount(restoreReview.archiveId, {
        reviewToken: restoreReview.reviewToken,
        confirmation: restoreConfirmation
      });
      setFeedback("The quarantined account was restored. The action remains audited.");
      setRestoreArchiveId("");
      setRestoreReview(null);
      setRestoreConfirmation("");
      const page = await listRemovedAccounts();
      setRemoved(page.accounts);
    } catch (error) {
      setFeedback(errorLabel(error, "Account restore failed closed."));
    } finally {
      setBusy("");
    }
  }

  async function loadCaseRecords(caseId: string) {
    if (busy) return;
    setBusy(`case:${caseId}`);
    setFeedback("");
    try {
      setSelectedCaseId(caseId);
      setCaseRecords(await listRestrictedCaseRecords(caseId));
    } catch (error) {
      setFeedback(errorLabel(error, "Restricted case records could not be opened."));
    } finally {
      setBusy("");
    }
  }

  async function saveCaseNote() {
    if (!selectedCaseId || busy) return;
    setBusy("case-note");
    setFeedback("");
    try {
      await addRestrictedCaseNote(selectedCaseId, {
        note: caseNote.trim(),
        confirmation: caseNoteConfirmation
      });
      setCaseNote("");
      setCaseNoteConfirmation("");
      setCaseRecords(await listRestrictedCaseRecords(selectedCaseId));
      setFeedback("Encrypted restricted case note recorded. Nothing was transmitted.");
    } catch (error) {
      setFeedback(errorLabel(error, "Restricted case note was not recorded."));
    } finally {
      setBusy("");
    }
  }

  async function saveExternalReportRecord() {
    if (!selectedCaseId || busy) return;
    setBusy("external-report");
    setFeedback("");
    try {
      await recordRestrictedExternalReport(selectedCaseId, {
        agencyCategory,
        agencyReference: agencyReference.trim(),
        reportReference: reportReference.trim(),
        submittedAt: reportSubmittedAt.trim(),
        summary: reportSummary.trim(),
        confirmation: reportConfirmation
      });
      setAgencyReference("");
      setReportReference("");
      setReportSubmittedAt("");
      setReportSummary("");
      setReportConfirmation("");
      setShowExternalReport(false);
      setCaseRecords(await listRestrictedCaseRecords(selectedCaseId));
      setFeedback(
        "The external report was recorded and encrypted. GrowPath did not send or disclose anything."
      );
    } catch (error) {
      setFeedback(errorLabel(error, "External-report record was not saved."));
    } finally {
      setBusy("");
    }
  }

  const capabilities = capabilityState?.capabilities;
  const canReviewRemoval =
    Boolean(targetUserId) &&
    removalInput.expectedEmail.length > 3 &&
    removalInput.reason.length >= 8 &&
    removalInput.caseReference.length >= 3 &&
    !busy;
  const canQuarantine =
    removalReview?.allowed === true &&
    Boolean(removalReview.reviewToken) &&
    removalConfirmation === removalReview.nextConfirmation &&
    !busy;
  const selectedRemovalUser = users.find((user) => user.id === targetUserId);

  return (
    <AppCard
      title="Removed accounts / Evidence vault"
      titleLevel={2}
      subtitle="Restricted, audited controls. Closed by default so the normal Admin account list stays compact."
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          expanded ? "Hide evidence vault controls" : "Open evidence vault controls"
        }
        accessibilityState={{ expanded }}
        onPress={() => void toggle()}
        style={styles.secondaryButton}
      >
        <Text style={styles.secondaryText}>
          {expanded ? "Hide restricted controls" : "Open restricted controls"}
        </Text>
      </Pressable>

      {expanded ? (
        <View style={styles.stack}>
          {loading ? <ActivityIndicator color={palette.accent} /> : null}
          {feedback ? (
            <Text accessibilityLiveRegion="polite" style={styles.feedback}>
              {feedback}
            </Text>
          ) : null}
          {capabilityState && !capabilityState.configured ? (
            <Text accessibilityRole="alert" style={styles.warning}>
              Restricted Admin identity configuration is incomplete. All vault actions are
              disabled.
            </Text>
          ) : null}
          {capabilityState ? (
            <Text style={styles.meta}>
              Removal owner:{" "}
              {capabilities?.accountRemovalOwner ? "authorized" : "not authorized"} ·
              Evidence access:{" "}
              {capabilities?.evidenceAccess ? "authorized" : "not authorized"} ·
              Independent approval:{" "}
              {capabilities?.evidenceApproval ? "authorized" : "not authorized"} ·
              Severe-harm review:{" "}
              {capabilities?.severeHarmReview ? "authorized" : "not authorized"}
            </Text>
          ) : null}

          <AdminEvidenceApprovalWorkspace />

          {capabilities?.accountRemovalOwner ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Two-step account quarantine</Text>
              <Text style={styles.meta}>
                Select an account only after reviewing it. The email must be typed again.
                GrowPath does not classify accounts from tokens, trial state, inactivity,
                or email patterns.
              </Text>
              {selectedRemovalUser ? (
                <Text accessibilityLiveRegion="polite" style={styles.meta}>
                  Selected account: {selectedRemovalUser.email}. Type the exact email and
                  complete both review steps below.
                </Text>
              ) : null}
              <View style={styles.pickerWrap}>
                <Picker
                  accessibilityLabel="Account selected for removal review"
                  selectedValue={targetUserId}
                  onValueChange={(value) => {
                    setTargetUserId(String(value));
                    setExpectedEmail("");
                    invalidateRemovalReview();
                  }}
                  style={styles.picker}
                >
                  <Picker.Item
                    label="Choose an account from the current search"
                    value=""
                  />
                  {users.map((user) => (
                    <Picker.Item
                      key={user.id}
                      label={`${user.label || user.email} · ${user.email}${user.role === "admin" ? " · protected Admin" : ""}`}
                      value={user.id}
                    />
                  ))}
                </Picker>
              </View>
              <TextInput
                accessibilityLabel="Type the reviewed account email"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                onChangeText={(value) => {
                  setExpectedEmail(value);
                  invalidateRemovalReview();
                }}
                placeholder="Type the exact account email"
                placeholderTextColor={palette.textMuted}
                selectionColor={palette.accent}
                style={styles.input}
                value={expectedEmail}
              />
              <View style={styles.pickerWrap}>
                <Picker
                  accessibilityLabel="Account removal category"
                  selectedValue={category}
                  onValueChange={(value) => {
                    setCategory(value as AccountRemovalCategory);
                    invalidateRemovalReview();
                  }}
                  style={styles.picker}
                >
                  {REMOVAL_CATEGORIES.map((option) => (
                    <Picker.Item
                      key={option.value}
                      label={option.label}
                      value={option.value}
                    />
                  ))}
                </Picker>
              </View>
              <TextInput
                accessibilityLabel="Account removal reason"
                multiline
                onChangeText={(value) => {
                  setReason(value);
                  invalidateRemovalReview();
                }}
                placeholder="Specific private reason (at least 8 characters)"
                placeholderTextColor={palette.textMuted}
                selectionColor={palette.accent}
                style={[styles.input, styles.multiline]}
                value={reason}
              />
              <TextInput
                accessibilityLabel="Account removal case reference"
                onChangeText={(value) => {
                  setCaseReference(value);
                  invalidateRemovalReview();
                }}
                placeholder="Support, cleanup, policy, or legal case reference"
                placeholderTextColor={palette.textMuted}
                selectionColor={palette.accent}
                style={styles.input}
                value={caseReference}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: !canReviewRemoval }}
                disabled={!canReviewRemoval}
                onPress={() => void runRemovalReview()}
                style={[styles.secondaryButton, !canReviewRemoval && styles.disabled]}
              >
                <Text style={styles.secondaryText}>
                  {busy === "removal-review"
                    ? "Reviewing account and Stripe…"
                    : "Review account removal"}
                </Text>
              </Pressable>

              {removalReview ? (
                <View
                  accessibilityLabel="Account removal safety review"
                  style={styles.review}
                >
                  <Text style={removalReview.allowed ? styles.success : styles.warning}>
                    {removalReview.allowed ? "Review passed" : "Removal blocked"}
                  </Text>
                  <Text style={styles.meta}>
                    Stripe verified: {removalReview.stripe.verified ? "yes" : "no"} ·
                    customers {removalReview.stripe.customerCount} · subscriptions{" "}
                    {removalReview.stripe.subscriptionCount} · unsettled invoices{" "}
                    {removalReview.stripe.unsettledInvoiceCount}
                  </Text>
                  <Text style={styles.warning}>
                    Billing action: none. No cancellation or refund is performed here.{" "}
                    {removalReview.billingEffect.requiredAction === "none"
                      ? "No separate billing action is required by this review."
                      : removalReview.billingEffect.requiredAction}
                  </Text>
                  <Text style={styles.meta}>
                    Ownership advisory: {removalReview.advisories.facilityOwnership}{" "}
                    facilities · {removalReview.advisories.courseOwnership} courses ·{" "}
                    {removalReview.advisories.storefrontOwnership} storefronts
                  </Text>
                  {removalReview.blockers.map((blocker) => (
                    <Text key={blocker} style={styles.warning}>
                      {BLOCKER_LABELS[blocker] || blocker.replaceAll("_", " ")}
                    </Text>
                  ))}
                  {removalReview.allowed ? (
                    <>
                      <Text style={styles.meta}>
                        Type exactly: {removalReview.nextConfirmation}
                      </Text>
                      <TextInput
                        accessibilityLabel="Exact account quarantine confirmation"
                        autoCapitalize="none"
                        autoCorrect={false}
                        onChangeText={setRemovalConfirmation}
                        placeholder="Type the exact quarantine phrase"
                        placeholderTextColor={palette.textMuted}
                        selectionColor={palette.accent}
                        style={styles.input}
                        value={removalConfirmation}
                      />
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ disabled: !canQuarantine }}
                        disabled={!canQuarantine}
                        onPress={() => void runQuarantine()}
                        style={[styles.dangerButton, !canQuarantine && styles.disabled]}
                      >
                        <Text style={styles.dangerText}>
                          {busy === "quarantine"
                            ? "Creating private archive…"
                            : "Quarantine reviewed account"}
                        </Text>
                      </Pressable>
                    </>
                  ) : null}
                </View>
              ) : null}
            </View>
          ) : null}

          {capabilities?.accountRemovalOwner ? (
            <View style={styles.section}>
              <View style={styles.rowBetween}>
                <Text style={styles.sectionTitle}>Removed accounts</Text>
                <Pressable
                  style={styles.linkButton}
                  onPress={() => void refreshWorkspace()}
                >
                  <Text style={styles.linkText}>Refresh</Text>
                </Pressable>
              </View>
              <Text style={styles.meta}>
                The list deliberately uses anonymous archive handles. Identity is not
                exposed from the vault list.
              </Text>
              {removed.map((archive) => (
                <View key={archive.archiveId} style={styles.archiveRow}>
                  <Text style={styles.rowTitle}>{archive.anonymousAccountLabel}</Text>
                  <Text style={styles.meta}>
                    {archive.quarantineStatus} · archived {dateLabel(archive.archivedAt)}{" "}
                    · purge eligibility {dateLabel(archive.purgeAfter)}
                  </Text>
                  <Text style={archive.legalHold ? styles.warning : styles.meta}>
                    {archive.legalHold
                      ? `Legal hold: ${archive.legalHoldAuthority} through ${dateLabel(archive.legalHoldExpiresAt)}`
                      : "No legal hold reported"}
                    {archive.operationalIssue ? " · operational review required" : ""}
                  </Text>
                  {archive.quarantineStatus === "quarantined" && !archive.legalHold ? (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        setRestoreArchiveId(archive.archiveId);
                        setRestoreReview(null);
                        setRestoreConfirmation("");
                      }}
                      style={styles.linkButton}
                    >
                      <Text style={styles.linkText}>Start reviewed restore</Text>
                    </Pressable>
                  ) : null}
                </View>
              ))}
              {!removed.length && !loading ? (
                <Text style={styles.meta}>
                  No quarantined or restored account archives were returned.
                </Text>
              ) : null}

              {restoreArchiveId ? (
                <View style={styles.review}>
                  <Text style={styles.rowTitle}>Restore {restoreArchiveId}</Text>
                  <Text style={styles.meta}>
                    GrowPath will privately bind this review to the account stored in the
                    selected archive. No user ID or email is exposed in the
                    removed-account list.
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Review selected account restore"
                    disabled={Boolean(busy)}
                    onPress={() => void runRestoreReview()}
                    style={styles.secondaryButton}
                  >
                    <Text style={styles.secondaryText}>Review restore</Text>
                  </Pressable>
                  {restoreReview ? (
                    <>
                      <Text style={styles.meta}>
                        Type exactly: {restoreReview.nextConfirmation}
                      </Text>
                      <TextInput
                        accessibilityLabel="Exact account restore confirmation"
                        autoCapitalize="none"
                        autoCorrect={false}
                        onChangeText={setRestoreConfirmation}
                        placeholder="Type the exact restore phrase"
                        placeholderTextColor={palette.textMuted}
                        selectionColor={palette.accent}
                        style={styles.input}
                        value={restoreConfirmation}
                      />
                      <Pressable
                        accessibilityRole="button"
                        disabled={
                          Boolean(busy) ||
                          restoreConfirmation !== restoreReview.nextConfirmation
                        }
                        onPress={() => void runRestore()}
                        style={styles.secondaryButton}
                      >
                        <Text style={styles.secondaryText}>Restore reviewed account</Text>
                      </Pressable>
                    </>
                  ) : null}
                </View>
              ) : null}
            </View>
          ) : null}

          {capabilities?.severeHarmReview ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Restricted severe-harm cases</Text>
              <Text style={styles.warning}>
                These controls preserve private notes or record a report already sent
                through an approved outside channel. They never transmit or mass-disclose
                data.
              </Text>
              {restrictedCases.map((item) => (
                <View key={item.id} style={styles.archiveRow}>
                  <Text style={styles.rowTitle}>Restricted case {item.id}</Text>
                  <Text style={styles.meta}>
                    {item.severity} · {item.status} · updated {dateLabel(item.updatedAt)}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => void loadCaseRecords(item.id)}
                    style={styles.linkButton}
                  >
                    <Text style={styles.linkText}>Open encrypted case record</Text>
                  </Pressable>
                </View>
              ))}
              {!restrictedCases.length && !loading ? (
                <Text style={styles.meta}>
                  No restricted severe-harm cases were returned.
                </Text>
              ) : null}

              {selectedCaseId ? (
                <View style={styles.review}>
                  <Text style={styles.rowTitle}>Restricted case {selectedCaseId}</Text>
                  {caseRecords.map((record) => (
                    <Text key={record.id} style={styles.meta}>
                      {dateLabel(record.createdAt)} ·{" "}
                      {record.recordType.replaceAll("_", " ")} ·{" "}
                      {record.data.note || record.data.summary || "encrypted record"}
                    </Text>
                  ))}
                  <TextInput
                    accessibilityLabel="Restricted case note"
                    multiline
                    onChangeText={setCaseNote}
                    placeholder="Private case note (at least 8 characters)"
                    placeholderTextColor={palette.textMuted}
                    selectionColor={palette.accent}
                    style={[styles.input, styles.multiline]}
                    value={caseNote}
                  />
                  <Text style={styles.meta}>
                    Confirmation: ADD RESTRICTED NOTE {selectedCaseId}
                  </Text>
                  <TextInput
                    accessibilityLabel="Exact restricted case note confirmation"
                    autoCapitalize="none"
                    autoCorrect={false}
                    onChangeText={setCaseNoteConfirmation}
                    placeholder="Type the exact note confirmation"
                    placeholderTextColor={palette.textMuted}
                    selectionColor={palette.accent}
                    style={styles.input}
                    value={caseNoteConfirmation}
                  />
                  <Pressable
                    accessibilityRole="button"
                    disabled={
                      Boolean(busy) ||
                      caseNote.trim().length < 8 ||
                      caseNoteConfirmation !== `ADD RESTRICTED NOTE ${selectedCaseId}`
                    }
                    onPress={() => void saveCaseNote()}
                    style={styles.secondaryButton}
                  >
                    <Text style={styles.secondaryText}>Encrypt and add case note</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded: showExternalReport }}
                    onPress={() => setShowExternalReport((current) => !current)}
                    style={styles.linkButton}
                  >
                    <Text style={styles.linkText}>
                      {showExternalReport
                        ? "Cancel report record"
                        : "Record an outside report already submitted"}
                    </Text>
                  </Pressable>
                  {showExternalReport ? (
                    <View style={styles.stack}>
                      <View style={styles.pickerWrap}>
                        <Picker
                          accessibilityLabel="Outside report agency category"
                          selectedValue={agencyCategory}
                          onValueChange={(value) => setAgencyCategory(value)}
                          style={styles.picker}
                        >
                          <Picker.Item label="Local agency" value="local" />
                          <Picker.Item label="State agency" value="state" />
                          <Picker.Item label="Federal agency" value="federal" />
                          <Picker.Item label="NCMEC" value="ncmec" />
                          <Picker.Item label="Other approved channel" value="other" />
                        </Picker>
                      </View>
                      <TextInput
                        accessibilityLabel="Outside agency reference"
                        onChangeText={setAgencyReference}
                        placeholder="Agency and destination reference"
                        placeholderTextColor={palette.textMuted}
                        selectionColor={palette.accent}
                        style={styles.input}
                        value={agencyReference}
                      />
                      <TextInput
                        accessibilityLabel="Outside report reference"
                        onChangeText={setReportReference}
                        placeholder="Submission or report reference"
                        placeholderTextColor={palette.textMuted}
                        selectionColor={palette.accent}
                        style={styles.input}
                        value={reportReference}
                      />
                      <TextInput
                        accessibilityLabel="Outside report submitted at"
                        autoCapitalize="none"
                        onChangeText={setReportSubmittedAt}
                        placeholder="Submitted time, ISO 8601"
                        placeholderTextColor={palette.textMuted}
                        selectionColor={palette.accent}
                        style={styles.input}
                        value={reportSubmittedAt}
                      />
                      <TextInput
                        accessibilityLabel="Outside report summary"
                        multiline
                        onChangeText={setReportSummary}
                        placeholder="Minimum-necessary report summary"
                        placeholderTextColor={palette.textMuted}
                        selectionColor={palette.accent}
                        style={[styles.input, styles.multiline]}
                        value={reportSummary}
                      />
                      <Text style={styles.meta}>
                        Confirmation: RECORD EXTERNAL REPORT {selectedCaseId}
                      </Text>
                      <TextInput
                        accessibilityLabel="Exact outside report confirmation"
                        autoCapitalize="none"
                        autoCorrect={false}
                        onChangeText={setReportConfirmation}
                        placeholder="Type the exact report confirmation"
                        placeholderTextColor={palette.textMuted}
                        selectionColor={palette.accent}
                        style={styles.input}
                        value={reportConfirmation}
                      />
                      <Pressable
                        accessibilityRole="button"
                        disabled={
                          Boolean(busy) ||
                          !agencyReference.trim() ||
                          !reportReference.trim() ||
                          !reportSubmittedAt.trim() ||
                          reportSummary.trim().length < 8 ||
                          reportConfirmation !==
                            `RECORD EXTERNAL REPORT ${selectedCaseId}`
                        }
                        onPress={() => void saveExternalReportRecord()}
                        style={styles.secondaryButton}
                      >
                        <Text style={styles.secondaryText}>
                          Encrypt submitted-report record
                        </Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>
          ) : null}

          <Text style={styles.meta}>
            Evidence release remains separate: it requires a completed legal request,
            minimum-necessary scope, a different configured approver, an expiring one-use
            review token, and a second exact confirmation.
          </Text>
        </View>
      ) : null}
    </AppCard>
  );
}

function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    stack: { gap: 10 },
    section: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.borderSoft,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 9,
      padding: 12
    },
    sectionTitle: { color: palette.text, fontSize: 15, fontWeight: "800" },
    rowTitle: { color: palette.text, fontSize: 13, fontWeight: "800" },
    meta: { color: palette.textMuted, fontSize: 12, lineHeight: 17 },
    feedback: { color: palette.text, fontSize: 13, fontWeight: "700", lineHeight: 18 },
    warning: { color: palette.warning, fontSize: 12, fontWeight: "700", lineHeight: 17 },
    success: { color: palette.success, fontSize: 13, fontWeight: "800" },
    input: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      color: palette.text,
      minHeight: 42,
      paddingHorizontal: 12,
      paddingVertical: 9
    },
    multiline: { minHeight: 70, textAlignVertical: "top" },
    pickerWrap: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      overflow: "hidden"
    },
    picker: { color: palette.text },
    review: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 8,
      padding: 10
    },
    archiveRow: {
      borderTopColor: palette.borderSoft,
      borderTopWidth: 1,
      gap: 4,
      paddingTop: 9
    },
    rowBetween: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between"
    },
    secondaryButton: {
      alignSelf: "flex-start",
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 9
    },
    secondaryText: { color: palette.link, fontSize: 13, fontWeight: "800" },
    dangerButton: {
      alignSelf: "flex-start",
      backgroundColor: palette.danger,
      borderRadius: radius.card,
      paddingHorizontal: 12,
      paddingVertical: 10
    },
    dangerText: { color: palette.dangerText, fontSize: 13, fontWeight: "800" },
    linkButton: { alignSelf: "flex-start", paddingVertical: 4 },
    linkText: { color: palette.link, fontSize: 12, fontWeight: "800" },
    disabled: { opacity: 0.45 }
  });
}
