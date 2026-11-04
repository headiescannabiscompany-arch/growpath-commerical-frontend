import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import PrimaryButton from "@/components/PrimaryButton";
import { useAppTheme } from "@/theme/appTheme";
import { getAdminSecurityEpoch, getAdminSecurityIdentityEpoch, subscribeAdminSecurity } from "@/api/adminPasskeys";
import { readWithdrawalReview, saveWithdrawalReview, validWithdrawalReviewInput, withdrawalReviewBases, withdrawalReviewOutcomes,
  type WithdrawalBasis, type WithdrawalOutcome, type WithdrawalReview, type WithdrawalReviewInput } from "@/api/courseWithdrawalReview";
import { enterCourseGiftDiagnosticScope } from "@/utils/courseGiftDiagnosticPrivacy";
const labels = {
  unresolved: "Applicability unresolved — urgent review", de_14: "Applicable German withdrawal — 14-day refund cutoff",
  th_15: "Applicable Thai direct-marketing withdrawal — 15-day refund cutoff", other: "Other documented basis / earlier deadline",
  not_applicable: "Withdrawal remedy does not apply — written basis required", review_required: "Further review required",
  refund_due: "Mandatory refund due", refund_complete: "Full refund already completed — verify purchase evidence", not_due: "No refund due — documented decision communicated"
};
const empty = { basis: "unresolved" as WithdrawalBasis, outcome: "review_required" as WithdrawalOutcome,
  reason: "", evidenceRef: "", communicationRef: "", purchaseId: "", deadlineAt: "", contractLinkConfirmed: false };
export default function CourseWithdrawalReviewPanel({ noticeId, onReviewed }: { noticeId: string; onReviewed?: () => void }) {
  // Scope diagnostic suppression before private children mount; no data is stored.
  const [privateReady, setPrivateReady] = useState(false);
  useEffect(() => { const release = enterCourseGiftDiagnosticScope(); setPrivateReady(true); return release; }, []);
  return privateReady ? <ReviewForm key={noticeId} noticeId={noticeId} onReviewed={onReviewed} /> : null;
}
function ReviewForm({ noticeId, onReviewed }: { noticeId: string; onReviewed?: () => void }) {
  const { palette } = useAppTheme();
  const epoch = useSyncExternalStore(subscribeAdminSecurity, getAdminSecurityEpoch, getAdminSecurityEpoch);
  const [identity] = useState(getAdminSecurityIdentityEpoch);
  const [view, setView] = useState<WithdrawalReview | null>(null), [draft, setDraft] = useState(empty);
  const [pending, setPending] = useState<WithdrawalReviewInput | null>(null);
  const [confirmed, setConfirmed] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const active = useRef(true), flight = useRef(false);
  const sameIdentity = identity === getAdminSecurityIdentityEpoch();
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => {
    setView(null); setConfirmed(false);
    if (identity !== getAdminSecurityIdentityEpoch()) { setPending(null); setDraft(empty); setMessage("Admin identity changed. Reopen this case in the current account."); }
  }, [epoch, identity]);
  const validScope = (started: number) => active.current && identity === getAdminSecurityIdentityEpoch() && started === getAdminSecurityEpoch();
  async function act(work: (started: number) => Promise<void>) {
    if (flight.current || !sameIdentity) return;
    flight.current = true; setBusy(true); setMessage(""); const started = getAdminSecurityEpoch();
    try { await work(started); }
    catch { if (active.current && identity === getAdminSecurityIdentityEpoch()) { setView(null); setConfirmed(false); setMessage("Result not confirmed. Verify your Admin passkey if needed, then read this case. Keep the same pending review for retry."); } }
    finally { if (active.current) { flight.current = false; setBusy(false); } }
  }
  const edit = (key: keyof typeof empty, value: string | boolean) => { if (pending || busy) return;
    setDraft(old => ({ ...old, [key]: value, ...(key === "purchaseId" ? { contractLinkConfirmed: false } : {}) })); setConfirmed(false); };
  const candidate = (operationId: string): WithdrawalReviewInput => ({ operationId, expectedVersion: view?.version ?? 0,
    basis: draft.basis, outcome: draft.outcome, reason: draft.reason.trim(), evidenceRef: draft.evidenceRef.trim(),
    communicationRef: draft.communicationRef.trim(), purchaseId: draft.purchaseId.trim() || null,
    contractLinkConfirmed: draft.contractLinkConfirmed, deadlineAt: draft.deadlineAt.trim() || null, confirmed: true });
  const superseded = Boolean(pending && view && view.version > pending.expectedVersion && !view.operationIds.includes(pending.operationId));
  const color = { color: palette.text };
  return <View style={{ gap: 12, padding: 12, borderWidth: 1, borderColor: palette.border, borderRadius: 8 }}>
    <Text style={[color, { fontWeight: "700" }]}>Course withdrawal rights review</Text>
    <Text style={color}>The notice is already received. Review its applicable rights promptly; acknowledgement and internal review do not extend a mandatory deadline. This form records a case decision, not a refund or customer email.</Text>
    {message ? <Text accessibilityLiveRegion="polite" style={color}>{message}</Text> : null}
    <PrimaryButton title="Read current withdrawal review" disabled={busy || !sameIdentity} onPress={() => void act(async started => {
      const result = await readWithdrawalReview(noticeId); if (!validScope(started)) return;
      setView(result); setConfirmed(false);
      if (!pending) setDraft({ basis: result.basis, outcome: result.outcome, reason: result.current?.reason || "", evidenceRef: result.current?.evidenceRef || "",
        communicationRef: result.current?.communicationRef || "", purchaseId: result.current?.purchaseId || "", deadlineAt: result.dueAt || "", contractLinkConfirmed: false });
    })} />
    {pending && <Text style={color}>A review save needs confirmation. Inputs stay locked; reading does not resubmit it. Retry the same operation after reviewing current state.</Text>}
    {view && sameIdentity && <>
      <Text style={color}>Contract reference: {view.contractReference}</Text>
      <Text style={color}>Original notice received (UTC): {view.receivedAt}</Text>
      <Text style={color}>Saved outcome: {labels[view.outcome]} · review version {view.version}</Text>
      <Text style={color}>{view.dueAt ? `Operational due by (UTC): ${view.dueAt}${view.overdue ? " — OVERDUE; escalate now" : ""}` : "Deadline not classified — review urgently."}</Text>
      <Text style={{ color: palette.textMuted }}>German/Thai selections apply only after you establish that rule covers this contract. Cutoffs are conservative UTC elapsed-day targets from the original notice, not a local-calendar legal opinion. Earlier saved deadlines cannot be extended here. Do not treat a course claim as the buyer's waiver.</Text>
      {["resolved", "spam"].includes(view.status) ? <Text style={color}>This case is closed. Use the existing reasoned Reopen request action before recording a new review.</Text> : <>
        <Text style={color}>Applicable basis</Text>
        {withdrawalReviewBases.map(value => <Pressable key={value} accessibilityRole="radio" accessibilityLabel={labels[value]}
          accessibilityState={{ checked: draft.basis === value, disabled: busy || Boolean(pending) }} disabled={busy || Boolean(pending)}
          onPress={() => edit("basis", value)} style={{ padding: 10, borderWidth: 1, borderColor: palette.border }}><Text style={color}>{draft.basis === value ? "●" : "○"} {labels[value]}</Text></Pressable>)}
        <Text style={color}>Outcome</Text>
        {withdrawalReviewOutcomes.map(value => <Pressable key={value} accessibilityRole="radio" accessibilityLabel={labels[value]}
          accessibilityState={{ checked: draft.outcome === value, disabled: busy || Boolean(pending) }} disabled={busy || Boolean(pending)}
          onPress={() => edit("outcome", value)} style={{ padding: 10, borderWidth: 1, borderColor: palette.border }}><Text style={color}>{draft.outcome === value ? "●" : "○"} {labels[value]}</Text></Pressable>)}
        {([ ["reason", "Written applicability and outcome reason", 2000], ["evidenceRef", "Evidence reference for the contract, claimant authority and applicable rule", 500],
          ["communicationRef", "Reference to the written outcome already communicated to the customer", 300], ["purchaseId", "Existing purchase ID (required for completed refund)", 24],
          ["deadlineAt", "Earlier / other mandatory deadline in UTC ISO format (optional for German/Thai cutoff)", 40] ] as const).map(([key, label, maxLength]) => <View key={key} style={{ gap: 5 }}>
          <Text style={color}>{label}</Text><TextInput accessibilityLabel={label} value={draft[key]} editable={!busy && !pending} autoComplete="off" autoCorrect={false}
            multiline={key === "reason"} maxLength={maxLength} onChangeText={value => edit(key, value)} style={{ ...color, borderWidth: 1, borderColor: palette.border, padding: 10, minHeight: key === "reason" ? 88 : 48 }} />
        </View>)}
        {draft.purchaseId && <Pressable accessibilityRole="checkbox" accessibilityLabel="I checked that this notice and claimant authority relate to the selected purchase; the evidence reference documents that link."
          accessibilityState={{ checked: draft.contractLinkConfirmed, disabled: busy || Boolean(pending) }} disabled={busy || Boolean(pending)} onPress={() => edit("contractLinkConfirmed", !draft.contractLinkConfirmed)} style={{ padding: 12, borderWidth: 1, borderColor: palette.border }}>
          <Text style={color}>{draft.contractLinkConfirmed ? "[x]" : "[ ]"} I checked that this notice and claimant authority relate to the selected purchase; the evidence reference documents that link.</Text>
        </Pressable>}
      </>}
      {(!["resolved", "spam"].includes(view.status) || pending) && <>
        <Pressable accessibilityRole="checkbox" accessibilityLabel="I reviewed this exact case decision and evidence. Record this review only; do not issue a refund or send email."
          accessibilityState={{ checked: confirmed, disabled: busy }} disabled={busy} onPress={() => setConfirmed(!confirmed)} style={{ padding: 12, borderWidth: 1, borderColor: palette.border }}>
          <Text style={color}>{confirmed ? "[x]" : "[ ]"} I reviewed this exact case decision and evidence. Record this review only; do not issue a refund or send email.</Text>
        </Pressable>
        <PrimaryButton title={pending ? "Retry same withdrawal review" : "Save withdrawal rights review"}
          disabled={busy || !confirmed || superseded || (!pending && !validWithdrawalReviewInput(candidate("a0000000-0000-4000-8000-000000000001")))}
          onPress={() => void act(async started => {
            const payload = pending || Object.freeze(candidate(globalThis.crypto?.randomUUID?.() || ""));
            if (!validWithdrawalReviewInput(payload)) throw new Error("Secure operation unavailable");
            setPending(payload); setConfirmed(false);
            const result = await saveWithdrawalReview(noticeId, payload); if (!validScope(started)) return;
            setPending(null); setView(result); setMessage("Review recorded. This did not issue a refund or send a customer notice."); onReviewed?.();
          })} />
      </>}
      {superseded && <PrimaryButton title="Discard superseded unsaved review" disabled={busy} onPress={() => {
        if (!pending || !view || view.version <= pending.expectedVersion || view.operationIds.includes(pending.operationId)) return;
        setPending(null); setConfirmed(false); setDraft(empty); setMessage("The unsaved operation was superseded by a newer recorded review. Read the current case before preparing another decision."); setView(null);
      }} />}
    </>}
  </View>;
}
