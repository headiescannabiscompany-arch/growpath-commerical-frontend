import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";

export default function TaskCompleteModal({ visible, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalBox}>
          <Text style={styles.title}>Task Complete!</Text>
          <Text style={styles.body}>
            Growth is a process, not a checklist. Celebrate progress, reflect on what you
            learned, and adjust as you go.
          </Text>

          <Text style={styles.body}>
            There’s no perfect streak—just your unique path.
          </Text>
          <TouchableOpacity style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center"
  },
  modalBox: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 24,
    maxWidth: 320,
    alignItems: "center"
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 10
  },
  body: {
    fontSize: 15,
    color: "#444",
    textAlign: "center",
    marginBottom: 18
  },
  button: {
    backgroundColor: "#2ecc71",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 24
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16
  }
});
