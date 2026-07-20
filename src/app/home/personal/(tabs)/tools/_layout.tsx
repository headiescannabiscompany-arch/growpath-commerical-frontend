import React from "react";
import { Redirect, Stack, usePathname } from "expo-router";

import { isFeatureNavigable, personalToolFeatures } from "@/config/featureStatus";
import { useAuth } from "@/auth/AuthContext";
import { flattenGrowInterests } from "@/utils/growInterests";

const CANNABIS_TOOL_PATHS = new Set([
  "/home/personal/tools/crop-steering-project",
  "/home/personal/tools/pheno-hunt",
  "/home/personal/tools/pheno-matrix",
  "/home/personal/tools/dry-cure-guard",
  "/home/personal/tools/clone-rooting",
  "/home/personal/tools/harvest-readiness"
]);

export function canOpenCannabisTool(
  pathname: string,
  growInterests: any,
  cannabisVisibility?: string
) {
  if (!CANNABIS_TOOL_PATHS.has(pathname)) return true;
  if (String(cannabisVisibility || "").toLowerCase() === "show") return true;
  return flattenGrowInterests(growInterests).some(
    (interest) => String(interest).toLowerCase() === "cannabis"
  );
}

export default function ToolsLayout() {
  const pathname = usePathname();
  const auth = useAuth();
  const matchedTool = personalToolFeatures.find(
    (feature) => feature.href && pathname === feature.href
  );

  if (matchedTool && !isFeatureNavigable(matchedTool, { allowBetaSurfaces: true })) {
    return <Redirect href="/home/personal/tools" />;
  }
  if (
    !canOpenCannabisTool(
      pathname,
      auth.user?.growInterests,
      auth.user?.contentControls?.cannabisVisibility
    )
  ) {
    return <Redirect href="/home/personal/tools" />;
  }

  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Tools / AI" }} />
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
        options={{ title: "Product / Ingredient Library" }}
      />
      <Stack.Screen name="npk" options={{ title: "Nutrient Mix Builder" }} />
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
      <Stack.Screen name="saved-runs" options={{ title: "Saved Tool Runs" }} />
      <Stack.Screen name="pheno-matrix" options={{ title: "Pheno Matrix" }} />
      <Stack.Screen name="soil-builder" options={{ title: "Soil Mix Builder" }} />
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
