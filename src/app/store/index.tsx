import { Link, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { searchPublicStorefronts } from "@/api/storefront";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import { useEntitlements } from "@/entitlements";
import { radius } from "@/theme/theme";
import { PublicCoordinates, requestCurrentCoordinates } from "@/utils/locationSearch";

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
  return String(
    row?.slug ||
      row?.storefrontSlug ||
      row?.linkedStorefrontSlug ||
      row?.brandSlug ||
      row?.publicSlug ||
      ""
  );
}

function dispensaryLocation(row: any) {
  return [row?.city, row?.stateCode || row?.state]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(", ");
}

export default function StoreIndex() {
  const entitlements = useEntitlements();
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
  const [dispensaries, setDispensaries] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchingDispensaries, setSearchingDispensaries] = useState(false);
  const [directoryMessage, setDirectoryMessage] = useState("");
  const [dispensaryMessage, setDispensaryMessage] = useState("");
  const [dispensaryState, setDispensaryState] = useState("");
  const [radiusMiles, setRadiusMiles] = useState(25);
  const [coordinates, setCoordinates] = useState<PublicCoordinates | null>(null);
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

  const loadDispensaries = useCallback(
    async (nextCoordinates: PublicCoordinates | null = coordinates) => {
      const stateCode = dispensaryState.trim().toUpperCase();
      if (!stateCode && !nextCoordinates) {
        setDispensaryMessage(
          "Enter a state or allow current-location access to search nearby."
        );
        return;
      }
      setSearchingDispensaries(true);
      setDispensaryMessage("");
      try {
        const payload = await searchPublicStorefronts({
          storefrontType: "dispensary",
          stateCode: stateCode || undefined,
          latitude: nextCoordinates?.latitude,
          longitude: nextCoordinates?.longitude,
          radiusMiles: nextCoordinates ? radiusMiles : undefined,
          limit: 25
        });
        const rows = asArray(payload);
        setDispensaries(rows);
        if (!rows.length) {
          setDispensaryMessage(
            "No published dispensaries match this state or distance yet."
          );
        }
      } catch (error: any) {
        setDispensaryMessage(error?.message || "Unable to search public dispensaries.");
      } finally {
        setSearchingDispensaries(false);
      }
    },
    [coordinates, dispensaryState, radiusMiles]
  );

  async function searchFromCurrentLocation() {
    setSearchingDispensaries(true);
    setDispensaryMessage("Requesting your current location...");
    try {
      const nextCoordinates = await requestCurrentCoordinates();
      setCoordinates(nextCoordinates);
      await loadDispensaries(nextCoordinates);
    } catch (error: any) {
      setDispensaryMessage(
        error?.message ||
          "Location access is unavailable. Search dispensaries by state instead."
      );
      setSearchingDispensaries(false);
    }
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
        <Text style={styles.cardTitle}>Public storefronts</Text>
        <Text style={styles.cardText}>
          Commercial storefronts are the public brand home base for products, courses,
          lives, campaigns, and Q&A links. Legacy brand profiles remain available as a
          secondary profile view.
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
            onPress={() => openPublicRoute("store")}
            style={[styles.primaryButton, !cleanSlug && styles.disabled]}
          >
            <Text style={styles.primaryButtonText}>Open Storefront</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={!cleanSlug}
            onPress={() => openPublicRoute("profile")}
            style={[styles.secondaryButton, !cleanSlug && styles.disabled]}
          >
            <Text style={styles.secondaryButtonText}>Open Profile</Text>
          </Pressable>
        </View>
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>
          {similarTo ? "Similar Storefronts" : "Find Storefronts"}
        </Text>
        <Text style={styles.cardText}>
          Search public commercial storefronts by brand, category, product line, or store
          slug. Similar-storefront results use the current storefront as context when
          opened from a store page.
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
            {searching ? "Searching..." : "Search Storefronts"}
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
                  <Link href={`/store/${encodeURIComponent(publicSlug)}` as any} asChild>
                    <Pressable style={styles.primaryButton}>
                      <Text style={styles.primaryButtonText}>Storefront</Text>
                    </Pressable>
                  </Link>
                  <Link href={`/brands/${encodeURIComponent(publicSlug)}` as any} asChild>
                    <Pressable style={styles.secondaryButton}>
                      <Text style={styles.secondaryButtonText}>Profile</Text>
                    </Pressable>
                  </Link>
                </View>
              ) : null}
            </View>
          );
        })}
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Find Dispensaries</Text>
        <Text style={styles.cardText}>
          Search dispensary inventory by state or distance from your current location.
          GrowPath does not sell cannabis or take payment. A dispensary can direct you to
          its own website or provide in-store pickup information.
        </Text>
        <Text style={styles.privacyNote}>
          Current location is used for this search and is not saved to your profile.
        </Text>
        <TextInput
          accessibilityLabel="Dispensary state"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={2}
          onChangeText={(value) => setDispensaryState(value.toUpperCase())}
          placeholder="State code, e.g. MA"
          style={styles.input}
          value={dispensaryState}
        />
        <Text style={styles.fieldLabel}>Distance from current location</Text>
        <View style={styles.buttonRow}>
          {[10, 25, 50, 100].map((miles) => (
            <Pressable
              key={miles}
              accessibilityRole="button"
              accessibilityLabel={`Search within ${miles} miles`}
              onPress={() => setRadiusMiles(miles)}
              style={[
                styles.radiusButton,
                radiusMiles === miles && styles.radiusButtonSelected
              ]}
            >
              <Text
                style={[
                  styles.radiusButtonText,
                  radiusMiles === miles && styles.radiusButtonTextSelected
                ]}
              >
                {miles} mi
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.buttonRow}>
          <Pressable
            accessibilityRole="button"
            disabled={!dispensaryState.trim() || searchingDispensaries}
            onPress={() => void loadDispensaries(null)}
            style={[
              styles.primaryButton,
              (!dispensaryState.trim() || searchingDispensaries) && styles.disabled
            ]}
          >
            <Text style={styles.primaryButtonText}>
              {searchingDispensaries ? "Searching..." : "Search by State"}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Use my location to find dispensaries"
            disabled={searchingDispensaries}
            onPress={() => void searchFromCurrentLocation()}
            style={[styles.secondaryButton, searchingDispensaries && styles.disabled]}
          >
            <Text style={styles.secondaryButtonText}>Use My Location</Text>
          </Pressable>
        </View>
        {coordinates ? (
          <Text style={styles.meta}>
            Searching within {radiusMiles} miles of your current location
            {dispensaryState.trim()
              ? ` and in ${dispensaryState.trim().toUpperCase()}`
              : ""}
            .
          </Text>
        ) : null}
        {dispensaryMessage ? <Text style={styles.meta}>{dispensaryMessage}</Text> : null}
        {dispensaries.map((dispensary) => {
          const publicSlug = rowSlug(dispensary);
          const location = dispensaryLocation(dispensary);
          const distance = Number(dispensary?.distanceMiles);
          return (
            <View
              key={publicSlug || dispensary?.id || dispensary?.name}
              style={styles.brandRow}
            >
              <View style={styles.brandBody}>
                <Text style={styles.brandName}>
                  {dispensary?.businessName || dispensary?.name || "Licensed dispensary"}
                </Text>
                {location ? <Text style={styles.meta}>{location}</Text> : null}
                {Number.isFinite(distance) ? (
                  <Text style={styles.distance}>{distance.toFixed(1)} miles away</Text>
                ) : null}
                {dispensary?.description ? (
                  <Text style={styles.meta}>{dispensary.description}</Text>
                ) : null}
                <Text style={styles.handoff}>
                  Inventory only · dispensary website or in-store pickup
                </Text>
              </View>
              {publicSlug ? (
                <Link href={`/store/${encodeURIComponent(publicSlug)}` as any} asChild>
                  <Pressable style={styles.primaryButton}>
                    <Text style={styles.primaryButtonText}>View Inventory</Text>
                  </Pressable>
                </Link>
              ) : null}
            </View>
          );
        })}
      </AppCard>

      {entitlements.mode === "commercial" ? (
        <AppCard>
          <Text style={styles.cardTitle}>Commercial storefront</Text>
          <Text style={styles.cardText}>
            Manage your published storefront and products.
          </Text>
          <Link href="/home/commercial/storefront" asChild>
            <Pressable style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>Manage Storefront</Text>
            </Pressable>
          </Link>
        </AppCard>
      ) : null}
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
  distance: {
    color: "#166534",
    fontWeight: "800"
  },
  fieldLabel: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 8
  },
  handoff: {
    color: "#92400E",
    fontSize: 12,
    fontWeight: "800"
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
  privacyNote: {
    color: "#64748B",
    fontSize: 12,
    marginBottom: 10
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "800"
  },
  radiusButton: {
    backgroundColor: "#F8FAFC",
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  radiusButtonSelected: {
    backgroundColor: "#DCFCE7",
    borderColor: "#166534"
  },
  radiusButtonText: {
    color: "#475569",
    fontWeight: "800"
  },
  radiusButtonTextSelected: {
    color: "#166534"
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
