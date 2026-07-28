import { Link } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import { FieldObservation, listPublicFieldObservations } from "@/api/fieldStudies";
import FieldObservationGlobe, {
  type FieldObservationViewport
} from "@/components/fieldStudies/FieldObservationGlobe";
import { radius } from "@/theme/theme";

const VERIFICATION_FILTERS = [
  { value: "", label: "All review states" },
  { value: "user_confirmed", label: "Observer confirmed" },
  { value: "expert_reviewed", label: "Expert reviewed" },
  { value: "source_verified", label: "Source verified" },
  { value: "needs_evidence", label: "Needs evidence" }
] as const;

const INVASIVE_FILTERS = [
  { value: "", label: "All plant findings" },
  { value: "suspected", label: "Possible invasive" },
  { value: "verified", label: "Verified invasive" }
] as const;

function observationName(observation: FieldObservation) {
  return (
    observation.identity?.commonName ||
    observation.identity?.scientificName ||
    observation.title ||
    "Unconfirmed plant"
  );
}

function observationImage(observation: FieldObservation) {
  const evidenceUrl = observation.evidenceAssets?.find(
    (asset) => asset.kind !== "video" && (asset.url || asset.uri)
  );
  return String(evidenceUrl?.url || evidenceUrl?.uri || observation.photoUrls?.[0] || "");
}

function readableStatus(value = "") {
  return value.replaceAll("_", " ");
}

export default function PublicFieldObservationsScreen() {
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [verificationStatus, setVerificationStatus] =
    useState<(typeof VERIFICATION_FILTERS)[number]["value"]>("");
  const [invasiveStatus, setInvasiveStatus] =
    useState<(typeof INVASIVE_FILTERS)[number]["value"]>("");
  const [observations, setObservations] = useState<FieldObservation[]>([]);
  const [highlightedObservationIds, setHighlightedObservationIds] = useState<string[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const viewportRef = useRef<FieldObservationViewport | null>(null);
  const viewportTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(
    async (search = activeQuery) => {
      setLoading(true);
      setError("");
      try {
        const viewport = viewportRef.current;
        setObservations(
          await listPublicFieldObservations({
            q: search,
            bbox: viewport
              ? [viewport.west, viewport.south, viewport.east, viewport.north]
              : undefined,
            verificationStatus: verificationStatus || undefined,
            invasiveStatus: invasiveStatus || undefined,
            limit: 500
          })
        );
      } catch (loadError: any) {
        setError(loadError?.message || "Public observations could not be loaded.");
      } finally {
        setLoading(false);
      }
    },
    [activeQuery, invasiveStatus, verificationStatus]
  );

  useEffect(() => {
    void load(activeQuery);
  }, [activeQuery, load]);

  useEffect(
    () => () => {
      if (viewportTimerRef.current) clearTimeout(viewportTimerRef.current);
    },
    []
  );

  const mappedCount = useMemo(
    () =>
      observations.filter(
        (observation) =>
          Number.isFinite(Number(observation.location?.latitude)) &&
          Number.isFinite(Number(observation.location?.longitude))
      ).length,
    [observations]
  );

  const highlightedObservations = useMemo(
    () =>
      observations.filter((observation) =>
        highlightedObservationIds.includes(String(observation.id || observation._id))
      ),
    [highlightedObservationIds, observations]
  );
  const selectedObservationId =
    highlightedObservations.length === 1
      ? String(highlightedObservations[0].id || highlightedObservations[0]._id)
      : "";
  const selectedObservation = useMemo(
    () => (highlightedObservations.length === 1 ? highlightedObservations[0] : null),
    [highlightedObservations]
  );

  const submitSearch = useCallback(() => {
    const nextQuery = query.trim();
    if (nextQuery === activeQuery) {
      void load(nextQuery);
    } else {
      setActiveQuery(nextQuery);
    }
  }, [activeQuery, load, query]);

  const handleViewportChange = useCallback(
    (viewport: FieldObservationViewport | null) => {
      if (viewportTimerRef.current) clearTimeout(viewportTimerRef.current);
      viewportTimerRef.current = setTimeout(() => {
        viewportRef.current = viewport;
        void load(activeQuery);
      }, 350);
    },
    [activeQuery, load]
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text accessibilityRole="header" style={styles.title}>
        Explore the living world
      </Text>
      <Text style={styles.subtitle}>
        Move around a shared globe of plant discoveries, open community Field Studies, and
        compare what people are finding. Every pin was deliberately published; map points
        may be widened to protect people, private property, and sensitive species.
      </Text>

      <View style={styles.searchRow}>
        <TextInput
          accessibilityLabel="Search public plant observations"
          onChangeText={setQuery}
          onSubmitEditing={submitSearch}
          placeholder="Search common name, scientific name, family, or region"
          returnKeyType="search"
          style={styles.searchInput}
          value={query}
        />
        <Pressable onPress={submitSearch} style={styles.searchButton}>
          <Text style={styles.searchButtonText}>Search</Text>
        </Pressable>
      </View>

      <View accessibilityRole="toolbar" style={styles.filterPanel}>
        <Text style={styles.filterLabel}>Identification review</Text>
        <View style={styles.filterRow}>
          {VERIFICATION_FILTERS.map((filter) => (
            <Pressable
              accessibilityState={{ selected: verificationStatus === filter.value }}
              key={filter.value || "all-verification"}
              onPress={() => setVerificationStatus(filter.value)}
              style={[
                styles.filterChip,
                verificationStatus === filter.value && styles.filterChipSelected
              ]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  verificationStatus === filter.value && styles.filterChipTextSelected
                ]}
              >
                {filter.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.filterLabel}>Field finding</Text>
        <View style={styles.filterRow}>
          {INVASIVE_FILTERS.map((filter) => (
            <Pressable
              accessibilityState={{ selected: invasiveStatus === filter.value }}
              key={filter.value || "all-invasive"}
              onPress={() => setInvasiveStatus(filter.value)}
              style={[
                styles.filterChip,
                invasiveStatus === filter.value && styles.filterChipSelected
              ]}
            >
              <Text
                style={[
                  styles.filterChipText,
                  invasiveStatus === filter.value && styles.filterChipTextSelected
                ]}
              >
                {filter.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.mapPanel}>
        <View style={styles.mapHeader}>
          <Text accessibilityRole="header" style={styles.sectionTitle}>
            Discovery globe
          </Text>
          <Text style={styles.mapCount}>{mappedCount} pins in view</Text>
        </View>
        <Text style={styles.mapHelp}>
          Zoom, rotate, or select a cluster to explore. The globe starts near your
          permitted location, or over the United States when location is not enabled.
        </Text>
        <FieldObservationGlobe
          observations={observations}
          onSelectObservations={setHighlightedObservationIds}
          onViewportChange={handleViewportChange}
          selectedObservationId={selectedObservationId}
        />
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#15803D" }]} />
            <Text style={styles.legendText}>Contributor-approved exact</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: "#D97706" }]} />
            <Text style={styles.legendText}>Approximate or regional</Text>
          </View>
        </View>
        {highlightedObservations.length > 1 ? (
          <View style={styles.clusterCard}>
            <Text style={styles.selectedEyebrow}>Selected pin group</Text>
            <Text style={styles.cardTitle}>
              {highlightedObservations.length} field findings
            </Text>
            <Text style={styles.cardMeta}>
              Select a finding below for its evidence and Field Study. Zoom farther in to
              split this group into smaller pins.
            </Text>
            <View style={styles.clusterList}>
              {highlightedObservations.map((observation) => {
                const id = String(observation.id || observation._id);
                return (
                  <Pressable
                    accessibilityRole="button"
                    key={id}
                    onPress={() => setHighlightedObservationIds([id])}
                    style={styles.clusterListItem}
                  >
                    <Text style={styles.clusterListTitle}>
                      {observationName(observation)}
                    </Text>
                    <Text style={styles.cardMeta}>
                      {observation.observationContext?.region ||
                        observation.location?.label ||
                        "Shared map location"}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}
        {selectedObservation ? (
          <View style={styles.selectedCard}>
            {observationImage(selectedObservation) ? (
              <Image
                accessibilityLabel={`Evidence for ${observationName(selectedObservation)}`}
                source={{ uri: observationImage(selectedObservation) }}
                style={styles.selectedImage}
              />
            ) : null}
            <View style={styles.selectedBody}>
              <Text style={styles.selectedEyebrow}>Selected field finding</Text>
              <Text style={styles.cardTitle}>{observationName(selectedObservation)}</Text>
              {selectedObservation.identity?.scientificName ? (
                <Text style={styles.scientificName}>
                  {selectedObservation.identity.scientificName}
                </Text>
              ) : null}
              <Text style={styles.cardMeta}>
                {readableStatus(
                  selectedObservation.identity?.verificationStatus || "ai_candidate"
                )}{" "}
                � {selectedObservation.identity?.confidence || "unknown"} confidence
              </Text>
              {selectedObservation.study?.slug ? (
                <Link
                  href={`/field-observations/${selectedObservation.study.slug}`}
                  asChild
                >
                  <Pressable accessibilityRole="link">
                    <Text style={styles.linkText}>Open the full Field Study ?</Text>
                  </Pressable>
                </Link>
              ) : null}
            </View>
          </View>
        ) : null}
      </View>

      <View style={styles.sectionHeader}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>
          Published observations
        </Text>
        <Link href="/home/personal/field-studies" asChild>
          <Pressable accessibilityRole="link">
            <Text style={styles.linkText}>Start a Field Study</Text>
          </Pressable>
        </Link>
      </View>

      {loading ? (
        <View style={styles.status}>
          <ActivityIndicator />
          <Text style={styles.muted}>Loading public observations...</Text>
        </View>
      ) : error ? (
        <View style={styles.status}>
          <Text style={styles.error}>{error}</Text>
          <Pressable onPress={() => void load(activeQuery)} style={styles.retryButton}>
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : !observations.length ? (
        <View style={styles.status}>
          <Text style={styles.statusTitle}>No matching public observations</Text>
          <Text style={styles.muted}>
            Public Field Studies only show observations that contributors deliberately
            published with media evidence.
          </Text>
        </View>
      ) : (
        observations.map((observation) => {
          const studySlug = observation.study?.slug;
          const precision = (observation.location as any)?.precision;
          return (
            <View
              key={String(observation.id || observation._id)}
              style={[
                styles.card,
                highlightedObservationIds.includes(
                  String(observation.id || observation._id)
                ) && styles.cardSelected
              ]}
            >
              <Text style={styles.cardTitle}>{observationName(observation)}</Text>
              {observation.identity?.scientificName ? (
                <Text style={styles.scientificName}>
                  {observation.identity.scientificName}
                </Text>
              ) : null}
              <Text style={styles.cardMeta}>
                {observation.identity?.verificationStatus || "ai_candidate"} �{" "}
                {observation.identity?.confidence || "unknown"} confidence
              </Text>
              <Text style={styles.cardMeta}>
                {String(
                  observation.observationContext?.region ||
                    observation.location?.label ||
                    "Region not shared"
                )}
                {precision ? ` � ${precision} map location` : ""}
              </Text>
              {observation.notes ? (
                <Text style={styles.cardBody}>{observation.notes}</Text>
              ) : null}
              {studySlug ? (
                <Link href={`/field-observations/${studySlug}`} asChild>
                  <Pressable accessibilityRole="link">
                    <Text style={styles.linkText}>
                      Open {observation.study?.title || "Field Study"} ?
                    </Text>
                  </Pressable>
                </Link>
              ) : null}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { gap: 15, padding: 20, paddingBottom: 56 },
  title: { color: "#0F172A", fontSize: 29, fontWeight: "800" },
  subtitle: { color: "#475569", fontSize: 15, lineHeight: 22 },
  filterPanel: { gap: 8 },
  filterLabel: { color: "#334155", fontSize: 13, fontWeight: "800" },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  filterChip: {
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 38,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  filterChipSelected: { backgroundColor: "#166534", borderColor: "#166534" },
  filterChipText: { color: "#334155", fontSize: 13, fontWeight: "700" },
  filterChipTextSelected: { color: "#FFFFFF" },
  searchRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  searchInput: {
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    borderWidth: 1,
    flex: 1,
    minHeight: 46,
    minWidth: 230,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  searchButton: {
    alignItems: "center",
    backgroundColor: "#166534",
    borderRadius: radius.card,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: 17
  },
  searchButtonText: { color: "#FFFFFF", fontWeight: "800" },
  mapPanel: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 10,
    padding: 14
  },
  mapHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  sectionTitle: { color: "#0F172A", fontSize: 20, fontWeight: "800" },
  mapCount: { color: "#166534", fontWeight: "800" },
  mapHelp: { color: "#64748B", lineHeight: 20 },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  legendItem: { alignItems: "center", flexDirection: "row", gap: 6 },
  legendDot: { borderRadius: 999, height: 10, width: 10 },
  legendText: { color: "#475569", fontSize: 12 },
  clusterCard: {
    backgroundColor: "#F0FDF4",
    borderColor: "#86EFAC",
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 7,
    padding: 12
  },
  clusterList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4
  },
  clusterListItem: {
    backgroundColor: "#FFFFFF",
    borderColor: "#BBF7D0",
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 190,
    paddingHorizontal: 11,
    paddingVertical: 9
  },
  clusterListTitle: { color: "#14532D", fontWeight: "800" },
  selectedCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#86EFAC",
    borderRadius: radius.card,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    padding: 12
  },
  selectedImage: {
    backgroundColor: "#E2E8F0",
    borderRadius: 10,
    height: 112,
    width: 136
  },
  selectedBody: {
    flex: 1,
    gap: 4,
    justifyContent: "center",
    minWidth: 220
  },
  selectedEyebrow: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-between"
  },
  linkText: { color: "#166534", fontWeight: "800" },
  status: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 8,
    padding: 16
  },
  statusTitle: { color: "#0F172A", fontSize: 16, fontWeight: "800" },
  muted: { color: "#64748B", lineHeight: 20 },
  error: { color: "#B91C1C", lineHeight: 20 },
  retryButton: {
    alignSelf: "flex-start",
    borderColor: "#94A3B8",
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  retryText: { color: "#0F172A", fontWeight: "700" },
  card: {
    backgroundColor: "#FFFFFF",
    borderColor: "#D1D5DB",
    borderRadius: radius.card,
    borderWidth: 1,
    gap: 5,
    padding: 15
  },
  cardSelected: { borderColor: "#16A34A", borderWidth: 2 },
  cardTitle: { color: "#0F172A", fontSize: 18, fontWeight: "800" },
  scientificName: { color: "#334155", fontStyle: "italic" },
  cardMeta: { color: "#64748B", fontSize: 13, lineHeight: 18 },
  cardBody: { color: "#334155", lineHeight: 20, marginVertical: 4 }
});
