import { Link } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { Campaign, createCampaign, fetchCampaigns } from "@/api/campaigns";
import { InlineError } from "@/components/InlineError";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import { persistImageUri, resolveImageUri } from "@/utils/photoUploads";

type CampaignForm = {
  name: string;
  description: string;
  objective: Campaign["objective"];
  platform: Campaign["platform"];
  status: Campaign["status"];
  launchDate: string;
  totalBudget: string;
  linkedProductId: string;
  linkedProductLineId: string;
  linkedCourseId: string;
  linkedGrowId: string;
  storefrontSlug: string;
  targetUrl: string;
  imageUrl: string;
  platformNotes: string;
};

const EMPTY_FORM: CampaignForm = {
  name: "",
  description: "",
  objective: "content_plan",
  platform: "multi",
  status: "draft",
  launchDate: "",
  totalBudget: "",
  linkedProductId: "",
  linkedProductLineId: "",
  linkedCourseId: "",
  linkedGrowId: "",
  storefrontSlug: "",
  targetUrl: "",
  imageUrl: "",
  platformNotes: ""
};

function ActionLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href as any} asChild>
      <Pressable accessibilityRole="button" style={styles.action}>
        <Text style={styles.actionText}>{label}</Text>
      </Pressable>
    </Link>
  );
}

function campaignId(campaign: Campaign) {
  return campaign.id || campaign.name || "campaign";
}

function clickCount(campaign: Campaign) {
  return Number(
    campaign.clickCount ||
      campaign.adClicks ||
      campaign.clicks ||
      campaign.metrics?.clickCount ||
      0
  );
}

function budgetTotal(campaign: Campaign) {
  return Number(campaign.budget?.totalBudget || campaign.total || 0);
}

function campaignImage(campaign: Campaign) {
  const creativeImage = String(
    campaign.imageUrl ||
      campaign.creativeImageUrl ||
      campaign.bannerImageUrl ||
      campaign.creative?.imageUrl ||
      campaign.creative?.bannerUrl ||
      ""
  ).trim();
  return resolveImageUri(creativeImage);
}

export default function CommercialMarketingRoute() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [form, setForm] = useState<CampaignForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<any>(null);

  const activeCount = useMemo(
    () =>
      campaigns.filter((campaign) =>
        ["scheduled", "active"].includes(String(campaign.status || ""))
      ).length,
    [campaigns]
  );
  const totalClicks = useMemo(
    () => campaigns.reduce((sum, campaign) => sum + clickCount(campaign), 0),
    [campaigns]
  );
  const linkedPlans = useMemo(
    () =>
      campaigns.filter(
        (campaign) =>
          campaign.linkedProductId || campaign.linkedCourseId || campaign.linkedGrowId
      ).length,
    [campaigns]
  );

  async function loadCampaigns() {
    setLoading(true);
    setError(null);
    try {
      setCampaigns(await fetchCampaigns());
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCampaigns();
  }, []);

  async function submitCampaign() {
    if (!form.name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const imageUrl = await persistImageUri(form.imageUrl.trim());
      await createCampaign({
        name: form.name.trim(),
        description: form.description.trim(),
        objective: form.objective,
        platform: form.platform,
        status: form.status,
        launchDate: form.launchDate.trim() || undefined,
        targetUrl: form.targetUrl.trim() || undefined,
        externalUrl: form.targetUrl.trim() || undefined,
        imageUrl: imageUrl || undefined,
        creativeImageUrl: imageUrl || undefined,
        bannerImageUrl: imageUrl || undefined,
        creative: imageUrl ? { imageUrl } : undefined,
        storefrontSlug: form.storefrontSlug.trim() || undefined,
        linkedProductId: form.linkedProductId.trim() || undefined,
        linkedProductLineId: form.linkedProductLineId.trim() || undefined,
        linkedCourseId: form.linkedCourseId.trim() || undefined,
        linkedGrowId: form.linkedGrowId.trim() || undefined,
        platformNotes: form.platformNotes.trim() || undefined,
        budget: {
          totalBudget: Number(form.totalBudget) || 0
        }
      });
      setForm(EMPTY_FORM);
      await loadCampaigns();
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  }

  async function pickCreativeImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError(new Error("Photo-library permission is required to upload ad creative."));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.85
    });
    if (result.canceled) return;
    const uri = result.assets.find((asset) => asset.uri)?.uri;
    if (uri) setForm((prev) => ({ ...prev, imageUrl: uri }));
  }

  return (
    <AppPage
      routeKey="commercial-marketing"
      longContent
      header={
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.kicker}>Commercial workspace</Text>
            <Text style={styles.title}>Marketing Planner</Text>
            <Text style={styles.subtitle}>
              Plan content, product launches, course announcements, storefront updates,
              ads, and promotional posts. Track clicks without pretending GrowPathAI
              executes ad-platform spend.
            </Text>
          </View>
          <View style={styles.headerActions}>
            <ActionLink href="/home/commercial/feed" label="Create Feed Campaign" />
            <ActionLink href="/home/commercial/products" label="Products" />
            <ActionLink href="/home/commercial/courses" label="Courses" />
            <ActionLink href="/home/commercial/storefront" label="Storefront" />
          </View>
        </View>
      }
    >
      <AppCard>
        <Text style={styles.cardTitle}>Content launch planner</Text>
        <Text style={styles.body}>
          Campaigns should not imply ad-spend execution unless platform integrations
          exist. For v1, track content plans, ad/link click counts, and launch tasks tied
          to real GrowPath objects.
        </Text>
        <View style={styles.metricGrid}>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{campaigns.length}</Text>
            <Text style={styles.metricLabel}>Plans</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{activeCount}</Text>
            <Text style={styles.metricLabel}>Scheduled / active</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{totalClicks}</Text>
            <Text style={styles.metricLabel}>Ad clicks tracked</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{linkedPlans}</Text>
            <Text style={styles.metricLabel}>Linked plans</Text>
          </View>
        </View>
        {loading ? <Text style={styles.muted}>Loading marketing plans...</Text> : null}
        {error ? <InlineError error={error} /> : null}
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Create marketing plan</Text>
        <Text style={styles.body}>
          Attach the plan to products, courses, grows, storefronts, and external URLs so
          clicks and public content can be traced back to real commercial work.
        </Text>
        <TextInput
          value={form.name}
          onChangeText={(name) => setForm((prev) => ({ ...prev, name }))}
          accessibilityLabel="Marketing plan name"
          placeholder="Campaign or launch name"
          style={styles.input}
        />
        <TextInput
          value={form.description}
          onChangeText={(description) => setForm((prev) => ({ ...prev, description }))}
          accessibilityLabel="Marketing plan description"
          multiline
          placeholder="What is launching and what result should be measured?"
          style={[styles.input, styles.textArea]}
        />
        <View style={styles.formGrid}>
          <TextInput
            value={form.objective}
            onChangeText={(objective) =>
              setForm((prev) => ({
                ...prev,
                objective: (objective.trim() || "content_plan") as Campaign["objective"]
              }))
            }
            accessibilityLabel="Marketing plan objective"
            placeholder="content_plan, traffic, engagement, conversions"
            style={styles.input}
          />
          <TextInput
            value={form.platform}
            onChangeText={(platform) =>
              setForm((prev) => ({
                ...prev,
                platform: (platform.trim() || "multi") as Campaign["platform"]
              }))
            }
            accessibilityLabel="Marketing plan platform"
            placeholder="multi, instagram, youtube, tiktok"
            style={styles.input}
          />
          <TextInput
            value={form.status}
            onChangeText={(status) =>
              setForm((prev) => ({
                ...prev,
                status: (status.trim() || "draft") as Campaign["status"]
              }))
            }
            accessibilityLabel="Marketing plan status"
            placeholder="draft, scheduled, active"
            style={styles.input}
          />
          <TextInput
            value={form.launchDate}
            onChangeText={(launchDate) => setForm((prev) => ({ ...prev, launchDate }))}
            accessibilityLabel="Marketing plan launch date"
            placeholder="Launch date"
            style={styles.input}
          />
          <TextInput
            value={form.totalBudget}
            onChangeText={(totalBudget) => setForm((prev) => ({ ...prev, totalBudget }))}
            accessibilityLabel="Marketing plan budget"
            keyboardType="decimal-pad"
            placeholder="Budget note or amount"
            style={styles.input}
          />
          <TextInput
            value={form.linkedProductId}
            onChangeText={(linkedProductId) =>
              setForm((prev) => ({ ...prev, linkedProductId }))
            }
            accessibilityLabel="Marketing plan linked product"
            placeholder="Linked product ID"
            style={styles.input}
          />
          <TextInput
            value={form.linkedProductLineId}
            onChangeText={(linkedProductLineId) =>
              setForm((prev) => ({ ...prev, linkedProductLineId }))
            }
            accessibilityLabel="Marketing plan linked product line"
            placeholder="Linked product line ID"
            style={styles.input}
          />
          <TextInput
            value={form.linkedCourseId}
            onChangeText={(linkedCourseId) =>
              setForm((prev) => ({ ...prev, linkedCourseId }))
            }
            accessibilityLabel="Marketing plan linked course"
            placeholder="Linked course ID"
            style={styles.input}
          />
          <TextInput
            value={form.linkedGrowId}
            onChangeText={(linkedGrowId) =>
              setForm((prev) => ({ ...prev, linkedGrowId }))
            }
            accessibilityLabel="Marketing plan linked grow"
            placeholder="Linked grow/trial ID"
            style={styles.input}
          />
          <TextInput
            value={form.storefrontSlug}
            onChangeText={(storefrontSlug) =>
              setForm((prev) => ({ ...prev, storefrontSlug }))
            }
            accessibilityLabel="Marketing plan storefront slug"
            placeholder="Storefront slug"
            style={styles.input}
          />
          <TextInput
            value={form.targetUrl}
            onChangeText={(targetUrl) => setForm((prev) => ({ ...prev, targetUrl }))}
            accessibilityLabel="Marketing plan target URL"
            autoCapitalize="none"
            placeholder="https://..."
            style={styles.input}
          />
          <TextInput
            value={form.imageUrl}
            onChangeText={(imageUrl) => setForm((prev) => ({ ...prev, imageUrl }))}
            accessibilityLabel="Marketing plan ad image URL"
            autoCapitalize="none"
            placeholder="Ad image URL or uploaded creative"
            style={styles.input}
          />
          <TextInput
            value={form.platformNotes}
            onChangeText={(platformNotes) =>
              setForm((prev) => ({ ...prev, platformNotes }))
            }
            accessibilityLabel="Marketing plan platform notes"
            placeholder="Platform/content notes"
            style={styles.input}
          />
        </View>
        <View style={styles.creativeTools}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Upload marketing plan ad image"
            onPress={pickCreativeImage}
            disabled={saving}
            style={[styles.uploadButton, saving && styles.submitDisabled]}
          >
            <Text style={styles.uploadButtonText}>Upload ad image</Text>
          </Pressable>
          {form.imageUrl ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear marketing plan ad image"
              onPress={() => setForm((prev) => ({ ...prev, imageUrl: "" }))}
              disabled={saving}
              style={styles.clearButton}
            >
              <Text style={styles.clearButtonText}>Clear image</Text>
            </Pressable>
          ) : null}
        </View>
        {form.imageUrl ? (
          <Image
            source={{ uri: resolveImageUri(form.imageUrl) }}
            style={styles.creativePreview}
            resizeMode="cover"
            accessibilityLabel="Marketing plan ad image preview"
          />
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Create marketing plan"
          disabled={saving || !form.name.trim()}
          onPress={submitCampaign}
          style={[
            styles.submit,
            saving || !form.name.trim() ? styles.submitDisabled : null
          ]}
        >
          <Text style={styles.submitText}>
            {saving ? "Saving..." : "Create marketing plan"}
          </Text>
        </Pressable>
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Product drop workflow</Text>
        <Text style={styles.body}>
          A product drop should start from the product or product line, then create a
          storefront update, linked feed campaign, support thread, and optional
          course/lesson.
        </Text>
        <View style={styles.actions}>
          <ActionLink href="/home/commercial/feed" label="Create linked campaign" />
          <ActionLink href="/home/commercial/products/new" label="Create Product" />
          <ActionLink href="/home/commercial/community" label="Community Support" />
        </View>
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Trial-to-content workflow</Text>
        <Text style={styles.body}>
          Trial results should become public proof only when there is enough saved grow
          data. Marketing should point back to product trials, grow reports, and public
          product pages.
        </Text>
        <View style={styles.actions}>
          <ActionLink href="/home/commercial/trials" label="Product Trials" />
          <ActionLink href="/home/commercial/grows" label="Product Trial Grows" />
        </View>
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Marketing plans</Text>
        {campaigns.length ? (
          <View style={styles.list}>
            {campaigns.map((campaign) => (
              <View key={campaignId(campaign)} style={styles.row}>
                {campaignImage(campaign) ? (
                  <Image
                    source={{ uri: campaignImage(campaign) }}
                    style={styles.rowImage}
                    resizeMode="cover"
                    accessibilityLabel={`${campaign.name} ad image`}
                  />
                ) : null}
                <View style={styles.rowMain}>
                  <Text style={styles.rowTitle}>{campaign.name}</Text>
                  {campaign.description ? (
                    <Text style={styles.rowBody}>{campaign.description}</Text>
                  ) : null}
                  <Text style={styles.rowMeta}>
                    {(campaign.objective || "content_plan").replace(/_/g, " ")} -
                    {` ${campaign.status || "draft"}`} - {clickCount(campaign)} ad clicks
                  </Text>
                  <Text style={styles.rowMeta}>
                    Product {campaign.linkedProductId || "none"} / Course{" "}
                    {campaign.linkedCourseId || "none"} / Grow{" "}
                    {campaign.linkedGrowId || "none"}
                  </Text>
                  {campaign.targetUrl || campaign.externalUrl ? (
                    <Text style={styles.rowMeta}>
                      Target: {campaign.targetUrl || campaign.externalUrl}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>${budgetTotal(campaign)}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.muted}>
            No marketing plans yet. Create one from a product, course, trial, or
            storefront link.
          </Text>
        )}
      </AppCard>
    </AppPage>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 16
  },
  headerText: {
    gap: 6
  },
  kicker: {
    color: "#5f6f5f",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  title: {
    color: "#172317",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 0
  },
  subtitle: {
    color: "#4b5a4b",
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 780
  },
  headerActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 12
  },
  action: {
    alignItems: "center",
    borderColor: "#b9c8b9",
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  actionText: {
    color: "#1f4d2c",
    fontSize: 14,
    fontWeight: "700"
  },
  cardTitle: {
    color: "#182618",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8
  },
  body: {
    color: "#4b5a4b",
    fontSize: 14,
    lineHeight: 21
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14
  },
  metric: {
    borderColor: "#d6e1d5",
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 140,
    padding: 12
  },
  metricValue: {
    color: "#172317",
    fontSize: 24,
    fontWeight: "800"
  },
  metricLabel: {
    color: "#5f6f5f",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2
  },
  formGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 12
  },
  input: {
    borderColor: "#c8d6c7",
    borderRadius: 8,
    borderWidth: 1,
    color: "#172317",
    flexBasis: 240,
    flexGrow: 1,
    fontSize: 14,
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  textArea: {
    minHeight: 88,
    textAlignVertical: "top"
  },
  submit: {
    alignItems: "center",
    backgroundColor: "#1f4d2c",
    borderRadius: 8,
    marginTop: 14,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  submitDisabled: {
    opacity: 0.55
  },
  creativeTools: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 12
  },
  uploadButton: {
    alignItems: "center",
    borderColor: "#b9c8b9",
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  uploadButtonText: { color: "#1f4d2c", fontSize: 14, fontWeight: "800" },
  clearButton: {
    alignItems: "center",
    borderColor: "#e2c4c4",
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  clearButtonText: { color: "#8a2d2d", fontSize: 14, fontWeight: "800" },
  creativePreview: {
    width: "100%",
    maxWidth: 520,
    aspectRatio: 16 / 7,
    borderRadius: 8,
    marginTop: 12,
    backgroundColor: "#edf5ec"
  },
  submitText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800"
  },
  muted: {
    color: "#6b7a6b",
    fontSize: 13,
    marginTop: 10
  },
  list: {
    gap: 10
  },
  row: {
    borderColor: "#d6e1d5",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 12
  },
  rowImage: {
    width: 128,
    height: 82,
    borderRadius: 8,
    backgroundColor: "#edf5ec"
  },
  rowMain: {
    flex: 1,
    gap: 4
  },
  rowTitle: {
    color: "#172317",
    fontSize: 15,
    fontWeight: "800"
  },
  rowBody: {
    color: "#4b5a4b",
    fontSize: 13,
    lineHeight: 19
  },
  rowMeta: {
    color: "#6b7a6b",
    fontSize: 12,
    lineHeight: 18
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#edf5ec",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  badgeText: {
    color: "#1f4d2c",
    fontSize: 12,
    fontWeight: "800"
  }
});
