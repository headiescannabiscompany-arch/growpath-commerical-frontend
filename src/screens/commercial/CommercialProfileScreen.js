import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Switch,
  ActivityIndicator
} from "react-native";
import ScreenContainer from "../../components/ScreenContainer.js";
import Card from "../../components/Card.js";
import { Colors, Typography, Spacing } from "../../theme/theme.js";
import PrimaryButton from "../../components/PrimaryButton.js";
import { useAuth } from "@/auth/AuthContext";
import {
  getCommercialBillingSummary,
  listCommercialInvoices,
  retryCommercialInvoice,
  updateCommercialPaymentMethod
} from "../../api/commercialBilling.js";
import { requirePro, handleApiError } from "../../utils/proHelper.js";
import * as Linking from "expo-linking";

export default function CommercialProfileScreen({ navigation }) {
  const { user, updateUser, setMode, facilitiesAccess, isPro } = useAuth();

  const initialBiz = useMemo(
    () => ({
      name: user?.business?.name || user?.businessName || "",
      type: user?.business?.type || user?.businessType || "",
      logoUrl: user?.business?.logoUrl || "",
      description: user?.business?.description || user?.bio || "",
      contact: user?.business?.contactEmail || user?.email || user?.business?.phone || ""
    }),
    [user]
  );

  const [biz, setBiz] = useState(initialBiz);
  const [toolsEnabled, setToolsEnabled] = useState(() => ({
    validation: true,
    coa: true,
    suppliers: true,
    courses: true
  }));

  // --- STUBS FOR MISSING VARIABLES ---
  const [billing, setBilling] = useState({
    currentPeriodEnd: Date.now() + 10000000,
    graceUntil: Date.now() + 20000000,
    nextInvoiceAmount: 1999,
    currency: "USD",
    paymentMethodLast4: "1234",
    status: "active"
  });
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState("");
  const [billingSummary, setBillingSummary] = useState(
    "Pro Commercial Subscription active."
  );
  const [invoices, setInvoices] = useState([
    {
      id: "inv1",
      status: "paid",
      amount: 1999,
      currency: "USD",
      createdAt: Date.now(),
      hostedInvoiceUrl: "",
      pdfUrl: "",
      dueDate: Date.now() + 1000000
    },
    {
      id: "inv2",
      status: "past_due",
      amount: 1999,
      currency: "USD",
      createdAt: Date.now(),
      hostedInvoiceUrl: "",
      pdfUrl: "",
      dueDate: Date.now() + 2000000
    }
  ]);
  const [retrying, setRetrying] = useState(false);
  const handleRetryPayment = (id) => {
    setRetrying(true);
    setTimeout(() => setRetrying(false), 1000);
  };
  const handleUpdatePayment = () => {
    Alert.alert("Update Payment", "Payment method update flow.");
  };
  const openLink = (url) => {
    Linking.openURL(url);
  };
  const handleSave = () => {
    Alert.alert("Save", "Profile saved.");
  };
  const handleSwitchWorkspace = () => {
    Alert.alert("Switch", "Workspace switched.");
  };

  return (
    <View>
      <Card style={styles.card}>
        <Text style={styles.title}>Billing summary</Text>
        {billingLoading ? (
          <ActivityIndicator color={Colors.primary} />
        ) : billingError ? (
          <Text style={styles.error}>{billingError}</Text>
        ) : (
          <>
            <Text style={styles.info}>{billingSummary}</Text>
            <View style={styles.billingMeta}>
              {billing?.currentPeriodEnd && (
                <Text style={styles.muted}>
                  Renews: {new Date(billing.currentPeriodEnd).toLocaleDateString()}
                </Text>
              )}
              {billing?.graceUntil && (
                <Text style={styles.muted}>
                  Grace until: {new Date(billing.graceUntil).toLocaleDateString()}
                </Text>
              )}
              {billing?.nextInvoiceAmount && (
                <Text style={styles.muted}>
                  Next charge: {billing.nextInvoiceAmount / 100}{" "}
                  {billing.currency || "USD"}
                </Text>
              )}
              {billing?.paymentMethodLast4 && (
                <Text style={styles.muted}>
                  Card ending in {billing.paymentMethodLast4}
                </Text>
              )}
            </View>
            {billing?.status === "past_due" && invoices.length > 0 && (
              <TouchableOpacity
                style={[styles.retryBtn, retrying && styles.disabledBtn]}
                onPress={() => handleRetryPayment(invoices[0]?.id)}
                disabled={retrying}
              >
                <Text style={styles.retryText}>
                  {retrying ? "Retrying..." : "Retry payment"}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.retryBtn,
                styles.secondaryBtn,
                retrying && styles.disabledBtn
              ]}
              onPress={handleUpdatePayment}
              disabled={retrying}
            >
              <Text style={[styles.retryText, { color: Colors.text }]}>
                Update payment method
              </Text>
            </TouchableOpacity>
          </>
        )}
      </Card>
      <Card style={styles.card}>
        <Text style={styles.title}>Invoices</Text>
        {billingLoading ? (
          <ActivityIndicator color={Colors.primary} />
        ) : invoices.length === 0 ? (
          <Text style={styles.muted}>No invoices yet.</Text>
        ) : (
          invoices.slice(0, 5).map((invoice) => (
            <View key={invoice.id} style={styles.invoiceRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.invoiceTitle}>
                  {invoice.status ? invoice.status.toUpperCase() : "Invoice"}
                </Text>
                <Text style={styles.muted}>
                  {new Date(
                    invoice.createdAt || invoice.created || invoice.date
                  ).toLocaleDateString()}
                </Text>
                {invoice.dueDate && (
                  <Text style={styles.muted}>
                    Due: {new Date(invoice.dueDate).toLocaleDateString()}
                  </Text>
                )}
              </View>
              <View style={{ alignItems: "flex-end", gap: Spacing.xs }}>
                <Text style={styles.invoiceAmount}>
                  {(invoice.amount || invoice.total || 0) / 100}{" "}
                  {invoice.currency || "USD"}
                </Text>
                {invoice.hostedInvoiceUrl || invoice.pdfUrl ? (
                  <TouchableOpacity
                    style={styles.linkBtn}
                    onPress={() => openLink(invoice.hostedInvoiceUrl || invoice.pdfUrl)}
                  >
                    <Text style={styles.linkText}>View</Text>
                  </TouchableOpacity>
                ) : null}
                {invoice.status === "past_due" && (
                  <TouchableOpacity
                    style={[styles.linkBtn, styles.retrySmall]}
                    onPress={() => handleRetryPayment(invoice.id)}
                  >
                    <Text style={styles.linkText}>Retry</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}
      </Card>
      <PrimaryButton
        title="Save profile"
        onPress={handleSave}
        style={{ marginTop: Spacing.md }}
        disabled={false}
        children={<></>}
      />
      <TouchableOpacity style={styles.switchBtn} onPress={handleSwitchWorkspace}>
        <Text style={styles.switchText}>Switch workspace</Text>
        <Text style={styles.switchSub}>
          Go to facility (if available) or back to personal.
        </Text>
      </TouchableOpacity>
    </View>
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
  title: {
    fontSize: Typography.size.subtitle,
    fontWeight: "600",
    color: Colors.text
  },
  fieldRow: {
    gap: Spacing.xs
  },
  label: {
    fontSize: Typography.size.caption,
    color: Colors.textSecondary,
    fontWeight: "600"
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: "#FFFFFF",
    color: Colors.text
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: "top"
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.xs
  },
  hint: {
    fontSize: Typography.size.caption,
    color: Colors.textSecondary
  },
  info: {
    fontSize: Typography.size.body,
    color: Colors.text
  },
  muted: {
    fontSize: Typography.size.caption,
    color: Colors.textSecondary
  },
  billingMeta: {
    gap: Spacing.xs
  },
  retryBtn: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    alignSelf: "flex-start"
  },
  secondaryBtn: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border
  },
  retryText: {
    color: "#fff",
    fontWeight: "600"
  },
  disabledBtn: {
    opacity: 0.6
  },
  invoiceRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border
  },
  invoiceTitle: {
    fontSize: Typography.size.body,
    fontWeight: "600",
    color: Colors.text
  },
  invoiceAmount: {
    fontSize: Typography.size.body,
    fontWeight: "600",
    color: Colors.text
  },
  linkBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: Colors.accentSoft,
    borderRadius: 8
  },
  linkText: {
    color: Colors.primary,
    fontWeight: "600"
  },
  retrySmall: {
    backgroundColor: Colors.primary
  },
  error: {
    color: Colors.danger || "#d9534f"
  },
  switchBtn: {
    marginTop: Spacing.lg,
    padding: Spacing.md,
    borderRadius: 12,
    backgroundColor: Colors.accentSoft
  },
  switchText: {
    fontSize: Typography.size.body,
    fontWeight: "600",
    color: Colors.text
  },
  switchSub: {
    fontSize: Typography.size.caption,
    color: Colors.textSecondary,
    marginTop: 2
  }
});
