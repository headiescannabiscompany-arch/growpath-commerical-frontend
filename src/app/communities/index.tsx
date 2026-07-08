import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import { joinGuild, leaveGuild, listGuilds, type Guild } from "@/api/communitySocial";
import { useAuth } from "@/auth/AuthContext";
import { InlineError } from "@/components/InlineError";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import { useApiErrorHandler, type UiErrorState } from "@/hooks/useApiErrorHandler";

type GuildRow = Guild & {
  members?: string[];
};

function rowId(row: GuildRow) {
  return String(row?._id || row?.id || "");
}

function userId(user: any) {
  return String(user?._id || user?.id || user?.userId || "");
}

function isJoined(guild: GuildRow, currentUserId: string) {
  if (guild.joined || guild.isMember) return true;
  if (!currentUserId || !Array.isArray(guild.members)) return false;
  return guild.members.map(String).includes(currentUserId);
}

function guildCategory(guild: GuildRow) {
  const text = `${guild.name || ""} ${guild.description || ""}`.toLowerCase();
  if (text.includes("cannabis") || text.includes("facility")) return "Cannabis";
  if (text.includes("fruit") || text.includes("tree") || text.includes("orchard"))
    return "Fruit trees";
  if (text.includes("vegetable") || text.includes("garden")) return "Gardening";
  if (text.includes("houseplant") || text.includes("indoor")) return "Houseplants";
  return "General";
}

export default function Communities() {
  const auth = useAuth();
  const mapApiError = useApiErrorHandler();
  const currentUserId = userId(auth.user);
  const [guilds, setGuilds] = useState<GuildRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState<UiErrorState | null>(null);
  const [feedback, setFeedback] = useState("");

  const load = useCallback(
    async (opts?: { refresh?: boolean }) => {
      if (opts?.refresh) setRefreshing(true);
      else setLoading(true);
      setFeedback("");
      try {
        setError(null);
        setGuilds((await listGuilds()) as GuildRow[]);
      } catch (e) {
        setError(mapApiError.toInlineError(e));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [mapApiError]
  );

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return guilds;
    return guilds.filter((guild) =>
      `${guild.name || ""} ${guild.description || ""} ${guildCategory(guild)}`
        .toLowerCase()
        .includes(needle)
    );
  }, [guilds, query]);

  const summary = useMemo(() => {
    const joined = guilds.filter((guild) => isJoined(guild, currentUserId)).length;
    const categories = new Set(guilds.map(guildCategory));
    const members = guilds.reduce(
      (sum, guild) => sum + Number(guild.memberCount || guild.members?.length || 0),
      0
    );
    return { total: guilds.length, joined, categories: categories.size, members };
  }, [currentUserId, guilds]);

  async function toggleGuild(guild: GuildRow) {
    const id = rowId(guild);
    if (!id) return;
    const joined = isJoined(guild, currentUserId);
    setSavingId(id);
    setFeedback("");
    try {
      setError(null);
      if (joined) {
        await leaveGuild(id);
        await load({ refresh: true });
        setFeedback(`Left ${guild.name || "guild"}.`);
      } else {
        await joinGuild(id);
        await load({ refresh: true });
        setFeedback(`Joined ${guild.name || "guild"}.`);
      }
    } catch (e) {
      setError(mapApiError.toInlineError(e));
    } finally {
      setSavingId("");
    }
  }

  return (
    <AppPage
      routeKey="communities"
      header={
        <View>
          <Text style={styles.headerTitle}>Communities</Text>
          <Text style={styles.headerSubtitle}>
            Browse guilds by crop and workflow so forum recommendations, courses, tools,
            and campaign placement targeting stay relevant.
          </Text>
        </View>
      }
    >
      {error ? <InlineError error={error} onRetry={() => void load()} /> : null}
      {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load({ refresh: true })}
          />
        }
        contentContainerStyle={styles.inner}
      >
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{summary.total}</Text>
            <Text style={styles.summaryLabel}>Guilds</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{summary.joined}</Text>
            <Text style={styles.summaryLabel}>Joined</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{summary.categories}</Text>
            <Text style={styles.summaryLabel}>Categories</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{summary.members}</Text>
            <Text style={styles.summaryLabel}>Members</Text>
          </View>
        </View>

        <TextInput
          value={query}
          onChangeText={setQuery}
          accessibilityLabel="Search communities"
          placeholder="Search by crop, category, or workflow"
          style={styles.input}
        />

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator />
            <Text style={styles.muted}>Loading communities...</Text>
          </View>
        ) : null}

        {!loading && filtered.length === 0 ? (
          <AppCard style={styles.emptyCard}>
            <Text style={styles.cardTitle}>No Matching Communities</Text>
            <Text style={styles.cardDesc}>
              Try another crop, method, or category. Guilds can still be selected during
              onboarding.
            </Text>
          </AppCard>
        ) : null}

        {filtered.map((guild) => {
          const id = rowId(guild);
          const joined = isJoined(guild, currentUserId);
          const saving = savingId === id;
          return (
            <AppCard key={id || guild.name}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{guild.name || "Guild"}</Text>
                <Text style={[styles.categoryPill, joined && styles.joinedPill]}>
                  {joined ? "Joined" : guildCategory(guild)}
                </Text>
              </View>
              <Text style={styles.cardDesc}>
                {guild.description || "No description yet."}
              </Text>
              <View style={styles.metaRow}>
                <Text style={styles.metaPill}>
                  {Number(guild.memberCount || guild.members?.length || 0)} members
                </Text>
                <Text style={styles.metaPill}>{guildCategory(guild)}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${joined ? "Leave" : "Join"} ${
                  guild.name || "guild"
                }`}
                disabled={saving}
                onPress={() => void toggleGuild(guild)}
                style={[
                  styles.actionButton,
                  joined && styles.secondaryButton,
                  saving && styles.disabledButton
                ]}
              >
                <Text style={styles.actionText}>
                  {saving ? "Saving..." : joined ? "Leave Guild" : "Join Guild"}
                </Text>
              </Pressable>
            </AppCard>
          );
        })}
      </ScrollView>
    </AppPage>
  );
}

const styles = StyleSheet.create({
  headerTitle: {
    color: "#0F172A",
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 4
  },
  headerSubtitle: {
    color: "#64748B",
    fontSize: 14,
    lineHeight: 20
  },
  inner: {
    gap: 14,
    paddingBottom: 28
  },
  feedback: {
    backgroundColor: "#DCFCE7",
    borderColor: "#86EFAC",
    borderRadius: 8,
    borderWidth: 1,
    color: "#166534",
    fontSize: 13,
    fontWeight: "800",
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  summaryCard: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E2E8F0",
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 148,
    padding: 12
  },
  summaryValue: {
    color: "#0F172A",
    fontSize: 20,
    fontWeight: "900"
  },
  summaryLabel: {
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
    textTransform: "uppercase"
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
    borderRadius: 8,
    borderWidth: 1,
    color: "#0F172A",
    fontSize: 14,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  loading: {
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
    paddingVertical: 28
  },
  muted: {
    color: "#64748B",
    fontSize: 13
  },
  emptyCard: {
    alignItems: "center",
    paddingVertical: 28
  },
  cardHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between"
  },
  cardTitle: {
    color: "#0F172A",
    flex: 1,
    fontSize: 16,
    fontWeight: "800"
  },
  cardDesc: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6
  },
  categoryPill: {
    backgroundColor: "#E0F2FE",
    borderRadius: 999,
    color: "#0369A1",
    fontSize: 12,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  joinedPill: {
    backgroundColor: "#D1FAE5",
    color: "#065F46"
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10
  },
  metaPill: {
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    color: "#334155",
    fontSize: 12,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 5
  },
  actionButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#2563EB",
    borderRadius: 8,
    minHeight: 40,
    justifyContent: "center",
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  secondaryButton: {
    backgroundColor: "#475569"
  },
  disabledButton: {
    opacity: 0.5
  },
  actionText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900"
  }
});
