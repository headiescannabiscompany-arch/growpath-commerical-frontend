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
  issueComplimentaryGrant,
  listComplimentaryFacilityWorkspaces,
  listComplimentaryGrants,
  resendComplimentaryGrant,
  revokeComplimentaryGrant,
  type ComplimentaryGrant,
  type ComplimentaryGrantDuration,
  type ComplimentaryFacilityWorkspace,
  type ComplimentaryGrantPlan
} from "@/api/complimentaryGrants";
import AppCard from "@/components/layout/AppCard";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

const COMPLIMENTARY_GRANTS_PAGE_SIZE = 5;

function dateLabel(value: string | null) {
  if (!value) return "Not set";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Invalid date" : date.toLocaleString();
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function ComplimentaryGrantsAdminCard() {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [grants, setGrants] = useState<ComplimentaryGrant[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [feedback, setFeedback] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [message, setMessage] = useState("");
  const [plan, setPlan] = useState<ComplimentaryGrantPlan>("pro");
  const [duration, setDuration] = useState<ComplimentaryGrantDuration>("month");
  const [facilityId, setFacilityId] = useState("");
  const [facilityWorkspaces, setFacilityWorkspaces] = useState<
    ComplimentaryFacilityWorkspace[]
  >([]);
  const [facilityWorkspacesLoading, setFacilityWorkspacesLoading] = useState(false);
  const [facilityLookupEmail, setFacilityLookupEmail] = useState("");
  const facilityLookupGeneration = useRef(0);
  const currentRecipientEmail = useRef("");
  const currentPlan = useRef<ComplimentaryGrantPlan>("pro");
  const [reason, setReason] = useState("");
  const [actionReasons, setActionReasons] = useState<Record<string, string>>({});
  const facilityReady =
    plan !== "facility" ||
    (facilityLookupEmail === recipientEmail.trim().toLowerCase() &&
      facilityWorkspaces.some((workspace) => workspace.facilityId === facilityId));
  const canIssue =
    !busy && validEmail(recipientEmail) && reason.trim().length >= 8 && facilityReady;

  const load = useCallback(async (cursor: string | null = null) => {
    setLoading(true);
    try {
      const page = await listComplimentaryGrants({
        limit: COMPLIMENTARY_GRANTS_PAGE_SIZE,
        ...(cursor ? { cursor } : {})
      });
      setGrants((current) => {
        if (!cursor) return page.grants;
        const byId = new Map(current.map((grant) => [grant.id, grant]));
        page.grants.forEach((grant) => byId.set(grant.id, grant));
        return Array.from(byId.values());
      });
      setNextCursor(page.nextCursor);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Unable to load grants.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(null);
  }, [load]);

  function replaceGrant(grant: ComplimentaryGrant) {
    setGrants((current) => {
      const exists = current.some((item) => item.id === grant.id);
      return exists
        ? current.map((item) => (item.id === grant.id ? grant : item))
        : [grant, ...current];
    });
  }

  async function loadFacilityWorkspaces() {
    const email = recipientEmail.trim().toLowerCase();
    if (!validEmail(email) || facilityWorkspacesLoading) return;
    const generation = facilityLookupGeneration.current + 1;
    facilityLookupGeneration.current = generation;
    setFacilityWorkspacesLoading(true);
    setFacilityLookupEmail("");
    setFacilityId("");
    setFacilityWorkspaces([]);
    setFeedback("");
    try {
      const result = await listComplimentaryFacilityWorkspaces(email);
      if (
        generation !== facilityLookupGeneration.current ||
        currentPlan.current !== "facility" ||
        currentRecipientEmail.current.trim().toLowerCase() !== email
      ) {
        return;
      }
      setFacilityWorkspaces(result.workspaces);
      setFacilityLookupEmail(result.recipientEmail);
      if (!result.workspaces.length) {
        setFeedback(
          "This recipient does not own a Facility workspace that can receive access."
        );
      }
    } catch (error) {
      setFeedback(
        error instanceof Error
          ? error.message
          : "Unable to load the recipient's Facility workspaces."
      );
    } finally {
      if (generation === facilityLookupGeneration.current) {
        setFacilityWorkspacesLoading(false);
      }
    }
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
        ...(plan === "facility" ? { facilityId } : {}),
        reason: reason.trim()
      });
      replaceGrant(result.grant);
      setRecipientEmail("");
      setRecipientName("");
      setMessage("");
      setFacilityId("");
      setFacilityWorkspaces([]);
      setFacilityLookupEmail("");
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
          onChangeText={(value) => {
            facilityLookupGeneration.current += 1;
            currentRecipientEmail.current = value;
            setRecipientEmail(value);
            setFacilityId("");
            setFacilityWorkspaces([]);
            setFacilityLookupEmail("");
            setFacilityWorkspacesLoading(false);
          }}
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
              onValueChange={(value) => {
                const nextPlan = value as ComplimentaryGrantPlan;
                facilityLookupGeneration.current += 1;
                currentPlan.current = nextPlan;
                setPlan(nextPlan);
                setFacilityId("");
                setFacilityWorkspaces([]);
                setFacilityLookupEmail("");
                setFacilityWorkspacesLoading(false);
              }}
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
        {plan === "facility" ? (
          <View style={styles.facilityPickerSection}>
            <Text style={styles.meta}>
              Facility access must be bound to one workspace currently owned by the
              recipient.
            </Text>
            <Pressable
              accessibilityLabel="Find complimentary recipient Facility workspaces"
              accessibilityRole="button"
              accessibilityState={{
                disabled: !validEmail(recipientEmail) || facilityWorkspacesLoading
              }}
              disabled={!validEmail(recipientEmail) || facilityWorkspacesLoading}
              onPress={() => void loadFacilityWorkspaces()}
              style={[
                styles.secondary,
                (!validEmail(recipientEmail) || facilityWorkspacesLoading) &&
                  styles.disabled
              ]}
            >
              <Text style={styles.secondaryText}>
                {facilityWorkspacesLoading
                  ? "Finding workspaces..."
                  : "Find owned workspaces"}
              </Text>
            </Pressable>
            {facilityWorkspaces.length ? (
              <View style={styles.pickerWrap}>
                <Picker
                  accessibilityLabel="Complimentary Facility workspace"
                  selectedValue={facilityId}
                  style={styles.picker}
                  onValueChange={(value) => setFacilityId(String(value || ""))}
                >
                  <Picker.Item label="Select one Facility workspace" value="" />
                  {facilityWorkspaces.map((workspace) => (
                    <Picker.Item
                      key={workspace.facilityId}
                      label={
                        workspace.workspaceReference
                          ? `${workspace.name} · ${workspace.workspaceReference}`
                          : workspace.name
                      }
                      value={workspace.facilityId}
                    />
                  ))}
                </Picker>
              </View>
            ) : null}
          </View>
        ) : null}
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
          accessibilityState={{ disabled: !canIssue }}
          disabled={!canIssue}
          onPress={() => void issue()}
          style={[styles.primary, !canIssue && styles.disabled]}
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
          accessibilityState={{ disabled: loading || Boolean(busy) }}
          disabled={loading || Boolean(busy)}
          onPress={() => void load(null)}
          style={[styles.secondary, (loading || Boolean(busy)) && styles.disabled]}
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
        const actionReasonReady =
          String(actionReasons[grant.id] || "").trim().length >= 8;
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
              {grant.status === "pending"
                ? `Claim by: ${dateLabel(grant.claimExpiresAt)} · Access starts when claimed for one ${grant.duration}`
                : `Access ends: ${dateLabel(grant.entitlementEndsAt)}`}
            </Text>
            <Text style={styles.meta}>Audit reason: {grant.reason}</Text>
            {grant.plan === "facility" ? (
              <Text style={styles.meta}>
                {grant.facilityId
                  ? "Bound to one Facility workspace"
                  : "Legacy Facility grant · primary workspace compatibility"}
              </Text>
            ) : null}
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
                      accessibilityState={{
                        disabled: Boolean(busy) || !actionReasonReady
                      }}
                      disabled={Boolean(busy) || !actionReasonReady}
                      onPress={() => void act(grant, "resend")}
                      style={[
                        styles.secondary,
                        (busy || !actionReasonReady) && styles.disabled
                      ]}
                    >
                      <Text style={styles.secondaryText}>Resend claim email</Text>
                    </Pressable>
                  ) : null}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{
                      disabled: Boolean(busy) || !actionReasonReady
                    }}
                    disabled={Boolean(busy) || !actionReasonReady}
                    onPress={() => void act(grant, "revoke")}
                    style={[
                      styles.danger,
                      (busy || !actionReasonReady) && styles.disabled
                    ]}
                  >
                    <Text style={styles.dangerText}>
                      {grant.status === "pending" ? "Cancel invitation" : "Revoke access"}
                    </Text>
                  </Pressable>
                </View>
              </>
            ) : null}
          </View>
        );
      })}
      {nextCursor ? (
        <Pressable
          accessibilityLabel="Load more complimentary grants"
          accessibilityRole="button"
          accessibilityState={{ disabled: loading || Boolean(busy) }}
          disabled={loading || Boolean(busy)}
          onPress={() => void load(nextCursor)}
          style={[styles.secondary, (loading || Boolean(busy)) && styles.disabled]}
        >
          <Text style={styles.secondaryText}>Load more grants</Text>
        </Pressable>
      ) : null}
    </AppCard>
  );
}

function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    warning: { color: palette.warning, fontWeight: "700", lineHeight: 20 },
    form: { gap: 10 },
    facilityPickerSection: { gap: 8 },
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
