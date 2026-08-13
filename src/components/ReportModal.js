import React, { useMemo, useState } from "react";
import { Modal, View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { submitReport } from "../api/reports";
import { useAppTheme } from "../theme/appTheme";
import { radius } from "../theme/theme";
import ReportBugButton from "./ReportBugButton";

const ReportModal = ({
  visible,
  onClose,
  contentType,
  contentId,
  contentTitle,
  targetUrl,
  parentPostId = null,
  token = null,
  onSuccess
}) => {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createReportModalStyles(palette), [palette]);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      await submitReport({
        contentType,
        contentId,
        contentTitle,
        targetUrl,
        parentPostId,
        reason,
        token
      });
      setReason("");
      onSuccess && onSuccess();
      onClose();
    } catch (e) {
      setError(
        e?.data?.error ||
          e?.response?.data?.error ||
          e?.message ||
          "Failed to submit report"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={() => {
        if (!loading) onClose();
      }}
    >
      <View style={styles.overlay}>
        <View
          testID="report-content-modal"
          accessibilityLabel="Report content dialog"
          accessibilityViewIsModal
          style={styles.container}
        >
          <Text accessibilityRole="header" aria-level={2} style={styles.title}>
            Report Content
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Reason for report..."
            placeholderTextColor={palette.textMuted}
            value={reason}
            onChangeText={setReason}
            editable={!loading}
            multiline
            accessibilityLabel="Report reason"
          />
          {error ? (
            <Text
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
              style={styles.error}
            >
              {error}
            </Text>
          ) : null}
          <View style={styles.buttonRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              accessibilityState={{ disabled: loading }}
              style={[
                styles.actionButton,
                styles.cancelButton,
                loading && styles.disabled
              ]}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Submit"
              accessibilityState={{ disabled: loading || !reason.trim() }}
              style={[
                styles.actionButton,
                styles.submitButton,
                (loading || !reason.trim()) && styles.disabled
              ]}
              onPress={handleSubmit}
              disabled={loading || !reason.trim()}
            >
              <Text style={styles.submitButtonText}>Submit</Text>
            </Pressable>
          </View>
          <View style={styles.reportBug}>
            <ReportBugButton location="Report content popup" />
          </View>
        </View>
      </View>
    </Modal>
  );
};

export const createReportModalStyles = (palette) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      alignItems: "center"
    },
    container: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      padding: 20,
      width: "85%",
      maxWidth: 400
    },
    title: {
      color: palette.text,
      fontSize: 18,
      fontWeight: "bold",
      marginBottom: 10
    },
    input: {
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: radius.card,
      color: palette.text,
      padding: 10,
      minHeight: 60,
      marginBottom: 10,
      textAlignVertical: "top"
    },
    error: {
      color: palette.danger,
      marginBottom: 10
    },
    buttonRow: {
      flexDirection: "row",
      gap: 10,
      justifyContent: "space-between"
    },
    actionButton: {
      alignItems: "center",
      borderRadius: radius.card,
      borderWidth: 1,
      flex: 1,
      justifyContent: "center",
      minHeight: 44,
      paddingHorizontal: 12,
      paddingVertical: 10
    },
    cancelButton: {
      backgroundColor: palette.surface,
      borderColor: palette.border
    },
    cancelButtonText: { color: palette.text, fontWeight: "700" },
    submitButton: {
      backgroundColor: palette.accent,
      borderColor: palette.accent
    },
    submitButtonText: { color: palette.accentText, fontWeight: "700" },
    disabled: { opacity: 0.5 },
    reportBug: { marginTop: 14, alignItems: "flex-end" }
  });

export default ReportModal;
