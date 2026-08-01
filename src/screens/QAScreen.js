import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, Platform } from "react-native";
import { personalToolFeatures } from "../config/featureStatus";
import { useEntitlements } from "../entitlements";
import { useAppTheme } from "../theme/appTheme";
import { radius } from "../theme/theme";

export default function QAScreen() {
  const entitlements = useEntitlements();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createQAStyles(palette), [palette]);
  const diagnostics = useMemo(
    () => [
      ["Entitlements ready", entitlements.ready ? "Yes" : "No"],
      ["Bootstrap error", entitlements.bootstrapError || "None"],
      ["Mode", entitlements.mode || "personal"],
      ["Plan", entitlements.plan || "free"],
      ["Facility ID", entitlements.facilityId || "None"],
      ["Facility role", entitlements.facilityRole || "None"]
    ],
    [entitlements]
  );
  const enabledCapabilities = Object.entries(entitlements.capabilities || {}).filter(
    ([, enabled]) => Boolean(enabled)
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>QA & Debug Tools</Text>
      <Text style={styles.subtitle}>
        Runtime diagnostics for access, feature status, and release validation.
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Runtime State</Text>
        {diagnostics.map(([label, value]) => (
          <View key={label} style={styles.row}>
            <Text style={styles.rowLabel}>{label}</Text>
            <Text style={styles.rowValue}>{value}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Enabled Capabilities</Text>
        {enabledCapabilities.length ? (
          enabledCapabilities.map(([key]) => (
            <Text key={key} style={styles.capability}>
              {key}
            </Text>
          ))
        ) : (
          <Text style={styles.muted}>
            No capability flags are enabled for this session.
          </Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tool Feature Status</Text>
        {personalToolFeatures.map((feature) => (
          <View key={feature.key} style={styles.featureRow}>
            <View>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDescription}>{feature.internalNote}</Text>
            </View>
            <Text style={styles.status}>{feature.status}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

export const createQAStyles = (palette) => {
  const shadow = Platform.select({
    web: { boxShadow: `0px 2px 4px ${palette.shadow}` },
    default: {
      elevation: 1,
      shadowColor: palette.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 2
    }
  });

  return StyleSheet.create({
    container: {
      backgroundColor: palette.page,
      padding: 24
    },
    title: {
      color: palette.link,
      fontSize: 28,
      fontWeight: "bold",
      marginBottom: 8
    },
    subtitle: {
      color: palette.textMuted,
      fontSize: 16,
      marginBottom: 16
    },
    section: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      marginBottom: 16,
      padding: 16,
      ...shadow
    },
    sectionTitle: {
      color: palette.link,
      fontSize: 18,
      fontWeight: "bold",
      marginBottom: 10
    },
    row: {
      borderBottomColor: palette.borderSoft,
      borderBottomWidth: 1,
      flexDirection: "row",
      gap: 12,
      justifyContent: "space-between",
      paddingVertical: 8
    },
    rowLabel: {
      color: palette.textSoft,
      fontWeight: "700"
    },
    rowValue: {
      color: palette.text,
      flexShrink: 1,
      fontWeight: "800",
      textAlign: "right"
    },
    capability: {
      color: palette.text,
      fontWeight: "700",
      paddingVertical: 4
    },
    muted: {
      color: palette.textMuted
    },
    featureRow: {
      alignItems: "flex-start",
      borderBottomColor: palette.borderSoft,
      borderBottomWidth: 1,
      flexDirection: "row",
      gap: 12,
      justifyContent: "space-between",
      paddingVertical: 10
    },
    featureTitle: {
      color: palette.text,
      fontWeight: "800"
    },
    featureDescription: {
      color: palette.textMuted,
      marginTop: 3,
      maxWidth: 520
    },
    status: {
      color: palette.link,
      fontWeight: "800",
      textTransform: "capitalize"
    }
  });
};
