import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Platform, Pressable, Text, TextInput, View } from "react-native";
import { Picker } from "@react-native-picker/picker";
import CalendarDateField from "@/components/forms/CalendarDateField";
import {
  changeArchiveRetention,
  prepareRetentionConfirmation,
  validateRetentionProposal,
  RETENTION_AUTHORITIES,
  type RetentionAction,
  type RetentionAuthority,
  type RetentionProposal,
  type RetentionReceipt
} from "@/api/adminArchiveRetention";
import { getAdminSecurityEpoch } from "@/api/adminPasskeys";
import { useAdminSecurityEpoch } from "./useAdminSecurity";
import { useAppTheme } from "@/theme/appTheme";

export default function AdminArchiveRetention({ authorized }: { authorized: boolean }) {
  const epoch = useAdminSecurityEpoch();
  return authorized ? <RetentionSession key={epoch} epoch={epoch} /> : null;
}

function RetentionSession({ epoch }: { epoch: number }) {
  const { palette } = useAppTheme();
  const [expanded, setExpanded] = useState(false);
  const [archiveId, setArchiveId] = useState("");
  const [requestId, setRequestId] = useState("");
  const [action, setAction] = useState<RetentionAction | "">("");
  const [authority, setAuthority] = useState<RetentionAuthority | "">("");
  const [reason, setReason] = useState("");
  const [reference, setReference] = useState("");
  const [agency, setAgency] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [prepared, setPrepared] = useState<{
    proposal: RetentionProposal;
    phrase: string;
  } | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [receipt, setReceipt] = useState<RetentionReceipt | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [submittedOnce, setSubmittedOnce] = useState(false);
  const generation = useRef(0);
  const pending = useRef(false);
  const mounted = useRef(true);
  const disabled = busy || submittedOnce;

  const clearReview = useCallback(() => {
    generation.current += 1;
    setPrepared(null);
    setConfirmation("");
    setReceipt(null);
    setMessage("");
    setAcknowledged(false);
  }, []);
  const clearDraft = useCallback(() => {
    clearReview();
    setArchiveId("");
    setRequestId("");
    setAction("");
    setAuthority("");
    setReason("");
    setReference("");
    setAgency("");
    setSubmitted("");
  }, [clearReview]);
  useEffect(() => {
    mounted.current = true;
    function hide() {
      clearDraft();
      setExpanded(false);
    }
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") hide();
    });
    const onVisibility = () => {
      if (document.hidden) hide();
    };
    if (Platform.OS === "web" && typeof document !== "undefined")
      document.addEventListener("visibilitychange", onVisibility);
    return () => {
      mounted.current = false;
      generation.current += 1;
      subscription?.remove();
      if (Platform.OS === "web" && typeof document !== "undefined")
        document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [clearDraft]);
  useEffect(() => {
    if (!prepared) return;
    const timer = setTimeout(() => {
      clearReview();
      setMessage("Confirmation expired. Prepare the change again.");
    }, 5 * 60_000);
    return () => clearTimeout(timer);
  }, [prepared, clearReview]);

  function proposal(): RetentionProposal | null {
    if (!action || !authority) return null;
    try {
      const parsed = new Date(submitted);
      return validateRetentionProposal({
        archiveId,
        evidenceRequestId: requestId,
        action,
        authority,
        reason,
        authorityReference: reference,
        agencyReference: agency,
        ...(submitted && Number.isFinite(parsed.getTime())
          ? { reportSubmittedAt: parsed.toISOString() }
          : {})
      });
    } catch {
      return null;
    }
  }
  const ready = proposal();
  async function run(save: boolean) {
    if (pending.current || submittedOnce || epoch !== getAdminSecurityEpoch()) return;
    const input = save ? prepared?.proposal : ready;
    if (
      !input ||
      (save && (!acknowledged || !prepared || confirmation !== prepared.phrase))
    )
      return;
    const attempt = ++generation.current;
    pending.current = true;
    setBusy(true);
    setMessage("");
    setReceipt(null);
    const current = () =>
      mounted.current &&
      generation.current === attempt &&
      epoch === getAdminSecurityEpoch();
    if (save) {
      setSubmittedOnce(true);
      setPrepared(null);
      setConfirmation("");
    }
    try {
      if (save) {
        const result = await changeArchiveRetention(input, confirmation);
        if (current()) setReceipt(result);
      } else {
        const phrase = await prepareRetentionConfirmation(input);
        if (current()) {
          setPrepared({ proposal: input, phrase });
          setAcknowledged(false);
          setConfirmation("");
        }
      }
    } catch {
      if (current())
        setMessage(
          save
            ? "Hold-change outcome not confirmed. It may have been saved. Check the request and retention audit before starting another change; nothing will retry automatically."
            : "Confirmation unavailable. Verify your passkey, independent approver permissions, and the case details. No hold change was submitted."
        );
    } finally {
      pending.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  function change(update: () => void) {
    if (disabled) return;
    clearReview();
    update();
  }
  const inputStyle = {
    color: palette.text,
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: 8,
    minHeight: 42,
    padding: 10
  };
  function button(label: string, onPress: () => void, inactive = false) {
    return (
      <Pressable
        accessibilityRole="button"
        disabled={inactive}
        onPress={onPress}
        style={{ paddingVertical: 10, opacity: inactive ? 0.45 : 1 }}
      >
        <Text style={{ color: palette.link, fontWeight: "700" }}>{label}</Text>
      </Pressable>
    );
  }
  function field(
    label: string,
    value: string,
    setter: (value: string) => void,
    maxLength = 1000
  ) {
    return (
      <View>
        <Text style={{ color: palette.text }}>{label}</Text>
        <TextInput
          accessibilityLabel={label}
          value={value}
          onChangeText={(value) => change(() => setter(value))}
          editable={!disabled}
          autoCorrect={false}
          autoCapitalize="none"
          maxLength={maxLength}
          style={inputStyle}
        />
      </View>
    );
  }
  return (
    <View style={{ gap: 8 }}>
      {button(
        expanded ? "Close archive retention controls" : "Archive retention / holds",
        () => {
          clearDraft();
          setExpanded(!expanded);
        }
      )}
      {expanded ? (
        <View style={{ gap: 10 }}>
          <Text style={{ color: palette.textMuted }}>
            Independent approvers only. Preservation is not disclosure or legal approval.
            Use an authorized archive/request pair and reviewed authority. The server
            controls eligibility, duration and audit; this form cannot choose a purge
            date, open data, contact an authority or grant access.
          </Text>
          {field(
            "Retention archive ID",
            archiveId,
            (value) => setArchiveId(value.trim().toLowerCase()),
            24
          )}
          {field(
            "Retention evidence request ID",
            requestId,
            (value) => setRequestId(value.trim().toLowerCase()),
            24
          )}
          <Text style={{ color: palette.text }}>Hold action</Text>
          <Picker
            accessibilityLabel="Hold action"
            enabled={!disabled}
            selectedValue={action}
            onValueChange={(value) =>
              change(() => {
                setAction(value);
                setAuthority("");
                setAgency("");
                setSubmitted("");
              })
            }
            style={inputStyle}
          >
            <Picker.Item label="Select an action" value="" />
            <Picker.Item label="Apply reviewed hold" value="apply" />
            <Picker.Item label="Renew existing 2703(f) hold" value="renew" />
            <Picker.Item label="Release reviewed hold" value="release" />
          </Picker>
          <Text style={{ color: palette.text }}>Reviewed preservation authority</Text>
          <Picker
            accessibilityLabel="Preservation authority"
            enabled={!disabled}
            selectedValue={authority}
            onValueChange={(value) =>
              change(() => {
                setAuthority(value);
                setAgency("");
                setSubmitted("");
              })
            }
            style={inputStyle}
          >
            <Picker.Item label="Select reviewed authority" value="" />
            {RETENTION_AUTHORITIES.filter(
              (value) => action !== "renew" || value === "2703f"
            ).map((value) => (
              <Picker.Item
                key={value}
                label={
                  value === "legal_hold"
                    ? "Legal hold"
                    : value === "emergency"
                      ? "Emergency review"
                      : value === "2703f"
                        ? "2703(f) preservation"
                        : "2258A covered-report preservation"
                }
                value={value}
              />
            ))}
          </Picker>
          {field("Retention change reason", reason, setReason)}
          {field("Non-secret authority reference", reference, setReference)}
          {action === "apply" && ["2258a", "emergency"].includes(authority)
            ? field("Agency or incident reference", agency, setAgency)
            : null}
          {action === "apply" && authority === "2258a" ? (
            <CalendarDateField
              accessibilityLabel="Completed report submission time"
              label="Completed report submission time"
              mode="datetime"
              value={submitted}
              onChange={(value) => change(() => setSubmitted(value))}
              disabled={disabled}
            />
          ) : null}
          {action === "release" ? (
            <Text style={{ color: palette.warning }}>
              Releasing a hold can allow scheduled deletion when otherwise eligible. The
              request must already be closed or rejected and match this hold. This action
              does not immediately purge data. Review other preservation obligations
              first.
            </Text>
          ) : null}
          {button(
            busy ? "Checking…" : "Prepare hold confirmation",
            () => void run(false),
            disabled || !ready
          )}
          {prepared ? (
            <View style={{ gap: 8 }}>
              <Text style={{ color: palette.text }}>
                Proposed {prepared.proposal.action}: {prepared.proposal.authority} ·
                archive {prepared.proposal.archiveId} · request{" "}
                {prepared.proposal.evidenceRequestId}
              </Text>
              <Text style={{ color: palette.warning }}>
                Confirmation phrase prepared only. Eligibility and current hold state have
                NOT been verified; the server checks them when you submit.
              </Text>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityLabel="Reviewed preservation obligations"
                accessibilityState={{ checked: acknowledged }}
                onPress={() => setAcknowledged(!acknowledged)}
              >
                <Text style={{ color: palette.text }}>
                  {acknowledged ? "☑" : "☐"} I reviewed the authority, exact case, and
                  preservation obligations for this change.
                </Text>
              </Pressable>
              <Text style={{ color: palette.textMuted }}>
                Type exactly: {prepared.phrase}
              </Text>
              <TextInput
                accessibilityLabel="Exact hold confirmation"
                value={confirmation}
                onChangeText={setConfirmation}
                autoCorrect={false}
                autoCapitalize="none"
                maxLength={120}
                style={inputStyle}
              />
              {button(
                "Confirm hold change",
                () => void run(true),
                busy || !acknowledged || confirmation !== prepared.phrase
              )}
            </View>
          ) : null}
          {receipt ? (
            <Text style={{ color: palette.text }}>
              Saved for archive {receipt.archiveId}:{" "}
              {receipt.preservationHold
                ? `hold active (${receipt.authority})`
                : "hold released"}
              . Expiry:{" "}
              {receipt.expiresAt
                ? new Date(receipt.expiresAt).toLocaleString()
                : receipt.preservationHold
                  ? "no fixed expiry"
                  : "none — hold released"}
              . Renewal count: {receipt.renewalCount}. No external transmission. Legal
              request status was not approved or disclosed by this action.
            </Text>
          ) : null}
          {message ? (
            <Text accessibilityRole="alert" style={{ color: palette.warning }}>
              {message}
            </Text>
          ) : null}
          {submittedOnce ? (
            <View>
              <Text style={{ color: palette.textMuted }}>
                Check the saved request and retention audit before another change,
                especially if the result was interrupted.
              </Text>
              {button(
                "Clear form for a new reviewed change",
                () => {
                  if (!pending.current) {
                    clearDraft();
                    setSubmittedOnce(false);
                  }
                },
                busy
              )}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
