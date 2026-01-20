import React from "react";
import { View, Text, StyleSheet } from "react-native";
import AppShell from "../components/AppShell.js";
import { useAuth } from "../context/AuthContext.js";
import { FEATURES, getEntitlement } from "../utils/entitlements.js";

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyTitle: { fontSize: 20, fontWeight: "bold", marginTop: 8 },
  emptyText: {
    fontSize: 15,
    color: "#7f8c8d",
    marginTop: 4,
    marginBottom: 12,
    textAlign: "center"
  }
});

const SearchScreen = () => {
  const { user } = useAuth();
  // Determine entitlement for search (example: advanced search feature)
  const searchEntitlement = getEntitlement(FEATURES.SEARCH, user?.role || "free");
  // For demo, fallback to always enabled if not in matrix
  const isDisabled = searchEntitlement === "disabled";
  const isCta = searchEntitlement === "cta";

  return (
    <AppShell style={{}} contentContainerStyle={{}}>
      <View style={styles.container}>
        <Text style={styles.emptyTitle}>No results found</Text>
        <Text style={styles.emptyText}>Try different keywords or browse categories</Text>
        {/* Example: gated feature button (replace with real search actions) */}
        <View style={{ marginTop: 24 }}>
          <Text
            style={{
              color: isDisabled ? "#ccc" : isCta ? "#2980b9" : "#27ae60",
              fontWeight: "bold",
              fontSize: 16,
              opacity: isDisabled ? 0.5 : 1
            }}
            // Add onPress/CTA logic as needed
          >
            {isDisabled
              ? "Upgrade to unlock search"
              : isCta
                ? "Upgrade for advanced search"
                : "Search available"}
          </Text>
        </View>
      </View>
    </AppShell>
  );
};

export default SearchScreen;
