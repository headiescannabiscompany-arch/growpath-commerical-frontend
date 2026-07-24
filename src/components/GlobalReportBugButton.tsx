import React from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { usePathname } from "expo-router";

import ReportBugButton from "@/components/ReportBugButton";

export function getReportBugButtonLabel(width: number) {
  return width < 600 ? "Bug" : "Report Bug";
}

export default function GlobalReportBugButton() {
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  if (pathname === "/support") return null;
  return (
    <View pointerEvents="box-none" style={styles.layer}>
      <View style={styles.button}>
        <ReportBugButton label={getReportBugButtonLabel(width)} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10000,
    elevation: 10000
  },
  button: {
    position: "absolute",
    right: 12,
    bottom: 76
  }
});
