import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useLocalSearchParams } from "expo-router";

import { sendSupportContact, type SupportContactTopic } from "@/api/support";
import {
  SUPPORT_CONTACT_ROUTING,
  SUPPORT_CONTACTS,
  supportLine
} from "@/config/supportContacts";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

const TOPICS: { key: SupportContactTopic; label: string }[] = [
  { key: "account", label: "Account" },
  { key: "billing", label: "Billing" },
  { key: "orders", label: "Orders" },
  { key: "sales", label: "Sales" },
  { key: "technical", label: "Technical" },
  { key: "commercial", label: "Commercial" },
  { key: "courses", label: "Courses" },
  { key: "live", label: "Live" },
  { key: "facility", label: "Facility" },
  { key: "partners", label: "Partners" },
  { key: "privacy", label: "Privacy" },
  { key: "legal", label: "Legal" },
  { key: "security", label: "Security" },
  { key: "general", label: "General" }
];

function isLikelyEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function paramString(value?: string | string[]) {
  if (Array.isArray(value)) return value[0] || "";
  return typeof value === "string" ? value : "";
}

function topicFromParam(value: string): SupportContactTopic | null {
  return TOPICS.some((item) => item.key === value)
    ? (value as SupportContactTopic)
    : null;
}

export default function SupportPage() {
  const { palette } = useAppTheme();
  const styles = createSupportStyles(palette);
  const params = useLocalSearchParams<{
    topic?: string | string[];
    name?: string | string[];
    email?: string | string[];
    accountEmail?: string | string[];
    subject?: string | string[];
    message?: string | string[];
    workspace?: string | string[];
    page?: string | string[];
  }>();
  const [topic, setTopic] = useState<SupportContactTopic>("account");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [workspace, setWorkspace] = useState("");
  const [page, setPage] = useState("");
  const [company, setCompany] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");

  React.useEffect(() => {
    const nextTopic = topicFromParam(paramString(params.topic));
    if (nextTopic) setTopic(nextTopic);
    const nextName = paramString(params.name);
    const nextEmail = paramString(params.email);
    const nextAccountEmail = paramString(params.accountEmail);
    const nextSubject = paramString(params.subject);
    const nextMessage = paramString(params.message);
    const nextWorkspace = paramString(params.workspace);
    const nextPage = paramString(params.page);
    if (nextName) setName(nextName);
    if (nextEmail) setEmail(nextEmail);
    if (nextAccountEmail) setAccountEmail(nextAccountEmail);
    if (nextSubject) setSubject(nextSubject);
    if (nextMessage) setMessage(nextMessage);
    if (nextWorkspace) setWorkspace(nextWorkspace);
    if (nextPage) setPage(nextPage);
  }, [
    params.accountEmail,
    params.email,
    params.message,
    params.name,
    params.subject,
    params.topic,
    params.workspace,
    params.page
  ]);

  const canSubmit = useMemo(
    () =>
      name.trim().length >= 2 &&
      isLikelyEmail(email) &&
      message.trim().length >= 10 &&
      !submitting,
    [email, message, name, submitting]
  );

  async function onSubmit() {
    if (!canSubmit) {
      setFeedback("Enter your name, a valid reply email, and a message.");
      return;
    }

    setSubmitting(true);
    setFeedback("");
    try {
      const response = await sendSupportContact({
        topic,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        accountEmail: accountEmail.trim().toLowerCase(),
        subject: subject.trim(),
        message: message.trim(),
        workspace: workspace.trim(),
        page: page.trim(),
        company: company.trim()
      });
      if (response.emailSent === false) {
        setFeedback(
          response.requestId
            ? `Support request received in GrowPathAI. Reference: ${response.requestId}. Email delivery is delayed.`
            : `Support email delivery is not available right now. Email ${SUPPORT_CONTACTS.general} directly.`
        );
        return;
      }
      setFeedback(
        response.requestId || response.providerMessageId
          ? `Support request sent. Reference: ${response.requestId || response.providerMessageId}.`
          : "Support request sent. Check your email for any follow-up."
      );
      setSubject("");
      setMessage("");
      setAccountEmail("");
      setCompany("");
    } catch (e: any) {
      setFeedback(e?.message || "Unable to send support request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.brand}>GrowPath</Text>
        <Text accessibilityRole="header" aria-level={1} style={styles.title}>
          Support
        </Text>
        <Text style={styles.intro}>
          Send account, billing, orders, sales, technical, privacy, legal, security,
          commercial, courses, live events, partner, and facility support requests to the
          GrowPath team.
        </Text>
      </View>

      <View style={styles.form}>
        <Text accessibilityRole="header" aria-level={2} style={styles.sectionTitle}>
          Send a Support Email
        </Text>

        <View style={styles.topicGrid}>
          {TOPICS.map((item) => {
            const active = topic === item.key;
            return (
              <Pressable
                key={item.key}
                accessibilityRole="button"
                accessibilityLabel={`Select ${item.label} support topic`}
                onPress={() => setTopic(item.key)}
                style={[styles.topicButton, active && styles.topicButtonActive]}
              >
                <Text style={[styles.topicText, active && styles.topicTextActive]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <TextInput
          accessibilityLabel="Support name"
          placeholder="Your name"
          placeholderTextColor={palette.textMuted}
          value={name}
          onChangeText={setName}
          style={styles.input}
        />
        <TextInput
          accessibilityLabel="Support reply email"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="Reply email"
          placeholderTextColor={palette.textMuted}
          value={email}
          onChangeText={setEmail}
          style={styles.input}
        />
        <TextInput
          accessibilityLabel="Support account email"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="Account email, if different"
          placeholderTextColor={palette.textMuted}
          value={accountEmail}
          onChangeText={setAccountEmail}
          style={styles.input}
        />
        <TextInput
          accessibilityLabel="Support subject"
          placeholder="Subject"
          placeholderTextColor={palette.textMuted}
          value={subject}
          onChangeText={setSubject}
          style={styles.input}
        />
        <TextInput
          accessibilityLabel="Support message"
          multiline
          placeholder="Describe what happened, what page you were on, and what account email is affected. Do not send passwords or API keys."
          placeholderTextColor={palette.textMuted}
          value={message}
          onChangeText={setMessage}
          style={[styles.input, styles.message]}
        />
        <TextInput
          accessibilityLabel="Company"
          autoCapitalize="none"
          value={company}
          onChangeText={setCompany}
          style={styles.honeypot}
        />

        {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Send support request"
          disabled={!canSubmit}
          onPress={onSubmit}
          style={[styles.sendButton, !canSubmit && styles.sendButtonDisabled]}
        >
          {submitting ? (
            <ActivityIndicator color={palette.accentText} />
          ) : (
            <Text style={styles.sendButtonText}>Send support request</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.sections}>
        <View style={styles.section}>
          <Text accessibilityRole="header" aria-level={2} style={styles.sectionTitle}>
            Direct Inboxes
          </Text>
          <Text style={styles.body}>
            Start with {SUPPORT_CONTACTS.general} if you are unsure. For urgent production
            incidents, include URGENT in the subject and describe the business impact.
          </Text>
        </View>
        {SUPPORT_CONTACT_ROUTING.map((item) => (
          <View key={item.title} style={styles.section}>
            <Text accessibilityRole="header" aria-level={2} style={styles.sectionTitle}>
              {item.title}
            </Text>
            <Text style={styles.body}>{supportLine(item.email, item.body)}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

export const createSupportStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    root: { backgroundColor: palette.page, flex: 1 },
    content: {
      alignSelf: "center",
      maxWidth: 920,
      paddingHorizontal: 24,
      paddingVertical: 40,
      width: "100%"
    },
    header: { marginBottom: 24 },
    brand: { color: palette.accent, fontSize: 16, fontWeight: "800", marginBottom: 10 },
    title: { color: palette.text, fontSize: 34, fontWeight: "800", marginBottom: 10 },
    intro: { color: palette.textSoft, fontSize: 17, lineHeight: 26 },
    form: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 12,
      marginBottom: 28,
      padding: 18
    },
    topicGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    topicButton: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.pill,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 8
    },
    topicButtonActive: { backgroundColor: palette.accent, borderColor: palette.accent },
    topicText: { color: palette.textSoft, fontSize: 12, fontWeight: "800" },
    topicTextActive: { color: palette.accentText },
    input: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      color: palette.text,
      paddingHorizontal: 12,
      paddingVertical: 11
    },
    message: { minHeight: 130, textAlignVertical: "top" },
    honeypot: {
      height: 0,
      opacity: 0,
      overflow: "hidden",
      padding: 0,
      position: "absolute",
      width: 0
    },
    feedback: { color: palette.success, fontWeight: "800", lineHeight: 20 },
    sendButton: {
      alignItems: "center",
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      paddingVertical: 12
    },
    sendButtonDisabled: { opacity: 0.55 },
    sendButtonText: { color: palette.accentText, fontWeight: "900" },
    sections: { gap: 22 },
    section: {
      borderTopColor: palette.border,
      borderTopWidth: 1,
      paddingTop: 20
    },
    sectionTitle: {
      color: palette.text,
      fontSize: 20,
      fontWeight: "800",
      marginBottom: 8
    },
    body: { color: palette.textSoft, fontSize: 16, lineHeight: 25 }
  });
