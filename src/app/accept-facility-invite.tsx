import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { apiRequest } from "@/api/apiRequest";
import { useAuth } from "@/auth/AuthContext";
import CalendarDateField from "@/components/forms/CalendarDateField";
import { useEntitlements } from "@/entitlements";
import { useFacility } from "@/facility/FacilityProvider";
import { useAccountMode } from "@/state/useAccountMode";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

export default function AcceptFacilityInviteScreen() {
  const router = useRouter();
  const auth = useAuth();
  const entitlements = useEntitlements();
  const facilityStore = useFacility();
  const { palette } = useAppTheme();
  const styles = createAcceptFacilityInviteStyles(palette);
  const { setMode } = useAccountMode();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [displayName, setDisplayName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [acceptedFacilityId, setAcceptedFacilityId] = useState<string | null>(null);

  useEffect(() => {
    if (
      !acceptedFacilityId ||
      auth.meStatus !== "ready" ||
      !entitlements.ready ||
      entitlements.mode !== "facility" ||
      String(entitlements.facilityId || "") !== acceptedFacilityId
    ) {
      return;
    }
    router.replace("/home/facility");
  }, [
    acceptedFacilityId,
    auth.meStatus,
    entitlements.facilityId,
    entitlements.mode,
    entitlements.ready,
    router
  ]);

  const canSubmit = useMemo(
    () =>
      Boolean(
        token && password.length >= 8 && password === confirmPassword && !submitting
      ),
    [confirmPassword, password, submitting, token]
  );

  async function acceptInvite() {
    if (!canSubmit) return;
    setSubmitting(true);
    setMessage("");
    let sessionHandoffStarted = false;
    try {
      const result: any = await apiRequest("/api/auth/accept-facility-invite", {
        method: "POST",
        body: { token, displayName, password, dateOfBirth }
      });
      const facilityId = String(result?.facilityId || "").trim();
      if (!facilityId) {
        throw new Error("The invitation was accepted without a Facility workspace.");
      }
      await entitlements.setPreferredMode?.("facility");
      setMode("facility");
      facilityStore.selectFacility({
        id: facilityId,
        name: String(result?.facilityName || "Selected facility")
      });
      await auth.login(String(result.email), password);
      setAcceptedFacilityId(facilityId);
      sessionHandoffStarted = true;
    } catch (error: any) {
      setMessage(
        error?.data?.error?.message ||
          error?.message ||
          "Unable to accept this invitation."
      );
    } finally {
      if (!sessionHandoffStarted) setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.card}>
          <Text accessibilityRole="header" aria-level={1} style={styles.title}>
            Join facility workspace
          </Text>
          <Text style={styles.copy}>This invitation link is missing its token.</Text>
          <Pressable
            onPress={() => router.replace("/login")}
            style={styles.button}
            accessibilityRole="button"
            accessibilityLabel="Go to sign in"
          >
            <Text style={styles.buttonText}>Go to sign in</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <Text accessibilityRole="header" aria-level={1} style={styles.title}>
          Join facility workspace
        </Text>
        <Text style={styles.copy}>
          Create a password for your GrowPathAI login. If this email already has an
          account, enter its existing password.
        </Text>
        {acceptedFacilityId ? (
          <Text accessibilityLiveRegion="polite" style={styles.helper}>
            Invitation accepted. Opening the Facility workspace…
          </Text>
        ) : null}
        <TextInput
          style={styles.input}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Your name"
          placeholderTextColor={palette.textMuted}
        />
        <CalendarDateField
          accessibilityLabel="Invite date of birth"
          label="Date of birth"
          value={dateOfBirth}
          onChange={setDateOfBirth}
          placeholder="Choose date of birth"
          initialYear={new Date().getFullYear() - 30}
          minYear={new Date().getFullYear() - 125}
          maxYear={new Date().getFullYear()}
          maximumDate={new Date().toISOString().slice(0, 10)}
        />
        <Text style={styles.helper}>
          Required only when this invitation creates a new GrowPathAI account. It is used
          for age eligibility and is not shown publicly.
        </Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Password (8+ characters)"
          placeholderTextColor={palette.textMuted}
          secureTextEntry
        />
        <TextInput
          style={styles.input}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Confirm password"
          placeholderTextColor={palette.textMuted}
          secureTextEntry
        />
        {password && confirmPassword && password !== confirmPassword ? (
          <Text style={styles.error}>Passwords do not match.</Text>
        ) : null}
        {message ? <Text style={styles.error}>{message}</Text> : null}
        <Pressable
          onPress={acceptInvite}
          disabled={!canSubmit}
          style={[styles.button, !canSubmit && styles.disabled]}
          accessibilityRole="button"
        >
          {submitting ? (
            <ActivityIndicator color={palette.accentText} />
          ) : (
            <Text style={styles.buttonText}>Accept invitation and sign in</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

export const createAcceptFacilityInviteStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    page: {
      alignItems: "center",
      backgroundColor: palette.page,
      flexGrow: 1,
      justifyContent: "center",
      padding: 20
    },
    card: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 12,
      maxWidth: 520,
      padding: 22,
      width: "100%"
    },
    title: { color: palette.text, fontSize: 24, fontWeight: "900" },
    copy: { color: palette.textSoft, lineHeight: 21 },
    helper: { color: palette.textMuted, fontSize: 12, lineHeight: 17 },
    input: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      color: palette.text,
      paddingHorizontal: 12,
      paddingVertical: 11
    },
    button: {
      alignItems: "center",
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      padding: 13
    },
    buttonText: { color: palette.accentText, fontWeight: "900" },
    disabled: { opacity: 0.45 },
    error: { color: palette.danger, fontWeight: "700" }
  });
