import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { updateContentControls } from "@/api/auth";
import { useAuth } from "@/auth/AuthContext";
import { useAppTheme } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

export default function CannabisContentControls() {
  const auth = useAuth();
  const { palette } = useAppTheme();
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
    <View
      style={[
        styles.card,
        { backgroundColor: palette.surface, borderColor: palette.border }
      ]}
    >
      <Text style={[styles.title, { color: palette.text }]}>
        Cannabis content and parental lock
      </Text>
      <Text style={[styles.copy, { color: palette.textMuted }]}>
        Hide cannabis posts, courses, recommendations, and related tools without affecting
        fruit, vegetable, flower, tree, or general gardening content.
      </Text>
      <Text style={[styles.value, { color: palette.text }]}>
        Cannabis content: {auth.user?.cannabisVisibility === "show" ? "Shown" : "Hidden"}
      </Text>
      <Text style={[styles.copy, { color: palette.textMuted }]}>
        Age eligibility: {auth.user?.ageBand || "verification needed"} · Parental lock:{" "}
        {auth.user?.parentalLockEnabled ? "On" : "Off"}
      </Text>
      <TextInput
        accessibilityLabel="Parental content control PIN"
        style={[
          styles.input,
          {
            backgroundColor: palette.surfaceMuted,
            borderColor: palette.border,
            color: palette.text
          }
        ]}
        value={pin}
        onChangeText={setPin}
        placeholder={
          auth.user?.parentalLockEnabled
            ? "Current parental PIN"
            : "New 4–12 digit parental PIN"
        }
        placeholderTextColor={palette.textMuted}
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
          backgroundColor={palette.surfaceMuted}
          borderColor={palette.border}
          textColor={palette.link}
        />
        <Action
          label="Show cannabis"
          accessibilityLabel="Show cannabis content"
          disabled={busy || !auth.user?.cannabisEligible}
          onPress={() => void save({ cannabisVisibility: "show" })}
          backgroundColor={palette.surfaceMuted}
          borderColor={palette.border}
          textColor={palette.link}
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
          backgroundColor={palette.surfaceMuted}
          borderColor={palette.border}
          textColor={palette.link}
        />
      </View>
      {feedback ? (
        <Text style={[styles.feedback, { color: palette.success }]}>{feedback}</Text>
      ) : null}
    </View>
  );
}

function Action({
  label,
  accessibilityLabel,
  disabled,
  onPress,
  backgroundColor,
  borderColor,
  textColor
}: {
  label: string;
  accessibilityLabel: string;
  disabled: boolean;
  onPress: () => void;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      style={[
        styles.action,
        { backgroundColor, borderColor },
        disabled && styles.disabled
      ]}
      onPress={onPress}
    >
      <Text style={[styles.actionText, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 9,
    padding: 14
  },
  title: { fontSize: 17, fontWeight: "900" },
  copy: { lineHeight: 20 },
  value: { fontWeight: "800" },
  input: {
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  action: {
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  actionText: { fontWeight: "900" },
  disabled: { opacity: 0.45 },
  feedback: { fontWeight: "700" }
});
