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
import { useEntitlements } from "@/entitlements";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";
import { resolveImageUri } from "@/utils/photoUploads";

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

function observationImages(observation: FieldObservation) {
  return Array.from(
    new Set(
      [
        ...(observation.evidenceAssets || [])
          .filter((asset) => asset.kind !== "video")
          .map((asset) => String(asset.url || asset.uri || "")),
        ...(observation.photoUrls || []).map(String)
      ].filter(Boolean)
    )
  ).map(resolveImageUri);
}

function readableStatus(value = "") {
  return value.replaceAll("_", " ");
}

export function fieldStudiesDestination(mode: string) {
  return mode === "personal" ? "/home/personal/field-studies" : "/account/mode";
}

export function fieldStudiesActionLabel(mode: string) {
  return mode === "personal"
    ? "Start a Field Study"
    : "Switch to Personal for Field Studies";
}

export function plantIdentificationDestination(mode: string) {
  return mode === "personal" ? "/home/personal/tools/species-crop-id" : "/account/mode";
}

export function plantIdentificationActionLabel(mode: string) {
  return mode === "personal" ? "Identify a Plant" : "Switch to Personal for Plant ID";
}

export default function PublicFieldObservationsScreen() {
  const entitlements = useEntitlements();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
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
  const loadRequestRef = useRef(0);

  const load = useCallback(
    async (search = activeQuery) => {
      const requestId = loadRequestRef.current + 1;
      loadRequestRef.current = requestId;
      setLoading(true);
      setError("");
      try {
        const viewport = viewportRef.current;
        const nextObservations = await listPublicFieldObservations({
          q: search,
          bbox: viewport
            ? [viewport.west, viewport.south, viewport.east, viewport.north]
            : undefined,
          verificationStatus: verificationStatus || undefined,
          invasiveStatus: invasiveStatus || undefined,
          limit: 500
        });
        if (loadRequestRef.current !== requestId) return;
        setObservations(nextObservations);
      } catch (loadError: any) {
        if (loadRequestRef.current !== requestId) return;
        setError(loadError?.message || "Public observations could not be loaded.");
      } finally {
        if (loadRequestRef.current === requestId) setLoading(false);
      }
    },
    [activeQuery, invasiveStatus, verificationStatus]
  );

  useEffect(() => {
    void load(activeQuery);
  }, [activeQuery, load]);

  useEffect(
    () => () => {
      loadRequestRef.current += 1;
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
      <Text accessibilityRole="header" aria-level={1} style={styles.title}>
        Explore the living world
      </Text>
      <Text style={styles.subtitle}>
        Move around a shared globe of plant discoveries, open community Field Studies, and
        compare what people are finding. Every pin was deliberately published; map points
        may be widened to protect people, private property, and sensitive species.
      </Text>

      <View style={styles.primaryActions}>
        <Link href={plantIdentificationDestination(entitlements.mode)} asChild>
          <Pressable accessibilityRole="link" style={styles.primaryAction}>
            <Text style={styles.primaryActionText}>
              {plantIdentificationActionLabel(entitlements.mode)}
            </Text>
          </Pressable>
        </Link>
        <Link href={fieldStudiesDestination(entitlements.mode)} asChild>
          <Pressable accessibilityRole="link" style={styles.secondaryAction}>
            <Text style={styles.secondaryActionText}>
              {fieldStudiesActionLabel(entitlements.mode)}
            </Text>
          </Pressable>
        </Link>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          accessibilityLabel="Search public plant observations"
          onChangeText={setQuery}
          onSubmitEditing={submitSearch}
          placeholder="Search common name, scientific name, family, or region"
          placeholderTextColor={palette.textMuted}
          returnKeyType="search"
          style={styles.searchInput}
          value={query}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Search public plant observations"
          onPress={submitSearch}
          style={styles.searchButton}
        >
          <Text style={styles.searchButtonText}>Search</Text>
        </Pressable>
      </View>

      <View accessibilityRole="toolbar" style={styles.filterPanel}>
        <Text style={styles.filterLabel}>Identification review</Text>
        <View style={styles.filterRow}>
          {VERIFICATION_FILTERS.map((filter) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Filter identification review: ${filter.label}`}
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
              accessibilityRole="button"
              accessibilityLabel={`Filter field finding: ${filter.label}`}
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
          <Text accessibilityRole="header" aria-level={2} style={styles.sectionTitle}>
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
            <Text accessibilityRole="header" aria-level={3} style={styles.cardTitle}>
              {highlightedObservations.length} field findings
            </Text>
            <Text style={styles.cardMeta}>
              Select a finding below for its evidence and Field Study. Zoom farther in to
              split this group into smaller pins.
            </Text>
            <View style={styles.clusterList}>
              {highlightedObservations.map((observation) => {
                const id = String(observation.id || observation._id);
                const images = observationImages(observation);
                return (
                  <Pressable
                    accessibilityRole="button"
                    key={id}
                    onPress={() => setHighlightedObservationIds([id])}
                    style={styles.clusterListItem}
                  >
                    {images[0] ? (
                      <Image
                        accessibilityLabel={`Evidence for ${observationName(observation)}`}
                        source={{ uri: images[0] }}
                        style={styles.clusterListImage}
                      />
                    ) : null}
                    <View style={styles.clusterListBody}>
                      <Text style={styles.clusterListTitle}>
                        {observationName(observation)}
                      </Text>
                      <Text style={styles.cardMeta}>
                        {String(
                          observation.observationContext?.region ||
                            observation.location?.label ||
                            "Shared map location"
                        )}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}
        {selectedObservation ? (
          <View style={styles.selectedCard}>
            {observationImages(selectedObservation).length ? (
              <ScrollView
                accessibilityLabel={`Photos for ${observationName(selectedObservation)}`}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.photoGallery}
              >
                {observationImages(selectedObservation).map((uri, index) => (
                  <Image
                    accessibilityLabel={`Evidence photo ${index + 1} for ${observationName(selectedObservation)}`}
                    key={uri}
                    source={{ uri }}
                    style={styles.selectedImage}
                  />
                ))}
              </ScrollView>
            ) : null}
            <View style={styles.selectedBody}>
              <Text style={styles.selectedEyebrow}>Selected field finding</Text>
              <Text accessibilityRole="header" aria-level={3} style={styles.cardTitle}>
                {observationName(selectedObservation)}
              </Text>
              {selectedObservation.identity?.scientificName ? (
                <Text style={styles.scientificName}>
                  {selectedObservation.identity.scientificName}
                </Text>
              ) : null}
              <Text style={styles.cardMeta}>
                {readableStatus(
                  selectedObservation.identity?.verificationStatus || "ai_candidate"
                )}{" "}
                · {selectedObservation.identity?.confidence || "unknown"} confidence
              </Text>
              {selectedObservation.study?.slug ? (
                <Link
                  href={`/field-observations/${selectedObservation.study.slug}`}
                  asChild
                >
                  <Pressable accessibilityRole="link">
                    <Text style={styles.linkText}>Open the full Field Study →</Text>
                  </Pressable>
                </Link>
              ) : null}
            </View>
          </View>
        ) : null}
      </View>

      <View style={styles.sectionHeader}>
        <Text accessibilityRole="header" aria-level={2} style={styles.sectionTitle}>
          Published observations
        </Text>
        <Link href={fieldStudiesDestination(entitlements.mode)} asChild>
          <Pressable accessibilityRole="link">
            <Text style={styles.linkText}>
              {fieldStudiesActionLabel(entitlements.mode)}
            </Text>
          </Pressable>
        </Link>
      </View>

      {loading ? (
        <View style={styles.status}>
          <ActivityIndicator color={palette.accent} />
          <Text style={styles.muted}>Loading public observations...</Text>
        </View>
      ) : error ? (
        <View style={styles.status}>
          <Text style={styles.error}>{error}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry public plant observations"
            onPress={() => void load(activeQuery)}
            style={styles.retryButton}
          >
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : !observations.length ? (
        <View style={styles.status}>
          <Text accessibilityRole="header" aria-level={3} style={styles.statusTitle}>
            No matching public observations
          </Text>
          <Text style={styles.muted}>
            Public Field Studies only show observations that contributors deliberately
            published with media evidence.
          </Text>
        </View>
      ) : (
        observations.map((observation) => {
          const studySlug = observation.study?.slug;
          const precision = (observation.location as any)?.precision;
          const images = observationImages(observation);
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
              {images[0] ? (
                <Image
                  accessibilityLabel={`Evidence for ${observationName(observation)}`}
                  source={{ uri: images[0] }}
                  style={styles.cardImage}
                />
              ) : null}
              <Text accessibilityRole="header" aria-level={3} style={styles.cardTitle}>
                {observationName(observation)}
              </Text>
              {observation.identity?.scientificName ? (
                <Text style={styles.scientificName}>
                  {observation.identity.scientificName}
                </Text>
              ) : null}
              <Text style={styles.cardMeta}>
                {observation.identity?.verificationStatus || "ai_candidate"} ·{" "}
                {observation.identity?.confidence || "unknown"} confidence
              </Text>
              <Text style={styles.cardMeta}>
                {String(
                  observation.observationContext?.region ||
                    observation.location?.label ||
                    "Region not shared"
                )}
                {precision ? ` · ${precision} map location` : ""}
              </Text>
              {observation.notes ? (
                <Text style={styles.cardBody}>{observation.notes}</Text>
              ) : null}
              {studySlug ? (
                <Link href={`/field-observations/${studySlug}`} asChild>
                  <Pressable accessibilityRole="link">
                    <Text style={styles.linkText}>
                      Open {observation.study?.title || "Field Study"} →
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

export const createStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: palette.page },
    content: { gap: 15, padding: 20, paddingBottom: 56 },
    title: { color: palette.heroText, fontSize: 29, fontWeight: "800" },
    subtitle: { color: palette.textMuted, fontSize: 15, lineHeight: 22 },
    primaryActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    primaryAction: {
      backgroundColor: palette.accent,
      borderColor: palette.accent,
      borderRadius: radius.card,
      borderWidth: 1,
      minHeight: 42,
      paddingHorizontal: 14,
      paddingVertical: 10
    },
    primaryActionText: { color: palette.accentText, fontWeight: "800" },
    secondaryAction: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      minHeight: 42,
      paddingHorizontal: 14,
      paddingVertical: 10
    },
    secondaryActionText: { color: palette.link, fontWeight: "800" },
    filterPanel: { gap: 8 },
    filterLabel: { color: palette.text, fontSize: 13, fontWeight: "800" },
    filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
    filterChip: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: 999,
      borderWidth: 1,
      minHeight: 38,
      paddingHorizontal: 12,
      paddingVertical: 8
    },
    filterChipSelected: { backgroundColor: palette.accent, borderColor: palette.accent },
    filterChipText: { color: palette.textMuted, fontSize: 13, fontWeight: "700" },
    filterChipTextSelected: { color: palette.accentText },
    searchRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    searchInput: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      flex: 1,
      minHeight: 46,
      minWidth: 230,
      paddingHorizontal: 12,
      paddingVertical: 9,
      color: palette.text
    },
    searchButton: {
      alignItems: "center",
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      justifyContent: "center",
      minHeight: 46,
      paddingHorizontal: 17
    },
    searchButtonText: { color: palette.accentText, fontWeight: "800" },
    mapPanel: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
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
    sectionTitle: { color: palette.text, fontSize: 20, fontWeight: "800" },
    mapCount: { color: palette.accent, fontWeight: "800" },
    mapHelp: { color: palette.textMuted, lineHeight: 20 },
    legend: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
    legendItem: { alignItems: "center", flexDirection: "row", gap: 6 },
    legendDot: { borderRadius: 999, height: 10, width: 10 },
    legendText: { color: palette.textMuted, fontSize: 12 },
    clusterCard: {
      backgroundColor: palette.accentSoft,
      borderColor: palette.accent,
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
      alignItems: "center",
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: 10,
      borderWidth: 1,
      flexDirection: "row",
      gap: 10,
      minWidth: 190,
      paddingHorizontal: 11,
      paddingVertical: 9
    },
    clusterListImage: { borderRadius: 8, height: 56, width: 56 },
    clusterListBody: { flex: 1, gap: 3 },
    clusterListTitle: { color: palette.text, fontWeight: "800" },
    selectedCard: {
      backgroundColor: palette.surface,
      borderColor: palette.accent,
      borderRadius: radius.card,
      borderWidth: 1,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
      padding: 12
    },
    selectedImage: {
      backgroundColor: palette.surfaceMuted,
      borderRadius: 10,
      height: 112,
      width: 136
    },
    photoGallery: { gap: 8, paddingRight: 4 },
    selectedBody: {
      flex: 1,
      gap: 4,
      justifyContent: "center",
      minWidth: 220
    },
    selectedEyebrow: {
      color: palette.accent,
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
    linkText: { color: palette.link, fontWeight: "800" },
    status: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 8,
      padding: 16
    },
    statusTitle: { color: palette.text, fontSize: 16, fontWeight: "800" },
    muted: { color: palette.textMuted, lineHeight: 20 },
    error: { color: palette.danger, lineHeight: 20 },
    retryButton: {
      alignSelf: "flex-start",
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 8
    },
    retryText: { color: palette.link, fontWeight: "700" },
    card: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 5,
      padding: 15
    },
    cardImage: {
      backgroundColor: palette.surfaceMuted,
      borderRadius: 10,
      height: 180,
      marginBottom: 6,
      width: "100%"
    },
    cardSelected: { borderColor: palette.accent, borderWidth: 2 },
    cardTitle: { color: palette.text, fontSize: 18, fontWeight: "800" },
    scientificName: { color: palette.textMuted, fontStyle: "italic" },
    cardMeta: { color: palette.textMuted, fontSize: 13, lineHeight: 18 },
    cardBody: { color: palette.text, lineHeight: 20, marginVertical: 4 }
  });
