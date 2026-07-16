import React, { useEffect, useMemo, useState } from "react";
import { Href, Link, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import TokenBalanceWidget from "@/components/TokenBalanceWidget";
import { listPersonalGrows } from "@/api/grows";
import { useAuth } from "@/auth/AuthContext";
import FeedBanner from "@/components/feed/FeedBanner";
import {
  FeatureArea,
  FeatureDefinition,
  PREVIEW_TOOL_STATUS,
  getNavigablePersonalTools
} from "@/config/featureStatus";
import { useEntitlements } from "@/entitlements";
import { radius } from "@/theme/theme";
import { getFeedBannerPolicy } from "@/utils/feedPolicy";
import { hasLocalPaidPreviewOverride } from "@/utils/localPaidPreview";
import { flattenGrowInterests, normalizeInterestList } from "@/utils/growInterests";

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  content: { padding: 20, paddingBottom: 40 },
  header: { marginBottom: 16 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 6 },
  subtitle: { fontSize: 14, color: "#64748B" },
  context: {
    borderWidth: 1,
    borderColor: "#DCFCE7",
    borderRadius: radius.card,
    backgroundColor: "#F0FDF4",
    padding: 10,
    marginTop: 12
  },
  contextText: { color: "#166534", fontWeight: "700" },
  section: { marginTop: 24 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
    textTransform: "uppercase"
  },
  grid: { gap: 10, marginTop: 10 },
  card: {
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: radius.card,
    backgroundColor: "#F8FAFC"
  },
  cardLocked: { opacity: 0.65 },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: "700" },
  locked: { fontSize: 12, color: "#991B1B", fontWeight: "700" },
  cardDesc: { fontSize: 14, color: "#475569" },
  link: { marginTop: 10, fontSize: 14, fontWeight: "700", color: "#166534" },
  lockedText: { marginTop: 10, fontSize: 14, fontWeight: "700", color: "#991B1B" },
  utilityRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  utilityButton: {
    borderWidth: 1,
    borderColor: "#166534",
    borderRadius: radius.card,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  utilityText: { color: "#166534", fontWeight: "800" }
});

function coerceParam(value?: string | string[]) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0] || "";
  return "";
}

function hrefWithGrow(path: string, growId: string) {
  if (!growId) return path;
  const glue = path.includes("?") ? "&" : "?";
  return `${path}${glue}growId=${encodeURIComponent(growId)}`;
}

const AREA_ORDER: FeatureArea[] = [
  "plant_health",
  "water_nutrients",
  "environment",
  "crop_management",
  "planning_records",
  "genetics",
  "lab_tc",
  "integrations",
  "business_production"
];

const AREA_LABELS: Record<FeatureArea, string> = {
  personal_navigation: "Navigation",
  environment: "Environment",
  water_nutrients: "Recipe / Nutrients",
  plant_health: "Plant Health & AI",
  crop_management: "Crop Management",
  planning_records: "Planning & Records",
  genetics: "Genetics & Selection",
  lab_tc: "Lab / Tissue Culture",
  integrations: "Integrations",
  business_production: "Products & Production"
};

const PRIMARY_TOOL_KEYS = new Set(["tools.ai_assistant", "tools.ai_diagnosis"]);
const CANNABIS_FOCUSED_TOOL_KEYS = new Set([
  "tools.crop_steering_projects",
  "tools.pheno_hunting",
  "tools.pheno_matrix",
  "tools.dry_cure_guard",
  "tools.clone_rooting",
  "tools.harvest_readiness_ai"
]);
const SOIL_FOCUSED_TOOL_KEYS = new Set([
  "tools.soil_builder",
  "tools.dry_amendment_mix",
  "tools.topdress_planner",
  "tools.soil_nutrient_batch_planner"
]);

function toolMatchesInterests(tool: FeatureDefinition, interests: string[]) {
  if (!interests.length) return true;
  const selected = new Set(interests.map((item) => item.toLowerCase()));
  const growsCannabis = selected.has("cannabis");
  const soilMethod = Array.from(selected).some((item) =>
    /soil|no-till|organic|amended/.test(item)
  );
  const hydroOnly =
    (selected.has("hydroponics") || selected.has("aeroponics")) && !soilMethod;

  if (CANNABIS_FOCUSED_TOOL_KEYS.has(tool.key) && !growsCannabis) return false;
  if (SOIL_FOCUSED_TOOL_KEYS.has(tool.key) && hydroOnly) return false;
  return true;
}

function ToolCard({
  tool,
  growId,
  enabled
}: {
  tool: FeatureDefinition;
  growId: string;
  enabled: boolean;
}) {
  const href = tool.acceptsGrowContext
    ? hrefWithGrow(tool.href || "", growId)
    : tool.href || "";

  return (
    <View style={[styles.card, !enabled && styles.cardLocked]}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{tool.title}</Text>
        {!enabled ? <Text style={styles.locked}>Locked</Text> : null}
      </View>
      <Text style={styles.cardDesc}>{tool.description}</Text>
      {enabled ? (
        <>
          <Link href={href as Href} style={styles.link} asChild>
            <Text>Open</Text>
          </Link>
          <Link
            href={
              hrefWithGrow(
                `/home/personal/ai?prompt=${encodeURIComponent(
                  `Help me use ${tool.title} as part of my grow workflow.`
                )}`,
                growId
              ) as Href
            }
            style={styles.link}
            asChild
          >
            <Text>Ask AI to guide this workflow</Text>
          </Link>
        </>
      ) : (
        <Text style={styles.lockedText}>Upgrade to unlock</Text>
      )}
    </View>
  );
}

export default function ToolsHubScreen() {
  const { growId: rawGrowId, devPlan: rawDevPlan } = useLocalSearchParams<{
    growId?: string | string[];
    devPlan?: string | string[];
  }>();
  const growId = useMemo(() => coerceParam(rawGrowId), [rawGrowId]);
  const devPlan = useMemo(() => coerceParam(rawDevPlan).toLowerCase(), [rawDevPlan]);
  const entitlements = useEntitlements();
  const auth = useAuth();
  const devPaidOverride = hasLocalPaidPreviewOverride(devPlan);
  const plan = devPaidOverride ? "pro" : entitlements.plan || "free";
  const isFreePlan = !devPaidOverride && String(plan).toLowerCase() === "free";
  const [activeGrowInterests, setActiveGrowInterests] = useState<string[]>([]);
  const profileInterests = useMemo(
    () => flattenGrowInterests(auth.user?.growInterests || {}),
    [auth.user?.growInterests]
  );
  useEffect(() => {
    let alive = true;
    if (!growId) {
      setActiveGrowInterests([]);
      return () => {
        alive = false;
      };
    }
    listPersonalGrows()
      .then((grows) => {
        if (!alive) return;
        const grow = grows.find(
          (item: any) => String(item?.id || item?._id || "") === growId
        );
        const tags = [
          ...normalizeInterestList((grow as any)?.growTags),
          ...flattenGrowInterests((grow as any)?.growInterests || {})
        ];
        setActiveGrowInterests(Array.from(new Set(tags)));
      })
      .catch(() => {
        if (alive) setActiveGrowInterests([]);
      });
    return () => {
      alive = false;
    };
  }, [growId]);
  const selectedInterests = activeGrowInterests.length
    ? activeGrowInterests
    : profileInterests;
  const tools = getNavigablePersonalTools({ allowBetaSurfaces: true }).filter((tool) =>
    toolMatchesInterests(tool, selectedInterests)
  );
  const primaryTools = tools.filter((tool) => PRIMARY_TOOL_KEYS.has(tool.key));
  const bannerPolicy = getFeedBannerPolicy({
    routeKey: "personal_tools_hub",
    plan,
    mode: entitlements.mode,
    longContent: true
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Tools / AI</Text>
        <Text style={styles.subtitle}>
          Ask AI, diagnose plants, build recipes, analyze environment risk, and save
          outputs back to a grow.
        </Text>
        <View style={styles.context}>
          <Text style={styles.contextText}>
            {isFreePlan
              ? "Free plan: Ask AI and Plant Diagnose include a limited weekly AI-credit allowance."
              : "AI-credit balance and usage are managed from Profile."}
          </Text>
        </View>
        {growId ? (
          <View style={styles.context}>
            <Text style={styles.contextText}>Grow context active: {growId}</Text>
          </View>
        ) : null}
        {selectedInterests.length ? (
          <View style={styles.context}>
            <Text style={styles.contextText}>
              Workflow interests: {selectedInterests.join(" | ")}
            </Text>
          </View>
        ) : null}
        <TokenBalanceWidget />
        <View style={styles.utilityRow}>
          <Link href={hrefWithGrow("/home/personal/ai", growId) as Href} asChild>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open personal Ask AI"
              style={styles.utilityButton}
            >
              <Text style={styles.utilityText}>Ask AI</Text>
            </Pressable>
          </Link>
          <Link
            href={hrefWithGrow("/home/personal/tools/saved-runs", growId) as Href}
            asChild
          >
            <Pressable style={styles.utilityButton}>
              <Text style={styles.utilityText}>Saved Runs</Text>
            </Pressable>
          </Link>
          <Link href={"/home/personal/tools/npk" as Href} asChild>
            <Pressable style={styles.utilityButton}>
              <Text style={styles.utilityText}>Recipes</Text>
            </Pressable>
          </Link>
          <Link href={"/home/personal/tools/ingredient-library" as Href} asChild>
            <Pressable style={styles.utilityButton}>
              <Text style={styles.utilityText}>Ingredients</Text>
            </Pressable>
          </Link>
        </View>
      </View>

      {bannerPolicy.top ? (
        <FeedBanner
          placement="top"
          slots={bannerPolicy.slotsByPlacement.top}
          mode={entitlements.mode}
          plan={plan}
          railMode={bannerPolicy.railMode}
        />
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Start Here</Text>
        <View style={styles.grid}>
          {primaryTools.map((tool) => (
            <ToolCard
              key={tool.key}
              tool={tool}
              growId={growId}
              enabled={
                devPaidOverride ||
                !tool.capabilityKey ||
                entitlements.can(tool.capabilityKey) ||
                PRIMARY_TOOL_KEYS.has(tool.key)
              }
            />
          ))}
        </View>
      </View>

      {AREA_ORDER.map((area, index) => {
        const areaTools = tools.filter(
          (tool) => tool.area === area && !PRIMARY_TOOL_KEYS.has(tool.key)
        );
        if (!areaTools.length) return null;

        return (
          <React.Fragment key={area}>
            {bannerPolicy.middle && index === 3 ? (
              <FeedBanner
                placement="middle"
                slots={bannerPolicy.slotsByPlacement.middle}
                mode={entitlements.mode}
                plan={plan}
                railMode={bannerPolicy.railMode}
              />
            ) : null}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{AREA_LABELS[area]}</Text>
              <View style={styles.grid}>
                {areaTools.map((tool) => (
                  <ToolCard
                    key={tool.key}
                    tool={tool}
                    growId={growId}
                    enabled={
                      devPaidOverride ||
                      (!(tool.status === PREVIEW_TOOL_STATUS && isFreePlan) &&
                        (!tool.capabilityKey || entitlements.can(tool.capabilityKey)))
                    }
                  />
                ))}
              </View>
            </View>
          </React.Fragment>
        );
      })}

      {bannerPolicy.bottom ? (
        <FeedBanner
          placement="bottom"
          slots={bannerPolicy.slotsByPlacement.bottom}
          mode={entitlements.mode}
          plan={plan}
          railMode={bannerPolicy.railMode}
        />
      ) : null}
    </ScrollView>
  );
}
