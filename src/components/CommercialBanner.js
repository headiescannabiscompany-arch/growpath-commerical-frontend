// @ts-nocheck
import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import ContextBar from "./ContextBar.js";
import { useAppTheme } from "@/theme/appTheme";

// Simple, reusable banner for promos, upgrades, featured tools, etc.
const defaultCapabilities = {
  canUseTimelinePlanner: false,
  canExportPdf: false
};

export default function CommercialBanner({
  mode,
  capabilities = defaultCapabilities,
  contextBarProps
}) {
  const { palette } = useAppTheme();
  let bannerText = "Featured: Try GrowPath Pro for advanced tools & Forum/Q&A!";
  if (mode === "facility") bannerText = "Facility: Access your team tools and analytics!";
  else if (mode === "commercial")
    bannerText = "Commercial: Manage your storefront and vendor tools!";

  // Show upgrade CTA if something is locked (example: Pro tools).
  let showUpgrade = false;
  if (!capabilities.canUseTimelinePlanner || !capabilities.canExportPdf) {
    showUpgrade = true;
  }

  return (
    <View>
      {(mode === "facility" || mode === "commercial") && (
        <ContextBar {...contextBarProps} />
      )}
      <View
        style={[
          styles.banner,
          {
            backgroundColor: palette.hero,
            borderBottomColor: palette.border
          }
        ]}
      >
        <Image
          source={require("../../assets/icon.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={[styles.text, { color: palette.heroText }]}>{bannerText}</Text>
        {showUpgrade && (
          <Text
            style={[
              styles.text,
              { color: palette.heroMuted, fontSize: 12, marginLeft: 8 }
            ]}
          >
            Unlock more with Pro!
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    width: "100%",
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    borderBottomWidth: 1,
    minHeight: 48
  },
  logo: {
    width: 32,
    height: 32,
    marginRight: 12
  },
  text: {
    fontWeight: "bold",
    fontSize: 16,
    flex: 1
  }
});
