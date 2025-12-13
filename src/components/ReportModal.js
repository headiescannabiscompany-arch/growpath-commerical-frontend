import React, { useState } from "react";
import { Modal, View, Text, TextInput, Button, StyleSheet } from "react-native";
import { submitReport } from "../api/reports";

const ReportModal = ({ visible, onClose, contentType, contentId, token, onSuccess }) => {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      await submitReport({ contentType, contentId, reason, token });
      setReason("");
      onSuccess && onSuccess();
      onClose();
    } catch (e) {
      setError(e?.response?.data?.error || "Failed to submit report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Report Content</Text>
          <TextInput
            style={styles.input}
            placeholder="Reason for report..."
            value={reason}
            onChangeText={setReason}
            editable={!loading}
            multiline
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.buttonRow}>
            <Button title="Cancel" onPress={onClose} disabled={loading} />
            <Button
              title="Submit"
              onPress={handleSubmit}
              disabled={loading || !reason.trim()}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center"
  },
  container: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    width: "85%",
    maxWidth: 400
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
    minHeight: 60,
    marginBottom: 10,
    textAlignVertical: "top"
  },
  error: {
    color: "red",
    marginBottom: 10
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between"
  }
});

export default ReportModal;
