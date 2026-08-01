import React, { useMemo } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { useAuth } from "@/auth/AuthContext";
import { useEntitlements } from "@/entitlements";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

type PlanKey = "pro" | "commercial" | "facility";

type Walkthrough = {
  title: string;
  subtitle: string;
  steps: { title: string; body: string }[];
  preview: string[];
};

const WALKTHROUGHS: Record<PlanKey, Walkthrough> = {
  pro: {
    title: "Pro grower walkthrough",
    subtitle: "See the personal tools that unlock after checkout.",
    steps: [
      {
        title: "Build the grow workspace",
        body: "Track grows, plants, logs, tasks, and observations in one personal workflow."
      },
      {
        title: "Use advanced tools",
        body: "Plan timelines, run VPD and nutrition tools, export grow records, and use AI guidance."
      },
      {
        title: "Keep Forum/Q&A separated",
        body: "Your forum-group selections shape Feed campaigns, courses, and recommendations before paid tools unlock."
      }
    ],
    preview: ["AI diagnosis", "Timeline planner", "PDF exports"]
  },
  commercial: {
    title: "Commercial walkthrough",
    subtitle: "Review the brand and storefront workspace before checkout.",
    steps: [
      {
        title: "Set up your brand surface",
        body: "Use storefront, products, courses, lives, Feed campaigns, orders, and generated inventory once the plan is active."
      },
      {
        title: "Route the right audience",
        body: "Forum-group selections keep commercial content aligned with the crops and customers you serve."
      },
      {
        title: "Keep paid access gated",
        body: "Until checkout completes, your account keeps the Commercial intent but uses free access."
      }
    ],
    preview: ["Storefront", "Campaign tools", "Commercial inventory"]
  },
  facility: {
    title: "Facility walkthrough",
    subtitle: "Start with a guided setup tour before operations alerts appear.",
    steps: [
      {
        title: "Name the facility",
        body: "Confirm the facility name, type, and operating model before entering the dashboard."
      },
      {
        title: "Map rooms and zones",
        body: "Create rooms or zones first so grows, plants, staff, tasks, and inventory have a clear home."
      },
      {
        title: "Start crops and batches",
        body: "Connect the first crop or batch to its room so plant records, logs, and environmental context have a real operating home."
      },
      {
        title: "Add staff and tasks",
        body: "Invite the team, assign roles, and create the first room-linked work so ownership is clear."
      },
      {
        title: "Add inventory and settings",
        body: "Enter real inventory, reorder points, devices, and facility settings before stock or operations risk is calculated."
      },
      {
        title: "Walk the dashboard",
        body: "Review rooms, crops, batches, staff, tasks, inventory, settings, and compliance after setup exists."
      }
    ],
    preview: [
      "Facility name and type",
      "Rooms and zones",
      "Crops and batches",
      "Staff and tasks",
      "Inventory and settings",
      "Dashboard walkthrough"
    ]
  }
};

function singleParam(value?: string | string[]) {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

function normalizePlan(raw: string): PlanKey {
  if (raw === "commercial" || raw === "facility" || raw === "pro") return raw;
  return "pro";
}

export default function WalkthroughsScreen() {
  const router = useRouter();
  const auth = useAuth();
  const entitlements = useEntitlements();
  const { palette } = useAppTheme();
  const styles = createWalkthroughStyles(palette);
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ plan?: string | string[] }>();
  const requestedPlan = singleParam(params.plan);
  const modePlan: PlanKey =
    entitlements.mode === "facility"
      ? "facility"
      : entitlements.mode === "commercial"
        ? "commercial"
        : "pro";
  const plan = requestedPlan ? normalizePlan(requestedPlan) : modePlan;
  const data = WALKTHROUGHS[plan];
  const isWide = width >= 900;
  const subscriptionActive = ["active", "trial", "trialing"].includes(
    String(auth.user?.subscriptionStatus || "").toLowerCase()
  );
  const currentWorkspacePlan = plan === modePlan;
  const openCurrentWorkspace = subscriptionActive && currentWorkspacePlan;

  const ctaLabel = useMemo(() => {
    if (openCurrentWorkspace) {
      if (plan === "facility") return "Open Facility workspace";
      if (plan === "commercial") return "Open Commercial workspace";
      return "Open Personal workspace";
    }
    if (plan === "facility") return "Continue to Facility checkout";
    if (plan === "commercial") return "Continue to Commercial checkout";
    return "Continue to Pro checkout";
  }, [openCurrentWorkspace, plan]);

  const ctaHref = openCurrentWorkspace
    ? plan === "facility"
      ? "/home/facility"
      : plan === "commercial"
        ? "/home/commercial"
        : "/home/personal"
    : "/offers";

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={[styles.shell, isWide && styles.shellWide]}>
        <View style={styles.main}>
          <Text style={styles.kicker}>Before checkout</Text>
          <Text accessibilityRole="header" aria-level={1} style={styles.title}>
            {data.title}
          </Text>
          <Text style={styles.subtitle}>{data.subtitle}</Text>

          <View style={styles.steps}>
            {data.steps.map((step, index) => (
              <View key={step.title} style={styles.step}>
                <Text style={styles.stepNumber}>{index + 1}</Text>
                <View style={styles.stepBody}>
                  <Text
                    accessibilityRole="header"
                    aria-level={2}
                    style={styles.stepTitle}
                  >
                    {step.title}
                  </Text>
                  <Text style={styles.stepText}>{step.body}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.side}>
          <Text accessibilityRole="header" aria-level={2} style={styles.sideTitle}>
            {openCurrentWorkspace
              ? "Available in this workspace"
              : "Unlocks after payment"}
          </Text>
          {data.preview.map((item) => (
            <View key={item} style={styles.previewRow}>
              <Text style={styles.previewDot}>+</Text>
              <Text style={styles.previewText}>{item}</Text>
            </View>
          ))}
          <Text style={styles.note}>
            {openCurrentWorkspace
              ? "This account already has active or trial access for its current workspace."
              : "Your selected plan is saved as intent. Paid tools stay locked until checkout activates the subscription."}
          </Text>
          <Pressable
            onPress={() => router.replace(ctaHref as any)}
            accessibilityRole="button"
            accessibilityLabel={ctaLabel}
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          >
            <Text style={styles.buttonText}>{ctaLabel}</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

export const createWalkthroughStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    root: { backgroundColor: palette.page, flex: 1 },
    content: { padding: 18 },
    shell: { gap: 16, marginHorizontal: "auto", maxWidth: 1120, width: "100%" },
    shellWide: { flexDirection: "row", alignItems: "stretch" },
    main: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      flex: 1,
      gap: 14,
      padding: 22
    },
    side: {
      backgroundColor: palette.surfaceStrong,
      borderColor: palette.border,
      borderWidth: 1,
      borderRadius: radius.card,
      gap: 12,
      padding: 22
    },
    kicker: {
      color: palette.accent,
      fontSize: 12,
      fontWeight: "900",
      textTransform: "uppercase"
    },
    title: { color: palette.text, fontSize: 30, fontWeight: "900" },
    subtitle: { color: palette.textSoft, fontSize: 15, fontWeight: "700", maxWidth: 720 },
    steps: { gap: 12, marginTop: 6 },
    step: {
      borderColor: palette.borderSoft,
      borderRadius: radius.card,
      borderWidth: 1,
      flexDirection: "row",
      gap: 12,
      padding: 14
    },
    stepNumber: {
      color: palette.accent,
      fontSize: 16,
      fontWeight: "900",
      minWidth: 22
    },
    stepBody: { flex: 1, gap: 4 },
    stepTitle: { color: palette.text, fontSize: 16, fontWeight: "900" },
    stepText: { color: palette.textSoft, fontSize: 14, lineHeight: 20 },
    sideTitle: { color: palette.text, fontSize: 18, fontWeight: "900" },
    previewRow: { flexDirection: "row", gap: 8 },
    previewDot: { color: palette.success, fontWeight: "900" },
    previewText: { color: palette.textSoft, fontSize: 14, fontWeight: "800" },
    note: { color: palette.textMuted, fontSize: 13, lineHeight: 19, marginTop: 8 },
    button: {
      alignItems: "center",
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      marginTop: 8,
      paddingVertical: 12
    },
    buttonText: { color: palette.accentText, fontSize: 14, fontWeight: "900" },
    pressed: { opacity: 0.86 }
  });
