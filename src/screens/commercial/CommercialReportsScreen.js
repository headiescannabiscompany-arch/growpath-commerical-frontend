import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from "react-native";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as Linking from "expo-linking";
import ScreenContainer from "../../components/ScreenContainer.js";
import Card from "../../components/Card.js";
import { Colors, Typography, Spacing } from "../../theme/theme.js";
import {
  generateValidationReport,
  explainCOA,
  exportCourseSales
} from "../../api/reports.js";

const initialState = {
  validation: { loading: false, error: null, message: null },
  coa: { loading: false, error: null, message: null },
  sales: { loading: false, error: null, message: null }
};

const ReportItem = ({ title, description, cta, onPress, loading, error, message }) => (
  <Card style={styles.card}>
    <View style={styles.headerRow}>
      <Text style={styles.title}>{title}</Text>
      {loading ? <ActivityIndicator size="small" color={Colors.primary} /> : null}
    </View>
    <Text style={styles.subtitle}>{description}</Text>
    {error ? <Text style={styles.error}>{error}</Text> : null}
    {message ? <Text style={styles.success}>{message}</Text> : null}
    <TouchableOpacity
      style={[styles.button, loading && styles.buttonDisabled]}
      onPress={onPress}
      disabled={loading}
    >
      <Text style={styles.buttonText}>{loading ? "Working..." : cta}</Text>
    </TouchableOpacity>
  </Card>
);

function normalizeDownloadResponse(result) {
  if (!result) return {};
  if (typeof result === "string") {
    if (result.startsWith("http")) return { downloadUrl: result };
    return { fileBase64: result };
  }

  const downloadUrl =
    result.downloadUrl || result.url || result.fileUrl || result.link || result.location;
  const base64Candidates = [result.fileBase64, result.base64, result.data];
  const fileBase64 = base64Candidates.find((value) => typeof value === "string");
  const filename = result.filename || result.fileName || result.name;
  const mimeType = result.mimeType || result.contentType || result.type;

  return { downloadUrl, fileBase64, filename, mimeType };
}

async function openUrl(url) {
  const supported = await Linking.canOpenURL(url);
  if (!supported) throw new Error("Cannot open download link.");
  await Linking.openURL(url);
}

async function saveBase64ToFile(base64, filename) {
  const target = `${FileSystem.cacheDirectory || FileSystem.documentDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(target, base64, {
    encoding: FileSystem.EncodingType.Base64
  });
  return target;
}

async function shareFile(uri, mimeType) {
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType });
  } else {
    Alert.alert("File ready", `Saved to ${uri}`);
  }
  return uri;
}

async function handleDownloadResult(result, fallback) {
  const normalized = normalizeDownloadResponse(result);
  const filename = normalized.filename || fallback.filename;
  const mimeType = normalized.mimeType || fallback.mimeType;

  if (normalized.downloadUrl) {
    await openUrl(normalized.downloadUrl);
    return "Opened download link";
  }

  if (normalized.fileBase64) {
    const uri = await saveBase64ToFile(normalized.fileBase64, filename);
    await shareFile(uri, mimeType);
    return `${filename} ready to share`;
  }

  throw new Error("No file returned by server");
}

export default function CommercialReportsScreen() {
  const [state, setState] = useState(initialState);

  const runTask = async (key, requestFn, fallback) => {
    setState((prev) => ({
      ...prev,
      [key]: { ...prev[key], loading: true, error: null }
    }));
    try {
      const result = await requestFn();
      const message = await handleDownloadResult(result, fallback);
      setState((prev) => ({
        ...prev,
        [key]: { ...prev[key], loading: false, message, error: null }
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        [key]: {
          ...prev[key],
          loading: false,
          error: error?.message || "Unable to generate report"
        }
      }));
    }
  };

  const handleValidation = () =>
    runTask(
      "validation",
      () =>
        generateValidationReport({
          includeCOA: true,
          notes: "Customer-facing validation summary",
          format: "pdf"
        }),
      { filename: "validation-report.pdf", mimeType: "application/pdf" }
    );

  const handleCOA = () =>
    runTask(
      "coa",
      () =>
        explainCOA({
          audience: "buyers",
          highlightLimits: true,
          format: "pdf"
        }),
      { filename: "coa-explained.pdf", mimeType: "application/pdf" }
    );

  const handleSales = () =>
    runTask(
      "sales",
      () =>
        exportCourseSales({
          range: "last_30_days",
          format: "csv"
        }),
      { filename: "course-sales.csv", mimeType: "text/csv" }
    );

  return (
    <ScreenContainer scroll contentContainerStyle={styles.scrollContent}>
      <ReportItem
        title="Validation report"
        description="Generate a customer-facing PDF from supplier or lab data."
        cta="Generate PDF"
        loading={state.validation.loading}
        error={state.validation.error}
        message={state.validation.message}
        onPress={handleValidation}
      />
      <ReportItem
        title="COA explained"
        description="Translate potency and limits into plain language for buyers."
        cta="Explain COA"
        loading={state.coa.loading}
        error={state.coa.error}
        message={state.coa.message}
        onPress={handleCOA}
      />
      <ReportItem
        title="Course sales summary"
        description="Export enrollments and revenue totals (last 30 days)."
        cta="Export CSV"
        loading={state.sales.loading}
        error={state.sales.error}
        message={state.sales.message}
        onPress={handleSales}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: Spacing.xl
  },
  card: {
    marginBottom: Spacing.md,
    gap: Spacing.sm
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  title: {
    fontSize: Typography.size.subtitle,
    fontWeight: Typography.weight.semibold,
    color: Colors.text
  },
  subtitle: {
    fontSize: Typography.size.body,
    color: Colors.textSecondary
  },
  button: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    alignSelf: "flex-start"
  },
  buttonDisabled: {
    opacity: 0.6
  },
  buttonText: {
    color: "#fff",
    fontWeight: Typography.weight.semibold
  },
  error: {
    color: Colors.danger || "#d9534f"
  },
  success: {
    color: Colors.success || "#2e7d32"
  }
});
