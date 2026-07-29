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

import {
  createGuild,
  joinGuild,
  leaveGuild,
  listGuilds,
  type Guild
} from "@/api/communitySocial";
import { useAuth } from "@/auth/AuthContext";
import { InlineError } from "@/components/InlineError";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import { useApiErrorHandler, type UiErrorState } from "@/hooks/useApiErrorHandler";
import { radius } from "@/theme/theme";

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
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [groupTopics, setGroupTopics] = useState("");
  const [groupIsPublic, setGroupIsPublic] = useState(true);
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
        setFeedback(`Left ${guild.name || "forum group"}.`);
      } else {
        await joinGuild(id);
        await load({ refresh: true });
        setFeedback(`Joined ${guild.name || "forum group"}.`);
      }
    } catch (e) {
      setError(mapApiError.toInlineError(e));
    } finally {
      setSavingId("");
    }
  }

  async function submitGroup() {
    const name = groupName.trim();
    const description = groupDescription.trim();
    if (!name || !description || creating) return;

    setCreating(true);
    setFeedback("");
    try {
      setError(null);
      await createGuild({
        name,
        description,
        topics: groupTopics
          .split(",")
          .map((topic) => topic.trim())
          .filter(Boolean),
        isPublic: groupIsPublic
      });
      setGroupName("");
      setGroupDescription("");
      setGroupTopics("");
      setGroupIsPublic(true);
      setShowCreate(false);
      await load({ refresh: true });
      setFeedback(
        `${name} was created. You can now invite growers and start discussions.`
      );
    } catch (e) {
      setError(mapApiError.toInlineError(e));
    } finally {
      setCreating(false);
    }
  }

  return (
    <AppPage
      routeKey="communities"
      header={
        <View>
          <Text style={styles.headerTitle}>Forum Directory</Text>
          <Text style={styles.headerSubtitle}>
            Browse discussion groups by crop and workflow so Forum/Q&A recommendations,
            courses, tools, and campaign placement targeting stay relevant.
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
        <AppCard style={styles.createCard}>
          <View style={styles.createHeader}>
            <View style={styles.createIntro}>
              <Text style={styles.cardTitle}>Start a Forum group</Text>
              <Text style={styles.cardDesc}>
                Create a focused space for a crop, method, product, course, or grow
                workflow.
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                showCreate ? "Cancel creating forum group" : "Create forum group"
              }
              accessibilityState={{ expanded: showCreate }}
              onPress={() => setShowCreate((current) => !current)}
              style={[styles.actionButton, showCreate && styles.secondaryButton]}
            >
              <Text style={styles.actionText}>
                {showCreate ? "Cancel" : "Create Group"}
              </Text>
            </Pressable>
          </View>

          {showCreate ? (
            <View style={styles.createForm}>
              <Text style={styles.fieldLabel}>Group name</Text>
              <TextInput
                value={groupName}
                onChangeText={setGroupName}
                accessibilityLabel="Forum group name"
                maxLength={80}
                placeholder="Example: Living Soil Builders"
                style={styles.input}
              />

              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                value={groupDescription}
                onChangeText={setGroupDescription}
                accessibilityLabel="Forum group description"
                maxLength={500}
                multiline
                numberOfLines={4}
                placeholder="What should growers discuss and learn here?"
                style={[styles.input, styles.textArea]}
              />

              <Text style={styles.fieldLabel}>Topics</Text>
              <TextInput
                value={groupTopics}
                onChangeText={setGroupTopics}
                accessibilityLabel="Forum group topics"
                maxLength={240}
                placeholder="living soil, compost, amendments"
                style={styles.input}
              />
              <Text style={styles.fieldHelp}>Separate topics with commas.</Text>

              <Text style={styles.fieldLabel}>Who can discover this group?</Text>
              <View accessibilityRole="radiogroup" style={styles.privacyRow}>
                {[
                  {
                    value: true,
                    label: "Public",
                    detail: "Any signed-in grower can find and join it."
                  },
                  {
                    value: false,
                    label: "Private",
                    detail: "Only invited growers can join it."
                  }
                ].map((option) => {
                  const selected = groupIsPublic === option.value;
                  return (
                    <Pressable
                      key={option.label}
                      accessibilityRole="radio"
                      accessibilityLabel={`${option.label} forum group`}
                      accessibilityState={{ checked: selected }}
                      onPress={() => setGroupIsPublic(option.value)}
                      style={[
                        styles.privacyOption,
                        selected && styles.privacyOptionSelected
                      ]}
                    >
                      <Text style={styles.privacyTitle}>{option.label}</Text>
                      <Text style={styles.fieldHelp}>{option.detail}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Save new forum group"
                accessibilityState={{
                  disabled: !groupName.trim() || !groupDescription.trim() || creating
                }}
                disabled={!groupName.trim() || !groupDescription.trim() || creating}
                onPress={() => void submitGroup()}
                style={[
                  styles.actionButton,
                  (!groupName.trim() || !groupDescription.trim() || creating) &&
                    styles.disabledButton
                ]}
              >
                <Text style={styles.actionText}>
                  {creating ? "Creating..." : "Create Forum Group"}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </AppCard>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{summary.total}</Text>
            <Text style={styles.summaryLabel}>Groups</Text>
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
          accessibilityLabel="Search forum groups"
          placeholder="Search by crop, category, or workflow"
          style={styles.input}
        />

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator />
            <Text style={styles.muted}>Loading forum groups...</Text>
          </View>
        ) : null}

        {!loading && filtered.length === 0 ? (
          <AppCard style={styles.emptyCard}>
            <Text style={styles.cardTitle}>No matching forum groups</Text>
            <Text style={styles.cardDesc}>
              Try another crop, method, or category. Forum groups can still be selected
              during onboarding.
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
                <Text style={styles.cardTitle}>{guild.name || "Forum group"}</Text>
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
                  guild.name || "forum group"
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
                  {saving ? "Saving..." : joined ? "Leave Group" : "Join Group"}
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
  createCard: {
    gap: 12
  },
  createHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    justifyContent: "space-between"
  },
  createIntro: {
    flex: 1,
    minWidth: 220
  },
  createForm: {
    borderTopColor: "#E2E8F0",
    borderTopWidth: 1,
    gap: 8,
    paddingTop: 14
  },
  fieldLabel: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "900",
    marginTop: 4
  },
  fieldHelp: {
    color: "#64748B",
    fontSize: 12,
    lineHeight: 17
  },
  textArea: {
    minHeight: 96,
    textAlignVertical: "top"
  },
  privacyRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  privacyOption: {
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
    borderRadius: radius.card,
    borderWidth: 1,
    flexGrow: 1,
    minWidth: 210,
    padding: 12
  },
  privacyOptionSelected: {
    backgroundColor: "#EFF6FF",
    borderColor: "#2563EB",
    borderWidth: 2
  },
  privacyTitle: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 2
  },
  feedback: {
    backgroundColor: "#DCFCE7",
    borderColor: "#86EFAC",
    borderRadius: radius.card,
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
    borderRadius: radius.card,
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
    borderRadius: radius.card,
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
    borderRadius: 999,
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
    borderRadius: radius.card,
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
