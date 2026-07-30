import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { radius, spacing } from "../theme/theme";
import { useAppTheme } from "@/theme/appTheme";
import ReportBugButton from "./ReportBugButton";

export default function PlantSaveModal({ visible, plantName = "Plant", onConfirm }) {
  const { palette } = useAppTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => setTimeout(onConfirm, 0)}
    >
      <View style={[styles.overlay, { backgroundColor: `${palette.page}CC` }]}>
        <View
          style={[
            styles.box,
            { backgroundColor: palette.surface, borderColor: palette.border }
          ]}
        >
          <Text style={[styles.title, { color: palette.text }]}>Changes saved</Text>
          <Text style={[styles.body, { color: palette.textMuted }]}>
            {plantName} has been updated. Take a moment to note what changed—growth is a
            reflection of your attention, not perfection.
          </Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: palette.accent }]}
            onPress={onConfirm}
          >
            <Text style={[styles.buttonText, { color: palette.accentText }]}>
              Back to grow
            </Text>
          </TouchableOpacity>
          <ReportBugButton location="Plant saved popup" />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing(4)
  },
  box: {
    backgroundColor: "#fff",
    borderRadius: radius.card,
    padding: spacing(5),
    maxWidth: 360,
    alignItems: "center",
    borderWidth: 1
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: spacing(2)
  },
  body: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: spacing(4)
  },
  button: {
    borderRadius: radius.pill,
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(6)
  },
  buttonText: {
    fontWeight: "600",
    fontSize: 16
  }
});
