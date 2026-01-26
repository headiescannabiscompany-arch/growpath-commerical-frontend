import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import { getTokenBalance } from "../api/tokens";
import FeatureGate from "../components/FeatureGate";
import { useAuth } from "@/auth/AuthContext";

export default function TokenInfoScreen({ navigation }) {
  const { isPro } = useAuth();
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const res = await getTokenBalance();
      setBalance(res?.data ?? res);
      setLoading(false);
    } catch (err) {
      console.error("Failed to load token balance:", err);
      setLoading(false);
    }
  }

  const FeatureCost = ({ feature, cost }) => (
    <View style={styles.featureRow}>
      <Text style={styles.featureText}>{feature}</Text>
      <Text style={styles.costText}>
        {cost} token{cost > 1 ? "s" : ""}
      </Text>
    </View>
  );

  return (
    <ScreenContainer>
      <ScrollView style={styles.container}>
        <Text style={styles.title}>🤖 AI Tokens</Text>

        {/* Current Balance */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Current Balance</Text>
          <Text style={styles.balanceValue}>
            {balance?.aiTokens || 0} / {balance?.maxTokens || 10}
          </Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${((balance?.aiTokens || 0) / (balance?.maxTokens || 10)) * 100}%`
                }
              ]}
            />
          </View>
        </View>

        {/* Token System Explanation */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How AI Tokens Work</Text>
          <Text style={styles.bodyText}>
            AI tokens power all AI-assisted features in GrowPath. Each AI feature consumes
            tokens when used.
          </Text>
        </View>

        {/* Token Costs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Feature Costs</Text>
          <FeatureCost feature="AI Diagnose (text only)" cost={1} />
          <FeatureCost feature="AI Diagnose (with photos)" cost={2} />
          <FeatureCost feature="Training Advisor" cost={1} />
          <FeatureCost feature="Environment Assistant" cost={1} />
          <FeatureCost feature="Feeding Schedule AI" cost={1} />
        </View>

        {/* Token Refresh */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Token Refresh</Text>
          <FeatureGate
            plan="pro"
            navigation={navigation}
            fallback={
              <>
                <Text style={styles.bodyText}>
                  On the <Text style={styles.boldText}>Free plan</Text>, you get:
                </Text>
                <Text style={styles.bulletText}>• 10 tokens weekly</Text>
                <Text style={styles.bulletText}>• Tokens refresh every 7 days</Text>
                {balance?.nextRefresh && (
                  <Text style={styles.refreshText}>
                    Next refresh: {new Date(balance.nextRefresh).toLocaleDateString()}
                  </Text>
                )}
                <TouchableOpacity
                  style={styles.upgradeButton}
                  onPress={() => navigation.navigate("Subscription")}
                >
                  <Text style={styles.upgradeButtonText}>
                    ✨ Upgrade to Pro for 100 Daily Tokens
                  </Text>
                </TouchableOpacity>
              </>
            }
          >
            <Text style={styles.bodyText}>
              ✨ As a <Text style={styles.boldText}>Pro member</Text>, you get:
            </Text>
            <Text style={styles.bulletText}>• 100 tokens daily</Text>
            <Text style={styles.bulletText}>• Auto-refresh every 24 hours</Text>
            <Text style={styles.bulletText}>• Priority AI processing</Text>
            {balance?.nextRefresh && (
              <Text style={styles.refreshText}>
                Next refresh: {new Date(balance.nextRefresh).toLocaleDateString()}
              </Text>
            )}
          </FeatureGate>
        </View>

        {/* Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💡 Pro Tips</Text>
          <Text style={styles.bulletText}>• Use text-based diagnose to save tokens</Text>
          <Text style={styles.bulletText}>• Batch similar questions together</Text>
          <Text style={styles.bulletText}>
            • Take detailed photos to get better AI results
          </Text>
          <Text style={styles.bulletText}>
            • Include environment data for more accurate advice
          </Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = {
  container: {
    flex: 1,
    padding: 20
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 20,
    textAlign: "center",
    color: "#2c3e50"
  },
  balanceCard: {
    backgroundColor: "#f8f9fa",
    padding: 24,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: "#27ae60",
    alignItems: "center"
  },
  balanceLabel: {
    fontSize: 16,
    color: "#7f8c8d",
    marginBottom: 8
  },
  balanceValue: {
    fontSize: 48,
    fontWeight: "700",
    color: "#27ae60",
    marginBottom: 16
  },
  progressBar: {
    width: "100%",
    height: 12,
    backgroundColor: "#e0e0e0",
    borderRadius: 6,
    overflow: "hidden"
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#27ae60",
    borderRadius: 6
  },
  section: {
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
    color: "#2c3e50"
  },
  bodyText: {
    fontSize: 15,
    lineHeight: 24,
    color: "#555",
    marginBottom: 12
  },
  boldText: {
    fontWeight: "700",
    color: "#27ae60"
  },
  bulletText: {
    fontSize: 15,
    lineHeight: 24,
    color: "#555",
    marginLeft: 12,
    marginBottom: 6
  },
  refreshText: {
    fontSize: 14,
    color: "#7f8c8d",
    marginTop: 12,
    fontStyle: "italic"
  },
  featureRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0"
  },
  featureText: {
    fontSize: 15,
    color: "#2c3e50"
  },
  costText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#27ae60"
  },
  upgradeButton: {
    backgroundColor: "#27ae60",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 16,
    alignItems: "center"
  },
  upgradeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700"
  }
};
