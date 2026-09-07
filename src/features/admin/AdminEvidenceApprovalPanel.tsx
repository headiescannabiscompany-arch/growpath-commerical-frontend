import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  approveLegalEvidenceRequest,
  getEvidenceVaultCapabilities,
  LEGAL_EVIDENCE_ARCHIVE_SCOPES,
  listAdminEvidenceRequests,
  reviewLegalEvidenceApproval,
  updateLegalEvidenceRequestReview,
  type LegalEvidenceApprovalProposal,
  type LegalEvidenceApprovalReview,
  type LegalEvidenceArchiveScope
} from "@/api/adminEvidenceVault";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

type EvidenceApprovalRequest = {
  _id: string;
  requestType: string;
  status: string;
  preservationHold: boolean;
  preservationExpiresAt?: string | null;
  targetBound?: boolean;
  targetUserId?: string | { _id?: string } | null;
  detailsAvailable?: boolean;
  requesterIdentityVerification?: {
    verified?: boolean;
    method?: string;
    reference?: string;
  } | null;
  requesterAuthorityVerification?: {
    verified?: boolean;
    method?: string;
    reference?: string;
  } | null;
  jurisdiction?: string;
  jurisdictionReview?: {
    reviewed?: boolean;
    determination?: string;
    reference?: string;
  } | null;
  minimumNecessaryScope?: string;
  userNoticeStatus?: string;
  createdAt?: string;
  updatedAt?: string;
};

type ApprovalReviewState = {
  receipt: LegalEvidenceApprovalReview;
  proposal: LegalEvidenceApprovalProposal;
};

const NOTICE_OPTIONS = ["permitted", "delayed", "prohibited", "sent"] as const;
const OBJECT_ID = /^[a-f0-9]{24}$/i;

export function AdminEvidenceApprovalWorkspace() {
  const [requests, setRequests] = useState<EvidenceApprovalRequest[]>([]);
  const refresh = useCallback(async () => {
    setRequests(await listAdminEvidenceRequests());
  }, []);

  useEffect(() => {
    void refresh().catch(() => setRequests([]));
  }, [refresh]);

  return <AdminEvidenceApprovalPanel requests={requests} onUpdated={refresh} />;
}

function targetId(value: EvidenceApprovalRequest["targetUserId"]) {
  return String(typeof value === "string" ? value : value?._id || "").trim();
}

function holdIsActive(request: EvidenceApprovalRequest) {
  if (request.preservationHold !== true) return false;
  if (!request.preservationExpiresAt) return true;
  const expiresAt = new Date(request.preservationExpiresAt);
  return !Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() > Date.now();
}

function errorText(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function RestrictedEvidenceRequestSummary({
  request,
  focused = false
}: {
  request: EvidenceApprovalRequest;
  focused?: boolean;
}) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  return (
    <View
      accessibilityLabel="Restricted legal evidence request summary"
      style={[styles.requestSummary, focused ? styles.focused : null]}
    >
      <Text style={styles.title}>
        {request.requestType} · {request.status}
      </Text>
      <Text style={styles.meta}>
        Restricted request · target {request.targetBound ? "linked" : "not linked"}
        {request.createdAt
          ? ` · opened ${new Date(request.createdAt).toLocaleString()}`
          : ""}
      </Text>
      <Text style={styles.note}>
        Requester, target, scope, preservation, approval, and audit controls are available
        only to configured legal-review administrators.
      </Text>
    </View>
  );
}

export default function AdminEvidenceApprovalPanel({
  requests,
  onUpdated
}: {
  requests: EvidenceApprovalRequest[];
  onUpdated: () => void | Promise<void>;
}) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [selectedId, setSelectedId] = useState("");

  useEffect(() => {
    let active = true;
    void getEvidenceVaultCapabilities()
      .then((result) => {
        if (active) setAllowed(result.capabilities.evidenceApproval === true);
      })
      .catch(() => {
        if (active) setAllowed(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const eligible = requests.filter(
    (request) =>
      request.detailsAvailable === true &&
      ["identity_review", "legal_review"].includes(request.status)
  );
  const selected = eligible.find((request) => request._id === selectedId) || null;

  if (allowed !== true || !eligible.length) return null;

  return (
    <View accessibilityLabel="Independent legal evidence approval" style={styles.panel}>
      <Text style={styles.title}>Independent legal review</Text>
      <Text style={styles.note}>
        Review prerequisites and approve the exact request only. This workflow never
        discloses or transmits account data.
      </Text>
      <View style={styles.actions}>
        {eligible.map((request) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Review legal workflow for ${request._id}`}
            key={request._id}
            onPress={() => setSelectedId(selectedId === request._id ? "" : request._id)}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryText}>
              {request.requestType} · {request.status}
            </Text>
          </Pressable>
        ))}
      </View>
      {selected ? (
        <EvidenceApprovalWorkflow
          key={`${selected._id}:${selected.updatedAt || "current"}`}
          request={selected}
          onUpdated={onUpdated}
        />
      ) : null}
    </View>
  );
}

function EvidenceApprovalWorkflow({
  request,
  onUpdated
}: {
  request: EvidenceApprovalRequest;
  onUpdated: () => void | Promise<void>;
}) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const exactTargetId = targetId(request.targetUserId);
  const [busy, setBusy] = useState("");
  const [feedback, setFeedback] = useState("");

  const [identityMethod, setIdentityMethod] = useState(
    request.requesterIdentityVerification?.method || ""
  );
  const [identityReference, setIdentityReference] = useState(
    request.requesterIdentityVerification?.reference || ""
  );
  const [authorityMethod, setAuthorityMethod] = useState(
    request.requesterAuthorityVerification?.method || ""
  );
  const [authorityReference, setAuthorityReference] = useState(
    request.requesterAuthorityVerification?.reference || ""
  );
  const [identityReason, setIdentityReason] = useState("");

  const [jurisdiction, setJurisdiction] = useState(request.jurisdiction || "");
  const [jurisdictionDetermination, setJurisdictionDetermination] = useState(
    request.jurisdictionReview?.determination || ""
  );
  const [jurisdictionReference, setJurisdictionReference] = useState(
    request.jurisdictionReview?.reference || ""
  );
  const [minimumScope, setMinimumScope] = useState(request.minimumNecessaryScope || "");
  const [noticeStatus, setNoticeStatus] = useState<"" | (typeof NOTICE_OPTIONS)[number]>(
    NOTICE_OPTIONS.includes(request.userNoticeStatus as (typeof NOTICE_OPTIONS)[number])
      ? (request.userNoticeStatus as (typeof NOTICE_OPTIONS)[number])
      : ""
  );
  const [legalReason, setLegalReason] = useState("");

  const [scopeCandidate, setScopeCandidate] = useState<"" | LegalEvidenceArchiveScope>(
    ""
  );
  const [scopes, setScopes] = useState<LegalEvidenceArchiveScope[]>([]);
  const [approvalReason, setApprovalReason] = useState("");
  const [approverName, setApproverName] = useState("");
  const [approverEmail, setApproverEmail] = useState("");
  const [approverRole, setApproverRole] = useState("");
  const [approverReference, setApproverReference] = useState("");
  const [approvalReview, setApprovalReview] = useState<ApprovalReviewState | null>(null);
  const [confirmation, setConfirmation] = useState("");

  function invalidateApprovalReview() {
    setApprovalReview(null);
    setConfirmation("");
  }

  function changeApprovalField(setter: (value: string) => void, value: string) {
    setter(value);
    invalidateApprovalReview();
  }

  async function saveIdentityReview() {
    if (busy) return;
    setBusy("identity");
    setFeedback("");
    invalidateApprovalReview();
    try {
      await updateLegalEvidenceRequestReview(request._id, {
        requesterIdentityVerification: {
          verified: true,
          method: identityMethod.trim(),
          reference: identityReference.trim()
        },
        requesterAuthorityVerification: {
          verified: true,
          method: authorityMethod.trim(),
          reference: authorityReference.trim()
        },
        reason: identityReason.trim()
      });
      setFeedback("Identity and authority reviews recorded. No data was disclosed.");
      await onUpdated();
    } catch (error) {
      setFeedback(errorText(error, "Identity and authority review was not recorded."));
    } finally {
      setBusy("");
    }
  }

  async function saveLegalPrerequisites() {
    if (busy || !noticeStatus) return;
    setBusy("legal-prerequisites");
    setFeedback("");
    invalidateApprovalReview();
    try {
      await updateLegalEvidenceRequestReview(request._id, {
        jurisdiction: jurisdiction.trim(),
        jurisdictionReview: {
          reviewed: true,
          determination: jurisdictionDetermination.trim(),
          reference: jurisdictionReference.trim()
        },
        minimumNecessaryScope: minimumScope.trim(),
        userNoticeStatus: noticeStatus,
        reason: legalReason.trim()
      });
      setFeedback("Legal prerequisites recorded. No request was approved or disclosed.");
      await onUpdated();
    } catch (error) {
      setFeedback(errorText(error, "Legal prerequisites were not recorded."));
    } finally {
      setBusy("");
    }
  }

  const prerequisitesReady =
    request.requesterIdentityVerification?.verified === true &&
    request.requesterAuthorityVerification?.verified === true &&
    request.jurisdictionReview?.reviewed === true &&
    Boolean(request.jurisdiction?.trim()) &&
    Boolean(request.minimumNecessaryScope?.trim()) &&
    NOTICE_OPTIONS.includes(request.userNoticeStatus as (typeof NOTICE_OPTIONS)[number]);
  const approvalGateOpen =
    request.status === "legal_review" &&
    holdIsActive(request) &&
    OBJECT_ID.test(exactTargetId) &&
    prerequisitesReady;
  const proposalReady =
    scopes.length > 0 &&
    approvalReason.trim().length >= 8 &&
    approverName.trim() &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(approverEmail.trim()) &&
    approverRole.trim() &&
    approverReference.trim();

  function proposal(): LegalEvidenceApprovalProposal {
    return {
      targetUserId: exactTargetId,
      scopes: [...scopes].sort(),
      reason: approvalReason.trim(),
      legalReview: {
        decision: "approve",
        approverName: approverName.trim(),
        approverEmail: approverEmail.trim().toLowerCase(),
        approverRole: approverRole.trim(),
        reference: approverReference.trim()
      }
    };
  }

  async function reviewApproval() {
    if (busy || !approvalGateOpen || !proposalReady) return;
    setBusy("approval-review");
    setFeedback("");
    setApprovalReview(null);
    setConfirmation("");
    const reviewedProposal = proposal();
    try {
      const receipt = await reviewLegalEvidenceApproval(request._id, reviewedProposal);
      setApprovalReview({ receipt, proposal: reviewedProposal });
      setFeedback("Approval review passed. No data was disclosed or transmitted.");
    } catch {
      setFeedback("Legal approval review failed closed. No data was disclosed.");
    } finally {
      setBusy("");
    }
  }

  async function executeApproval() {
    if (
      busy ||
      !approvalReview ||
      confirmation !== approvalReview.receipt.nextConfirmation
    ) {
      return;
    }
    setBusy("approval");
    setFeedback("");
    try {
      await approveLegalEvidenceRequest(request._id, {
        ...approvalReview.proposal,
        reviewToken: approvalReview.receipt.reviewToken,
        confirmation
      });
      setApprovalReview(null);
      setConfirmation("");
      setFeedback("Evidence request approved. No data was disclosed or transmitted.");
      await onUpdated();
    } catch {
      setFeedback("Legal approval failed closed. No data was disclosed.");
    } finally {
      setBusy("");
    }
  }

  const identityReady =
    identityMethod.trim() &&
    identityReference.trim() &&
    authorityMethod.trim() &&
    authorityReference.trim() &&
    identityReason.trim().length >= 8;
  const legalPrerequisitesReady =
    jurisdiction.trim() &&
    jurisdictionDetermination.trim() &&
    jurisdictionReference.trim() &&
    minimumScope.trim() &&
    noticeStatus &&
    legalReason.trim().length >= 8;

  return (
    <View style={styles.workflow}>
      <Text style={styles.title}>
        {request.requestType} · {request.status}
      </Text>
      {request.status === "identity_review" ? (
        <View style={styles.stack}>
          <Text style={styles.sectionTitle}>Requester verification</Text>
          <TextInput
            accessibilityLabel="Identity verification method"
            onChangeText={(value) => {
              setIdentityMethod(value);
              invalidateApprovalReview();
            }}
            placeholder="Identity verification method"
            placeholderTextColor={palette.textMuted}
            style={styles.input}
            value={identityMethod}
          />
          <TextInput
            accessibilityLabel="Identity verification reference"
            onChangeText={(value) => {
              setIdentityReference(value);
              invalidateApprovalReview();
            }}
            placeholder="Non-secret identity reference"
            placeholderTextColor={palette.textMuted}
            style={styles.input}
            value={identityReference}
          />
          <TextInput
            accessibilityLabel="Authority verification method"
            onChangeText={(value) => {
              setAuthorityMethod(value);
              invalidateApprovalReview();
            }}
            placeholder="Authority verification method"
            placeholderTextColor={palette.textMuted}
            style={styles.input}
            value={authorityMethod}
          />
          <TextInput
            accessibilityLabel="Authority verification reference"
            onChangeText={(value) => {
              setAuthorityReference(value);
              invalidateApprovalReview();
            }}
            placeholder="Non-secret authority reference"
            placeholderTextColor={palette.textMuted}
            style={styles.input}
            value={authorityReference}
          />
          <TextInput
            accessibilityLabel="Identity review reason"
            multiline
            onChangeText={(value) => {
              setIdentityReason(value);
              invalidateApprovalReview();
            }}
            placeholder="Specific typed review reason"
            placeholderTextColor={palette.textMuted}
            style={styles.input}
            value={identityReason}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Record identity and authority reviews"
            disabled={Boolean(busy) || !identityReady}
            onPress={() => void saveIdentityReview()}
            style={[styles.primaryButton, (!identityReady || busy) && styles.disabled]}
          >
            <Text style={styles.primaryText}>Record verification reviews</Text>
          </Pressable>
        </View>
      ) : null}

      {request.status === "legal_review" ? (
        <View style={styles.stack}>
          <Text style={styles.sectionTitle}>Legal prerequisites</Text>
          <TextInput
            accessibilityLabel="Reviewed jurisdiction"
            onChangeText={(value) => {
              setJurisdiction(value);
              invalidateApprovalReview();
            }}
            placeholder="Named jurisdiction"
            placeholderTextColor={palette.textMuted}
            style={styles.input}
            value={jurisdiction}
          />
          <TextInput
            accessibilityLabel="Jurisdiction determination"
            multiline
            onChangeText={(value) => {
              setJurisdictionDetermination(value);
              invalidateApprovalReview();
            }}
            placeholder="Reviewed jurisdiction determination"
            placeholderTextColor={palette.textMuted}
            style={styles.input}
            value={jurisdictionDetermination}
          />
          <TextInput
            accessibilityLabel="Jurisdiction review reference"
            onChangeText={(value) => {
              setJurisdictionReference(value);
              invalidateApprovalReview();
            }}
            placeholder="Non-secret jurisdiction reference"
            placeholderTextColor={palette.textMuted}
            style={styles.input}
            value={jurisdictionReference}
          />
          <TextInput
            accessibilityLabel="Minimum necessary scope"
            multiline
            onChangeText={(value) => {
              setMinimumScope(value);
              invalidateApprovalReview();
            }}
            placeholder="Minimum records necessary for this request"
            placeholderTextColor={palette.textMuted}
            style={styles.input}
            value={minimumScope}
          />
          <View style={styles.pickerWrap}>
            <Picker
              accessibilityLabel="User notice decision"
              onValueChange={(value) => {
                setNoticeStatus(value);
                invalidateApprovalReview();
              }}
              selectedValue={noticeStatus}
              style={styles.picker}
            >
              <Picker.Item label="Choose notice decision" value="" />
              {NOTICE_OPTIONS.map((value) => (
                <Picker.Item key={value} label={value} value={value} />
              ))}
            </Picker>
          </View>
          <TextInput
            accessibilityLabel="Legal prerequisite review reason"
            multiline
            onChangeText={(value) => {
              setLegalReason(value);
              invalidateApprovalReview();
            }}
            placeholder="Specific typed review reason"
            placeholderTextColor={palette.textMuted}
            style={styles.input}
            value={legalReason}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Record legal approval prerequisites"
            disabled={Boolean(busy) || !legalPrerequisitesReady}
            onPress={() => void saveLegalPrerequisites()}
            style={[
              styles.secondaryButton,
              (!legalPrerequisitesReady || busy) && styles.disabled
            ]}
          >
            <Text style={styles.secondaryText}>Record legal prerequisites</Text>
          </Pressable>
        </View>
      ) : null}

      {request.status === "legal_review" && !approvalGateOpen ? (
        <Text style={styles.warning}>
          Approval remains blocked until the request has an active hold, exact target ID,
          completed identity/authority and jurisdiction reviews, minimum scope, and notice
          decision.
        </Text>
      ) : null}

      {approvalGateOpen ? (
        <View style={styles.stack}>
          <Text style={styles.sectionTitle}>Independent approval</Text>
          <Text style={styles.meta}>Exact target: {exactTargetId}</Text>
          <View style={styles.pickerWrap}>
            <Picker
              accessibilityLabel="Archive scope to add"
              onValueChange={(value) => {
                setScopeCandidate(value);
                invalidateApprovalReview();
              }}
              selectedValue={scopeCandidate}
              style={styles.picker}
            >
              <Picker.Item label="Choose an exact archive scope" value="" />
              {LEGAL_EVIDENCE_ARCHIVE_SCOPES.map((scope) => (
                <Picker.Item key={scope} label={scope} value={scope} />
              ))}
            </Picker>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add selected archive scope"
            disabled={!scopeCandidate || scopes.includes(scopeCandidate)}
            onPress={() => {
              if (!scopeCandidate || scopes.includes(scopeCandidate)) return;
              setScopes((current) => [...current, scopeCandidate]);
              setScopeCandidate("");
              invalidateApprovalReview();
            }}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryText}>Add scope</Text>
          </Pressable>
          {scopes.map((scope) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove archive scope ${scope}`}
              key={scope}
              onPress={() => {
                setScopes((current) => current.filter((value) => value !== scope));
                invalidateApprovalReview();
              }}
              style={styles.scopeChip}
            >
              <Text style={styles.secondaryText}>{scope} · remove</Text>
            </Pressable>
          ))}
          <TextInput
            accessibilityLabel="Legal approval reason"
            multiline
            onChangeText={(value) => changeApprovalField(setApprovalReason, value)}
            placeholder="Specific legal approval reason"
            placeholderTextColor={palette.textMuted}
            style={styles.input}
            value={approvalReason}
          />
          <TextInput
            accessibilityLabel="Legal approver name"
            onChangeText={(value) => changeApprovalField(setApproverName, value)}
            placeholder="Reviewed approver name"
            placeholderTextColor={palette.textMuted}
            style={styles.input}
            value={approverName}
          />
          <TextInput
            accessibilityLabel="Legal approver email"
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={(value) => changeApprovalField(setApproverEmail, value)}
            placeholder="Reviewed approver email"
            placeholderTextColor={palette.textMuted}
            style={styles.input}
            value={approverEmail}
          />
          <TextInput
            accessibilityLabel="Legal approver role"
            onChangeText={(value) => changeApprovalField(setApproverRole, value)}
            placeholder="Approver role"
            placeholderTextColor={palette.textMuted}
            style={styles.input}
            value={approverRole}
          />
          <TextInput
            accessibilityLabel="Legal approval reference"
            onChangeText={(value) => changeApprovalField(setApproverReference, value)}
            placeholder="Non-secret legal review reference"
            placeholderTextColor={palette.textMuted}
            style={styles.input}
            value={approverReference}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Review exact legal evidence approval"
            disabled={Boolean(busy) || !proposalReady}
            onPress={() => void reviewApproval()}
            style={[styles.primaryButton, (!proposalReady || busy) && styles.disabled]}
          >
            <Text style={styles.primaryText}>
              {busy === "approval-review" ? "Reviewing…" : "Review exact approval"}
            </Text>
          </Pressable>
          {approvalReview ? (
            <View style={styles.reviewReceipt}>
              <Text style={styles.success}>Approval review ready</Text>
              <Text style={styles.meta}>
                Expires{" "}
                {new Date(approvalReview.receipt.reviewExpiresAt).toLocaleString()}
              </Text>
              <Text style={styles.meta}>
                Type exactly: {approvalReview.receipt.nextConfirmation}
              </Text>
              <TextInput
                accessibilityLabel="Exact legal approval confirmation"
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={setConfirmation}
                placeholder="Type the exact approval phrase"
                placeholderTextColor={palette.textMuted}
                style={styles.input}
                value={confirmation}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Approve evidence request without disclosure"
                disabled={
                  Boolean(busy) ||
                  confirmation !== approvalReview.receipt.nextConfirmation
                }
                onPress={() => void executeApproval()}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryText}>
                  {busy === "approval" ? "Approving…" : "Approve request only"}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : null}
      {busy ? <ActivityIndicator color={palette.accent} /> : null}
      {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
    </View>
  );
}

function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    panel: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.borderSoft,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 9,
      padding: 12
    },
    workflow: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 10,
      padding: 12
    },
    requestSummary: {
      borderColor: palette.borderSoft,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 5,
      padding: 12
    },
    focused: { borderColor: palette.accent, borderWidth: 2 },
    stack: { gap: 8 },
    actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    title: { color: palette.text, fontSize: 14, fontWeight: "800" },
    sectionTitle: { color: palette.text, fontSize: 13, fontWeight: "800" },
    note: { color: palette.textSoft, fontSize: 12, lineHeight: 17 },
    meta: { color: palette.textMuted, fontSize: 12, lineHeight: 17 },
    warning: { color: palette.warning, fontSize: 12, fontWeight: "700", lineHeight: 17 },
    success: { color: palette.success, fontSize: 13, fontWeight: "800" },
    feedback: { color: palette.text, fontSize: 12, fontWeight: "700", lineHeight: 17 },
    input: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      color: palette.text,
      minHeight: 40,
      paddingHorizontal: 10,
      paddingVertical: 8
    },
    pickerWrap: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      overflow: "hidden"
    },
    picker: { color: palette.text },
    primaryButton: {
      alignSelf: "flex-start",
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      paddingHorizontal: 12,
      paddingVertical: 9
    },
    primaryText: { color: palette.accentText, fontSize: 13, fontWeight: "800" },
    secondaryButton: {
      alignSelf: "flex-start",
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      paddingHorizontal: 11,
      paddingVertical: 8
    },
    secondaryText: { color: palette.link, fontSize: 12, fontWeight: "800" },
    scopeChip: {
      alignSelf: "flex-start",
      backgroundColor: palette.accentSoft,
      borderRadius: radius.card,
      paddingHorizontal: 10,
      paddingVertical: 7
    },
    reviewReceipt: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.borderSoft,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 8,
      padding: 10
    },
    disabled: { opacity: 0.45 }
  });
}
