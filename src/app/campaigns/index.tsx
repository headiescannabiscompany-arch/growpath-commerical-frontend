import { Redirect } from "expo-router";
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
  createCampaign,
  deleteCampaign,
  fetchCampaigns,
  updateCampaign,
  type Campaign
} from "@/api/campaigns";
import { InlineError } from "@/components/InlineError";
import AppPage from "@/components/layout/AppPage";
import AppCard from "@/components/layout/AppCard";
import { useEntitlements } from "@/entitlements";
import { useApiErrorHandler, type UiErrorState } from "@/hooks/useApiErrorHandler";

type CampaignStatus = "draft" | "scheduled" | "active" | "paused" | "ended";
type CampaignObjective = "awareness" | "reach" | "engagement" | "conversions" | "traffic";
type CampaignPlatform = "multi" | "instagram" | "tiktok" | "twitter" | "youtube";

const statusOptions: CampaignStatus[] = [
  "draft",
  "scheduled",
  "active",
  "paused",
  "ended"
];
const objectiveOptions: CampaignObjective[] = [
  "awareness",
  "reach",
  "engagement",
  "conversions",
  "traffic"
];
const platformOptions: CampaignPlatform[] = [
  "multi",
  "instagram",
  "tiktok",
  "twitter",
  "youtube"
];

function campaignId(campaign: Campaign) {
  return String(campaign.id || (campaign as any)._id || "");
}

function label(value?: string) {
  return String(value || "draft").replace(/_/g, " ");
}

function money(value: any) {
  const number = Number(value || 0);
  return `$${(Number.isFinite(number) ? number : 0).toFixed(2)}`;
}

function campaignTotal(campaign: Campaign) {
  const total = Number(campaign.total ?? campaign.budget?.totalBudget ?? 0);
  return Number.isFinite(total) ? total : 0;
}

function campaignSpent(campaign: Campaign) {
  const spent = Number(campaign.spent ?? campaign.budget?.spent ?? 0);
  return Number.isFinite(spent) ? spent : 0;
}

function dateLabel(value?: string) {
  if (!value) return "Date pending";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date pending";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

export default function Campaigns() {
  const ent = useEntitlements();
  const mapApiError = useApiErrorHandler();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<UiErrorState | null>(null);
  const [feedback, setFeedback] = useState("");
  const [draft, setDraft] = useState({
    name: "",
    description: "",
    totalBudget: "",
    objective: "awareness" as CampaignObjective,
    platform: "multi" as CampaignPlatform,
    status: "draft" as CampaignStatus
  });

  const load = useCallback(
    async (opts?: { refresh?: boolean }) => {
      if (opts?.refresh) setRefreshing(true);
      else setLoading(true);
      setFeedback("");
      try {
        setError(null);
        setCampaigns(await fetchCampaigns());
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
    if (ent.ready && ent.mode === "commercial") void load();
  }, [ent.mode, ent.ready, load]);

  const summary = useMemo(() => {
    const active = campaigns.filter((campaign) => campaign.status === "active").length;
    const draftCount = campaigns.filter((campaign) => campaign.status === "draft").length;
    const totalBudget = campaigns.reduce(
      (sum, campaign) => sum + campaignTotal(campaign),
      0
    );
    const spent = campaigns.reduce((sum, campaign) => sum + campaignSpent(campaign), 0);
    return { count: campaigns.length, active, draftCount, totalBudget, spent };
  }, [campaigns]);

  async function submitCampaign() {
    if (!draft.name.trim()) {
      setError({ message: "Campaign name is required." });
      return;
    }
    setCreating(true);
    setFeedback("");
    try {
      setError(null);
      const totalBudget = Number(draft.totalBudget || 0);
      const res: any = await createCampaign({
        name: draft.name.trim(),
        description: draft.description.trim(),
        objective: draft.objective,
        platform: draft.platform,
        status: draft.status,
        totalBudget: Number.isFinite(totalBudget) ? totalBudget : 0
      } as any);
      const campaign = res?.campaign ?? res;
      setCampaigns((current) => [campaign, ...current].filter(Boolean));
      setDraft({
        name: "",
        description: "",
        totalBudget: "",
        objective: "awareness",
        platform: "multi",
        status: "draft"
      });
      setFeedback("Campaign created.");
    } catch (e) {
      setError(mapApiError.toInlineError(e));
    } finally {
      setCreating(false);
    }
  }

  async function setStatus(campaign: Campaign, status: CampaignStatus) {
    const id = campaignId(campaign);
    if (!id) return;
    setSavingId(id);
    setFeedback("");
    try {
      setError(null);
      const res: any = await updateCampaign(id, { status } as any);
      const updated = res?.campaign ?? res;
      setCampaigns((current) =>
        current.map((candidate) => (campaignId(candidate) === id ? updated : candidate))
      );
      setFeedback(`${campaign.name} set to ${label(status)}.`);
    } catch (e) {
      setError(mapApiError.toInlineError(e));
    } finally {
      setSavingId("");
    }
  }

  async function removeCampaign(campaign: Campaign) {
    const id = campaignId(campaign);
    if (!id) return;
    setSavingId(id);
    setFeedback("");
    try {
      setError(null);
      await deleteCampaign(id);
      setCampaigns((current) =>
        current.filter((candidate) => campaignId(candidate) !== id)
      );
      setFeedback(`${campaign.name} removed.`);
    } catch (e) {
      setError(mapApiError.toInlineError(e));
    } finally {
      setSavingId("");
    }
  }

  if (!ent.ready) return null;
  if (ent.mode !== "commercial") return <Redirect href="/home/personal" />;

  return (
    <AppPage
      routeKey="campaigns"
      header={
        <View>
          <Text style={styles.headerTitle}>Campaigns</Text>
          <Text style={styles.headerSubtitle}>
            Plan commercial campaigns, budgets, channels, and launch status.
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
            <Text style={styles.summaryValue}>{summary.count}</Text>
            <Text style={styles.summaryLabel}>Campaigns</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{summary.active}</Text>
            <Text style={styles.summaryLabel}>Active</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{summary.draftCount}</Text>
            <Text style={styles.summaryLabel}>Drafts</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{money(summary.totalBudget)}</Text>
            <Text style={styles.summaryLabel}>Budget</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{money(summary.spent)}</Text>
            <Text style={styles.summaryLabel}>Spent</Text>
          </View>
        </View>

        <AppCard>
          <Text style={styles.cardTitle}>Create Campaign</Text>
          <TextInput
            value={draft.name}
            onChangeText={(name) => setDraft((current) => ({ ...current, name }))}
            accessibilityLabel="Campaign name"
            placeholder="Campaign name"
            style={styles.input}
          />
          <TextInput
            value={draft.description}
            onChangeText={(description) =>
              setDraft((current) => ({ ...current, description }))
            }
            accessibilityLabel="Campaign description"
            placeholder="Campaign description"
            multiline
            style={[styles.input, styles.notesInput]}
          />
          <TextInput
            value={draft.totalBudget}
            onChangeText={(totalBudget) =>
              setDraft((current) => ({ ...current, totalBudget }))
            }
            accessibilityLabel="Campaign total budget"
            placeholder="Total budget"
            keyboardType="decimal-pad"
            style={styles.input}
          />

          <Text style={styles.optionLabel}>Objective</Text>
          <View style={styles.optionRow}>
            {objectiveOptions.map((objective) => (
              <Pressable
                key={objective}
                accessibilityRole="button"
                accessibilityLabel={`Select campaign objective ${objective}`}
                onPress={() => setDraft((current) => ({ ...current, objective }))}
                style={[
                  styles.optionButton,
                  draft.objective === objective && styles.optionSelected
                ]}
              >
                <Text
                  style={[
                    styles.optionText,
                    draft.objective === objective && styles.optionTextSelected
                  ]}
                >
                  {label(objective)}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.optionLabel}>Platform</Text>
          <View style={styles.optionRow}>
            {platformOptions.map((platform) => (
              <Pressable
                key={platform}
                accessibilityRole="button"
                accessibilityLabel={`Select campaign platform ${platform}`}
                onPress={() => setDraft((current) => ({ ...current, platform }))}
                style={[
                  styles.optionButton,
                  draft.platform === platform && styles.optionSelected
                ]}
              >
                <Text
                  style={[
                    styles.optionText,
                    draft.platform === platform && styles.optionTextSelected
                  ]}
                >
                  {label(platform)}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.optionLabel}>Launch Status</Text>
          <View style={styles.optionRow}>
            {statusOptions.map((status) => (
              <Pressable
                key={status}
                accessibilityRole="button"
                accessibilityLabel={`Select campaign status ${status}`}
                onPress={() => setDraft((current) => ({ ...current, status }))}
                style={[
                  styles.optionButton,
                  draft.status === status && styles.optionSelected
                ]}
              >
                <Text
                  style={[
                    styles.optionText,
                    draft.status === status && styles.optionTextSelected
                  ]}
                >
                  {label(status)}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create campaign"
            disabled={creating}
            onPress={() => void submitCampaign()}
            style={[styles.primaryButton, creating && styles.disabledButton]}
          >
            <Text style={styles.primaryButtonText}>
              {creating ? "Creating..." : "Create Campaign"}
            </Text>
          </Pressable>
        </AppCard>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator />
            <Text style={styles.muted}>Loading campaigns...</Text>
          </View>
        ) : null}

        {!loading && campaigns.length === 0 ? (
          <AppCard style={styles.emptyCard}>
            <Text style={styles.cardTitle}>No Campaigns Yet</Text>
            <Text style={styles.cardDesc}>
              Build a draft campaign to track budget, platform, and launch state.
            </Text>
          </AppCard>
        ) : null}

        {campaigns.map((campaign) => {
          const id = campaignId(campaign);
          const saving = savingId === id;
          return (
            <AppCard key={id || campaign.name}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleBlock}>
                  <Text style={styles.cardTitle}>{campaign.name}</Text>
                  <Text style={styles.cardDesc}>
                    {campaign.description || "No description"}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.statusPill,
                    campaign.status === "active" && styles.activePill,
                    campaign.status === "paused" && styles.pausedPill,
                    campaign.status === "ended" && styles.endedPill
                  ]}
                >
                  {label(campaign.status)}
                </Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaPill}>{label(campaign.objective)}</Text>
                <Text style={styles.metaPill}>{label(campaign.platform)}</Text>
                <Text style={styles.metaPill}>
                  Budget {money(campaignTotal(campaign))}
                </Text>
                <Text style={styles.metaPill}>
                  Spent {money(campaignSpent(campaign))}
                </Text>
                <Text style={styles.metaPill}>{dateLabel(campaign.createdAt)}</Text>
              </View>
              <View style={styles.actions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Activate campaign ${campaign.name}`}
                  disabled={saving || campaign.status === "active"}
                  onPress={() => void setStatus(campaign, "active")}
                  style={[
                    styles.actionButton,
                    (saving || campaign.status === "active") && styles.disabledButton
                  ]}
                >
                  <Text style={styles.actionText}>Activate</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Pause campaign ${campaign.name}`}
                  disabled={saving || campaign.status === "paused"}
                  onPress={() => void setStatus(campaign, "paused")}
                  style={[
                    styles.actionButton,
                    styles.secondaryButton,
                    (saving || campaign.status === "paused") && styles.disabledButton
                  ]}
                >
                  <Text style={styles.actionText}>Pause</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`End campaign ${campaign.name}`}
                  disabled={saving || campaign.status === "ended"}
                  onPress={() => void setStatus(campaign, "ended")}
                  style={[
                    styles.actionButton,
                    styles.neutralButton,
                    (saving || campaign.status === "ended") && styles.disabledButton
                  ]}
                >
                  <Text style={styles.actionText}>End</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Delete campaign ${campaign.name}`}
                  disabled={saving}
                  onPress={() => void removeCampaign(campaign)}
                  style={[
                    styles.actionButton,
                    styles.dangerButton,
                    saving && styles.disabledButton
                  ]}
                >
                  <Text style={styles.actionText}>{saving ? "Saving..." : "Delete"}</Text>
                </Pressable>
              </View>
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
    fontSize: 14,
    color: "#64748B"
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
  cardHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between"
  },
  cardTitleBlock: {
    flex: 1
  },
  cardTitle: {
    color: "#0F172A",
    fontSize: 16,
    fontWeight: "800"
  },
  cardDesc: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderColor: "#CBD5E1",
    borderRadius: 8,
    borderWidth: 1,
    color: "#0F172A",
    fontSize: 14,
    marginTop: 12,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  notesInput: {
    minHeight: 82,
    textAlignVertical: "top"
  },
  optionLabel: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "900",
    marginTop: 14,
    textTransform: "uppercase"
  },
  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8
  },
  optionButton: {
    backgroundColor: "#F8FAFC",
    borderColor: "#CBD5E1",
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  optionSelected: {
    backgroundColor: "#0F172A",
    borderColor: "#0F172A"
  },
  optionText: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "capitalize"
  },
  optionTextSelected: {
    color: "#FFFFFF"
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#2563EB",
    borderRadius: 8,
    minHeight: 44,
    justifyContent: "center",
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900"
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
  statusPill: {
    backgroundColor: "#E0F2FE",
    borderRadius: 999,
    color: "#0369A1",
    fontSize: 12,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 3,
    textTransform: "capitalize"
  },
  activePill: {
    backgroundColor: "#D1FAE5",
    color: "#065F46"
  },
  pausedPill: {
    backgroundColor: "#FEF3C7",
    color: "#92400E"
  },
  endedPill: {
    backgroundColor: "#E2E8F0",
    color: "#334155"
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
    paddingVertical: 5,
    textTransform: "capitalize"
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14
  },
  actionButton: {
    alignItems: "center",
    backgroundColor: "#2563EB",
    borderRadius: 8,
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  secondaryButton: {
    backgroundColor: "#475569"
  },
  neutralButton: {
    backgroundColor: "#334155"
  },
  dangerButton: {
    backgroundColor: "#B91C1C"
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
