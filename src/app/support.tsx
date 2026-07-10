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

import { sendSupportContact, type SupportContactTopic } from "@/api/support";
import {
  SUPPORT_CONTACT_ROUTING,
  SUPPORT_CONTACTS,
  supportLine
} from "@/config/supportContacts";
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

export default function SupportPage() {
  const [topic, setTopic] = useState<SupportContactTopic>("account");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [company, setCompany] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");

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
        company: company.trim()
      });
      if (response.emailSent === false) {
        setFeedback(
          `Support email delivery is not available right now. Email ${SUPPORT_CONTACTS.general} directly.`
        );
        return;
      }
      setFeedback(
        response.providerMessageId
          ? `Support request sent. Reference: ${response.providerMessageId}.`
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
        <Text style={styles.title}>Support</Text>
        <Text style={styles.intro}>
          Send account, billing, orders, sales, technical, privacy, legal, security,
          commercial, courses, live events, partner, and facility support requests to the
          GrowPath team.
        </Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.sectionTitle}>Send a Support Email</Text>

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
          placeholderTextColor="#64748b"
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
          placeholderTextColor="#64748b"
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
          placeholderTextColor="#64748b"
          value={accountEmail}
          onChangeText={setAccountEmail}
          style={styles.input}
        />
        <TextInput
          accessibilityLabel="Support subject"
          placeholder="Subject"
          placeholderTextColor="#64748b"
          value={subject}
          onChangeText={setSubject}
          style={styles.input}
        />
        <TextInput
          accessibilityLabel="Support message"
          multiline
          placeholder="Describe what happened, what page you were on, and what account email is affected. Do not send passwords or API keys."
          placeholderTextColor="#64748b"
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
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.sendButtonText}>Send support request</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.sections}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Direct Inboxes</Text>
          <Text style={styles.body}>
            Start with {SUPPORT_CONTACTS.general} if you are unsure. For urgent production
            incidents, include URGENT in the subject and describe the business impact.
          </Text>
        </View>
        {SUPPORT_CONTACT_ROUTING.map((item) => (
          <View key={item.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{item.title}</Text>
            <Text style={styles.body}>{supportLine(item.email, item.body)}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: "#f8fafc", flex: 1 },
  content: {
    alignSelf: "center",
    maxWidth: 920,
    paddingHorizontal: 24,
    paddingVertical: 40,
    width: "100%"
  },
  header: { marginBottom: 24 },
  brand: { color: "#166534", fontSize: 16, fontWeight: "800", marginBottom: 10 },
  title: { color: "#111827", fontSize: 34, fontWeight: "800", marginBottom: 10 },
  intro: { color: "#334155", fontSize: 17, lineHeight: 26 },
  form: {
    backgroundColor: "#ffffff",
    borderColor: "#dbe3ea",
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 12,
    marginBottom: 28,
    padding: 18
  },
  topicGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  topicButton: {
    backgroundColor: "#f8fafc",
    borderColor: "#cbd5e1",
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  topicButtonActive: { backgroundColor: "#166534", borderColor: "#166534" },
  topicText: { color: "#334155", fontSize: 12, fontWeight: "800" },
  topicTextActive: { color: "#ffffff" },
  input: {
    backgroundColor: "#ffffff",
    borderColor: "#cbd5e1",
    borderRadius: radius.card,
    borderWidth: 1,
    color: "#111827",
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
  feedback: { color: "#166534", fontWeight: "800", lineHeight: 20 },
  sendButton: {
    alignItems: "center",
    backgroundColor: "#166534",
    borderRadius: radius.card,
    paddingVertical: 12
  },
  sendButtonDisabled: { opacity: 0.55 },
  sendButtonText: { color: "#ffffff", fontWeight: "900" },
  sections: { gap: 22 },
  section: {
    borderTopColor: "#dbe3ea",
    borderTopWidth: 1,
    paddingTop: 20
  },
  sectionTitle: {
    color: "#111827",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 8
  },
  body: { color: "#334155", fontSize: 16, lineHeight: 25 }
});
