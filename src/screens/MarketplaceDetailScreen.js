import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { getMarketplaceContent, purchaseContent } from "../api/marketplace";
import ScreenContainer from "../components/ScreenContainer";
import { MarketplaceDetailContent } from "./MarketplaceScreen";

function itemId(item, fallback) {
  return String(item?._id || item?.id || item?.contentId || fallback || "");
}

function unwrapPurchase(response) {
  return response?.purchase || response?.data?.purchase || response?.data || response;
}

export default function MarketplaceDetailScreen({ route, navigation }) {
  const initialContent = route?.params?.content || null;
  const id = useMemo(
    () => itemId(initialContent, route?.params?.id || route?.params?.contentId),
    [initialContent, route?.params?.contentId, route?.params?.id]
  );
  const [item, setItem] = useState(initialContent);
  const [loading, setLoading] = useState(!initialContent && !!id);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setFeedback("");
    try {
      setItem(await getMarketplaceContent(id));
    } catch (error) {
      setFeedback(error?.message || "Unable to load storefront offer content.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handlePurchase() {
    if (!id) {
      setFeedback("This storefront offer is missing an id.");
      return;
    }
    setBusy(true);
    setFeedback("");
    try {
      const purchase = unwrapPurchase(await purchaseContent(id));
      if (purchase?.url) {
        await Linking.openURL(purchase.url);
        setFeedback("Checkout opened. Complete payment to unlock this item.");
      } else {
        setFeedback(purchase?.message || "Storefront offer added.");
      }
      await load();
    } catch (error) {
      setFeedback(error?.message || "Unable to purchase this storefront offer.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScreenContainer scroll>
      <View style={styles.actions}>
        {navigation?.goBack ? (
          <Pressable onPress={() => navigation.goBack()}>
            <Text style={styles.link}>Back to offers</Text>
          </Pressable>
        ) : null}
        <Pressable
          disabled={busy || loading}
          style={[styles.button, (busy || loading) && styles.buttonDisabled]}
          onPress={handlePurchase}
        >
          <Text style={styles.buttonText}>{busy ? "Purchasing..." : "Purchase"}</Text>
        </Pressable>
      </View>

      {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}

      {loading ? (
        <View style={styles.emptyState}>
          <ActivityIndicator />
          <Text style={styles.emptyText}>Loading storefront offer detail...</Text>
        </View>
      ) : item ? (
        <MarketplaceDetailContent item={item} />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Storefront offer not found.</Text>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  actions: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12
  },
  link: { color: "#166534", fontWeight: "800" },
  button: {
    backgroundColor: "#166534",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#FFFFFF", fontWeight: "800" },
  feedback: {
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    color: "#334155",
    marginBottom: 10,
    padding: 8
  },
  emptyState: { alignItems: "center", gap: 8, justifyContent: "center", minHeight: 200 },
  emptyText: { color: "#64748B", fontSize: 16, fontWeight: "700" }
});
