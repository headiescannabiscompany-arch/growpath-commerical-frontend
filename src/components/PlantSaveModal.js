import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { colors, spacing, radius } from "../theme/theme";

export default function PlantSaveModal({ visible, plantName = "Plant", onConfirm }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => setTimeout(onConfirm, 0)}
    >
      <View style={styles.overlay}>
        <View style={styles.box}>
          <Text style={styles.title}>Changes saved</Text>
          <Text style={styles.body}>
            {plantName} has been updated. Take a moment to note what changed—growth is a
            reflection of your attention, not perfection.
          </Text>
          <TouchableOpacity style={styles.button} onPress={onConfirm}>
            <Text style={styles.buttonText}>Back to grow</Text>
          </TouchableOpacity>
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
    backgroundColor: colors.surface || "#fff",
    borderRadius: radius.card,
    padding: spacing(5),
    maxWidth: 360,
    alignItems: "center"
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: spacing(2),
    color: colors.text
  },
  body: {
    fontSize: 15,
    color: colors.textSoft,
    textAlign: "center",
    marginBottom: spacing(4)
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(6)
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16
  }
});
