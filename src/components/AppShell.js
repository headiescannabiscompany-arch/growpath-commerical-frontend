import React from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import CommercialBanner from "./CommercialBanner.js";
import { useAuth } from "@/auth/AuthContext";
import { useAppTheme } from "@/theme/appTheme";

import { sanitizeViewChildren } from "./layout/sanitizeViewChildren";
// AppShell wraps every screen with the CommercialBanner and consistent scroll behavior
export default function AppShell({
  children,
  scroll = true,
  style,
  contentContainerStyle
}) {
  const { user, mode, capabilities, limits } = useAuth();
  const { palette } = useAppTheme();
  // Prepare contextBarProps for commercial/facility users
  const contextBarProps = { user, mode, capabilities, limits };
  if (scroll) {
    return (
      <View style={[styles.container, { backgroundColor: palette.page }]}>
        <CommercialBanner
          mode={mode}
          capabilities={capabilities}
          contextBarProps={contextBarProps}
        />
        <ScrollView
          style={[styles.scroll, { backgroundColor: palette.page }, style]}
          contentContainerStyle={[styles.content, contentContainerStyle]}
          keyboardShouldPersistTaps="handled"
        >
          {sanitizeViewChildren(children, "AppShell.children")}
        </ScrollView>
      </View>
    );
  }
  return (
    <View style={[styles.container, { backgroundColor: palette.page }]}>
      <CommercialBanner
        mode={mode}
        capabilities={capabilities}
        contextBarProps={contextBarProps}
      />
      <View style={[styles.content, style]}>
        {sanitizeViewChildren(children, "AppShell.content")}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingBottom: 120 } // ensures content is not covered by tabs
});
