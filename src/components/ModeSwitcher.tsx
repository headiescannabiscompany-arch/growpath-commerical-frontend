import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { useEntitlements } from "@/entitlements";
import { useAuth } from "@/auth/AuthContext";
import type { AccountMode } from "@/state/useAccountMode";
import { useModeSwitcher } from "@/features/mode/useModeSwitcher";
import { availableWorkspaceModes } from "@/features/mode/workspaceOptions";
import { radius } from "@/theme/theme";
import { useAppTheme } from "@/theme/appTheme";

type Props = {
  showFacility?: boolean;
  showCommercial?: boolean;
  showSingle?: boolean;
  availableOnly?: boolean;
};

type WorkspaceCard = {
  mode: AccountMode;
  title: string;
  description: string;
  actionLabel: string;
  access: boolean;
  createHref?: string;
};

const MODE_LABELS: Record<AccountMode, string> = {
  personal: "Personal",
  commercial: "Commercial",
  facility: "Facility"
};

export function ModeSwitcher({
  showFacility = true,
  showCommercial = true,
  showSingle = true,
  availableOnly = false
}: Props) {
  const router = useRouter();
  const auth = useAuth();
  const entitlements = useEntitlements();
  const { mode, switchTo } = useModeSwitcher();
  const { palette } = useAppTheme();
  const availableModes = availableWorkspaceModes(entitlements);
  const commercialAccess = availableModes.includes("commercial");
  const facilityAccess = availableModes.includes("facility");

  const cards: WorkspaceCard[] = [
    showSingle
      ? {
          mode: "personal",
          title: "Continue as Personal",
          description:
            "Grow logging, AI help, tools, courses, forum/Q&A, and your personal profile.",
          actionLabel: "Open Personal",
          access: true
        }
      : null,
    showCommercial
      ? {
          mode: "commercial",
          title: commercialAccess
            ? "Manage Commercial Brand"
            : "Create Commercial Account",
          description:
            "Storefront, products, courses, lives, Feed/Campaigns, orders, analytics, and Stripe.",
          actionLabel: commercialAccess ? "Open Commercial" : "Start Commercial",
          access: commercialAccess,
          createHref: "/offers"
        }
      : null,
    showFacility
      ? {
          mode: "facility",
          title: facilityAccess ? "Manage Facility" : "Create Facility Account",
          description:
            "Rooms, operational runs, tasks, staff, compliance, inventory, sensors, and audit logs.",
          actionLabel: facilityAccess ? "Open Facility" : "Start Facility",
          access: facilityAccess,
          createHref: "/offers"
        }
      : null
  ].filter((card): card is WorkspaceCard =>
    Boolean(card && (!availableOnly || card.access))
  );

  function handlePress(card: WorkspaceCard) {
    if (card.access) {
      switchTo(card.mode);
      return;
    }
    router.push(card.createHref || "/offers");
  }

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.identityPanel,
          { backgroundColor: palette.hero, borderColor: palette.border }
        ]}
      >
        <Text style={[styles.kicker, { color: palette.heroMuted }]}>
          Current identity
        </Text>
        <Text style={[styles.identityName, { color: palette.heroText }]}>
          {auth.user?.name || auth.user?.email || "Signed-in grower"}
        </Text>
        <Text style={[styles.identityMeta, { color: palette.heroMuted }]}>
          Acting in {MODE_LABELS[mode]} workspace mode
        </Text>
      </View>

      <View
        style={[
          styles.selector,
          { backgroundColor: palette.surfaceMuted, borderColor: palette.border }
        ]}
        accessibilityLabel="Account mode selector"
      >
        {cards.map((card) => {
          const selected = mode === card.mode;
          return (
            <Pressable
              key={card.mode}
              accessibilityRole="button"
              accessibilityLabel={`${card.actionLabel}: ${card.title}`}
              onPress={() => handlePress(card)}
              style={[
                styles.segment,
                selected && [styles.segmentActive, { backgroundColor: palette.surface }]
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  { color: palette.textMuted },
                  selected && { color: palette.text }
                ]}
              >
                {MODE_LABELS[card.mode]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.cards}>
        {cards.map((card) => {
          const selected = mode === card.mode;
          return (
            <Pressable
              key={card.title}
              accessibilityRole="button"
              accessibilityLabel={card.title}
              onPress={() => handlePress(card)}
              style={[
                styles.card,
                { backgroundColor: palette.surface, borderColor: palette.border },
                selected && { borderColor: palette.accent, borderWidth: 2 }
              ]}
            >
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: palette.text }]}>
                  {card.title}
                </Text>
                <Text
                  style={[
                    styles.badge,
                    { backgroundColor: palette.surfaceMuted, color: palette.textMuted },
                    selected && {
                      backgroundColor: palette.accentSoft,
                      color: palette.accent
                    }
                  ]}
                >
                  {selected ? "Current" : card.access ? "Available" : "Setup"}
                </Text>
              </View>
              <Text style={[styles.cardText, { color: palette.textMuted }]}>
                {card.description}
              </Text>
              <Text style={[styles.cardAction, { color: palette.accent }]}>
                {card.actionLabel}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  identityPanel: {
    backgroundColor: "#0f172a",
    borderRadius: radius.card,
    padding: 16
  },
  kicker: {
    color: "#86efac",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  identityName: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "900",
    marginTop: 6
  },
  identityMeta: {
    color: "#cbd5e1",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4
  },
  selector: {
    backgroundColor: "#e2e8f0",
    borderRadius: radius.card,
    flexDirection: "row",
    gap: 4,
    padding: 4
  },
  segment: {
    alignItems: "center",
    borderRadius: radius.card,
    flex: 1,
    paddingVertical: 10
  },
  segmentActive: {
    backgroundColor: "#ffffff"
  },
  segmentText: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "900"
  },
  segmentTextActive: {
    color: "#0f172a"
  },
  cards: { gap: 10 },
  card: {
    backgroundColor: "#ffffff",
    borderColor: "#dbe3ea",
    borderRadius: radius.card,
    borderWidth: 1,
    padding: 14
  },
  cardActive: {
    borderColor: "#166534",
    borderWidth: 2
  },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between"
  },
  cardTitle: {
    color: "#111827",
    flex: 1,
    fontSize: 16,
    fontWeight: "900"
  },
  badge: {
    backgroundColor: "#f1f5f9",
    borderRadius: 999,
    color: "#475569",
    fontSize: 11,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 9,
    paddingVertical: 5,
    textTransform: "uppercase"
  },
  badgeActive: {
    backgroundColor: "#dcfce7",
    color: "#166534"
  },
  cardText: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    marginTop: 8
  },
  cardAction: {
    color: "#166534",
    fontSize: 13,
    fontWeight: "900",
    marginTop: 10
  }
});
