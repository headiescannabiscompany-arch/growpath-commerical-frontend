import { Link, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { searchPublicStorefronts } from "@/api/storefront";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import { radius } from "@/theme/theme";

function asArray(payload: any) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.storefronts)) return payload.storefronts;
  if (Array.isArray(payload?.brands)) return payload.brands;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data?.storefronts)) return payload.data.storefronts;
  if (Array.isArray(payload?.data?.brands)) return payload.data.brands;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  return [];
}

function rowSlug(row: any) {
  return String(row?.slug || row?.storefrontSlug || row?.brandSlug || "");
}

export default function StoreIndex() {
  const router = useRouter();
  const params = useLocalSearchParams<{ similarTo?: string; q?: string }>();
  const similarTo = useMemo(
    () => String(params.similarTo || "").trim(),
    [params.similarTo]
  );
  const queryParam = useMemo(() => String(params.q || "").trim(), [params.q]);
  const [slug, setSlug] = useState("");
  const [brandQuery, setBrandQuery] = useState(queryParam);
  const [brands, setBrands] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [directoryMessage, setDirectoryMessage] = useState("");
  const cleanSlug = slug.trim();

  const loadBrands = useCallback(async (options?: { q?: string; similarTo?: string }) => {
    const q = String(options?.q ?? "").trim();
    const related = String(options?.similarTo ?? "").trim();
    if (!q && !related) return;
    setSearching(true);
    setDirectoryMessage("");
    try {
      const payload = await searchPublicStorefronts({
        q: q || undefined,
        similarTo: related || undefined,
        limit: 12
      });
      const rows = asArray(payload);
      setBrands(rows);
      if (!rows.length) setDirectoryMessage("No matching public brands found yet.");
    } catch (error: any) {
      setDirectoryMessage(error?.message || "Unable to load public brands.");
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (similarTo) void loadBrands({ similarTo });
    else if (queryParam) void loadBrands({ q: queryParam });
  }, [loadBrands, queryParam, similarTo]);

  function openPublicRoute(kind: "profile" | "store") {
    if (!cleanSlug) return;
    const encoded = encodeURIComponent(cleanSlug);
    router.push(kind === "profile" ? `/brands/${encoded}` : `/store/${encoded}`);
  }

  function searchBrands() {
    void loadBrands({ q: brandQuery });
  }

  return (
    <AppPage
      routeKey="store"
      header={
        <View>
          <Text style={styles.title}>Store</Text>
          <Text style={styles.subtitle}>
            Open public storefronts or manage your commercial storefront.
          </Text>
        </View>
      }
    >
      <AppCard>
        <Text style={styles.cardTitle}>Public brand profiles</Text>
        <Text style={styles.cardText}>
          Commercial profiles can be opened from feed campaigns, forum content, products,
          courses, and storefront links. A profile gives users a public brand page with a
          direct path to the store.
        </Text>
        <TextInput
          accessibilityLabel="Public brand slug"
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setSlug}
          placeholder="brand-slug"
          style={styles.input}
          value={slug}
        />
        <View style={styles.buttonRow}>
          <Pressable
            accessibilityRole="button"
            disabled={!cleanSlug}
            onPress={() => openPublicRoute("profile")}
            style={[styles.primaryButton, !cleanSlug && styles.disabled]}
          >
            <Text style={styles.primaryButtonText}>Open Profile</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={!cleanSlug}
            onPress={() => openPublicRoute("store")}
            style={[styles.secondaryButton, !cleanSlug && styles.disabled]}
          >
            <Text style={styles.secondaryButtonText}>Open Store</Text>
          </Pressable>
        </View>
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>
          {similarTo ? "Similar Brands" : "Find Brands"}
        </Text>
        <Text style={styles.cardText}>
          Search public commercial profiles by brand, category, product line, or store
          slug. Similar-brand results use the current storefront as context when opened
          from a store page.
        </Text>
        <TextInput
          accessibilityLabel="Search public brands"
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={setBrandQuery}
          placeholder="soil, nutrients, seeds, garden center..."
          style={styles.input}
          value={brandQuery}
        />
        <Pressable
          accessibilityRole="button"
          disabled={!brandQuery.trim() || searching}
          onPress={searchBrands}
          style={[
            styles.secondaryButton,
            (!brandQuery.trim() || searching) && styles.disabled
          ]}
        >
          <Text style={styles.secondaryButtonText}>
            {searching ? "Searching..." : "Search Brands"}
          </Text>
        </Pressable>
        {directoryMessage ? <Text style={styles.meta}>{directoryMessage}</Text> : null}
        {brands.map((brand) => {
          const publicSlug = rowSlug(brand);
          return (
            <View key={publicSlug || brand?.id || brand?.name} style={styles.brandRow}>
              <View style={styles.brandBody}>
                <Text style={styles.brandName}>
                  {brand?.businessName || brand?.name || "Public brand"}
                </Text>
                {brand?.description || brand?.bio ? (
                  <Text style={styles.meta}>{brand.description || brand.bio}</Text>
                ) : null}
              </View>
              {publicSlug ? (
                <View style={styles.brandActions}>
                  <Link href={`/brands/${encodeURIComponent(publicSlug)}` as any} asChild>
                    <Pressable style={styles.secondaryButton}>
                      <Text style={styles.secondaryButtonText}>Profile</Text>
                    </Pressable>
                  </Link>
                  <Link href={`/store/${encodeURIComponent(publicSlug)}` as any} asChild>
                    <Pressable style={styles.secondaryButton}>
                      <Text style={styles.secondaryButtonText}>Store</Text>
                    </Pressable>
                  </Link>
                </View>
              ) : null}
            </View>
          );
        })}
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Commercial storefront</Text>
        <Text style={styles.cardText}>
          Storefront setup and product management are available to commercial accounts.
        </Text>
        <Link href="/home/commercial/storefront" asChild>
          <Pressable style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Manage Storefront</Text>
          </Pressable>
        </Link>
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Storefront offers</Text>
        <Text style={styles.cardText}>
          Compare GrowPath plans and storefront-ready commercial or facility offers
          without leaving the connected storefront workflow.
        </Text>
        <Link href="/offers" asChild>
          <Pressable style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>View Offers</Text>
          </Pressable>
        </Link>
      </AppCard>
    </AppPage>
  );
}

const styles = StyleSheet.create({
  title: {
    color: "#111827",
    fontSize: 26,
    fontWeight: "800"
  },
  subtitle: {
    color: "#64748B",
    marginTop: 4
  },
  cardTitle: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8
  },
  cardText: {
    color: "#475569",
    lineHeight: 20,
    marginBottom: 14
  },
  brandActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  brandBody: {
    flex: 1,
    gap: 4
  },
  brandName: {
    color: "#111827",
    fontWeight: "800"
  },
  brandRow: {
    borderTopColor: "#E2E8F0",
    borderTopWidth: 1,
    gap: 10,
    marginTop: 12,
    paddingTop: 12
  },
  buttonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  disabled: {
    opacity: 0.55
  },
  input: {
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    borderWidth: 1,
    color: "#111827",
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#166534",
    borderRadius: radius.card,
    paddingHorizontal: 14,
    paddingVertical: 11
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "800"
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11
  },
  secondaryButtonText: {
    color: "#166534",
    fontWeight: "800"
  },
  meta: {
    color: "#64748B",
    lineHeight: 19,
    marginTop: 8
  }
});
