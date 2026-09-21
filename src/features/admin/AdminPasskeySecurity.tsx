import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import {
  adminPasskeysSupported,
  getAdminPasskeyStatus,
  getAdminSecurityIdentityEpoch,
  getAdminStepUpExpiry,
  lockAdminSecurity,
  registerAdminPasskey,
  revokeAdminPasskey,
  subscribeAdminSecurity,
  verifyAdminPasskey,
  type AdminPasskeyStatus
} from "@/api/adminPasskeys";
import { useAppTheme } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

export default function AdminPasskeySecurity() {
  const identityEpoch = useSyncExternalStore(
    subscribeAdminSecurity,
    getAdminSecurityIdentityEpoch,
    () => 0
  );
  const mounted = useRef(true);
  const { palette } = useAppTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        panel: {
          gap: 8,
          borderWidth: 1,
          borderColor: palette.border,
          borderRadius: radius.card,
          padding: 12
        },
        title: { color: palette.text, fontWeight: "800", fontSize: 15 },
        text: { color: palette.textMuted, fontSize: 12, lineHeight: 18 },
        feedback: { color: palette.text, fontSize: 13 },
        input: {
          color: palette.text,
          backgroundColor: palette.surface,
          borderWidth: 1,
          borderColor: palette.border,
          borderRadius: radius.card,
          minHeight: 42,
          padding: 10
        },
        button: {
          alignSelf: "flex-start",
          borderWidth: 1,
          borderColor: palette.border,
          borderRadius: radius.card,
          padding: 10
        },
        buttonText: { color: palette.link, fontWeight: "700" },
        disabled: { opacity: 0.45 },
        row: { flexDirection: "row", flexWrap: "wrap", gap: 8 }
      }),
    [palette]
  );
  const [status, setStatus] = useState<AdminPasskeyStatus | null>(null);
  const [expiresAt, setExpiresAt] = useState(getAdminStepUpExpiry());
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [password, setPassword] = useState("");
  const [label, setLabel] = useState("");
  const [revokeId, setRevokeId] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const supported = adminPasskeysSupported();

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(
    () =>
      subscribeAdminSecurity(() => {
        setExpiresAt(getAdminStepUpExpiry());
        setPassword("");
        setConfirmation("");
      }),
    []
  );
  useEffect(() => {
    setStatus(null);
    setExpiresAt(getAdminStepUpExpiry());
    setBusy(false);
    setMessage("");
    setPassword("");
    setLabel("");
    setRevokeId("");
    setConfirmation("");
  }, [identityEpoch]);
  useEffect(() => {
    if (!expanded) return;
    let active = true;
    void getAdminPasskeyStatus()
      .then((next) => {
        if (active && identityEpoch === getAdminSecurityIdentityEpoch()) setStatus(next);
      })
      .catch(() => {
        if (active && identityEpoch === getAdminSecurityIdentityEpoch())
          setMessage(
            "Admin passkey setup is not available yet. Restricted access is not verified."
          );
      });
    return () => {
      active = false;
    };
  }, [expanded, identityEpoch]);

  async function run(action: () => Promise<unknown>, success: string) {
    const isCurrentIdentity = () =>
      mounted.current && identityEpoch === getAdminSecurityIdentityEpoch();
    if (busy || !isCurrentIdentity()) return;
    setBusy(true);
    setMessage("");
    // Keep passwords out of rendered state throughout the device ceremony.
    setPassword("");
    try {
      await action();
      if (!isCurrentIdentity()) return;
      setMessage(success);
      setRevokeId("");
      setConfirmation("");
      const next = await getAdminPasskeyStatus();
      if (isCurrentIdentity()) setStatus(next);
    } catch (error: any) {
      if (!isCurrentIdentity()) return;
      setMessage(
        error?.name === "NotAllowedError" || error?.name === "AbortError"
          ? "Passkey confirmation was canceled or timed out. No restricted action was performed."
          : error?.data?.message ||
              error?.message ||
              "The result could not be confirmed. Refresh Admin security before retrying."
      );
    } finally {
      if (isCurrentIdentity()) setBusy(false);
    }
  }

  function button(text: string, action: () => void, disabled = false) {
    return (
      <Pressable
        accessibilityRole="button"
        disabled={busy || disabled}
        onPress={action}
        style={[styles.button, busy || disabled ? styles.disabled : null]}
      >
        <Text style={styles.buttonText}>{text}</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.panel} accessibilityLabel="Admin passkey security">
      <Text style={styles.title}>Admin security</Text>
      <Text style={styles.text}>
        {expiresAt
          ? `Verified until ${new Date(expiresAt).toLocaleTimeString()}. Existing role and review restrictions still apply.`
          : "Set up and verify your own passkey here. Open this section to check whether passkey enforcement is enabled."}
      </Text>
      {button(expanded ? "Hide Admin security" : "Set up or verify a passkey", () => {
        setPassword("");
        setConfirmation("");
        setExpanded(!expanded);
      })}
      {expanded ? (
        <View style={{ gap: 8 }}>
          {!supported ? (
            <Text style={styles.text}>
              Use an HTTPS browser supporting Windows Hello, a phone passkey, or a
              security key. No password-only bypass is available.
            </Text>
          ) : null}
          {busy ? <ActivityIndicator color={palette.accent} /> : null}
          {message ? (
            <Text accessibilityLiveRegion="polite" style={styles.feedback}>
              {message}
            </Text>
          ) : null}
          {status && !status.enrollmentEnabled ? (
            <Text style={styles.text}>
              New passkey enrollment is not enabled for this environment.
            </Text>
          ) : null}
          {status && !status.enforcementEnabled ? (
            <Text style={styles.text}>
              Passkey enforcement is not yet enabled in this environment. Enrollment is
              preparation only.
            </Text>
          ) : null}
          <View style={styles.row}>
            {button(
              "Verify passkey",
              () =>
                void run(
                  verifyAdminPasskey,
                  "Passkey verified for a short Admin session."
                ),
              !supported || !status?.enrolled
            )}
            {button(
              "End verified session",
              () =>
                void run(
                  lockAdminSecurity,
                  "Passkey verification ended. Existing role restrictions and the current enforcement setting still apply."
                ),
              !expiresAt
            )}
          </View>
          {status?.enrollmentEnabled && supported ? (
            <>
              <Text style={styles.text}>
                Add your own device only. Keep a second passkey as backup. Adding another
                device requires verification with an existing passkey first. Your PIN,
                biometric, and private key stay with your device/provider.
              </Text>
              <Text style={styles.text}>Device name (not your email)</Text>
              <TextInput
                accessibilityLabel="Admin passkey label"
                value={label}
                onChangeText={setLabel}
                placeholder="Device label (for example, my phone)"
                placeholderTextColor={palette.textMuted}
                style={styles.input}
                maxLength={80}
                autoComplete="off"
                textContentType="none"
                autoCorrect={false}
                editable={!busy}
              />
              <Text style={styles.text}>
                Current password for the signed-in Admin account
              </Text>
              <TextInput
                accessibilityLabel="Current Admin password for passkey changes"
                value={password}
                onChangeText={setPassword}
                placeholder="Current account password"
                placeholderTextColor={palette.textMuted}
                style={styles.input}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                textContentType="password"
                autoComplete="current-password"
                editable={!busy}
              />
              {button(
                "Add a passkey",
                () =>
                  void run(
                    () => registerAdminPasskey(password, label.trim()),
                    "Passkey added. Verify it before using restricted controls."
                  ),
                !password ||
                  label.trim().length < 2 ||
                  status.passkeys.length >= 5 ||
                  (status.enrolled && !expiresAt)
              )}
            </>
          ) : null}
          {status?.passkeys.map((key) => (
            <View key={key.id} style={{ gap: 4 }}>
              <Text style={styles.text}>
                {key.label} · added {new Date(key.createdAt).toLocaleDateString()}
              </Text>
              {button(
                `Review removal of ${key.label}`,
                () => {
                  setRevokeId(key.id);
                  setConfirmation("");
                },
                status.passkeys.length < 2 || !expiresAt
              )}
            </View>
          ))}
          {revokeId ? (
            <>
              <Text style={styles.text}>
                Type REVOKE PASSKEY {revokeId}. This removes only that device credential,
                not the Admin account. Your final passkey cannot be removed here.
              </Text>
              <TextInput
                accessibilityLabel="Confirm passkey removal"
                value={confirmation}
                onChangeText={setConfirmation}
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
                editable={!busy}
              />
              {button(
                "Confirm passkey removal",
                () =>
                  void run(
                    () => revokeAdminPasskey(revokeId, password, confirmation),
                    "Passkey removed. Verify again with your remaining device."
                  ),
                !password || confirmation !== `REVOKE PASSKEY ${revokeId}` || !expiresAt
              )}
            </>
          ) : null}
          <Text style={styles.text}>
            Once passkey enforcement is enabled, losing every passkey blocks sensitive
            actions. Password reset does not remove that requirement. No automatic passkey
            recovery or external evidence disclosure is enabled here.
          </Text>
        </View>
      ) : null}
    </View>
  );
}
