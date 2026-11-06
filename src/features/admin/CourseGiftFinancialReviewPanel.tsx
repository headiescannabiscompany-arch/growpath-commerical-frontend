import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Platform, Pressable, Text, TextInput, View } from "react-native";
import { getAdminSecurityEpoch, getAdminSecurityIdentityEpoch, subscribeAdminSecurity } from "@/api/adminPasskeys";
import { createInternalCourseGiftFinancialReviewClient } from "@/api/courseCheckoutSupportClient";
import { financialCandidate, type FinancialAction, type FinancialAssessment } from "@/api/courseGiftFinancialContract";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import { enterCourseGiftDiagnosticScope } from "@/utils/courseGiftDiagnosticPrivacy";
import { useAppTheme } from "@/theme/appTheme";
import AdminPasskeySecurity from "./AdminPasskeySecurity";

type Client = ReturnType<typeof createInternalCourseGiftFinancialReviewClient>;
type Action = Exclude<FinancialAction, "assess">;
type Body = Readonly<Record<string, string | number>>;
const empty = () => ({ amount: "", operationId: "", reason: "requested_by_customer", taxCredit: "", feeReturned: "",
  reference: "", taxEvidenceReference: "", reviewReason: "", evidenceReference: "", confirmation: "" });
const amount = (value: string) => {
  const match = /^(0|[1-9]\d{0,7})(?:\.(\d{1,2}))?$/.exec(value);
  return match ? Number(match[1]) * 100 + Number((match[2] || "").padEnd(2, "0")) : NaN;
};
const money = (value: number) => `USD ${(value / 100).toFixed(2)}`;

/** Dormant private web building block. The prepared Admin outlet supplies display
 * admission; the server independently verifies Owner, passkey and exact record. */
export function InternalCourseGiftFinancialReviewPanel() {
  const [reader, setReader] = useState<Client | null>(null);
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const release = enterCourseGiftDiagnosticScope();
    const client = createInternalCourseGiftFinancialReviewClient({ platform: "web", action: "assess" });
    setReader(client);
    return () => { client.dispose(); release(); };
  }, []);
  if (Platform.OS !== "web" || !reader) return null;
  return <ScreenBoundary name="CourseGiftFinancialReview" showBack={false}><FinancialReview reader={reader} /></ScreenBoundary>;
}

function FinancialReview({ reader }: { reader: Client }) {
  const { palette } = useAppTheme();
  const epoch = useSyncExternalStore(subscribeAdminSecurity, getAdminSecurityEpoch, () => 0);
  const [identity] = useState(getAdminSecurityIdentityEpoch);
  const [purchaseId, setPurchaseId] = useState("");
  const [assessment, setAssessment] = useState<FinancialAssessment | null>(null);
  const [action, setAction] = useState<Action>("refund");
  const [form, setForm] = useState(empty);
  const [reviewed, setReviewed] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [attempted, setAttempted] = useState(false);
  const active = useRef(true), busy = useRef(false), serial = useRef(0);
  const current = useRef<Client | null>(null);
  const intent = useRef<{ action: Action; body: Body } | null>(null);
  const sameIdentity = identity === getAdminSecurityIdentityEpoch();
  const locked = reader.snapshot().needsStepUp;
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; serial.current++; current.current?.dispose(); intent.current = null; };
  }, []);
  useEffect(() => {
    setReviewed(false); setAssessment(null); setForm(v => ({ ...v, confirmation: "" }));
    if (identity !== getAdminSecurityIdentityEpoch()) { setForm(empty()); setPurchaseId(""); setMessage(""); intent.current = null; }
  }, [epoch, identity]);
  const valid = (sequence: number) => active.current && sequence === serial.current && identity === getAdminSecurityIdentityEpoch();
  const inputStyle = { minHeight: 44, minWidth: 0, width: "100%" as const, color: palette.text, backgroundColor: palette.page,
    borderColor: palette.border, borderWidth: 1, borderRadius: 8, padding: 10 };
  function edit(key: keyof ReturnType<typeof empty>, value: string) {
    if (busy.current || attempted) return;
    setForm(v => ({ ...v, [key]: value, ...(key !== "confirmation" ? { confirmation: "" } : {}) }));
    setReviewed(false);
  }
  function field(label: string, key: keyof ReturnType<typeof empty>, maxLength: number, numeric = false) {
    return <View key={key} style={{ gap: 5, minWidth: 0 }}><Text style={{ color: palette.text }}>{label}</Text>
      <TextInput accessibilityLabel={label} value={form[key]} onChangeText={v => edit(key, v)} maxLength={maxLength}
        editable={!pending && !attempted} autoComplete="off" autoCorrect={false} autoCapitalize="none"
        keyboardType={numeric ? "decimal-pad" : "default"} style={inputStyle} /></View>;
  }
  function button(label: string, fn: () => void, disabled = false) {
    return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled}
      onPress={fn} style={{ borderWidth: 1, borderColor: palette.border, padding: 12, borderRadius: 8, opacity: disabled ? 0.5 : 1 }}>
      <Text style={{ color: palette.text, fontWeight: "700", flexShrink: 1 }}>{label}</Text></Pressable>;
  }
  async function assess() {
    if (busy.current || !sameIdentity) return;
    const body = financialCandidate("assess", { purchaseId }); if (!body) { setMessage("Enter the exact course-gift payment record ID."); return; }
    busy.current = true; setPending(true); setMessage(""); const sequence = ++serial.current;
    try {
      reader.prepare("courseGift", body); const snapshot = await reader.submit(true);
      if (!valid(sequence)) return;
      const value = snapshot.financial;
      if (!value || !("expectedStateFingerprint" in value)) { setAssessment(null); setMessage("Assessment unavailable. Verify your passkey and refresh this same payment; no financial action was requested."); return; }
      setAssessment(value); setReviewed(false); setForm(v => ({ ...v, confirmation: "" }));
      if (intent.current?.action === "allocation") {
        const original = intent.current.body, saved = value.allocation;
        if (saved && ["reference", "taxEvidenceReference", "refundedGrossCents", "taxCreditCents", "platformFeeReturnedCents"].every(k => saved[k as keyof typeof saved] === original[k]))
          setMessage("The original allocation is recorded. This refresh did not submit it again.");
      }
    } catch { if (valid(sequence)) { setAssessment(null); setMessage("Assessment unavailable. Keep the original payment and operation references and refresh after verification."); } }
    finally { if (valid(sequence)) setPending(false); busy.current = false; }
  }
  const confirmationReady = action === "refund" ? Number.isSafeInteger(amount(form.amount)) && amount(form.amount) > 0 :
    Number.isSafeInteger(amount(form.taxCredit)) && Number.isSafeInteger(amount(form.feeReturned));
  const expected = assessment && confirmationReady ? action === "refund" ? `REFUND ${purchaseId} ${amount(form.amount)}` :
    `ALLOCATE ${purchaseId} ${assessment.refundedGrossCents}/${amount(form.taxCredit)}/${amount(form.feeReturned)}` : "";
  const completedIntent = Boolean(assessment && intent.current && (intent.current.action === "refund" ?
    assessment.refundOperation && assessment.refundOperation.operationId === intent.current.body.operationId && assessment.refundOperation.state === "applied" &&
      assessment.refundedGrossCents >= assessment.refundOperation.expectedRefundedAmountCents + assessment.refundOperation.amountCents :
    assessment.allocation && ["reference", "taxEvidenceReference", "refundedGrossCents", "taxCreditCents", "platformFeeReturnedCents"]
      .every(k => assessment.allocation![k as keyof NonNullable<typeof assessment.allocation>] === intent.current!.body[k])));
  function candidate() {
    if (!assessment || assessment.purchaseId !== purchaseId) return null;
    if (action === "refund") {
      const op = assessment.refundOperation;
      if (op && !["applied", "provider_failed"].includes(op.state)) {
        if (form.operationId !== op.operationId || amount(form.amount) !== op.amountCents || form.reason !== op.reason) return null;
      } else if (amount(form.amount) > assessment.grossAmountCents - assessment.refundedGrossCents) return null;
    }
    const body = financialCandidate(action, { purchaseId,
      ...(action === "refund" ? { operationId: form.operationId, amountCents: amount(form.amount), reason: form.reason } :
        { refundedGrossCents: assessment.refundedGrossCents, taxCreditCents: amount(form.taxCredit), platformFeeReturnedCents: amount(form.feeReturned),
          reference: form.reference, taxEvidenceReference: form.taxEvidenceReference }),
      expectedStateFingerprint: assessment.expectedStateFingerprint, reviewReason: form.reviewReason,
      evidenceReference: form.evidenceReference, confirmation: form.confirmation });
    const original = intent.current;
    if (body && original) {
      const keys = action === "refund" ? ["operationId", "amountCents", "reason"] :
        ["reference", "taxEvidenceReference", "refundedGrossCents", "taxCreditCents", "platformFeeReturnedCents"];
      if (original.action !== action || keys.some(k => body[k] !== original.body[k])) return null;
    }
    return body;
  }
  async function submit() {
    const body = candidate(); if (!body || !reviewed || busy.current || attempted || locked) return;
    const client = createInternalCourseGiftFinancialReviewClient({ platform: "web", action });
    current.current?.dispose(); current.current = client; intent.current = { action, body };
    busy.current = true; setPending(true); setAttempted(true); setMessage(""); const sequence = ++serial.current;
    try {
      client.prepare("courseGift", body); const snapshot = await client.submit(true);
      if (!valid(sequence)) return;
      const result = snapshot.financial;
      setMessage(result && "status" in result ? result.status === "recorded" ? "Allocation recorded. No buyer refund was sent by this action." :
        result.status === "provider_accepted" ? "Stripe accepted the original refund request. Final refund and access status still require reconciliation; refresh this same payment." :
          "The provider outcome is uncertain. Keep the same operation reference and refresh this payment before reviewing any further action." :
        "The result is unknown. Keep the same operation reference; refresh this payment and review the original evidence. Do not start a replacement operation.");
      setAssessment(null); setReviewed(false);
    } catch { if (valid(sequence)) { setAssessment(null); setMessage("The result is unknown. Preserve the original references and refresh the same payment; no automatic retry was made."); } }
    finally { if (valid(sequence)) setPending(false); busy.current = false; }
  }
  function reviewAgain() {
    const original = intent.current; if (!assessment || !original || pending || completedIntent) return;
    // Only explicit new review after an authoritative read; preserve the exact
    // financial intent. Never generate a replacement operation after uncertainty.
    current.current?.dispose(); current.current = null; setAction(original.action); setAttempted(false);
    setReviewed(false); setForm(v => ({ ...v, confirmation: "" })); setMessage("Review the original evidence and current assessment, then confirm the same operation again if appropriate.");
  }
  if (!sameIdentity) return null;
  return <View style={{ padding: 16, gap: 14, minWidth: 0, maxWidth: "100%", backgroundColor: palette.surface }}>
    <Text accessibilityRole="header" style={{ color: palette.text, fontSize: 19, fontWeight: "700" }}>Course-gift payment review</Text>
    <AdminPasskeySecurity verificationOnly />
    {locked ? <Text style={{ color: palette.text }}>Verify your existing passkey to view private payment details. Verification does not submit a financial action.</Text> : <>
      <Text style={{ color: palette.text }}>Use the exact payment record and original provider evidence. Assessment is read-only. Evidence references locate your review; they do not prove a tax credit. Keep original references before closing; this form is not saved in the browser.</Text>
      <TextInput accessibilityLabel="Course-gift payment record ID" value={purchaseId} maxLength={24} editable={!pending && !assessment && !attempted}
        onChangeText={setPurchaseId} autoComplete="off" autoCorrect={false} autoCapitalize="none" style={inputStyle} />
      {button("Load or refresh payment assessment", () => { void assess(); }, pending || !/^[a-f0-9]{24}$/.test(purchaseId))}
      {message ? <Text accessibilityRole="alert" style={{ color: palette.text }}>{message}</Text> : null}
      {assessment ? <>
        <Text style={{ color: palette.text }}>Paid: {money(assessment.grossAmountCents)} · Refunded: {money(assessment.refundedGrossCents)}{"\n"}Original included tax: {money(assessment.taxAmountCents)} · Original platform fee: {money(assessment.platformFeeCents)}</Text>
        {assessment.refundOperation ? <Text style={{ color: palette.text }}>Original refund operation: {assessment.refundOperation.operationId}{"\n"}Recorded state: {assessment.refundOperation.state}. This is not a new refund authorization.</Text> : null}
        {assessment.allocation ? <Text style={{ color: palette.text }}>Last recorded allocation: gross {money(assessment.allocation.refundedGrossCents)}, tax credit {money(assessment.allocation.taxCreditCents)}, fee returned {money(assessment.allocation.platformFeeReturnedCents)}.</Text> : null}
        {attempted ? completedIntent ? <Text style={{ color: palette.text }}>The original financial intent is confirmed in the current record. It was not submitted again. Close this review before starting a separate decision.</Text> :
          button("Review the same financial intent again", reviewAgain, pending) : <>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {button("Review buyer refund", () => { setAction("refund"); setReviewed(false); setForm(v => ({ ...v, confirmation: "" })); }, pending)}
            {button("Review tax allocation", () => { setAction("allocation"); setReviewed(false); setForm(v => ({ ...v, confirmation: "" })); }, pending)}
          </View>
          {action === "refund" ? <>
            <Text style={{ color: palette.text }}>Refund the buyer's gross amount separately from creator recovery and tax allocation. Tax-credit evidence is not a prerequisite for a required buyer remedy.</Text>
            {field("Refund operation reference", "operationId", 120)}
            {assessment.refundOperation && !["applied", "provider_failed"].includes(assessment.refundOperation.state) ?
              button("Use the recorded refund operation", () => { const op = assessment.refundOperation!; setForm(v => ({ ...v,
                operationId: op.operationId, amount: (op.amountCents / 100).toFixed(2), reason: op.reason, confirmation: "" })); setReviewed(false); }, pending) :
              button("Create a reference for this new refund review", () => { const id = globalThis.crypto?.randomUUID?.();
                if (!id) { setMessage("Secure reference generation is unavailable. Use the existing original operation reference; do not replace an uncertain request."); return; }
                setForm(v => ({ ...v, operationId: `gift-refund-${id}`, confirmation: "" })); setReviewed(false); }, pending || Boolean(intent.current))}
            {field("Buyer refund amount (USD)", "amount", 12, true)}
            <View style={{ gap: 8 }}>{["requested_by_customer", "duplicate", "fraudulent"].map(reason =>
              <Pressable key={reason} accessibilityRole="radio" accessibilityLabel={`Refund reason: ${reason.replaceAll("_", " ")}`}
                accessibilityState={{ checked: form.reason === reason }} disabled={pending} onPress={() => edit("reason", reason)} style={{ padding: 10 }}>
                <Text style={{ color: palette.text }}>{form.reason === reason ? "● " : "○ "}{reason.replaceAll("_", " ")}</Text></Pressable>)}</View>
          </> : <>
            <Text style={{ color: palette.text }}>Record cumulative amounts from the original tax-credit evidence and agreed fee return for the refunded gross shown above. Do not estimate a partial tax credit. This action does not issue a refund or certify a tax invoice.</Text>
            {field("Allocation review reference", "reference", 160)}
            {field("Original tax-credit evidence reference", "taxEvidenceReference", 160)}
            {field("Cumulative tax credit (USD)", "taxCredit", 12, true)}
            {field("Cumulative platform fee returned (USD)", "feeReturned", 12, true)}
          </>}
          {field("Reason for this exact financial decision", "reviewReason", 1000)}
          {field("Original evidence review reference", "evidenceReference", 160)}
          <Text style={{ color: palette.text }}>{expected ? `Type the exact confirmation: ${expected}` : "Enter the exact amounts to see the required confirmation."}</Text>
          {field("Exact financial confirmation", "confirmation", 240)}
          <Pressable accessibilityRole="checkbox" accessibilityLabel="I reviewed the original evidence and these exact payment amounts"
            accessibilityState={{ checked: reviewed, disabled: pending }} disabled={pending} onPress={() => setReviewed(v => !v)}
            style={{ padding: 12, borderWidth: 2, borderColor: palette.border, borderRadius: 8 }}>
            <Text style={{ color: palette.text, fontWeight: "700" }}>{reviewed ? "☑ " : "☐ "}I reviewed the original evidence and these exact payment amounts.</Text></Pressable>
          {button(action === "refund" ? "Submit the reviewed buyer refund" : "Record the reviewed tax allocation", () => { void submit(); }, pending || !reviewed || !candidate())}
        </>}
      </> : null}
    </>}
  </View>;
}

/** Normal/public/native entry remains inert. */
export default function CourseGiftFinancialReviewPanel() { return null; }
