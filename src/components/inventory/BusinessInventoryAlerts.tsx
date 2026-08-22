import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  BusinessInventoryAlerts as BusinessInventoryAlertFlags,
  BusinessInventoryItem
} from "@/api/businessInventory";
import { type ThemePalette, useAppTheme } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

type AlertEntry = {
  key: string;
  title: string;
  evidence: string;
  tone: "danger" | "warning" | "info";
};

function count(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function businessInventoryAlertEntries(
  alerts: BusinessInventoryAlertFlags | null | undefined
): AlertEntry[] {
  if (!alerts) return [];
  const entries: AlertEntry[] = [];
  const expiredLots = count(alerts.expiredLots);
  const expiringSoonLots = count(alerts.expiringSoonLots);
  const unallocatedQuantity = count(alerts.unallocatedQuantity);

  if (alerts.outOfStock) {
    entries.push({
      key: "out-of-stock",
      title: "Out of stock",
      evidence: "Evidence: the canonical item on-hand balance is zero.",
      tone: "danger"
    });
  } else if (alerts.lowStock) {
    entries.push({
      key: "low-stock",
      title: "Low stock",
      evidence:
        "Evidence: the canonical on-hand balance is at or below this item's reorder point.",
      tone: "warning"
    });
  }
  if (alerts.held) {
    entries.push({
      key: "held",
      title: "Inventory held",
      evidence: "Evidence: the item or at least one attached lot has held status.",
      tone: "warning"
    });
  }
  if (expiredLots) {
    entries.push({
      key: "expired",
      title: `${expiredLots} expired ${expiredLots === 1 ? "lot" : "lots"}`,
      evidence: "Evidence: stored lot expiration dates are before today.",
      tone: "danger"
    });
  }
  if (expiringSoonLots) {
    entries.push({
      key: "expiring-soon",
      title: `${expiringSoonLots} ${expiringSoonLots === 1 ? "lot expires" : "lots expire"} within 30 days`,
      evidence: "Evidence: the server-reviewed lot expiration window.",
      tone: "warning"
    });
  }
  if (alerts.lotQuantityExceedsItem) {
    entries.push({
      key: "lot-balance-discrepancy",
      title: "Lot balance discrepancy",
      evidence:
        "Evidence: attached lot balances exceed the canonical item on-hand balance.",
      tone: "danger"
    });
  }
  if (unallocatedQuantity) {
    entries.push({
      key: "unallocated-quantity",
      title: `${unallocatedQuantity} on-hand ${unallocatedQuantity === 1 ? "unit is" : "units are"} not allocated to a lot`,
      evidence:
        "Evidence: the canonical item balance is greater than its attached lot balances.",
      tone: "warning"
    });
  }
  if (alerts.sourceAgeDays === null) {
    entries.push({
      key: "source-freshness",
      title: "Source freshness not recorded",
      evidence: "Evidence: this record has no reviewed source freshness date.",
      tone: "info"
    });
  } else if (Number.isFinite(Number(alerts.sourceAgeDays))) {
    const sourceAgeDays = Math.max(0, Number(alerts.sourceAgeDays));
    entries.push({
      key: "source-freshness",
      title: `Source evidence age: ${sourceAgeDays} ${sourceAgeDays === 1 ? "day" : "days"}`,
      evidence: "Evidence: the saved source freshness date for this inventory record.",
      tone: "info"
    });
  }

  return entries;
}

export function BusinessInventoryAlerts({
  item,
  compact = false
}: {
  item: Pick<BusinessInventoryItem, "alerts"> | Record<string, unknown>;
  compact?: boolean;
}) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const entries = businessInventoryAlertEntries(
    (item as { alerts?: BusinessInventoryAlertFlags }).alerts
  );

  if (!entries.length) return null;

  if (compact) {
    const compactEntries = entries.filter(
      (entry) => entry.key !== "low-stock" && entry.key !== "out-of-stock"
    );
    if (!compactEntries.length) return null;
    return (
      <View accessibilityLabel="Inventory evidence alerts" style={styles.badgeRow}>
        {compactEntries.map((entry) => (
          <Text
            key={entry.key}
            style={[
              styles.badge,
              entry.tone === "danger" && styles.danger,
              entry.tone === "warning" && styles.warning,
              entry.tone === "info" && styles.info
            ]}
          >
            {entry.title}
          </Text>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.panel}>
      <Text accessibilityRole="header" aria-level={2} style={styles.heading}>
        Evidence-linked inventory alerts
      </Text>
      {entries.map((entry) => (
        <View
          key={entry.key}
          style={[
            styles.entry,
            entry.tone === "danger" && styles.dangerBorder,
            entry.tone === "warning" && styles.warningBorder,
            entry.tone === "info" && styles.infoBorder
          ]}
        >
          <Text style={styles.title}>{entry.title}</Text>
          <Text style={styles.evidence}>{entry.evidence}</Text>
        </View>
      ))}
    </View>
  );
}

function createStyles(palette: ThemePalette) {
  return StyleSheet.create({
    panel: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 8,
      padding: 14
    },
    heading: { color: palette.text, fontSize: 16, fontWeight: "900" },
    entry: {
      borderLeftWidth: 3,
      gap: 3,
      paddingHorizontal: 10,
      paddingVertical: 6
    },
    dangerBorder: { borderLeftColor: palette.danger },
    warningBorder: { borderLeftColor: palette.warning },
    infoBorder: { borderLeftColor: palette.accent },
    title: { color: palette.text, fontWeight: "900" },
    evidence: { color: palette.textMuted, fontSize: 12, lineHeight: 17 },
    badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    badge: {
      borderRadius: 999,
      borderWidth: 1,
      fontSize: 11,
      fontWeight: "800",
      overflow: "hidden",
      paddingHorizontal: 7,
      paddingVertical: 3
    },
    danger: { borderColor: palette.danger, color: palette.danger },
    warning: { borderColor: palette.warning, color: palette.warning },
    info: { borderColor: palette.accent, color: palette.text }
  });
}
