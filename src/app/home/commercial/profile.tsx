import { Link } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { fetchStorefront, Storefront, updateStorefront } from "@/api/storefront";
import { useAuth } from "@/auth/AuthContext";
import { InlineError } from "@/components/InlineError";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import { useEntitlements } from "@/entitlements";

type ProfileForm = {
  businessName: string;
  slug: string;
  accountType: string;
  bio: string;
  websiteUrl: string;
  supportEmail: string;
  socialLinks: string;
  forumDisplayName: string;
  storefrontStatus: string;
};

const EMPTY_FORM: ProfileForm = {
  businessName: "",
  slug: "",
  accountType: "brand",
  bio: "",
  websiteUrl: "",
  supportEmail: "",
  socialLinks: "",
  forumDisplayName: "",
  storefrontStatus: "draft"
};

type BusinessStorefront = Storefront & {
  businessName?: string;
  bio?: string;
  websiteUrl?: string;
  supportEmail?: string;
  socialLinks?: string[] | string;
  forumDisplayName?: string;
  accountType?: string;
  storefrontStatus?: string;
  status?: string;
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

function splitLinks(value: string) {
  return value
    .split(",")
    .map((link) => link.trim())
    .filter(Boolean);
}

function hydrateForm(storefront: BusinessStorefront | null): ProfileForm {
  if (!storefront) return EMPTY_FORM;
  const socialLinks = Array.isArray(storefront.socialLinks)
    ? storefront.socialLinks.join(", ")
    : String(storefront.socialLinks || "");
  return {
    businessName: storefront.businessName || storefront.name || "",
    slug: storefront.slug || "",
    accountType: storefront.accountType || "brand",
    bio: storefront.bio || "",
    websiteUrl: storefront.websiteUrl || "",
    supportEmail: storefront.supportEmail || "",
    socialLinks,
    forumDisplayName: storefront.forumDisplayName || storefront.businessName || "",
    storefrontStatus: storefront.storefrontStatus || storefront.status || "draft"
  };
}

export default function CommercialProfileRoute() {
  const { user } = useAuth();
  const entitlements = useEntitlements();
  const [storefront, setStorefront] = useState<BusinessStorefront | null>(null);
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<any>(null);

  const publicProfileUrl = useMemo(
    () => (form.slug.trim() ? `/brands/${form.slug.trim()}` : "/brands/:slug"),
    [form.slug]
  );
  const publicStoreUrl = useMemo(
    () => (form.slug.trim() ? `/store/${form.slug.trim()}` : "/store/:slug"),
    [form.slug]
  );

  async function loadProfile() {
    setLoading(true);
    setError(null);
    try {
      const next = (await fetchStorefront()) as BusinessStorefront | null;
      setStorefront(next);
      setForm(hydrateForm(next));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  async function submitProfile() {
    if (!form.businessName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await updateStorefront({
        name: form.businessName.trim(),
        businessName: form.businessName.trim(),
        slug: form.slug.trim() || undefined,
        accountType: form.accountType.trim() || "brand",
        bio: form.bio.trim(),
        websiteUrl: form.websiteUrl.trim(),
        supportEmail: form.supportEmail.trim(),
        socialLinks: splitLinks(form.socialLinks),
        forumDisplayName: form.forumDisplayName.trim(),
        storefrontStatus: form.storefrontStatus.trim() || "draft",
        status: form.storefrontStatus.trim() || "draft"
      } as Partial<BusinessStorefront>);
      await loadProfile();
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppPage
      routeKey="commercial-profile"
      longContent
      header={
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.kicker}>Commercial workspace</Text>
            <Text style={styles.title}>Brand Profile & Billing</Text>
            <Text style={styles.subtitle}>
              Manage the brand identity that appears on public profiles, storefronts,
              courses, Feed/Campaigns, and Forum/Q&A support. Keep destructive account
              controls in the account profile.
            </Text>
          </View>
          <View style={styles.headerActions}>
            <ActionLink href="/profile" label="Account Profile" />
            <ActionLink href="/home/commercial/storefront" label="Storefront" />
            <ActionLink href="/store" label="Public Store Directory" />
          </View>
        </View>
      }
    >
      <AppCard>
        <Text style={styles.cardTitle}>Brand identity checklist</Text>
        <Text style={styles.body}>
          Commercial profile is the brand-level identity. The root profile page stays
          account-level for sign-in and privacy; storefront and public profile settings
          define how the brand appears publicly.
        </Text>
        <View style={styles.metricGrid}>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{form.businessName || "Not set"}</Text>
            <Text style={styles.metricLabel}>Brand</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{form.accountType || "brand"}</Text>
            <Text style={styles.metricLabel}>Brand type</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{form.storefrontStatus || "draft"}</Text>
            <Text style={styles.metricLabel}>Storefront status</Text>
          </View>
        </View>
        {loading ? <Text style={styles.muted}>Loading brand profile...</Text> : null}
        {error ? <InlineError error={error} /> : null}
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Edit brand profile</Text>
        <View style={styles.formGrid}>
          <TextInput
            value={form.businessName}
            onChangeText={(businessName) =>
              setForm((prev) => ({ ...prev, businessName }))
            }
            accessibilityLabel="Commercial brand name"
            placeholder="Brand name"
            style={styles.input}
          />
          <TextInput
            value={form.slug}
            onChangeText={(slug) => setForm((prev) => ({ ...prev, slug }))}
            accessibilityLabel="Commercial public slug"
            autoCapitalize="none"
            placeholder="public-slug"
            style={styles.input}
          />
          <TextInput
            value={form.accountType}
            onChangeText={(accountType) => setForm((prev) => ({ ...prev, accountType }))}
            accessibilityLabel="Commercial brand type"
            placeholder="soil_nutrient_brand, breeder, retailer"
            style={styles.input}
          />
          <TextInput
            value={form.storefrontStatus}
            onChangeText={(storefrontStatus) =>
              setForm((prev) => ({ ...prev, storefrontStatus }))
            }
            accessibilityLabel="Commercial storefront visibility"
            placeholder="draft, published, active"
            style={styles.input}
          />
          <TextInput
            value={form.websiteUrl}
            onChangeText={(websiteUrl) => setForm((prev) => ({ ...prev, websiteUrl }))}
            accessibilityLabel="Commercial website URL"
            autoCapitalize="none"
            placeholder="https://..."
            style={styles.input}
          />
          <TextInput
            value={form.supportEmail}
            onChangeText={(supportEmail) =>
              setForm((prev) => ({ ...prev, supportEmail }))
            }
            accessibilityLabel="Commercial support email"
            autoCapitalize="none"
            placeholder="support@example.com"
            style={styles.input}
          />
          <TextInput
            value={form.forumDisplayName}
            onChangeText={(forumDisplayName) =>
              setForm((prev) => ({ ...prev, forumDisplayName }))
            }
            accessibilityLabel="Commercial forum display name"
            placeholder="Brand forum identity"
            style={styles.input}
          />
          <TextInput
            value={form.socialLinks}
            onChangeText={(socialLinks) => setForm((prev) => ({ ...prev, socialLinks }))}
            accessibilityLabel="Commercial external links"
            autoCapitalize="none"
            placeholder="External links, comma separated"
            style={styles.input}
          />
        </View>
        <TextInput
          value={form.bio}
          onChangeText={(bio) => setForm((prev) => ({ ...prev, bio }))}
          accessibilityLabel="Commercial public bio"
          multiline
          placeholder="Public profile bio"
          style={[styles.input, styles.textArea]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Save commercial brand profile"
          disabled={saving || !form.businessName.trim()}
          onPress={submitProfile}
          style={[
            styles.submit,
            saving || !form.businessName.trim() ? styles.submitDisabled : null
          ]}
        >
          <Text style={styles.submitText}>
            {saving ? "Saving..." : "Save brand profile"}
          </Text>
        </Pressable>
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Public profile discovery</Text>
        <Text style={styles.body}>
          Free, Pro, commercial, and facility users should be able to discover this brand
          from feed campaigns, product cards, courses, forum threads, store search,
          similar brands, and direct public URLs.
        </Text>
        <View style={styles.urlList}>
          <Text style={styles.urlText}>Public profile: {publicProfileUrl}</Text>
          <Text style={styles.urlText}>Public storefront: {publicStoreUrl}</Text>
          <Text style={styles.urlText}>
            Public product detail: /store/:slug/products/:productId
          </Text>
          <Text style={styles.urlText}>
            Similar brands and return-to-feed actions stay available from public pages.
          </Text>
        </View>
        <View style={styles.actions}>
          <ActionLink href="/store" label="Browse Public Store" />
          <ActionLink href="/home/commercial/feed" label="Feed / Campaigns" />
        </View>
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Brand support and education</Text>
        <Text style={styles.body}>
          Commercial identity carries across support answers, courses, product trial
          updates, and storefront proof. A user should understand who is speaking and what
          product/course/trial is connected.
        </Text>
        <View style={styles.actions}>
          <ActionLink href="/home/commercial/community" label="Community" />
          <ActionLink href="/home/commercial/courses" label="Courses" />
          <ActionLink href="/home/commercial/trials" label="Product Trials" />
        </View>
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Billing and account controls</Text>
        <Text style={styles.body}>
          Signed in as {user?.email || "commercial user"}. Plan:{" "}
          {entitlements?.plan || "commercial"}. Mode: {entitlements?.mode || "commercial"}
          . Keep sign-in, email verification, plan status, privacy export, and account
          deletion in the account profile. Brand-facing settings should not be mixed with
          destructive account controls.
        </Text>
        {storefront?.id ? (
          <Text style={styles.muted}>Brand profile record: {storefront.id}</Text>
        ) : null}
        <View style={styles.actions}>
          <ActionLink href="/profile" label="Open Account Profile" />
        </View>
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
    minWidth: 150,
    padding: 12
  },
  metricValue: {
    color: "#172317",
    fontSize: 16,
    fontWeight: "800"
  },
  metricLabel: {
    color: "#5f6f5f",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4
  },
  formGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
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
    marginTop: 10,
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
  submitText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800"
  },
  urlList: {
    gap: 6,
    marginTop: 12
  },
  urlText: {
    color: "#315031",
    fontSize: 13,
    lineHeight: 19
  },
  muted: {
    color: "#6b7a6b",
    fontSize: 13,
    marginTop: 10
  }
});
