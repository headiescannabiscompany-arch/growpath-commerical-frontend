import React, { useEffect, useMemo, useState } from "react";
import { Link, Redirect, Stack, useLocalSearchParams, usePathname } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { isFeatureNavigable, personalToolFeatures } from "@/config/featureStatus";
import { useAuth } from "@/auth/AuthContext";
import { flattenGrowInterests } from "@/utils/growInterests";
import { listPersonalGrows, type PersonalGrow } from "@/api/grows";
import { coerceParam, isCannabisGrow } from "@/features/grows/routeUtils";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";

const CANNABIS_TOOL_PATHS = new Set([
  "/home/personal/tools/crop-steering-project",
  "/home/personal/tools/pheno-hunt",
  "/home/personal/tools/pheno-matrix",
  "/home/personal/tools/dry-cure-guard",
  "/home/personal/tools/clone-rooting",
  "/home/personal/tools/genetics-inventory",
  "/home/personal/tools/harvest-estimator",
  "/home/personal/tools/harvest-readiness",
  "/home/personal/tools/auto-grow-calendar"
]);

export function isCannabisToolPath(pathname: string) {
  return CANNABIS_TOOL_PATHS.has(pathname);
}

function hasCannabisLabel(values: unknown[]) {
  return values.some((value) => /\b(cannabis|hemp)\b/i.test(String(value || "")));
}

export function canOpenCannabisTool(
  pathname: string,
  growInterests: any,
  cannabisVisibility?: string,
  grow?: PersonalGrow | null,
  accountPurpose?: unknown
) {
  if (!isCannabisToolPath(pathname)) return true;
  if (String(cannabisVisibility || "").toLowerCase() === "show") return true;
  if (hasCannabisLabel(flattenGrowInterests(growInterests))) return true;
  if (
    hasCannabisLabel(Array.isArray(accountPurpose) ? accountPurpose : [accountPurpose])
  ) {
    return true;
  }
  return isCannabisGrow(grow);
}

export function CannabisToolAccessNotice() {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createCannabisToolAccessStyles(palette), [palette]);

  return (
    <View style={styles.accessPage}>
      <View
        accessibilityRole="alert"
        style={styles.accessNotice}
        testID="cannabis-tool-access-notice"
      >
        <Text style={styles.accessTitle}>Cannabis tool access is off</Text>
        <Text style={styles.accessBody}>
          Harvest, dry/cure, genetics, and other cannabis-specific tools stay hidden
          unless this Personal account shows cannabis content or the tool is opened from a
          cannabis grow.
        </Text>
        <Text style={styles.accessBody}>
          Open Profile to review cannabis visibility, or return to AI Tools for workflows
          that do not require cannabis access.
        </Text>
        <View style={styles.accessLinks}>
          <Link href="/home/personal/profile" style={styles.accessLink}>
            Open Profile
          </Link>
          <Link href="/home/personal/tools" style={styles.accessLink}>
            Back to AI Tools
          </Link>
        </View>
      </View>
    </View>
  );
}

export default function ToolsLayout() {
  const pathname = usePathname();
  const params = useLocalSearchParams<{ growId?: string | string[] }>();
  const growId = coerceParam(params.growId);
  const auth = useAuth();
  const [routeGrow, setRouteGrow] = useState<PersonalGrow | null | undefined>(
    growId ? undefined : null
  );
  const matchedTool = personalToolFeatures.find(
    (feature) => feature.href && pathname === feature.href
  );

  useEffect(() => {
    let active = true;
    if (!growId || !isCannabisToolPath(pathname)) {
      setRouteGrow(null);
      return () => {
        active = false;
      };
    }
    setRouteGrow(undefined);
    listPersonalGrows()
      .then((grows) => {
        if (!active) return;
        setRouteGrow(
          grows.find((grow) => String(grow.id || (grow as any)._id || "") === growId) ||
            null
        );
      })
      .catch(() => {
        if (active) setRouteGrow(null);
      });
    return () => {
      active = false;
    };
  }, [growId, pathname]);

  if (matchedTool && !isFeatureNavigable(matchedTool, { allowBetaSurfaces: true })) {
    return <Redirect href="/home/personal/tools" />;
  }
  if (
    isCannabisToolPath(pathname) &&
    (auth.isHydrating || auth.meStatus === "idle" || auth.meStatus === "loading")
  ) {
    return null;
  }
  if (growId && isCannabisToolPath(pathname) && routeGrow === undefined) return null;
  if (
    !canOpenCannabisTool(
      pathname,
      auth.user?.growInterests,
      auth.user?.cannabisVisibility ||
        (auth.user as any)?.contentControls?.cannabisVisibility,
      routeGrow,
      (auth.user as any)?.accountPurpose
    )
  ) {
    return <CannabisToolAccessNotice />;
  }

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="vpd" options={{ title: "VPD Calculator" }} />
      <Stack.Screen name="dew-point-guard" options={{ title: "Dew Point Guard" }} />
      <Stack.Screen
        name="environment-analysis"
        options={{ title: "Environment Review" }}
      />
      <Stack.Screen name="integrations" options={{ title: "Data Integrations" }} />
      <Stack.Screen name="ppfd" options={{ title: "PPFD / DLI Planner" }} />
      <Stack.Screen name="bud-rot-risk" options={{ title: "Bud Rot Risk" }} />
      <Stack.Screen name="nutrient-chemistry" options={{ title: "Nutrient Chemistry" }} />
      <Stack.Screen
        name="nutrient-source-comparison"
        options={{ title: "Nutrient Source Comparison" }}
      />
      <Stack.Screen
        name="ingredient-library"
        options={{ title: "Products & Label Library", headerShown: false }}
      />
      <Stack.Screen
        name="npk"
        options={{ title: "Nutrient Mix Builder", headerShown: false }}
      />
      <Stack.Screen name="watering" options={{ title: "Watering Planner" }} />
      <Stack.Screen
        name="feeding-schedule"
        options={{ title: "Feeding Schedule Planner" }}
      />
      <Stack.Screen
        name="harvest-estimator"
        options={{ title: "Harvest Readiness AI" }}
      />
      <Stack.Screen name="timeline-planner" options={{ title: "Timeline Planner" }} />
      <Stack.Screen name="pdf-export" options={{ title: "PDF / Export" }} />
      <Stack.Screen name="saved-runs" options={{ headerShown: false }} />
      <Stack.Screen name="pheno-matrix" options={{ title: "Pheno Matrix" }} />
      <Stack.Screen
        name="soil-builder"
        options={{ title: "Soil Mix Builder", headerShown: false }}
      />
      <Stack.Screen name="recipe-builder" options={{ title: "Mix Builders" }} />
      <Stack.Screen
        name="dry-amendment-mix"
        options={{ title: "Dry Amendment Mix Builder" }}
      />
      <Stack.Screen name="topdress" options={{ title: "Topdress Planner" }} />
      <Stack.Screen name="ph-ec" options={{ title: "pH / EC Range Check" }} />
      <Stack.Screen
        name="crop-steering-project"
        options={{ title: "Crop Steering Projects" }}
      />
      <Stack.Screen name="stress-test" options={{ title: "Stress Testing" }} />
      <Stack.Screen name="pheno-hunt" options={{ title: "Pheno Hunting" }} />
      <Stack.Screen name="genetics-inventory" options={{ title: "Genetics Notes" }} />
      <Stack.Screen name="tissue-culture" options={{ title: "Tissue Culture" }} />
      <Stack.Screen name="dry-cure-guard" options={{ title: "Dry / Cure Guard" }} />
      <Stack.Screen name="clone-rooting" options={{ title: "Clone Rooting" }} />
      <Stack.Screen name="ipm-scout" options={{ title: "IPM Scout" }} />
      <Stack.Screen name="species-crop-id" options={{ title: "Species / Crop ID" }} />
      <Stack.Screen name="harvest-readiness" options={{ title: "Harvest Readiness" }} />
      <Stack.Screen name="run-comparison" options={{ title: "Run-To-Run Comparison" }} />
      <Stack.Screen name="auto-grow-calendar" options={{ title: "Auto Grow Calendar" }} />
      <Stack.Screen
        name="soil-nutrient-batch"
        options={{ title: "Soil & Nutrient Batch Planner" }}
      />
    </Stack>
  );
}

export const createCannabisToolAccessStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    accessPage: {
      alignItems: "center",
      backgroundColor: palette.page,
      flex: 1
    },
    accessNotice: {
      alignSelf: "center",
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.warning,
      borderRadius: 14,
      borderWidth: 1,
      gap: 10,
      margin: 20,
      maxWidth: 620,
      padding: 18,
      width: "90%"
    },
    accessTitle: { color: palette.warning, fontSize: 20, fontWeight: "800" },
    accessBody: { color: palette.textSoft, fontSize: 15, lineHeight: 22 },
    accessLinks: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    accessLink: {
      backgroundColor: palette.accent,
      borderRadius: 10,
      color: palette.accentText,
      fontWeight: "800",
      paddingHorizontal: 14,
      paddingVertical: 10
    }
  });
