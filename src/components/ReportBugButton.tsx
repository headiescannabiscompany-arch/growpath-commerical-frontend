import React from "react";
import { Linking, Pressable, StyleSheet, Text } from "react-native";
import { usePathname } from "expo-router";

import { useAuth } from "@/auth/AuthContext";
import { SUPPORT_CONTACTS } from "@/config/supportContacts";
import { useEntitlements } from "@/entitlements";

type ReportBugButtonProps = {
  workspace?: "personal" | "commercial" | "facility";
};

function valueOrUnknown(value: unknown) {
  const text = value == null ? "" : String(value).trim();
  return text || "unknown";
}

function currentUrl(pathname: string) {
  const location = (globalThis as any)?.window?.location;
  if (location?.href) return String(location.href);
  return pathname || "unknown";
}

export default function ReportBugButton({ workspace }: ReportBugButtonProps) {
  const pathname = usePathname();
  const auth = useAuth();
  const entitlements = useEntitlements();

  const mode = workspace || entitlements.mode || "personal";
  const user = auth.user;

  const openBugEmail = async () => {
    const subject = `GrowPathAI bug report - ${mode} - ${pathname || "unknown page"}`;
    const body = [
      "Bug report",
      "",
      "Who is reporting this:",
      `Name: ${valueOrUnknown((user as any)?.displayName || (user as any)?.name)}`,
      `Email: ${valueOrUnknown(user?.email)}`,
      `User ID: ${valueOrUnknown(user?.id || (user as any)?._id)}`,
      `Account type: ${valueOrUnknown(mode)}`,
      `Plan: ${valueOrUnknown(entitlements.plan || user?.plan)}`,
      `Facility ID: ${valueOrUnknown(entitlements.facilityId)}`,
      `Facility role: ${valueOrUnknown(entitlements.facilityRole)}`,
      "",
      "Where it is wrong:",
      `Page: ${valueOrUnknown(pathname)}`,
      `URL: ${valueOrUnknown(currentUrl(pathname))}`,
      "",
      "What is wrong:",
      "[Describe what broke or what looks incorrect.]",
      "",
      "Why it is wrong:",
      "[Describe what should have happened instead.]",
      "",
      "Steps to reproduce:",
      "1. ",
      "2. ",
      "3. ",
      "",
      "Screenshots/video:",
      "[Attach screenshots or video if available.]"
    ].join("\n");

    const mailto = `mailto:${SUPPORT_CONTACTS.general}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;

    await Linking.openURL(mailto);
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Report bug to GrowPathAI support"
      onPress={openBugEmail}
      style={({ pressed }) => [styles.button, pressed ? styles.pressed : null]}
    >
      <Text style={styles.text}>Report Bug</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    marginRight: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#b91c1c",
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#fef2f2"
  },
  pressed: {
    opacity: 0.72
  },
  text: {
    color: "#991b1b",
    fontSize: 12,
    fontWeight: "800"
  }
});
