import { Link } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { radius } from "@/theme/theme";

type FacilityStep = {
  label: string;
  shortLabel: string;
  href: string;
  paths: string[];
};

const FACILITY_STEPS: FacilityStep[] = [
  {
    label: "Setup",
    shortLabel: "1",
    href: "/home/facility/profile",
    paths: [
      "/home/facility/profile",
      "/home/facility/select",
      "/onboarding/create-facility"
    ]
  },
  {
    label: "Rooms",
    shortLabel: "2",
    href: "/home/facility/rooms",
    paths: ["/home/facility/rooms"]
  },
  {
    label: "Grows",
    shortLabel: "3",
    href: "/home/facility/grows",
    paths: ["/home/facility/grows"]
  },
  {
    label: "Plants & Logs",
    shortLabel: "4",
    href: "/home/facility/plants",
    paths: ["/home/facility/plants", "/home/facility/logs"]
  },
  {
    label: "Inventory",
    shortLabel: "5",
    href: "/home/facility/inventory",
    paths: ["/home/facility/inventory"]
  },
  {
    label: "Tasks & SOPs",
    shortLabel: "6",
    href: "/home/facility/tasks",
    paths: ["/home/facility/tasks", "/home/facility/sop-runs"]
  },
  {
    label: "Compliance",
    shortLabel: "7",
    href: "/home/facility/compliance",
    paths: ["/home/facility/compliance", "/home/facility/audit-logs"]
  },
  {
    label: "Team",
    shortLabel: "8",
    href: "/home/facility/team",
    paths: ["/home/facility/team"]
  },
  {
    label: "Reports & AI",
    shortLabel: "9",
    href: "/home/facility/reports",
    paths: [
      "/home/facility/dashboard",
      "/home/facility/reports",
      "/home/facility/ai-ask",
      "/home/facility/ai-tools",
      "/home/facility/ai-template",
      "/home/facility/ai-validation",
      "/home/facility/ai-diagnosis-photo"
    ]
  }
];

function currentPath() {
  if (typeof window === "undefined" || !window.location) return "";
  return window.location.pathname || "";
}

export function isFacilityWorkflowPath(pathname = currentPath()) {
  return pathname === "/home/facility" || pathname.startsWith("/home/facility/");
}

function isActiveStep(step: FacilityStep, pathname: string) {
  return step.paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export default function FacilityWorkflowNav() {
  const pathname = currentPath();
  if (!isFacilityWorkflowPath(pathname)) return null;

  return (
    <View accessibilityLabel="Facility workflow" style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.kicker}>Paid facility workflow</Text>
        <Text style={styles.helper}>Configure, operate, verify, report.</Text>
      </View>
      <View style={styles.steps}>
        {FACILITY_STEPS.map((step) => {
          const active = isActiveStep(step, pathname);
          return (
            <Link key={step.label} href={step.href as any} asChild>
              <Pressable
                accessibilityRole="link"
                accessibilityState={{ selected: active }}
                style={[styles.step, active ? styles.stepActive : null]}
              >
                <Text style={[styles.stepNumber, active && styles.stepNumberActive]}>
                  {step.shortLabel}
                </Text>
                <Text style={[styles.stepText, active && styles.stepTextActive]}>
                  {step.label}
                </Text>
              </Pressable>
            </Link>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    borderWidth: 1,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 12
  },
  headerRow: {
    alignItems: "baseline",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "space-between",
    marginBottom: 10
  },
  kicker: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "900"
  },
  helper: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700"
  },
  steps: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  step: {
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: "row",
    gap: 7,
    minHeight: 38,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  stepActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#2563EB"
  },
  stepNumber: {
    backgroundColor: "#E2E8F0",
    borderRadius: 999,
    color: "#334155",
    fontSize: 11,
    fontWeight: "900",
    minWidth: 20,
    overflow: "hidden",
    paddingHorizontal: 6,
    paddingVertical: 3,
    textAlign: "center"
  },
  stepNumberActive: {
    backgroundColor: "#1D4ED8",
    color: "#FFFFFF"
  },
  stepText: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "900"
  },
  stepTextActive: {
    color: "#1D4ED8"
  }
});
