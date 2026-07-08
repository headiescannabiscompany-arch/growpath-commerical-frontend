import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import { useAuth } from "@/auth/AuthContext";
import type { AccountMode } from "@/state/useAccountMode";
import { useModeSwitcher } from "@/features/mode/useModeSwitcher";

type Props = {
  showFacility?: boolean;
  showCommercial?: boolean;
  showSingle?: boolean;
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

function canUseCommercial(entitlements: ReturnType<typeof useEntitlements>) {
  return (
    entitlements.mode === "commercial" ||
    entitlements.can?.(CAPABILITY_KEYS.COMMERCIAL_HOME) === true
  );
}

function canUseFacility(entitlements: ReturnType<typeof useEntitlements>) {
  return (
    entitlements.mode === "facility" ||
    Boolean(entitlements.facilityId || entitlements.facilityRole) ||
    entitlements.can?.(CAPABILITY_KEYS.FACILITY_ACCESS) === true
  );
}

export function ModeSwitcher({
  showFacility = true,
  showCommercial = true,
  showSingle = true
}: Props) {
  const router = useRouter();
  const auth = useAuth();
  const entitlements = useEntitlements();
  const { mode, switchTo } = useModeSwitcher();
  const commercialAccess = canUseCommercial(entitlements);
  const facilityAccess = canUseFacility(entitlements);

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
  ].filter(Boolean) as WorkspaceCard[];

  function handlePress(card: WorkspaceCard) {
    if (card.access) {
      switchTo(card.mode);
      return;
    }
    router.push(card.createHref || "/offers");
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.identityPanel}>
        <Text style={styles.kicker}>Current identity</Text>
        <Text style={styles.identityName}>
          {auth.user?.name || auth.user?.email || "Signed-in grower"}
        </Text>
        <Text style={styles.identityMeta}>
          Acting in {MODE_LABELS[mode]} workspace mode
        </Text>
      </View>

      <View style={styles.selector} accessibilityLabel="Account mode selector">
        {cards.map((card) => {
          const selected = mode === card.mode;
          return (
            <Pressable
              key={card.mode}
              accessibilityRole="button"
              accessibilityLabel={`${card.actionLabel}: ${card.title}`}
              onPress={() => handlePress(card)}
              style={[styles.segment, selected && styles.segmentActive]}
            >
              <Text style={[styles.segmentText, selected && styles.segmentTextActive]}>
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
              style={[styles.card, selected && styles.cardActive]}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{card.title}</Text>
                <Text style={[styles.badge, selected && styles.badgeActive]}>
                  {selected ? "Current" : card.access ? "Available" : "Setup"}
                </Text>
              </View>
              <Text style={styles.cardText}>{card.description}</Text>
              <Text style={styles.cardAction}>{card.actionLabel}</Text>
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
    borderRadius: 8,
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
    borderRadius: 8,
    flexDirection: "row",
    gap: 4,
    padding: 4
  },
  segment: {
    alignItems: "center",
    borderRadius: 6,
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
    borderRadius: 8,
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
