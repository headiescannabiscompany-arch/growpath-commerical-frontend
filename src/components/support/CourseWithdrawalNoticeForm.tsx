import React, { useRef, useState } from "react";
import { Platform, Share, Text, TextInput, View } from "react-native";
import PrimaryButton from "@/components/PrimaryButton";
import { useAppTheme } from "@/theme/appTheme";
import { sendCourseWithdrawal, type CourseWithdrawalInput, type CourseWithdrawalReceipt } from "@/api/courseWithdrawal";

export default function CourseWithdrawalNoticeForm() {
  const { palette } = useAppTheme();
  const [name, setName] = useState(""), [email, setEmail] = useState(""), [reference, setReference] = useState("");
  const [review, setReview] = useState(false), [busy, setBusy] = useState(false), [uncertain, setUncertain] = useState(false);
  const [receipt, setReceipt] = useState<CourseWithdrawalReceipt | null>(null), [feedback, setFeedback] = useState("");
  const pending = useRef<CourseWithdrawalInput | null>(null), flight = useRef(false);
  const text = { color: palette.text }, field = { color: palette.text, borderColor: palette.border,
    borderWidth: 1, borderRadius: 8, padding: 12, minHeight: 48 };
  const printable = (v: string) => !/[\u0000-\u001f\u007f-\u009f]/.test(v.trim());
  const valid = printable(name) && printable(reference) && name.trim().length > 0 && name.trim().length <= 120 &&
    /^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/.test(email.trim()) && email.trim().length <= 320 &&
    reference.trim().length > 0 && reference.trim().length <= 160 && !/https?:\/\/|token=/i.test(reference);
  async function confirm() {
    if (flight.current || !review || (!pending.current && !valid)) return;
    flight.current = true; setBusy(true); setFeedback("");
    try {
      if (!pending.current) {
        // Reuse the existing course-gift browser UUID mechanism. A runtime that
        // cannot supply it fails before any notice request; no extra dependency.
        const requestId = globalThis.crypto?.randomUUID?.();
        if (typeof requestId !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(requestId))
          throw new Error("Request identity unavailable");
        pending.current = { requestId, name: name.trim(), email: email.trim().toLowerCase(),
          contractReference: reference.trim(), confirmed: true };
      }
      const result = await sendCourseWithdrawal(pending.current);
      setReceipt(result); setUncertain(false);
    } catch {
      setUncertain(Boolean(pending.current));
      setFeedback(pending.current
        ? "We could not confirm the result. Retry the same notice below; it keeps the original request. You can also contact support@growpathai.com."
        : "We could not prepare a secure request. Contact support@growpathai.com or try again.");
    } finally { flight.current = false; setBusy(false); }
  }
  async function saveReceipt() {
    if (!receipt) return;
    try {
      if (Platform.OS === "web" && typeof document !== "undefined") {
        const url = URL.createObjectURL(new Blob([receipt.receiptText], { type: "text/plain;charset=utf-8" }));
        try {
          const anchor = document.createElement("a"); anchor.href = url;
          anchor.download = `GrowPathAI-course-withdrawal-${receipt.receiptId}.txt`;
          document.body.appendChild(anchor); anchor.click(); anchor.remove();
        } finally { URL.revokeObjectURL(url); }
      } else await Share.share({ message: receipt.receiptText });
    } catch { setFeedback("Save was not confirmed. You can select and copy the receipt text below."); }
  }
  if (receipt) return <View style={{ gap: 16 }}>
    <Text accessibilityRole="header" style={text}>Withdrawal notice received</Text>
    <Text style={text}>Save this acknowledgement. Refund and course-access handling will be reviewed under the applicable customer rights.</Text>
    <Text style={text}>{receipt.emailStatus === "sent" ? "An email acknowledgement has been sent." : "Email acknowledgement was not confirmed. Keep this receipt and contact support if needed."}</Text>
    <PrimaryButton title="Save acknowledgement" onPress={() => void saveReceipt()} />
    <Text selectable style={text}>{receipt.receiptText}</Text>
    {feedback ? <Text accessibilityLiveRegion="polite" style={text}>{feedback}</Text> : null}
  </View>;
  return <View style={{ gap: 16 }}>
    {!review ? <>
      <Text style={text}>Your name</Text>
      <TextInput accessibilityLabel="Consumer name" value={name} onChangeText={setName} maxLength={120} style={field} />
      <Text style={text}>Email for your acknowledgement</Text>
      <TextInput accessibilityLabel="Acknowledgement email" value={email} onChangeText={setEmail}
        autoCapitalize="none" autoCorrect={false} keyboardType="email-address" maxLength={320} style={field} />
      <Text style={text}>Course order or payment reference</Text>
      <TextInput accessibilityLabel="Course contract reference" value={reference} onChangeText={setReference} maxLength={160} style={field} />
      <Text style={text}>Use the reference from your order or payment confirmation. Do not enter passwords or gift-invitation links. No reason is required.</Text>
      <PrimaryButton title="Withdraw from course contract / Vertrag widerrufen" disabled={!valid} onPress={() => { setFeedback(""); setReview(true); }} />
    </> : <>
      <Text style={text}>Review your withdrawal notice</Text>
      <Text style={text}>Name: {name.trim()}</Text><Text style={text}>Acknowledgement email: {email.trim().toLowerCase()}</Text>
      <Text style={text}>Contract reference: {reference.trim()}</Text>
      <Text style={text}>I withdraw from the course contract identified above.</Text>
      <PrimaryButton title={uncertain ? "Retry the same withdrawal notice" : "Confirm withdrawal / Widerruf bestätigen"} disabled={busy} onPress={() => void confirm()} />
      {!pending.current && <PrimaryButton title="Edit notice" disabled={busy} onPress={() => setReview(false)} />}
    </>}
    {feedback ? <Text accessibilityLiveRegion="polite" style={text}>{feedback}</Text> : null}
  </View>;
}
