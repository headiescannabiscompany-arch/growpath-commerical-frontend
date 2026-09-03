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
  issueComplimentaryGrant,
  listComplimentaryGrants,
  resendComplimentaryGrant,
  revokeComplimentaryGrant,
  type ComplimentaryGrant,
  type ComplimentaryGrantDuration,
  type ComplimentaryGrantPlan
} from "@/api/complimentaryGrants";
import AppCard from "@/components/layout/AppCard";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

function dateLabel(value: string | null) {
  if (!value) return "Not set";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Invalid date" : date.toLocaleString();
}

export default function ComplimentaryGrantsAdminCard() {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [grants, setGrants] = useState<ComplimentaryGrant[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [feedback, setFeedback] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [message, setMessage] = useState("");
  const [plan, setPlan] = useState<ComplimentaryGrantPlan>("pro");
  const [duration, setDuration] = useState<ComplimentaryGrantDuration>("month");
  const [reason, setReason] = useState("");
  const [actionReasons, setActionReasons] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const page = await listComplimentaryGrants({ limit: 50 });
      setGrants(page.grants);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to load grants.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function replaceGrant(grant: ComplimentaryGrant) {
    setGrants((current) => {
      const exists = current.some((item) => item.id === grant.id);
      return exists
        ? current.map((item) => (item.id === grant.id ? grant : item))
        : [grant, ...current];
    });
  }

  async function issue() {
    if (busy) return;
    setBusy("issue");
    setFeedback("");
    try {
      const result = await issueComplimentaryGrant({
        recipientEmail: recipientEmail.trim().toLowerCase(),
        recipientName: recipientName.trim(),
        message: message.trim(),
        plan,
        duration,
        reason: reason.trim()
      });
      replaceGrant(result.grant);
      setRecipientEmail("");
      setRecipientName("");
      setMessage("");
      setReason("");
      setFeedback(
        result.deliveryAccepted
          ? "Complimentary access was issued and the claim email was accepted."
          : "Access was issued, but email delivery needs retry or configuration. No Stripe object was created."
      );
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to issue access.");
    } finally {
      setBusy("");
    }
  }

  async function act(grant: ComplimentaryGrant, action: "revoke" | "resend") {
    if (busy) return;
    const actionReason = String(actionReasons[grant.id] || "").trim();
    setBusy(`${action}:${grant.id}`);
    setFeedback("");
    try {
      if (action === "revoke") {
        replaceGrant(await revokeComplimentaryGrant(grant.id, actionReason));
        setFeedback("Complimentary access was revoked. No Stripe action was taken.");
      } else {
        const result = await resendComplimentaryGrant(grant.id, actionReason);
        replaceGrant(result.grant);
        setFeedback(
          result.deliveryAccepted
            ? "The claim email was accepted for delivery."
            : "The resend is retained for review or another retry."
        );
      }
      setActionReasons((current) => ({ ...current, [grant.id]: "" }));
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : `Unable to ${action}.`);
    } finally {
      setBusy("");
    }
  }

  return (
    <AppCard
      title="Complimentary access"
      titleLevel={2}
      subtitle="Grant one non-renewing month or year by email. This never creates a Stripe Customer, Checkout Session, Subscription, Invoice, or PaymentIntent."
    >
      <Text style={styles.warning}>
        Only eligible Free recipients can claim. Paid, gift, app-store, protected,
        unresolved, and open-Checkout accounts are blocked.
      </Text>
      <View style={styles.form}>
        <TextInput
          accessibilityLabel="Complimentary recipient email"
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={setRecipientEmail}
          placeholder="Recipient email"
          placeholderTextColor={palette.textMuted}
          selectionColor={palette.accent}
          style={styles.input}
          value={recipientEmail}
        />
        <TextInput
          accessibilityLabel="Complimentary recipient name"
          onChangeText={setRecipientName}
          placeholder="Recipient name (optional)"
          placeholderTextColor={palette.textMuted}
          selectionColor={palette.accent}
          style={styles.input}
          value={recipientName}
        />
        <View style={styles.pickerRow}>
          <View style={styles.pickerWrap}>
            <Picker
              accessibilityLabel="Complimentary plan"
              selectedValue={plan}
              style={styles.picker}
              onValueChange={(value) => setPlan(value as ComplimentaryGrantPlan)}
            >
              <Picker.Item label="Personal Pro" value="pro" />
              <Picker.Item label="Commercial" value="commercial" />
              <Picker.Item label="Facility" value="facility" />
            </Picker>
          </View>
          <View style={styles.pickerWrap}>
            <Picker
              accessibilityLabel="Complimentary duration"
              selectedValue={duration}
              style={styles.picker}
              onValueChange={(value) => setDuration(value as ComplimentaryGrantDuration)}
            >
              <Picker.Item label="One month" value="month" />
              <Picker.Item label="One year" value="year" />
            </Picker>
          </View>
        </View>
        <TextInput
          accessibilityLabel="Complimentary message"
          multiline
          onChangeText={setMessage}
          placeholder="Message to recipient (optional)"
          placeholderTextColor={palette.textMuted}
          selectionColor={palette.accent}
          style={[styles.input, styles.multiline]}
          value={message}
        />
        <TextInput
          accessibilityLabel="Complimentary audit reason"
          multiline
          onChangeText={setReason}
          placeholder="Internal audit reason (required, at least 8 characters)"
          placeholderTextColor={palette.textMuted}
          selectionColor={palette.accent}
          style={[styles.input, styles.multiline]}
          value={reason}
        />
        <Pressable
          accessibilityRole="button"
          disabled={Boolean(busy)}
          onPress={() => void issue()}
          style={[styles.primary, busy && styles.disabled]}
        >
          <Text style={styles.primaryText}>
            {busy === "issue" ? "Issuing..." : "Issue complimentary access"}
          </Text>
        </Pressable>
      </View>

      {feedback ? (
        <Text accessibilityLiveRegion="polite" style={styles.feedback}>
          {feedback}
        </Text>
      ) : null}

      <View style={styles.headingRow}>
        <Text style={styles.heading}>Recent grants</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => void load()}
          style={styles.secondary}
        >
          <Text style={styles.secondaryText}>Refresh</Text>
        </Pressable>
      </View>
      {loading ? <ActivityIndicator color={palette.accent} /> : null}
      {!loading && !grants.length ? (
        <Text style={styles.meta}>No complimentary grants are recorded.</Text>
      ) : null}
      {grants.map((grant) => {
        const actionable = grant.status === "pending" || grant.status === "active";
        const resendable = grant.status === "pending";
        return (
          <View key={grant.id} style={styles.grant}>
            <Text style={styles.grantTitle}>
              {grant.recipientEmail} · {grant.plan} · {grant.duration}
            </Text>
            <Text style={styles.meta}>
              {grant.status} · nonpaid · does not renew · issued{" "}
              {dateLabel(grant.issuedAt)}
            </Text>
            <Text style={styles.meta}>
              Email: {grant.emailDelivery.status} ({grant.emailDelivery.attempts}{" "}
              attempts)
            </Text>
            <Text style={styles.meta}>
              Claim by: {dateLabel(grant.claimExpiresAt)} · Access ends:{" "}
              {dateLabel(grant.entitlementEndsAt)}
            </Text>
            <Text style={styles.meta}>Audit reason: {grant.reason}</Text>
            {actionable ? (
              <>
                <TextInput
                  accessibilityLabel={`Action reason for ${grant.recipientEmail}`}
                  onChangeText={(value) =>
                    setActionReasons((current) => ({
                      ...current,
                      [grant.id]: value
                    }))
                  }
                  placeholder="Reason for resend or revocation"
                  placeholderTextColor={palette.textMuted}
                  selectionColor={palette.accent}
                  style={styles.input}
                  value={actionReasons[grant.id] || ""}
                />
                <View style={styles.actions}>
                  {resendable ? (
                    <Pressable
                      accessibilityRole="button"
                      disabled={Boolean(busy)}
                      onPress={() => void act(grant, "resend")}
                      style={styles.secondary}
                    >
                      <Text style={styles.secondaryText}>Resend claim email</Text>
                    </Pressable>
                  ) : null}
                  <Pressable
                    accessibilityRole="button"
                    disabled={Boolean(busy)}
                    onPress={() => void act(grant, "revoke")}
                    style={styles.danger}
                  >
                    <Text style={styles.dangerText}>Revoke access</Text>
                  </Pressable>
                </View>
              </>
            ) : null}
          </View>
        );
      })}
    </AppCard>
  );
}

function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    warning: { color: palette.warning, fontWeight: "700", lineHeight: 20 },
    form: { gap: 10 },
    input: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      color: palette.text,
      minHeight: 44,
      paddingHorizontal: 12,
      paddingVertical: 10
    },
    multiline: { minHeight: 76, textAlignVertical: "top" },
    pickerRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    pickerWrap: {
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      flexGrow: 1,
      minWidth: 220,
      overflow: "hidden"
    },
    picker: { backgroundColor: palette.surfaceMuted, color: palette.text },
    primary: {
      alignItems: "center",
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      padding: 12
    },
    primaryText: { color: palette.accentText, fontWeight: "900" },
    secondary: {
      alignItems: "center",
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 9
    },
    secondaryText: { color: palette.text, fontWeight: "800" },
    danger: {
      alignItems: "center",
      borderColor: palette.danger,
      borderRadius: radius.card,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 9
    },
    dangerText: { color: palette.danger, fontWeight: "900" },
    disabled: { opacity: 0.5 },
    feedback: { color: palette.text, fontWeight: "700" },
    headingRow: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between"
    },
    heading: { color: palette.text, fontSize: 18, fontWeight: "900" },
    grant: {
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 8,
      padding: 14
    },
    grantTitle: { color: palette.text, fontWeight: "900" },
    meta: { color: palette.textMuted, fontSize: 13, lineHeight: 18 },
    actions: { flexDirection: "row", flexWrap: "wrap", gap: 10 }
  });
}
