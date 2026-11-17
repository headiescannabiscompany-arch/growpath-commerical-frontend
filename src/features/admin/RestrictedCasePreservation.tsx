import React, { useEffect, useMemo, useRef, useState } from "react";
import { Picker } from "@react-native-picker/picker";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import {
  loadRestrictedPreservationTargets,
  recordRestrictedPreservation
} from "@/api/adminEvidenceVault";
import { getAdminSecurityEpoch, getAdminStepUpExpiry } from "@/api/adminPasskeys";
import { useAppTheme } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

type Target = Awaited<ReturnType<typeof loadRestrictedPreservationTargets>>[number];
type Receipt = Awaited<ReturnType<typeof recordRestrictedPreservation>>;
type Submission = Parameters<typeof recordRestrictedPreservation>[1];

const fields = [
  { key: "requesterName", title: "Requester name", limit: 300 },
  { key: "requesterEmail", title: "Requester email", limit: 500 },
  { key: "authorityDescription", title: "Preservation authority or reference", limit: 5000 },
  { key: "scope", title: "Exact preservation scope", limit: 4000 }
] as const;

const blankDraft = { requesterName: "", requesterEmail: "", authorityDescription: "", scope: "" };

function hasCurrentProof() {
  const expiry = getAdminStepUpExpiry();
  return Boolean(expiry && Date.parse(expiry) > Date.now());
}

export default function RestrictedCasePreservation({
  caseId,
  securityEpoch
}: {
  caseId: string;
  securityEpoch: number;
}) {
  const { palette } = useAppTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        panel: { gap: 8, paddingTop: 8 },
        button: { alignSelf: "flex-start", paddingVertical: 8 },
        buttonText: { color: palette.link, fontSize: 13, fontWeight: "800" },
        label: { color: palette.text, fontSize: 13, fontWeight: "700" },
        info: { color: palette.textMuted, fontSize: 12, lineHeight: 17 },
        error: { color: palette.warning, fontSize: 13, lineHeight: 18 },
        success: { color: palette.success, fontSize: 13, fontWeight: "800" },
        control: {
          backgroundColor: palette.surface,
          borderRadius: radius.card,
          borderColor: palette.border,
          borderWidth: 1,
          minHeight: 42,
          paddingHorizontal: 10,
          color: palette.text
        },
        multiline: { minHeight: 62, textAlignVertical: "top" },
        disabled: { opacity: 0.45 }
      }),
    [palette]
  );
  const [targets, setTargets] = useState<Target[] | null>(null);
  const [targetIndex, setTargetIndex] = useState(-1);
  const [draft, setDraft] = useState(blankDraft);
  const [sent, setSent] = useState<Submission | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const mounted = useRef(true);
  const inFlight = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  function canUseCase() {
    return mounted.current && getAdminSecurityEpoch() === securityEpoch && hasCurrentProof();
  }

  async function loadTargets() {
    if (inFlight.current || !canUseCase()) return;
    inFlight.current = true;
    setBusy(true);
    setLoadFailed(false);
    try {
      const next = await loadRestrictedPreservationTargets(caseId);
      if (!canUseCase()) return;
      setTargets(next);
      setTargetIndex(next.length === 1 ? 0 : -1);
    } catch {
      if (canUseCase()) setLoadFailed(true);
    } finally {
      inFlight.current = false;
      if (canUseCase()) setBusy(false);
    }
  }

  const target = targets?.[targetIndex];
  const ready = Boolean(
    target &&
      draft.requesterName.trim() &&
      draft.authorityDescription.trim() &&
      draft.scope.trim() &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.requesterEmail.trim())
  );

  async function submit() {
    if (inFlight.current || !canUseCase()) return;
    let input = sent;
    if (!input) {
      if (!target || !ready) return;
      input = {
        ...target,
        requesterName: draft.requesterName.trim(),
        requesterEmail: draft.requesterEmail.trim().toLowerCase(),
        authorityDescription: draft.authorityDescription.trim(),
        scope: draft.scope.trim()
      };
    }
    inFlight.current = true;
    setSent(input);
    setBusy(true);
    setUnconfirmed(false);
    try {
      const saved = await recordRestrictedPreservation(caseId, input);
      if (!canUseCase()) return;
      setReceipt(saved);
      setSent(null);
      setDraft(blankDraft);
    } catch {
      if (canUseCase()) setUnconfirmed(true);
    } finally {
      inFlight.current = false;
      if (canUseCase()) setBusy(false);
    }
  }

  if (!hasCurrentProof()) {
    return <Text style={styles.info}>Verify your passkey in Admin security to record a preservation hold.</Text>;
  }

  if (receipt) {
    return (
      <View style={styles.panel} role="status" accessibilityLiveRegion="polite">
        <Text style={styles.success}>
          {receipt.preservationHold ? "Preservation hold recorded." : "The saved preservation hold is no longer active."}
        </Text>
        <Text style={styles.info}>Request reference {receipt.evidenceRequestId}</Text>
      </View>
    );
  }

  if (targets === null) {
    return (
      <View style={styles.panel}>
        {loadFailed ? (
          <Text style={styles.error} accessibilityLiveRegion="polite">
            The case targets could not be loaded. Try opening preservation again.
          </Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => void loadTargets()}
          style={[styles.button, busy && styles.disabled]}
        >
          <Text style={styles.buttonText}>{busy ? "Loading case targets…" : "Preserve a case target"}</Text>
        </Pressable>
      </View>
    );
  }

  if (!targets.length) {
    return <Text style={styles.info}>This case has no retained targets available for a hold.</Text>;
  }

  const locked = Boolean(sent) || busy;
  return (
    <View style={styles.panel}>
      <Text style={styles.label}>Preservation hold</Text>
      <Text style={styles.info}>
        Record a hold for one selected target. Use the exact authority and scope of the request.
        Outside reports are handled separately.
      </Text>
      <Text style={styles.label}>Case target</Text>
      <Picker
        accessibilityLabel="Preservation case target"
        enabled={!locked}
        selectedValue={targetIndex}
        onValueChange={setTargetIndex}
        style={styles.control}
      >
        <Picker.Item label="Select a case target" value={-1} />
        {targets.map((item, index) => (
          <Picker.Item label={`${item.targetType} · ${item.targetId}`} value={index} key={`${item.targetType}:${item.targetId}`} />
        ))}
      </Picker>
      {fields.map(({ key, title, limit }) => {
        const multiline = key === "authorityDescription" || key === "scope";
        return (
          <View key={key} style={{ gap: 4 }}>
            <Text style={styles.label}>{title}</Text>
            <TextInput
              accessibilityLabel={title}
              autoCapitalize={key === "requesterEmail" ? "none" : "sentences"}
              autoComplete="off"
              autoCorrect={false}
              editable={!locked}
              keyboardType={key === "requesterEmail" ? "email-address" : "default"}
              maxLength={limit}
              multiline={multiline}
              onChangeText={(value) => setDraft((current) => ({ ...current, [key]: value }))}
              style={[styles.control, multiline && styles.multiline]}
              value={draft[key]}
            />
          </View>
        );
      })}
      {unconfirmed ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          The hold could not be confirmed. Retry this exact request to recover its receipt or finish saving it.
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        disabled={busy || (!sent && !ready)}
        onPress={() => void submit()}
        style={[styles.button, (busy || (!sent && !ready)) && styles.disabled]}
      >
        <Text style={styles.buttonText}>
          {busy ? "Checking preservation request…" : sent ? "Retry same preservation request" : "Record preservation hold"}
        </Text>
      </Pressable>
    </View>
  );
}
