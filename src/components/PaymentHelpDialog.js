import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking
} from "react-native";

export default function PaymentHelpDialog({ onClose }) {
  const adminEmail = "admin@growpath.ai"; // Update with your actual email

  const openEmail = () => {
    Linking.openURL(`mailto:${adminEmail}?subject=Payment Issue`);
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.dialog}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>💳 Payment Issues Help</Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Common Problems</Text>

            <View style={styles.problem}>
              <Text style={styles.problemTitle}>❌ Payment Declined</Text>
              <Text style={styles.problemText}>
                • Check if your card has sufficient funds{"\n"}• Verify your billing
                address is correct{"\n"}• Try a different payment method{"\n"}• Contact
                your bank to authorize the transaction
              </Text>
            </View>

            <View style={styles.problem}>
              <Text style={styles.problemTitle}>🔄 Subscription Not Active</Text>
              <Text style={styles.problemText}>
                • Wait up to 5 minutes for processing{"\n"}• Force close and reopen the
                app{"\n"}• Check if payment went through in your bank statement{"\n"}•
                Contact support if issue persists
              </Text>
            </View>

            <View style={styles.problem}>
              <Text style={styles.problemTitle}>❌ Can't Cancel Subscription</Text>
              <Text style={styles.problemText}>
                • Go to Profile → Subscription → Cancel{"\n"}• If using Apple/Google:
                Cancel through App Store/Play Store{"\n"}• Email support for immediate
                cancellation
              </Text>
            </View>

            <View style={styles.problem}>
              <Text style={styles.problemTitle}>💰 Refund Request</Text>
              <Text style={styles.problemText}>
                Refunds are processed within 7-14 business days.{"\n\n"}
                Email us with your account email and reason for refund request.
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              What to Include When Contacting Support
            </Text>
            <Text style={styles.bulletText}>• Your account email address</Text>
            <Text style={styles.bulletText}>• Description of the problem</Text>
            <Text style={styles.bulletText}>• Screenshot of error (if applicable)</Text>
            <Text style={styles.bulletText}>• Transaction ID or receipt</Text>
          </View>

          <TouchableOpacity style={styles.emailButton} onPress={openEmail}>
            <Text style={styles.emailButtonText}>📧 Email Support</Text>
            <Text style={styles.emailAddress}>{adminEmail}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20
  },
  dialog: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 24,
    maxHeight: "90%",
    width: "100%",
    maxWidth: 500
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 20,
    textAlign: "center"
  },
  section: {
    marginBottom: 20
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12
  },
  problem: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: "#F8F9FA",
    borderRadius: 8
  },
  problemTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8
  },
  problemText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20
  },
  bulletText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
    marginLeft: 4
  },
  emailButton: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12
  },
  emailButtonText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "600"
  },
  emailAddress: {
    color: "#FFF",
    fontSize: 14,
    marginTop: 4,
    opacity: 0.9
  },
  closeButton: {
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#DDD",
    alignItems: "center"
  },
  closeButtonText: {
    fontSize: 16,
    color: "#666"
  }
});
