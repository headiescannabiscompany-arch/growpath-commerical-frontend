import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { completeAgeAssurance } from "@/api/auth";
import { useAuth } from "@/auth/AuthContext";
import CalendarDateField from "@/components/forms/CalendarDateField";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

function failureMessage(error: any) {
  const code = error?.code || error?.data?.error?.code;
  switch (code) {
    case "ACCOUNT_SESSION_CHANGED":
      return "Your signed-in account changed. Refresh Profile before confirming your date of birth.";
    case "AGE_ASSURANCE_ALREADY_RECORDED":
      return "This account already has an age declaration. Refresh Profile to see its current eligibility; this form cannot replace it.";
    case "AGE_CONFIRMATION_REQUIRED":
      return "Please confirm that the selected date of birth is yours before saving.";
    case "DATE_OF_BIRTH_REQUIRED":
      return "Choose a valid date of birth that is not in the future.";
    case "AGE_NOT_ELIGIBLE":
      return "This age does not meet the account age requirement. Your age declaration was not saved.";
    case "EMAIL_NOT_VERIFIED":
      return "Verify your account email before confirming your date of birth.";
    case "ACCOUNT_AUTHORITY_MUTATION_BLOCKED":
      return "Age changes are unavailable for this account. Contact support for help.";
    default:
      return "Unable to save your age declaration. Your selection is still here; please try again.";
  }
}

export default function LegacyAgeCompletion() {
  const auth = useAuth();
  const user = auth.user;
  const userId = user?.id || user?._id;
  if (
    !userId ||
    !auth.token ||
    user?.ageConfirmationRequired !== true ||
    user.cannabisEligible === true ||
    (user.ageBand && user.ageBand !== "unknown")
  ) {
    return null;
  }

  // Remount account-bound draft state on a change of identity. The submitted date
  // is never copied from profile data, retained in storage, or reused by another user.
  return (
    <AgeCompletionForm key={userId} sessionToken={auth.token} retryMe={auth.retryMe} />
  );
}

function AgeCompletionForm({
  sessionToken,
  retryMe
}: {
  sessionToken: string;
  retryMe: () => Promise<void>;
}) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [feedback, setFeedback] = useState("");
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const reviewedSession = useRef(sessionToken);
  const currentSession = useRef(sessionToken);
  currentSession.current = sessionToken;
  const today = new Date();
  const todayKey = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0")
  ].join("-");
  const sessionChanged = reviewedSession.current !== sessionToken;
  const disabled = busy || saved || sessionChanged;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (sessionChanged) {
      setDateOfBirth("");
      setConfirmed(false);
    }
  }, [sessionChanged]);

  async function save() {
    if (inFlight.current || disabled || !dateOfBirth || !confirmed) return;
    inFlight.current = true;
    setBusy(true);
    setFeedback("");
    try {
      await completeAgeAssurance(
        { dateOfBirth, confirmed: true },
        reviewedSession.current
      );
      if (!mounted.current || reviewedSession.current !== currentSession.current) return;
      setDateOfBirth("");
      setConfirmed(false);
      setSaved(true);
      setFeedback(
        "Date of birth saved as your self-declared age. This does not turn on cannabis content or change the parental lock."
      );
      try {
        await retryMe();
      } catch {
        if (mounted.current) {
          setFeedback(
            "Date of birth saved. Refresh Profile to load your age eligibility. Cannabis visibility and the parental lock were not changed."
          );
        }
      }
    } catch (error: any) {
      if (mounted.current) setFeedback(failureMessage(error));
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  }

  return (
    <View style={styles.section} accessibilityLabel="Complete age eligibility">
      <Text style={styles.title}>Complete age eligibility</Text>
      <Text style={styles.copy}>
        This older account has no age declaration. Confirm your own date of birth to
        determine eligibility. This is self-declared age, not an identity verification.
        Your birth date is not displayed publicly. Show cannabis remains a separate
        choice.
      </Text>
      {!saved && !sessionChanged ? (
        <>
          <CalendarDateField
            accessibilityLabel="Profile date of birth"
            label="Date of birth"
            placeholder="Choose date of birth"
            value={dateOfBirth}
            onChange={(value) => {
              if (inFlight.current) return;
              setDateOfBirth(value);
              setConfirmed(false);
              setFeedback("");
            }}
            minYear={today.getFullYear() - 125}
            maxYear={today.getFullYear()}
            maximumDate={todayKey}
            initialYear={today.getFullYear() - 30}
            optional={false}
            disabled={disabled}
          />
          <Pressable
            accessibilityRole="checkbox"
            accessibilityLabel="I confirm this is my date of birth"
            accessibilityState={{ checked: confirmed, disabled }}
            disabled={disabled}
            onPress={() => {
              if (!inFlight.current) setConfirmed((value) => !value);
            }}
            style={[styles.choice, disabled && styles.disabled]}
          >
            <Text style={styles.choiceText}>
              {confirmed ? "✓ " : "☐ "}I confirm this is my date of birth.
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save date of birth"
            accessibilityState={{
              disabled: disabled || !dateOfBirth || !confirmed,
              busy
            }}
            disabled={disabled || !dateOfBirth || !confirmed}
            onPress={() => void save()}
            style={[
              styles.action,
              (disabled || !dateOfBirth || !confirmed) && styles.disabled
            ]}
          >
            <Text style={styles.actionText}>
              {busy ? "Saving…" : "Save date of birth"}
            </Text>
          </Pressable>
        </>
      ) : null}
      {sessionChanged ? (
        <Text accessibilityRole="alert" style={styles.copy}>
          Your session changed. Refresh Profile before confirming your date of birth.
        </Text>
      ) : feedback ? (
        <Text accessibilityRole="alert" style={styles.copy}>
          {feedback}
        </Text>
      ) : null}
    </View>
  );
}

const createStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    section: { gap: 8, marginVertical: 10 },
    title: { color: palette.text, fontWeight: "800" },
    copy: { color: palette.textMuted, lineHeight: 20 },
    choice: { paddingVertical: 8, minHeight: 44, justifyContent: "center" },
    choiceText: { color: palette.text, fontWeight: "700" },
    action: {
      alignSelf: "flex-start",
      backgroundColor: palette.surface,
      borderColor: palette.accent,
      borderRadius: radius.card,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 10,
      minHeight: 44,
      justifyContent: "center"
    },
    actionText: { color: palette.accent, fontWeight: "800" },
    disabled: { opacity: 0.45 }
  });
