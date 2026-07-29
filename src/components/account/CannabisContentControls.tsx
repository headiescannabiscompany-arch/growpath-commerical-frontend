import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { updateContentControls } from "@/api/auth";
import { useAuth } from "@/auth/AuthContext";
import { radius } from "@/theme/theme";

export default function CannabisContentControls() {
  const auth = useAuth();
  const [busy, setBusy] = useState(false);
  const [pin, setPin] = useState("");
  const [feedback, setFeedback] = useState("");

  async function save(input: {
    cannabisVisibility: "show" | "hide";
    parentalLockEnabled?: boolean;
    enablingLock?: boolean;
  }) {
    setBusy(true);
    setFeedback("");
    try {
      const result = await updateContentControls({
        cannabisVisibility: input.cannabisVisibility,
        parentalLockEnabled: input.parentalLockEnabled,
        ...(input.enablingLock ? { newPin: pin } : { currentPin: pin })
      });
      setPin("");
      setFeedback(
        result.contentControls.parentalLockEnabled
          ? "Cannabis content controls are protected by the parental PIN."
          : result.contentControls.cannabisVisibility === "show"
            ? "Cannabis content is visible for this account."
            : "Cannabis content is hidden."
      );
      await auth.retryMe();
    } catch (error: any) {
      setFeedback(
        error?.data?.error?.message ||
          error?.message ||
          "Unable to update content controls."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Cannabis content and parental lock</Text>
      <Text style={styles.copy}>
        Hide cannabis posts, courses, recommendations, and related tools without affecting
        fruit, vegetable, flower, tree, or general gardening content.
      </Text>
      <Text style={styles.value}>
        Cannabis content: {auth.user?.cannabisVisibility === "show" ? "Shown" : "Hidden"}
      </Text>
      <Text style={styles.copy}>
        Age eligibility: {auth.user?.ageBand || "verification needed"} · Parental lock:{" "}
        {auth.user?.parentalLockEnabled ? "On" : "Off"}
      </Text>
      <TextInput
        accessibilityLabel="Parental content control PIN"
        style={styles.input}
        value={pin}
        onChangeText={setPin}
        placeholder={
          auth.user?.parentalLockEnabled
            ? "Current parental PIN"
            : "New 4–12 digit parental PIN"
        }
        keyboardType="number-pad"
        secureTextEntry
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        importantForAutofill="no"
      />
      <View style={styles.actions}>
        <Action
          label="Hide cannabis"
          accessibilityLabel="Hide cannabis content"
          disabled={busy}
          onPress={() => void save({ cannabisVisibility: "hide" })}
        />
        <Action
          label="Show cannabis"
          accessibilityLabel="Show cannabis content"
          disabled={busy || !auth.user?.cannabisEligible}
          onPress={() => void save({ cannabisVisibility: "show" })}
        />
        <Action
          label={auth.user?.parentalLockEnabled ? "Disable lock" : "Enable lock + hide"}
          accessibilityLabel={
            auth.user?.parentalLockEnabled
              ? "Disable parental lock"
              : "Enable parental lock"
          }
          disabled={busy || pin.length < 4}
          onPress={() =>
            void save({
              cannabisVisibility: "hide",
              parentalLockEnabled: !auth.user?.parentalLockEnabled,
              enablingLock: !auth.user?.parentalLockEnabled
            })
          }
        />
      </View>
      {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
    </View>
  );
}

function Action({
  label,
  accessibilityLabel,
  disabled,
  onPress
}: {
  label: string;
  accessibilityLabel: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      style={[styles.action, disabled && styles.disabled]}
      onPress={onPress}
    >
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "white",
    borderColor: "#dbe5d4",
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 9,
    padding: 14
  },
  title: { color: "#172317", fontSize: 17, fontWeight: "900" },
  copy: { color: "#64748b", lineHeight: 20 },
  value: { color: "#172317", fontWeight: "800" },
  input: {
    backgroundColor: "white",
    borderColor: "#cbd5e1",
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  action: {
    backgroundColor: "#ecfdf5",
    borderColor: "#86efac",
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  actionText: { color: "#166534", fontWeight: "900" },
  disabled: { opacity: 0.45 },
  feedback: { color: "#166534", fontWeight: "700" }
});
