import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { apiRequest } from "@/api/apiRequest";
import { endpoints } from "@/api/endpoints";
import { InlineError } from "@/components/InlineError";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import FacilityContextualTools from "@/components/facility/FacilityContextualTools";
import GrowIntegrationBuildPanel from "@/components/integrations/GrowIntegrationBuildPanel";
import { useApiErrorHandler } from "@/hooks/useApiErrorHandler";
import { useFacility } from "@/state/useFacility";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import { getTier1Options } from "@/utils/growInterests";
import { radius } from "@/theme/theme";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";

type AnyRec = Record<string, any>;

function unwrapGrow(res: any): AnyRec | null {
  const row =
    res?.grow ?? res?.item ?? res?.data?.grow ?? res?.data?.item ?? res?.data ?? res;
  return row && typeof row === "object" && !Array.isArray(row) ? row : null;
}

function pickTitle(x: AnyRec): string {
  return String(x?.name ?? x?.title ?? x?.strain ?? x?.label ?? "Grow Detail");
}

function readableDate(value: unknown) {
  if (!value) return "Not set";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
}

export default function FacilityGrowDetail() {
  const router = useRouter();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createFacilityGrowDetailStyles(palette), [palette]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { selectedId: facilityId } = useFacility();
  const entitlements = useEntitlements();
  const canEditGrow = Boolean(entitlements?.can?.(CAPABILITY_KEYS.GROWS_WRITE));

  const apiErr: any = useApiErrorHandler();
  const error = apiErr?.error ?? apiErr?.[0] ?? null;
  const handleApiError = useMemo(
    () => apiErr?.handleApiError ?? apiErr?.[1] ?? ((_: any) => {}),
    [apiErr]
  );
  const clearError = useMemo(
    () => apiErr?.clearError ?? apiErr?.[2] ?? (() => {}),
    [apiErr]
  );

  const [item, setItem] = useState<AnyRec | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCrops, setSelectedCrops] = useState<string[]>([]);
  const [savingCrops, setSavingCrops] = useState(false);
  const [cropFeedback, setCropFeedback] = useState("");
  const loadInFlightRef = useRef(false);

  const load = useCallback(
    async (opts?: { refresh?: boolean }) => {
      if (!facilityId || !id || loadInFlightRef.current) return;
      loadInFlightRef.current = true;

      if (opts?.refresh) setRefreshing(true);
      else setLoading(true);

      try {
        clearError();
        const res = await apiRequest(endpoints.grow(facilityId, String(id)));
        const grow = unwrapGrow(res);
        setItem(grow);
        setSelectedCrops(
          Array.isArray(grow?.cropTypes)
            ? grow.cropTypes.filter(Boolean)
            : Array.isArray(grow?.growInterests?.crops)
              ? grow.growInterests.crops.filter(Boolean)
              : []
        );
      } catch (e) {
        handleApiError(e);
      } finally {
        loadInFlightRef.current = false;
        setLoading(false);
        setRefreshing(false);
      }
    },
    [clearError, facilityId, handleApiError, id]
  );

  useEffect(() => {
    if (!facilityId) {
      router.replace("/home/facility/select");
      return;
    }
    if (!id) {
      router.back();
      return;
    }
    load();
  }, [facilityId, id, load, router]);

  const title = useMemo(() => (item ? pickTitle(item) : "Grow Detail"), [item]);

  function toggleCrop(crop: string) {
    setSelectedCrops((current) =>
      current.includes(crop)
        ? current.filter((value) => value !== crop)
        : [...current, crop]
    );
    setCropFeedback("");
  }

  async function saveCropContext() {
    if (!facilityId || !id || !selectedCrops.length || savingCrops) {
      if (!selectedCrops.length) setCropFeedback("Select at least one crop type.");
      return;
    }
    setSavingCrops(true);
    setCropFeedback("");
    try {
      const res = await apiRequest(endpoints.grow(facilityId, String(id)), {
        method: "PATCH",
        body: {
          cropTypes: selectedCrops,
          growInterests: { ...(item?.growInterests || {}), crops: selectedCrops }
        }
      });
      const updated = unwrapGrow(res);
      setItem((current) => ({
        ...(current || {}),
        ...(updated || {}),
        cropTypes: selectedCrops
      }));
      setCropFeedback(
        selectedCrops.some((crop) => /^(cannabis|hemp)$/i.test(crop))
          ? "Saved. Harvest Readiness is now available in Facility AI Tools."
          : "Crop context saved."
      );
    } catch (saveError) {
      handleApiError(saveError);
      setCropFeedback("Unable to save crop context.");
    } finally {
      setSavingCrops(false);
    }
  }

  return (
    <ScreenBoundary title={title} showBack backFallbackHref="/home/facility/grows">
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load({ refresh: true })}
            tintColor={palette.accent}
            colors={[palette.accent]}
            progressBackgroundColor={palette.surface}
          />
        }
      >
        {error ? <InlineError error={error} /> : null}

        {loading ? (
          <View
            accessibilityLabel="Loading facility grow details"
            accessibilityLiveRegion="polite"
            accessibilityRole="progressbar"
            style={styles.loading}
          >
            <ActivityIndicator color={palette.accent} />
            <Text style={styles.muted}>Loading grow...</Text>
          </View>
        ) : null}

        {!loading && !item ? (
          <View style={styles.empty}>
            <Text accessibilityRole="header" aria-level={1} style={styles.emptyTitle}>
              Grow not found
            </Text>
            <Text style={styles.muted}>This grow could not be loaded.</Text>
          </View>
        ) : null}

        {item ? (
          <>
            <View style={styles.card}>
              <Text accessibilityRole="header" aria-level={1} style={styles.h1}>
                {pickTitle(item)}
              </Text>
              <Text style={styles.muted}>
                {item.roomName ? `${item.roomName} → ` : ""}
                {pickTitle(item)}
              </Text>
              <View style={styles.summaryGrid}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Stage</Text>
                  <Text style={styles.summaryValue}>
                    {String(item.stage ?? item.phase ?? "Not set")}
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Status</Text>
                  <Text style={styles.summaryValue}>
                    {String(item.status ?? "Active")}
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Started</Text>
                  <Text style={styles.summaryValue}>
                    {readableDate(item.startedAt ?? item.startDate ?? item.createdAt)}
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Plants</Text>
                  <Text style={styles.summaryValue}>
                    {String(item.plantCount ?? item.estimatedPlantCount ?? "Open plants")}
                  </Text>
                </View>
              </View>
              <Text accessibilityRole="header" aria-level={2} style={styles.sectionTitle}>
                Crop context
              </Text>
              <Text style={styles.muted}>
                Crop context controls crop-specific Facility tools. Select Cannabis for
                the full Harvest Readiness review.
              </Text>
              <View style={styles.cropGrid}>
                {getTier1Options().map((crop) => {
                  const active = selectedCrops.includes(crop);
                  return (
                    <Pressable
                      key={crop}
                      disabled={!canEditGrow || savingCrops}
                      onPress={() => toggleCrop(crop)}
                      accessibilityRole="button"
                      accessibilityLabel={`${active ? "Remove" : "Select"} crop ${crop}`}
                      accessibilityState={{
                        disabled: !canEditGrow || savingCrops,
                        selected: active
                      }}
                      style={[styles.cropChip, active && styles.cropChipActive]}
                    >
                      <Text
                        style={[styles.cropChipText, active && styles.cropChipTextActive]}
                      >
                        {crop}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              {canEditGrow ? (
                <Pressable
                  onPress={saveCropContext}
                  disabled={savingCrops || !selectedCrops.length}
                  accessibilityRole="button"
                  accessibilityLabel="Save crop context"
                  accessibilityState={{ disabled: savingCrops || !selectedCrops.length }}
                  style={[
                    styles.saveButton,
                    (savingCrops || !selectedCrops.length) && styles.disabled
                  ]}
                >
                  <Text style={styles.saveButtonText}>
                    {savingCrops ? "Saving..." : "Save crop context"}
                  </Text>
                </Pressable>
              ) : (
                <Text style={styles.muted}>
                  Only an owner or manager can change crop context.
                </Text>
              )}
              {cropFeedback ? (
                <Text accessibilityLiveRegion="polite" style={styles.feedback}>
                  {cropFeedback}
                </Text>
              ) : null}
              <Text accessibilityRole="header" aria-level={2} style={styles.sectionTitle}>
                Grow workspace
              </Text>
              <View style={styles.workspaceGrid}>
                {[
                  ["Plants", "/home/facility/plants"],
                  ["Journal & timeline", "/home/facility/logs"],
                  ["Tasks & calendar", "/home/facility/tasks"],
                  ["Inventory usage", "/home/facility/inventory"],
                  ["Assigned SOPs", "/home/facility/sop-runs"],
                  ["Environment & devices", "/home/facility/integrations"],
                  ["Import grow history", "/home/facility/tools/history-import"],
                  ["Ask GrowPath AI", "/home/facility/ai-ask"]
                ].map(([label, pathname]) => (
                  <Pressable
                    key={label}
                    onPress={() =>
                      router.push({
                        pathname: pathname as any,
                        params: {
                          growId: String(id),
                          roomId: String(item.roomId ?? ""),
                          contextName: pickTitle(item)
                        }
                      })
                    }
                    style={styles.workspaceAction}
                    accessibilityRole="link"
                    accessibilityLabel={`Open ${label} for ${pickTitle(item)}`}
                  >
                    <Text style={styles.workspaceLabel}>{label}</Text>
                    <Text style={styles.workspaceArrow}>{">"}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <FacilityContextualTools
              title="Grow tools"
              tools={[
                "ask-ai",
                "diagnose",
                "environment",
                "recipe-builder",
                "harvest-readiness",
                "reports"
              ]}
              source="facility-grow-detail"
              facilityId={facilityId ?? undefined}
              growId={String(id)}
              roomId={String(item.roomId ?? "")}
              prompt={`Review ${pickTitle(item)} and recommend the next facility action.`}
            />
            <GrowIntegrationBuildPanel
              mode="facility"
              targetRef={String(id || "")}
              facilityId={String(facilityId || "")}
              canConfigure={canEditGrow}
            />
          </>
        ) : null}
      </ScrollView>
    </ScreenBoundary>
  );
}

export const createFacilityGrowDetailStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    container: { backgroundColor: palette.page, gap: 12, padding: 16 },
    loading: { alignItems: "center", gap: 10, paddingVertical: 18 },
    muted: { color: palette.textMuted },
    card: {
      backgroundColor: palette.card,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 10,
      padding: 14
    },
    h1: { color: palette.text, fontSize: 18, fontWeight: "900" },
    sectionTitle: { color: palette.text, fontSize: 14, fontWeight: "900", marginTop: 4 },
    summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    summaryItem: {
      backgroundColor: palette.surface,
      borderRadius: 10,
      minWidth: 120,
      padding: 10
    },
    summaryLabel: { color: palette.textMuted, fontSize: 11, fontWeight: "800" },
    summaryValue: { color: palette.text, fontSize: 14, fontWeight: "900", marginTop: 3 },
    cropGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    cropChip: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 11,
      paddingVertical: 8
    },
    cropChipActive: { backgroundColor: palette.accent, borderColor: palette.accent },
    cropChipText: { color: palette.text, fontSize: 12, fontWeight: "800" },
    cropChipTextActive: { color: palette.accentText },
    saveButton: {
      alignItems: "center",
      alignSelf: "flex-start",
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      minHeight: 44,
      justifyContent: "center",
      paddingHorizontal: 14,
      paddingVertical: 10
    },
    saveButtonText: { color: palette.accentText, fontWeight: "900" },
    disabled: { opacity: 0.5 },
    feedback: { color: palette.text, fontWeight: "800" },
    empty: { alignItems: "center", gap: 8, paddingVertical: 26 },
    emptyTitle: { color: palette.text, fontSize: 16, fontWeight: "800" },
    workspaceGrid: { gap: 8, marginTop: 4 },
    workspaceAction: {
      alignItems: "center",
      backgroundColor: palette.surfaceMuted,
      borderRadius: 10,
      flexDirection: "row",
      justifyContent: "space-between",
      padding: 12
    },
    workspaceLabel: { color: palette.link, fontSize: 14, fontWeight: "800" },
    workspaceArrow: { color: palette.link, fontSize: 18, opacity: 0.75 }
  });
