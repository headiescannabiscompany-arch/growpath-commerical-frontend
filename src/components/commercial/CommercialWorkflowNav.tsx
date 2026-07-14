import { Link } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { radius } from "@/theme/theme";

type WorkflowStep = {
  label: string;
  shortLabel: string;
  href: string;
  routeKeys: string[];
};

const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    label: "Setup",
    shortLabel: "1",
    href: "/home/commercial/profile",
    routeKeys: ["commercial-profile"]
  },
  {
    label: "Catalog",
    shortLabel: "2",
    href: "/home/commercial/products",
    routeKeys: [
      "commercial-products",
      "commercial-product-create",
      "commercial-product-detail",
      "commercial-product-lines",
      "commercial-product-line-detail",
      "commercial-batch-planner",
      "commercial-batch-detail"
    ]
  },
  {
    label: "Evidence",
    shortLabel: "3",
    href: "/home/commercial/trials",
    routeKeys: [
      "commercial-trials",
      "commercial-trial-detail",
      "commercial-evidence-runs",
      "commercial-evidence-run-detail",
      "commercial-grows",
      "commercial-grow-detail"
    ]
  },
  {
    label: "Storefront",
    shortLabel: "4",
    href: "/home/commercial/storefront",
    routeKeys: [
      "storefront",
      "commercial-storefront",
      "commercial-storefront-edit",
      "commercial-storefront-preview"
    ]
  },
  {
    label: "Education",
    shortLabel: "5",
    href: "/home/commercial/courses",
    routeKeys: ["commercial-courses", "commercial-course-detail", "commercial-lives"]
  },
  {
    label: "Campaigns",
    shortLabel: "6",
    href: "/home/commercial/feed",
    routeKeys: ["commercial-feed", "commercial-marketing", "commercial-community"]
  },
  {
    label: "Sales",
    shortLabel: "7",
    href: "/home/commercial/orders",
    routeKeys: ["orders", "commercial-orders"]
  },
  {
    label: "Analytics",
    shortLabel: "8",
    href: "/home/commercial/analytics",
    routeKeys: ["commercial-analytics"]
  },
  {
    label: "Operations",
    shortLabel: "9",
    href: "/home/commercial/tasks",
    routeKeys: [
      "commercial_home",
      "commercial-tasks",
      "commercial-inventory",
      "commercial-inventory-create",
      "commercial-inventory-detail",
      "commercial-alerts",
      "commercial-schedule"
    ]
  }
];

export function isCommercialWorkflowRoute(routeKey: string) {
  return (
    routeKey === "commercial_home" ||
    routeKey.startsWith("commercial-") ||
    WORKFLOW_STEPS.some((step) => step.routeKeys.includes(routeKey))
  );
}

function isActiveStep(step: WorkflowStep, routeKey: string) {
  if (step.routeKeys.includes(routeKey)) return true;
  if (routeKey === "commercial_home" && step.label === "Operations") return true;
  return false;
}

export default function CommercialWorkflowNav({ routeKey }: { routeKey: string }) {
  return (
    <View accessibilityLabel="Commercial workflow" style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.kicker}>Commercial workflow</Text>
        <Text style={styles.helper}>Build, prove, publish, sell, measure.</Text>
      </View>
      <View style={styles.steps}>
        {WORKFLOW_STEPS.map((step) => {
          const active = isActiveStep(step, routeKey);
          return (
            <Link key={step.label} href={step.href as any} asChild>
              <Pressable
                accessibilityRole="link"
                accessibilityState={{ selected: active }}
                // Expo Router's web Link forwards this style to an <a>. React DOM
                // cannot apply React Native's array style directly to that node.
                style={StyleSheet.flatten([
                  styles.step,
                  active ? styles.stepActive : null
                ])}
              >
                <Text
                  style={[styles.stepNumber, active ? styles.stepNumberActive : null]}
                >
                  {step.shortLabel}
                </Text>
                <Text style={[styles.stepText, active ? styles.stepTextActive : null]}>
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
    marginBottom: 16,
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
    backgroundColor: "#ECFDF5",
    borderColor: "#16A34A"
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
    backgroundColor: "#166534",
    color: "#FFFFFF"
  },
  stepText: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "900"
  },
  stepTextActive: {
    color: "#166534"
  }
});
