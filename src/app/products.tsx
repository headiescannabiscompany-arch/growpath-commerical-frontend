import { Link, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import { discoverPublicProductsAndTrials } from "@/api/storefront";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import { purchaseIntentConceptById } from "@/config/commerceConceptTrials";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";
import { resolveImageUri } from "@/utils/photoUploads";

const SEARCH_LIMIT = 50;

// Use the separate public lists: the mixed Discover rail deliberately reserves trial slots.
export function publicCatalogRows(payload: any): any[] {
  const data = payload?.data || payload;
  const lists =
    Array.isArray(data?.products) || Array.isArray(data?.trials)
      ? [...(data.products || []), ...(data.trials || [])]
      : Array.isArray(data?.items)
        ? data.items
        : [];
  const seen = new Set<string>();
  return lists.filter((row: any) => {
    const key = `${row.discoveryType || "product"}:${row.id || row._id || ""}`;
    if ((!row.id && !row._id) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function ProductCatalog() {
  const params = useLocalSearchParams<{ q?: string }>();
  const initialQuery = typeof params.q === "string" ? params.q : "";
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [query, setQuery] = useState(initialQuery);
  const [search, setSearch] = useState(initialQuery);
  const [retry, setRetry] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    setQuery(initialQuery);
    setSearch(initialQuery);
  }, [initialQuery]);
  useEffect(() => {
    let current = true;
    setLoading(true);
    setError("");
    discoverPublicProductsAndTrials({
      q: search.trim() || undefined,
      limit: SEARCH_LIMIT
    })
      .then((result) => {
        if (current) setItems(publicCatalogRows(result));
      })
      .catch(() => {
        if (current) {
          setItems([]);
          setError("Products could not load. Please try again.");
        }
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [search, retry]);
  const submit = () => {
    setSearch(query.trim());
    setRetry((value) => value + 1);
  };
  return (
    <AppPage
      routeKey="products"
      railOverride={null}
      backFallbackHref="/discover"
      header={
        <View>
          <Text accessibilityRole="header" aria-level={1} style={styles.title}>
            Products, Offers & Trials
          </Text>
          <Text style={styles.muted}>
            Browse published products and explore their stores. Interest checks and
            concept trials are not purchases.
          </Text>
        </View>
      }
    >
      <AppCard>
        <TextInput
          accessibilityLabel="Search products"
          placeholder="Search products or store names"
          placeholderTextColor={palette.textMuted}
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={submit}
          returnKeyType="search"
        />
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" onPress={submit} style={styles.button}>
            <Text style={styles.link}>Search products</Text>
          </Pressable>
          {query || search ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setQuery("");
                setSearch("");
              }}
              style={styles.button}
            >
              <Text style={styles.link}>Clear search</Text>
            </Pressable>
          ) : null}
          <Link href="/store" asChild>
            <Pressable accessibilityRole="link" style={styles.button}>
              <Text style={styles.link}>Find stores</Text>
            </Pressable>
          </Link>
        </View>
        <Text style={styles.muted}>
          Search shows up to 50 products and 50 trials. Refine your search or open a store
          for its complete collection.
        </Text>
      </AppCard>
      {loading ? (
        <ActivityIndicator accessibilityLabel="Loading products" color={palette.accent} />
      ) : error ? (
        <AppCard>
          <Text accessibilityRole="alert" style={{ color: palette.danger }}>
            {error}
          </Text>
          <Pressable accessibilityRole="button" onPress={submit} style={styles.button}>
            <Text style={styles.link}>Retry products</Text>
          </Pressable>
        </AppCard>
      ) : (
        <>
          <Text accessibilityLiveRegion="polite" style={styles.muted}>
            {items.length} {items.length === 1 ? "result" : "results"}
            {search ? ` for “${search}”` : ""}
          </Text>
          {!items.length ? (
            <Text style={styles.muted}>
              No matching products or trials. Try another product or store name.
            </Text>
          ) : null}
          <View style={styles.grid}>
            {items.map((item) => {
              const id = String(item.id || item._id);
              const slug = String(item.storefrontSlug || item.slug || "");
              const trial = item.discoveryType === "trial";
              const title = String(
                item.name ||
                  item.title ||
                  item.conceptTitle ||
                  (trial ? "Concept trial" : "Product")
              );
              const href = trial
                ? `/store/${encodeURIComponent(slug)}#product-trials`
                : `/store/${encodeURIComponent(slug)}/products/${encodeURIComponent(id)}`;
              const uri = resolveImageUri(
                item.imageUrl || item.coverImageUrl || item.thumbnailUrl || ""
              );
              const artwork = trial
                ? purchaseIntentConceptById(item.conceptAssetId)?.image
                : null;
              return (
                <View key={`${trial ? "trial" : "product"}:${id}`} style={styles.card}>
                  <Link href={href as any} asChild>
                    <Pressable
                      accessibilityRole="link"
                      accessibilityLabel={`Open ${title}`}
                      style={styles.open}
                    >
                      {artwork || uri ? (
                        <Image
                          source={artwork || { uri }}
                          style={styles.image}
                          resizeMode="contain"
                          accessibilityLabel={`${title} image`}
                        />
                      ) : null}
                      <Text accessibilityRole="header" aria-level={2} style={styles.name}>
                        {title}
                      </Text>
                      <Text style={styles.muted}>
                        {trial
                          ? "Concept trial · Not for sale"
                          : item.purchaseIntentEnabled
                            ? "Interest only · Not for sale"
                            : "View product details"}
                      </Text>
                      {item.shortDescription ? (
                        <Text numberOfLines={3} style={styles.muted}>
                          {item.shortDescription}
                        </Text>
                      ) : null}
                    </Pressable>
                  </Link>
                  {slug ? (
                    <Link href={`/store/${encodeURIComponent(slug)}` as any} asChild>
                      <Pressable accessibilityRole="link" style={styles.store}>
                        <Text style={styles.link}>
                          All products from {item.storefrontName || "this store"}
                        </Text>
                      </Pressable>
                    </Link>
                  ) : null}
                </View>
              );
            })}
          </View>
        </>
      )}
    </AppPage>
  );
}

const createStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    title: { fontSize: 26, fontWeight: "800", color: palette.heroText },
    muted: { color: palette.textMuted, lineHeight: 20, marginVertical: 6 },
    input: {
      color: palette.text,
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderWidth: 1,
      borderRadius: radius.card,
      padding: 12,
      minHeight: 44
    },
    actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
    button: {
      borderColor: palette.border,
      borderWidth: 1,
      borderRadius: radius.card,
      paddingHorizontal: 14,
      minHeight: 44,
      justifyContent: "center"
    },
    link: { color: palette.link, fontWeight: "700" },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    card: {
      flexGrow: 1,
      flexBasis: 260,
      maxWidth: "100%",
      borderColor: palette.border,
      borderWidth: 1,
      borderRadius: radius.card,
      backgroundColor: palette.surface,
      overflow: "hidden"
    },
    open: { padding: 14 },
    name: { color: palette.text, fontWeight: "800", fontSize: 16 },
    image: { height: 180, width: "100%", marginBottom: 10 },
    store: {
      borderTopWidth: 1,
      borderTopColor: palette.border,
      padding: 14,
      minHeight: 44
    }
  });
