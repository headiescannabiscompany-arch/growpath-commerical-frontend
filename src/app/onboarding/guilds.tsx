import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { joinGuild, listGuilds, type Guild } from "@/api/communitySocial";
import { updateGrowInterests } from "@/api/users";
import { INTEREST_TIERS } from "@/config/interests";
import { radius } from "@/theme/theme";

type InterestMap = Record<string, string[]>;

function rowId(row: Guild) {
  return String(row?._id || row?.id || "");
}

function singleParam(value?: string | string[]) {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

function toggle(map: InterestMap, tier: string, option: string): InterestMap {
  const current = Array.isArray(map[tier]) ? map[tier] : [];
  const nextTier = current.includes(option)
    ? current.filter((item) => item !== option)
    : [...current, option];
  return { ...map, [tier]: nextTier };
}

export default function GuildOnboardingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    next?: string | string[];
    mode?: string | string[];
    plan?: string | string[];
  }>();
  const next = singleParam(params.next) || "/";
  const mode = singleParam(params.mode);
  const plan = singleParam(params.plan);
  const { width } = useWindowDimensions();
  const isWide = width >= 900;

  const [interests, setInterests] = useState<InterestMap>({});
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [selectedGuildIds, setSelectedGuildIds] = useState<string[]>([]);
  const [loadingGuilds, setLoadingGuilds] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const rows = await listGuilds();
        if (mounted) setGuilds(rows);
      } catch (e: any) {
        if (mounted) setError(e?.message || "Unable to load forum groups.");
      } finally {
        if (mounted) setLoadingGuilds(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const cropTier = INTEREST_TIERS.find((tier) => tier.id === "crops");
  const secondaryTiers = INTEREST_TIERS.filter((tier) =>
    ["environment", "methods", "experience"].includes(tier.id)
  );
  const selectedCrops = useMemo(() => interests.crops || [], [interests.crops]);
  const canContinue = selectedCrops.length > 0 && !saving;

  const recommendedGuilds = useMemo(() => {
    if (!selectedCrops.length) return guilds;
    const crops = selectedCrops.map((crop) => crop.toLowerCase());
    return guilds.filter((guild) => {
      const haystack = `${guild.name || ""} ${guild.description || ""}`.toLowerCase();
      return crops.some((crop) => haystack.includes(crop.split(" ")[0]));
    });
  }, [guilds, selectedCrops]);

  function toggleGuild(id: string) {
    setSelectedGuildIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  }

  async function save() {
    if (!canContinue) {
      setError("Select at least one crop or plant category.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await updateGrowInterests(interests);
      for (const id of selectedGuildIds) {
        await joinGuild(id);
      }
      if (next === "/onboarding/walkthroughs") {
        router.replace({
          pathname: "/onboarding/walkthroughs",
          params: { mode, plan }
        } as any);
      } else {
        router.replace(next as any);
      }
    } catch (e: any) {
      setError(e?.message || "Unable to save forum group selections.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={[styles.shell, isWide ? styles.shellWide : null]}>
        <View style={styles.main}>
          <Text style={styles.kicker}>Forum/Q&A routing</Text>
          <Text style={styles.title}>Select your forum groups</Text>
          <Text style={styles.subtitle}>
            Choose what you grow first. This keeps cannabis facility content, fruit-tree
            gardening, houseplants, and other discussion spaces separated.
          </Text>

          {cropTier ? (
            <View style={styles.panel}>
              <Text style={styles.panelTitle}>{cropTier.label}</Text>
              <View style={styles.chips}>
                {cropTier.options.map((option) => {
                  const active = selectedCrops.includes(option);
                  return (
                    <Pressable
                      key={option}
                      onPress={() =>
                        setInterests((prev) => toggle(prev, "crops", option))
                      }
                      accessibilityRole="button"
                      accessibilityLabel={`${active ? "Remove" : "Select"} ${option}`}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {option}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          {secondaryTiers.map((tier) => (
            <View key={tier.id} style={styles.panel}>
              <Text style={styles.panelTitle}>{tier.label}</Text>
              <View style={styles.chips}>
                {tier.options.map((option) => {
                  const active = (interests[tier.id] || []).includes(option);
                  return (
                    <Pressable
                      key={option}
                      onPress={() =>
                        setInterests((prev) => toggle(prev, tier.id, option))
                      }
                      accessibilityRole="button"
                      accessibilityLabel={`${active ? "Remove" : "Select"} ${option}`}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {option}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </View>

        <View style={[styles.side, isWide ? styles.sideWide : null]}>
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Recommended forum groups</Text>
            <Text style={styles.panelCopy}>
              Optional memberships based on your crop selections.
            </Text>

            {loadingGuilds ? (
              <View style={styles.loading}>
                <ActivityIndicator />
                <Text style={styles.muted}>Loading forum groups...</Text>
              </View>
            ) : null}

            {!loadingGuilds && !recommendedGuilds.length ? (
              <Text style={styles.muted}>No matching forum groups yet.</Text>
            ) : null}

            {recommendedGuilds.slice(0, 8).map((guild) => {
              const id = rowId(guild);
              const active = selectedGuildIds.includes(id);
              return (
                <Pressable
                  key={id || guild.name}
                  onPress={() => id && toggleGuild(id)}
                  accessibilityRole="button"
                  accessibilityLabel={`${active ? "Leave" : "Join"} ${
                    guild.name || "forum group"
                  }`}
                  style={[styles.guildRow, active && styles.guildRowActive]}
                >
                  <Text style={styles.guildTitle}>{guild.name || "Forum group"}</Text>
                  <Text style={styles.guildMeta}>
                    {guild.description || "No description"} | {guild.memberCount || 0}{" "}
                    members
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            onPress={save}
            disabled={!canContinue}
            accessibilityRole="button"
            accessibilityLabel="Continue after selecting forum groups"
            style={[styles.button, !canContinue && styles.buttonDisabled]}
          >
            {saving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>Continue{mode ? ` as ${mode}` : ""}</Text>
            )}
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: "#f4f6f3", flex: 1 },
  content: { alignItems: "center", padding: 16, paddingBottom: 32 },
  shell: { gap: 14, maxWidth: 1180, width: "100%" },
  shellWide: { alignItems: "flex-start", flexDirection: "row", gap: 18 },
  main: { flex: 1, minWidth: 0 },
  side: { gap: 12, width: "100%" },
  sideWide: { width: 390 },
  kicker: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 6,
    textTransform: "uppercase"
  },
  title: { color: "#111827", fontSize: 34, fontWeight: "900", marginBottom: 8 },
  subtitle: {
    color: "#475569",
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22,
    marginBottom: 14,
    maxWidth: 760
  },
  panel: {
    backgroundColor: "#ffffff",
    borderColor: "#d7ddd2",
    borderRadius: radius.card,
    borderWidth: 1,
    marginBottom: 12,
    padding: 14
  },
  panelTitle: { color: "#111827", fontSize: 17, fontWeight: "900", marginBottom: 8 },
  panelCopy: { color: "#64748b", fontWeight: "700", lineHeight: 20, marginBottom: 10 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    backgroundColor: "#f8fafc",
    borderColor: "#cbd5e1",
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 8
  },
  chipActive: { backgroundColor: "#166534", borderColor: "#166534" },
  chipText: { color: "#334155", fontSize: 12, fontWeight: "800" },
  chipTextActive: { color: "#ffffff" },
  loading: { alignItems: "center", gap: 8, paddingVertical: 12 },
  muted: { color: "#64748b", fontWeight: "700" },
  guildRow: {
    borderColor: "#e2e8f0",
    borderRadius: radius.card,
    borderWidth: 1,
    marginBottom: 8,
    padding: 10
  },
  guildRowActive: { borderColor: "#166534", borderWidth: 2 },
  guildTitle: { color: "#111827", fontWeight: "900", marginBottom: 4 },
  guildMeta: { color: "#64748b", fontSize: 12, fontWeight: "700" },
  error: { color: "#b91c1c", fontWeight: "800" },
  button: {
    alignItems: "center",
    backgroundColor: "#166534",
    borderRadius: radius.card,
    paddingVertical: 12
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#ffffff", fontWeight: "900" }
});
