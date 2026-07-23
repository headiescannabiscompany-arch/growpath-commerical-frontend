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
import { useEntitlements } from "@/entitlements";
import { useFacility } from "@/facility/FacilityProvider";
import { useAccountMode } from "@/state/useAccountMode";
import { radius } from "@/theme/theme";

export default function AcceptFacilityInviteScreen() {
  const router = useRouter();
  const auth = useAuth();
  const entitlements = useEntitlements();
  const facilityStore = useFacility();
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

  return (
    <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <Text style={styles.title}>Join facility workspace</Text>
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
        />
        <TextInput
          accessibilityLabel="Invite date of birth"
          style={styles.input}
          value={dateOfBirth}
          onChangeText={setDateOfBirth}
          placeholder="Date of birth (YYYY-MM-DD)"
          autoCapitalize="none"
          keyboardType="numbers-and-punctuation"
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
          secureTextEntry
        />
        <TextInput
          style={styles.input}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Confirm password"
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
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Accept invitation and sign in</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    flexGrow: 1,
    justifyContent: "center",
    padding: 20
  },
  card: {
    backgroundColor: "white",
    borderColor: "#bbf7d0",
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 12,
    maxWidth: 520,
    padding: 22,
    width: "100%"
  },
  title: { color: "#14532d", fontSize: 24, fontWeight: "900" },
  copy: { color: "#475569", lineHeight: 21 },
  helper: { color: "#64748b", fontSize: 12, lineHeight: 17 },
  input: {
    backgroundColor: "white",
    borderColor: "#cbd5e1",
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 11
  },
  button: {
    alignItems: "center",
    backgroundColor: "#166534",
    borderRadius: radius.card,
    padding: 13
  },
  buttonText: { color: "white", fontWeight: "900" },
  disabled: { opacity: 0.45 },
  error: { color: "#b91c1c", fontWeight: "700" }
});
