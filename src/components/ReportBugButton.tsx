import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";

import { useAuth } from "@/auth/AuthContext";
import { useEntitlements } from "@/entitlements";
import { radius } from "@/theme/theme";

function userName(user: any) {
  const explicit = String(user?.displayName || user?.name || "").trim();
  if (explicit) return explicit;
  const email = String(user?.email || "").trim();
  if (email.includes("@")) return email.split("@")[0];
  return "GrowPath user";
}

function bugTemplate(args: {
  email: string;
  userId: string;
  mode: string;
  plan: string;
  facilityId: string;
  facilityRole: string;
  location: string;
}) {
  return [
    "Bug report",
    "",
    "Who:",
    `- Account email: ${args.email || "unknown"}`,
    `- User ID: ${args.userId || "unknown"}`,
    `- Workspace/user type: ${args.mode || "unknown"}`,
    `- Plan: ${args.plan || "unknown"}`,
    `- Facility ID: ${args.facilityId || "unknown"}`,
    `- Facility role: ${args.facilityRole || "unknown"}`,
    "",
    "What is wrong:",
    "- ",
    "",
    "Why this is wrong / what should happen:",
    "- ",
    "",
    "Where it happened:",
    `- Page or feature: ${args.location}`,
    "- Device/browser:",
    "",
    "Steps to reproduce:",
    "1. ",
    "2. ",
    "3. ",
    "",
    "Impact:",
    "- ",
    "",
    "Screenshots or video:",
    "- Attach or link if available."
  ].join("\n");
}

export default function ReportBugButton({
  location,
  label = "Report Bug"
}: {
  location: string;
  label?: string;
}) {
  const router = useRouter();
  const auth = useAuth();
  const entitlements = useEntitlements();
  const email = String(auth.user?.email || "").trim();
  const userId = String(auth.user?.id || (auth.user as any)?._id || "").trim();
  const mode = String(entitlements.mode || "unknown");
  const plan = String(entitlements.plan || "unknown");
  const facilityId = String((entitlements as any).facilityId || "").trim();
  const facilityRole = String((entitlements as any).facilityRole || "").trim();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Report bug"
      style={styles.button}
      onPress={() =>
        router.push({
          pathname: "/support",
          params: {
            topic: "technical",
            name: userName(auth.user),
            email,
            accountEmail: email,
            subject: `Bug report - ${mode} - ${location}`,
            message: bugTemplate({
              email,
              userId,
              mode,
              plan,
              facilityId,
              facilityRole,
              location
            })
          }
        } as any)
      }
    >
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#B45309",
    borderRadius: radius.card,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  text: { color: "#92400E", fontWeight: "900" }
});
