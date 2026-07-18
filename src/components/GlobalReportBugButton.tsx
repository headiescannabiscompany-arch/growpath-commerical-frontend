import React from "react";
import { StyleSheet, View } from "react-native";
import { usePathname } from "expo-router";

import ReportBugButton from "@/components/ReportBugButton";

export default function GlobalReportBugButton() {
  const pathname = usePathname();
  if (pathname === "/support") return null;
  return (
    <View pointerEvents="box-none" style={styles.layer}>
      <View style={styles.button}>
        <ReportBugButton label="Report Bug" />
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
