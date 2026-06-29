import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useLocalSearchParams } from "expo-router";

import { checkoutProduct } from "@/api/products";
import { fetchPublicStorefront } from "@/api/storefront";
import AppPage from "@/components/layout/AppPage";

function money(product: any) {
  const cents = Number(product?.priceCents || 0);
  if (cents > 0) return `$${(cents / 100).toFixed(2)}`;
  const price = Number(product?.price || 0);
  return price > 0 ? `$${price.toFixed(2)}` : "Free";
}

function productId(product: any) {
  return String(product?.id || product?._id || product?.productId || "");
}

async function openCheckoutUrl(url: string) {
  if (Platform.OS === "web" && typeof window !== "undefined" && window.location) {
    window.location.href = url;
    return;
  }
  await Linking.openURL(url);
}

export default function PublicStorefrontRoute() {
  const params = useLocalSearchParams<{ slug?: string }>();
  const slug = useMemo(() => String(params.slug || "").trim(), [params.slug]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [storefront, setStorefront] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  const load = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError("");
    try {
      const res: any = await fetchPublicStorefront(slug);
      setStorefront(res?.storefront || res?.data?.storefront || null);
      setProducts(res?.products || res?.data?.products || []);
    } catch (err: any) {
      setError(err?.message || "Unable to load storefront.");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  async function buy(product: any) {
    const id = productId(product);
    if (!id) return;
    setBusyId(id);
    setFeedback("");
    try {
      const checkout: any = await checkoutProduct(id);
      const url = checkout?.url || checkout?.checkoutUrl || checkout?.data?.url;
      if (!url) {
        setFeedback("Checkout unavailable. The backend did not return a checkout URL.");
        Alert.alert("Checkout unavailable", "The backend did not return a checkout URL.");
        return;
      }
      await openCheckoutUrl(url);
      setFeedback("Checkout started.");
    } catch (err: any) {
      setFeedback(err?.message || "Unable to start checkout.");
      Alert.alert("Checkout failed", err?.message || "Unable to start checkout.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <AppPage
      routeKey="store-public"
      header={
        <View>
          <Text style={styles.title}>{storefront?.name || "Storefront"}</Text>
          <Text style={styles.subtitle}>
            {storefront?.description || "Published products"}
          </Text>
        </View>
      }
    >
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.meta}>Loading storefront...</Text>
        </View>
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : products.length ? (
        <>
          {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
          {products.map((product) => {
            const id = productId(product);
            return (
              <View key={id || product?.name} style={styles.product}>
                <View style={styles.productBody}>
                  <Text style={styles.productName}>{product?.name || "Product"}</Text>
                  {product?.description ? (
                    <Text style={styles.meta}>{product.description}</Text>
                  ) : null}
                  <Text style={styles.price}>{money(product)}</Text>
                </View>
                <Pressable
                  accessibilityLabel={`Buy ${product?.name || "product"}`}
                  style={[styles.button, busyId === id && styles.disabled]}
                  disabled={busyId === id}
                  onPress={() => buy(product)}
                >
                  <Text style={styles.buttonText}>
                    {busyId === id ? "Opening..." : "Buy"}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </>
      ) : (
        <Text style={styles.meta}>No published products.</Text>
      )}
    </AppPage>
  );
}

const styles = StyleSheet.create({
  title: { color: "#111827", fontSize: 24, fontWeight: "800" },
  subtitle: { color: "#64748B", marginTop: 4 },
  center: { alignItems: "center", gap: 8, justifyContent: "center", minHeight: 180 },
  error: { color: "#B91C1C", fontWeight: "700" },
  feedback: {
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    color: "#334155",
    marginBottom: 10,
    padding: 8
  },
  meta: { color: "#64748B" },
  product: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    marginBottom: 10,
    padding: 12
  },
  productBody: { flex: 1, gap: 4 },
  productName: { color: "#111827", fontSize: 16, fontWeight: "800" },
  price: { color: "#166534", fontWeight: "800" },
  button: {
    backgroundColor: "#166534",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  disabled: { opacity: 0.6 },
  buttonText: { color: "#FFFFFF", fontWeight: "800" }
});
