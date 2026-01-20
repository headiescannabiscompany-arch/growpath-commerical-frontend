import React from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import CommercialBanner from "./CommercialBanner.js";
import { useAuth } from "../context/AuthContext.js";

// AppShell wraps every screen with the CommercialBanner and consistent scroll behavior
export default function AppShell({
  children,
  scroll = true,
  style,
  contentContainerStyle
}) {
  const { user, mode } = useAuth();
  // Prepare contextBarProps for commercial/facility users
  const contextBarProps = { user, mode };
  if (scroll) {
    return (
      <View style={styles.container}>
        <CommercialBanner
          userRole={user?.role}
          mode={mode}
          contextBarProps={contextBarProps}
        />
        <ScrollView
          style={[styles.scroll, style]}
          contentContainerStyle={[styles.content, contentContainerStyle]}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </View>
    );
  }
  return (
    <View style={styles.container}>
      <CommercialBanner
        userRole={user?.role}
        mode={mode}
        contextBarProps={contextBarProps}
      />
      <View style={[styles.content, style]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scroll: { flex: 1 },
  content: { paddingBottom: 120 } // ensures content is not covered by tabs
});
