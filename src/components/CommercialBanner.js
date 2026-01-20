// @ts-nocheck
import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import ContextBar from "./ContextBar.js";

// Simple, reusable banner for promos, upgrades, featured tools, etc.
export default function CommercialBanner({ userRole, mode, contextBarProps }) {
  let bannerText = "🌱 Featured: Try GrowPath Pro for advanced tools & community!";
  if (mode === "facility")
    bannerText = "🏭 Facility: Access your team tools and analytics!";
  else if (mode === "commercial")
    bannerText = "💼 Commercial: Manage your marketplace and vendor tools!";
  else if (userRole === "admin")
    bannerText = "🔒 Admin: Manage all users, reports, and analytics.";
  else if (userRole === "creator")
    bannerText = "🎓 Creator: Build and publish your own courses!";

  return (
    <View>
      {/* ContextBar for commercial/facility users */}
      {(mode === "facility" || mode === "commercial") && (
        <ContextBar {...contextBarProps} />
      )}
      <View style={styles.banner}>
        <Image
          source={require("../../assets/icon.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.text}>{bannerText}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    width: "100%",
    backgroundColor: "#10B981",
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    minHeight: 48
  },
  logo: {
    width: 32,
    height: 32,
    marginRight: 12
  },
  text: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
    flex: 1
  }
});
