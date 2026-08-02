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
import { useAuth } from "@/auth/AuthContext";
import { INTEREST_TIERS } from "@/config/interests";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { radius } from "@/theme/theme";
import { parseClaimReturnPath } from "@/utils/claimReturnPath";

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
  const auth = useAuth();
  const { palette } = useAppTheme();
  const styles = createGuildOnboardingStyles(palette);
  const router = useRouter();
  const params = useLocalSearchParams<{
    next?: string | string[];
    mode?: string | string[];
    plan?: string | string[];
  }>();
  const requestedNext = singleParam(params.next);
  const claimNext = parseClaimReturnPath(requestedNext);
  const next = claimNext
    ? claimNext
    : ["/", "/home/personal", "/onboarding/walkthroughs"].includes(requestedNext)
      ? requestedNext
      : "/";
  const mode = singleParam(params.mode);
  const plan = singleParam(params.plan);
  const { width } = useWindowDimensions();
  const isWide = width >= 900;

  const [interests, setInterests] = useState<InterestMap>(
    (auth.user?.growInterests as InterestMap) || {}
  );
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
      await auth.retryMe();
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
          <Text accessibilityRole="header" aria-level={1} style={styles.title}>
            Select your forum groups
          </Text>
          <Text style={styles.subtitle}>
            Choose what you grow first. This keeps cannabis facility content, fruit-tree
            gardening, houseplants, and other discussion spaces separated.
          </Text>

          {cropTier ? (
            <View style={styles.panel}>
              <Text accessibilityRole="header" aria-level={2} style={styles.panelTitle}>
                {cropTier.label}
              </Text>
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
              <Text accessibilityRole="header" aria-level={2} style={styles.panelTitle}>
                {tier.label}
              </Text>
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
            <Text accessibilityRole="header" aria-level={2} style={styles.panelTitle}>
              Recommended forum groups
            </Text>
            <Text style={styles.panelCopy}>
              Optional memberships based on your crop selections.
            </Text>

            {loadingGuilds ? (
              <View style={styles.loading}>
                <ActivityIndicator color={palette.accent} />
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
              <ActivityIndicator color={palette.accentText} />
            ) : (
              <Text style={styles.buttonText}>Continue{mode ? ` as ${mode}` : ""}</Text>
            )}
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

export const createGuildOnboardingStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    root: { backgroundColor: palette.page, flex: 1 },
    content: { alignItems: "center", padding: 16, paddingBottom: 32 },
    shell: { gap: 14, maxWidth: 1180, width: "100%" },
    shellWide: { alignItems: "flex-start", flexDirection: "row", gap: 18 },
    main: { flex: 1, minWidth: 0 },
    side: { gap: 12, width: "100%" },
    sideWide: { width: 390 },
    kicker: {
      color: palette.accent,
      fontSize: 12,
      fontWeight: "900",
      marginBottom: 6,
      textTransform: "uppercase"
    },
    title: { color: palette.text, fontSize: 34, fontWeight: "900", marginBottom: 8 },
    subtitle: {
      color: palette.textSoft,
      fontSize: 15,
      fontWeight: "700",
      lineHeight: 22,
      marginBottom: 14,
      maxWidth: 760
    },
    panel: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      marginBottom: 12,
      padding: 14
    },
    panelTitle: { color: palette.text, fontSize: 17, fontWeight: "900", marginBottom: 8 },
    panelCopy: {
      color: palette.textMuted,
      fontWeight: "700",
      lineHeight: 20,
      marginBottom: 10
    },
    chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    chip: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.pill,
      borderWidth: 1,
      paddingHorizontal: 11,
      paddingVertical: 8
    },
    chipActive: { backgroundColor: palette.accent, borderColor: palette.accent },
    chipText: { color: palette.textSoft, fontSize: 12, fontWeight: "800" },
    chipTextActive: { color: palette.accentText },
    loading: { alignItems: "center", gap: 8, paddingVertical: 12 },
    muted: { color: palette.textMuted, fontWeight: "700" },
    guildRow: {
      borderColor: palette.borderSoft,
      borderRadius: radius.card,
      borderWidth: 1,
      marginBottom: 8,
      padding: 10
    },
    guildRowActive: { borderColor: palette.accent, borderWidth: 2 },
    guildTitle: { color: palette.text, fontWeight: "900", marginBottom: 4 },
    guildMeta: { color: palette.textMuted, fontSize: 12, fontWeight: "700" },
    error: { color: palette.danger, fontWeight: "800" },
    button: {
      alignItems: "center",
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      paddingVertical: 12
    },
    buttonDisabled: { opacity: 0.5 },
    buttonText: { color: palette.accentText, fontWeight: "900" }
  });
