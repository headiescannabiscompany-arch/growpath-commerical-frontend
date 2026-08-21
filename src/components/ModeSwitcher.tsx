import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import { useEntitlements } from "@/entitlements";
import { useAuth } from "@/auth/AuthContext";
import type { AccountMode } from "@/state/useAccountMode";
import { useModeSwitcher } from "@/features/mode/useModeSwitcher";
import { availableWorkspaceModes } from "@/features/mode/workspaceOptions";
import { radius } from "@/theme/theme";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";

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
  const styles = useMemo(() => createModeSwitcherStyles(palette), [palette]);
  const availableModes = availableWorkspaceModes(entitlements);
  const commercialAccess = availableModes.includes("commercial");
  const facilityAccess = availableModes.includes("facility");
  const isPlatformAdmin = String(auth.user?.role || "").toLowerCase() === "admin";

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
              accessibilityRole="radio"
              accessibilityLabel={`${card.actionLabel}: ${card.title}`}
              accessibilityState={{ checked: selected }}
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
        {isPlatformAdmin ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Platform Administration"
            accessibilityHint="Open platform safety, moderation, account, and legal tools"
            onPress={() => router.push("/admin")}
            style={[styles.card, styles.adminCard]}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Platform Administration</Text>
              <Text style={[styles.badge, styles.adminBadge]}>Platform owner</Text>
            </View>
            <Text style={styles.cardText}>
              Review accounts, reports, security, moderation, legal requests, and audited
              platform actions.
            </Text>
            <Text style={styles.cardAction}>Open Admin Tools</Text>
          </Pressable>
        ) : null}
        {cards.map((card) => {
          const selected = mode === card.mode;
          return (
            <Pressable
              key={card.title}
              accessibilityRole="button"
              accessibilityLabel={card.title}
              accessibilityHint={
                card.access ? card.actionLabel : `${card.actionLabel} setup`
              }
              accessibilityState={{ selected }}
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

export function createModeSwitcherStyles(palette: ThemePalette) {
  return StyleSheet.create({
    wrap: { gap: 14 },
    identityPanel: {
      backgroundColor: palette.hero,
      borderColor: palette.border,
      borderRadius: radius.card,
      padding: 16
    },
    kicker: {
      color: palette.heroMuted,
      fontSize: 12,
      fontWeight: "900",
      textTransform: "uppercase"
    },
    identityName: {
      color: palette.heroText,
      fontSize: 20,
      fontWeight: "900",
      marginTop: 6
    },
    identityMeta: {
      color: palette.heroMuted,
      fontSize: 13,
      fontWeight: "700",
      marginTop: 4
    },
    selector: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      flexDirection: "row",
      gap: 4,
      padding: 4
    },
    segment: {
      alignItems: "center",
      borderRadius: radius.card,
      flex: 1,
      justifyContent: "center",
      minHeight: 44,
      paddingVertical: 10
    },
    segmentActive: {
      backgroundColor: palette.surface
    },
    segmentText: {
      color: palette.textMuted,
      fontSize: 13,
      fontWeight: "900"
    },
    segmentTextActive: {
      color: palette.text
    },
    cards: { gap: 10 },
    card: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      minHeight: 44,
      padding: 14
    },
    cardActive: {
      borderColor: palette.accent,
      borderWidth: 2
    },
    adminCard: {
      borderColor: palette.info
    },
    cardHeader: {
      alignItems: "center",
      flexDirection: "row",
      gap: 10,
      justifyContent: "space-between"
    },
    cardTitle: {
      color: palette.text,
      flex: 1,
      fontSize: 16,
      fontWeight: "900"
    },
    badge: {
      backgroundColor: palette.surfaceMuted,
      borderRadius: 999,
      color: palette.textMuted,
      fontSize: 11,
      fontWeight: "900",
      overflow: "hidden",
      paddingHorizontal: 9,
      paddingVertical: 5,
      textTransform: "uppercase"
    },
    badgeActive: {
      backgroundColor: palette.accentSoft,
      color: palette.accent
    },
    adminBadge: {
      backgroundColor: palette.accentSoft,
      color: palette.info
    },
    cardText: {
      color: palette.textMuted,
      fontSize: 13,
      fontWeight: "700",
      lineHeight: 19,
      marginTop: 8
    },
    cardAction: {
      color: palette.accent,
      fontSize: 13,
      fontWeight: "900",
      marginTop: 10
    }
  });
}
