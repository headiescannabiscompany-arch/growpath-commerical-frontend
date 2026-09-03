import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ApiError } from "@/api/apiRequest";
import { SignupBody } from "@/api/auth";
import { useAuth } from "@/auth/AuthContext";
import AuthAutofillStyle from "@/components/auth/AuthAutofillStyle";
import CalendarDateField from "@/components/forms/CalendarDateField";
import LegalLinks from "@/components/LegalLinks";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";
import { claimLoginPath, parseClaimReturnPath } from "@/utils/claimReturnPath";

type AccountChoice = {
  key: "free" | "pro" | "commercial" | "facility";
  mode: "personal" | "commercial" | "facility";
  title: string;
  label: string;
  description: string;
  afterSignup: string;
};

const ACCOUNT_CHOICES: AccountChoice[] = [
  {
    key: "free",
    mode: "personal",
    title: "Free grower",
    label: "Free",
    description: "Start with personal grow tracking, Forum/Q&A, and basic tools.",
    afterSignup: "/home/personal"
  },
  {
    key: "pro",
    mode: "personal",
    title: "Pro grower",
    label: "Pro",
    description: "Use advanced personal tools, AI workflows, and export paths.",
    afterSignup: "/onboarding/walkthroughs"
  },
  {
    key: "commercial",
    mode: "commercial",
    title: "Commercial brand",
    label: "Commercial",
    description:
      "Manage storefront, products, courses, lives, Feed campaigns, and orders.",
    afterSignup: "/onboarding/walkthroughs"
  },
  {
    key: "facility",
    mode: "facility",
    title: "Facility operator",
    label: "Facility",
    description:
      "Run rooms, batches, tasks, team training, sensor imports, and audit logs.",
    afterSignup: "/onboarding/walkthroughs"
  }
];

function ageFromDate(value: string) {
  const birth = new Date(`${value}T00:00:00Z`);
  if (!value || Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const monthDelta = now.getUTCMonth() - birth.getUTCMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getUTCDate() < birth.getUTCDate())) {
    age -= 1;
  }
  return age >= 0 && age <= 125 ? age : null;
}

export default function RegisterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ next?: string | string[] }>();
  const auth = useAuth();
  const { palette } = useAppTheme();
  const styles = createRegisterStyles(palette);
  const { width } = useWindowDimensions();
  const isWide = width >= 860;
  const claimNext = parseClaimReturnPath(params.next);
  const giftSignupChoice = ACCOUNT_CHOICES[0];

  const [choice, setChoice] = useState<AccountChoice>(ACCOUNT_CHOICES[0]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [showCannabisContent, setShowCannabisContent] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    const age = ageFromDate(dateOfBirth);
    return (
      name.trim().length >= 2 &&
      email.trim().length > 3 &&
      password.length >= 1 &&
      age !== null &&
      age >= 13 &&
      !submitting
    );
  }, [name, email, password, dateOfBirth, submitting]);
  const age = ageFromDate(dateOfBirth);
  const cannabisEligible = age !== null && age >= 21;

  async function onSubmit() {
    setErrMsg(null);
    setInfoMsg(null);
    setSubmitting(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const signupChoice = claimNext ? giftSignupChoice : choice;
      const payload: SignupBody = {
        name: name.trim(),
        displayName: name.trim(),
        email: normalizedEmail,
        password,
        plan: signupChoice.key,
        mode: signupChoice.mode,
        dateOfBirth,
        showCannabisContent: cannabisEligible && showCannabisContent
      };
      const signupResult = await auth.signup(payload);
      if (signupResult.emailVerificationRequired && !signupResult.token) {
        setPassword("");
        setInfoMsg(
          signupResult.emailSent
            ? "Account created. Check your email to verify the account before signing in."
            : "Account created. Email verification is required before signing in. Use Resend verification on the login screen, or contact support."
        );
        return;
      }
      if (claimNext) {
        router.replace(claimNext as any);
        return;
      }
      router.replace({
        pathname: "/onboarding/guilds",
        params: {
          next: choice.afterSignup,
          mode: choice.mode,
          plan: choice.key
        }
      } as any);
    } catch (e: any) {
      if (e instanceof ApiError) {
        const backendMessage =
          e.data?.error?.message || e.data?.message || "Registration failed";
        setErrMsg(backendMessage);
      } else {
        setErrMsg(e?.message || "Registration failed");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <AuthAutofillStyle />
      <View style={[styles.shell, isWide ? styles.shellWide : null]}>
        <View style={styles.planPanel}>
          <Text style={styles.kicker}>
            {claimNext ? "Gift recipient" : "Choose account"}
          </Text>
          <Text accessibilityRole="header" aria-level={1} style={styles.title}>
            Create account
          </Text>
          <Text style={styles.subtitle}>
            {claimNext
              ? "Create a free personal account first. The paid gift activates only after you verify and claim it with the recipient email."
              : "Pick the workflow you need now. You can still change plans as the account grows."}
          </Text>

          {!claimNext ? (
            <View style={styles.choiceGrid}>
              {ACCOUNT_CHOICES.map((item) => {
                const active = choice.key === item.key;
                return (
                  <Pressable
                    key={item.key}
                    onPress={() => setChoice(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`Select ${item.label} account`}
                    accessibilityState={{ selected: active }}
                    style={({ pressed }) => [
                      styles.choice,
                      active && styles.choiceActive,
                      pressed && styles.pressed
                    ]}
                  >
                    <View style={styles.choiceHeader}>
                      <Text style={styles.choiceLabel}>{item.label}</Text>
                      <View style={[styles.radio, active && styles.radioActive]} />
                    </View>
                    <Text style={styles.choiceTitle}>{item.title}</Text>
                    <Text style={styles.choiceDesc}>{item.description}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>

        <View style={[styles.formCard, isWide ? styles.formCardWide : null]}>
          <Text style={styles.formTitle}>
            {claimNext ? giftSignupChoice.title : choice.title}
          </Text>
          <Text style={styles.formSub}>
            {claimNext ? giftSignupChoice.description : choice.description}
          </Text>

          <TextInput
            accessibilityLabel="Register name"
            style={styles.input}
            placeholder="Name"
            placeholderTextColor={palette.textMuted}
            value={name}
            onChangeText={setName}
          />

          <TextInput
            accessibilityLabel="Register email"
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="Email"
            placeholderTextColor={palette.textMuted}
            value={email}
            onChangeText={setEmail}
          />

          <TextInput
            accessibilityLabel="Register password"
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={palette.textMuted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={onSubmit}
            returnKeyType="go"
          />

          <View style={styles.dateField}>
            <CalendarDateField
              accessibilityLabel="Register date of birth"
              label="Date of birth"
              placeholder="Choose date of birth"
              value={dateOfBirth}
              onChange={(value) => {
                setDateOfBirth(value);
                if ((ageFromDate(value) || 0) < 21) setShowCannabisContent(false);
              }}
              initialYear={new Date().getFullYear() - 30}
              minYear={new Date().getFullYear() - 125}
              maxYear={new Date().getFullYear()}
              maximumDate={new Date().toISOString().slice(0, 10)}
              optional={false}
            />
          </View>
          <Text style={styles.ageHelper}>
            Date of birth is used for age eligibility and is never displayed publicly.
            Cannabis content stays hidden unless an eligible user chooses to show it.
          </Text>
          {dateOfBirth && age !== null && age < 13 ? (
            <Text style={styles.error}>
              This account cannot be created through the standard signup flow.
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{
              checked: showCannabisContent,
              disabled: !cannabisEligible
            }}
            accessibilityLabel="Show cannabis content"
            disabled={!cannabisEligible}
            onPress={() => setShowCannabisContent((current) => !current)}
            style={[
              styles.contentChoice,
              showCannabisContent && styles.contentChoiceSelected,
              !cannabisEligible && styles.buttonDisabled
            ]}
          >
            <Text style={styles.contentChoiceTitle}>
              {showCannabisContent ? "✓ " : ""}Show cannabis content
            </Text>
            <Text style={styles.ageHelper}>
              Optional for age-eligible accounts. You can hide it again or add a parental
              lock from account settings.
            </Text>
          </Pressable>

          {errMsg ? <Text style={styles.error}>{errMsg}</Text> : null}
          {infoMsg ? <Text style={styles.success}>{infoMsg}</Text> : null}

          <Pressable
            onPress={onSubmit}
            disabled={!canSubmit}
            accessibilityRole="button"
            accessibilityLabel={`Create ${claimNext ? giftSignupChoice.label : choice.label} account`}
            style={[styles.button, !canSubmit && styles.buttonDisabled]}
          >
            {submitting ? (
              <ActivityIndicator color={palette.accentText} />
            ) : (
              <Text style={styles.buttonText}>
                Create {claimNext ? giftSignupChoice.label : choice.label} account
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => router.replace(claimLoginPath(email, claimNext) as any)}
            accessibilityRole="button"
            accessibilityLabel="Back to login"
            style={styles.linkBtn}
          >
            <Text style={styles.linkText}>Back to login</Text>
          </Pressable>

          <LegalLinks />
        </View>
      </View>
    </ScrollView>
  );
}

export const createRegisterStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    root: { backgroundColor: palette.page, flex: 1 },
    content: {
      alignItems: "center",
      flexGrow: 1,
      justifyContent: "center",
      padding: 16
    },
    shell: { gap: 14, maxWidth: 1120, width: "100%" },
    shellWide: { alignItems: "flex-start", flexDirection: "row", gap: 24 },
    planPanel: { flex: 1, minWidth: 0 },
    kicker: {
      color: palette.accent,
      fontSize: 12,
      fontWeight: "900",
      marginBottom: 6,
      textTransform: "uppercase"
    },
    title: { color: palette.text, fontSize: 34, fontWeight: "900", marginBottom: 8 },
    subtitle: {
      color: palette.textSoft,
      fontSize: 15,
      fontWeight: "700",
      lineHeight: 22,
      marginBottom: 16,
      maxWidth: 640
    },
    choiceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    choice: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      minHeight: 142,
      padding: 14,
      width: "100%"
    },
    choiceActive: { borderColor: palette.accent, borderWidth: 2 },
    choiceHeader: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 10
    },
    choiceLabel: {
      color: palette.accent,
      fontSize: 12,
      fontWeight: "900",
      textTransform: "uppercase"
    },
    radio: {
      borderColor: palette.textMuted,
      borderRadius: radius.pill,
      borderWidth: 2,
      height: 16,
      width: 16
    },
    radioActive: { backgroundColor: palette.accent, borderColor: palette.accent },
    choiceTitle: {
      color: palette.text,
      fontSize: 17,
      fontWeight: "900",
      marginBottom: 6
    },
    choiceDesc: { color: palette.textSoft, fontWeight: "700", lineHeight: 20 },
    formCard: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      padding: 16,
      width: "100%"
    },
    formCardWide: { padding: 22, width: 390 },
    formTitle: {
      color: palette.text,
      fontSize: 22,
      fontWeight: "900",
      marginBottom: 6
    },
    formSub: {
      color: palette.textMuted,
      fontWeight: "700",
      lineHeight: 20,
      marginBottom: 16
    },
    input: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      color: palette.text,
      marginBottom: 12,
      paddingHorizontal: 12,
      paddingVertical: 12
    },
    dateField: { marginBottom: 12 },
    ageHelper: { color: palette.textMuted, fontSize: 12, lineHeight: 17 },
    contentChoice: {
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 4,
      marginBottom: 12,
      marginTop: 10,
      padding: 11
    },
    contentChoiceSelected: {
      backgroundColor: palette.accentSoft,
      borderColor: palette.accent
    },
    contentChoiceTitle: { color: palette.text, fontWeight: "900" },
    error: { color: palette.danger, fontWeight: "700", marginBottom: 12 },
    success: { color: palette.success, fontWeight: "700", marginBottom: 12 },
    button: {
      alignItems: "center",
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      paddingVertical: 12
    },
    buttonDisabled: { opacity: 0.5 },
    buttonText: { color: palette.accentText, fontWeight: "900" },
    linkBtn: { alignItems: "center", marginTop: 14 },
    linkText: { color: palette.link, fontWeight: "900" },
    pressed: { opacity: 0.84 }
  });
