import { Link } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { fetchStorefront, Storefront, updateStorefront } from "@/api/storefront";
import { useAuth } from "@/auth/AuthContext";
import { InlineError } from "@/components/InlineError";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import ThemeModeSelector from "@/components/ThemeModeSelector";
import { SUPPORT_CONTACTS } from "@/config/supportContacts";
import { CAPABILITY_KEYS, useEntitlements } from "@/entitlements";
import { type ThemePalette, useAppTheme } from "@/theme/appTheme";
import { radius } from "@/theme/theme";
import CannabisContentControls from "@/components/account/CannabisContentControls";
import StripeConnectPayoutCard from "@/components/account/StripeConnectPayoutCard";

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

type BusinessIdentityUser = {
  businessName?: unknown;
  companyName?: unknown;
  business?: { name?: unknown } | null;
};

function authenticatedBusinessStarter(
  user: BusinessIdentityUser | null | undefined
): ProfileForm {
  const businessName = String(
    user?.businessName || user?.companyName || user?.business?.name || ""
  ).trim();
  if (!businessName) return EMPTY_FORM;

  const isLivingSoilLabs = businessName.toLowerCase() === "living soil labs";
  return {
    ...EMPTY_FORM,
    businessName,
    forumDisplayName: businessName,
    accountType: isLivingSoilLabs ? "soil_nutrient_brand" : "brand",
    bio: isLivingSoilLabs
      ? "Rooted in Science. Grown by Nature. Pre-launch placeholder brand. All inventory starts at zero and prices stay TBD until the owner edits them."
      : ""
  };
}

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
  const { palette } = useAppTheme();
  const styles = useMemo(() => createCommercialProfileStyles(palette), [palette]);

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

function hasStorefrontIdentity(storefront: BusinessStorefront | null) {
  return Boolean(
    storefront &&
    (storefront.id || storefront.name || storefront.businessName || storefront.slug)
  );
}

function hydrateForm(
  storefront: BusinessStorefront | null,
  starterForm: ProfileForm
): ProfileForm {
  if (!storefront || !hasStorefrontIdentity(storefront)) return starterForm;
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
    storefrontStatus:
      typeof storefront.isPublished === "boolean"
        ? storefront.isPublished
          ? "published"
          : "draft"
        : storefront.storefrontStatus || storefront.status || "draft"
  };
}

export default function CommercialProfileRoute() {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createCommercialProfileStyles(palette), [palette]);
  const { user } = useAuth();
  const entitlements = useEntitlements();
  const canManageCreatorPayouts =
    entitlements.can?.(CAPABILITY_KEYS.COURSES_SELL_PAID) === true;
  const starterForm = useMemo(
    () => authenticatedBusinessStarter(user as BusinessIdentityUser | null),
    [user]
  );
  const [storefront, setStorefront] = useState<BusinessStorefront | null>(null);
  const [form, setForm] = useState<ProfileForm>(starterForm);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<any>(null);
  const [loadError, setLoadError] = useState<any>(null);
  const [success, setSuccess] = useState("");
  const readInFlight = useRef(false);
  const writeInFlight = useRef(false);
  const generation = useRef(0);
  const canEdit = loaded && !loading && !loadError && !saving;
  const savedForm = hydrateForm(storefront, starterForm);

  const publicStoreUrl = useMemo(() => {
    const slug = storefront?.slug?.trim();
    return slug ? `/store/${encodeURIComponent(slug)}` : "";
  }, [storefront?.slug]);

  const loadProfile = useCallback(async () => {
    if (readInFlight.current) return;
    readInFlight.current = true;
    const current = generation.current;
    setLoading(true);
    setLoadError(null);
    try {
      const next = (await fetchStorefront()) as BusinessStorefront | null;
      if (current !== generation.current) return;
      setStorefront(next);
      setForm(hydrateForm(next, starterForm));
      setLoaded(true);
    } catch (err) {
      if (current === generation.current) setLoadError(err);
    } finally {
      if (current === generation.current) {
        readInFlight.current = false;
        setLoading(false);
      }
    }
  }, [starterForm]);

  useEffect(() => {
    setLoaded(false);
    setStorefront(null);
    setForm(starterForm);
    setError(null);
    setSuccess("");
    setSaving(false);
    void loadProfile();
    return () => {
      generation.current += 1;
      readInFlight.current = false;
      writeInFlight.current = false;
    };
  }, [loadProfile, starterForm]);

  async function submitProfile() {
    if (
      !canEdit ||
      readInFlight.current ||
      writeInFlight.current ||
      !form.businessName.trim()
    )
      return;
    writeInFlight.current = true;
    const current = generation.current;
    setSaving(true);
    setError(null);
    setSuccess("");
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
      if (current !== generation.current) return;
      setSuccess("Brand profile saved.");
      await loadProfile();
    } catch (err) {
      if (current === generation.current) setError(err);
    } finally {
      if (current === generation.current) {
        writeInFlight.current = false;
        setSaving(false);
      }
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
            <Text style={styles.title} accessibilityRole="header" aria-level={1}>
              Brand Profile & Billing
            </Text>
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
          define how the brand appears publicly. When no storefront has been saved yet,
          GrowPath starts with the authenticated business name when one is available.
          Another brand&apos;s identity or storefront content is never inserted.
        </Text>
        <View style={styles.metricGrid}>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>
              {loaded ? savedForm.businessName || "Not set" : "—"}
            </Text>
            <Text style={styles.metricLabel}>Brand</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{loaded ? savedForm.accountType : "—"}</Text>
            <Text style={styles.metricLabel}>Brand type</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>
              {loaded ? savedForm.storefrontStatus : "—"}
            </Text>
            <Text style={styles.metricLabel}>Storefront status</Text>
          </View>
        </View>
        {loading ? <Text style={styles.muted}>Loading brand profile...</Text> : null}
        {loaded && (loading || loadError) ? (
          <Text style={styles.muted}>
            Showing previously loaded brand details. Waiting for a successful refresh
            before editing.
          </Text>
        ) : null}
        {loadError ? (
          <>
            <InlineError error={loadError} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retry brand profile"
              disabled={loading || saving}
              onPress={() => {
                if (!writeInFlight.current) void loadProfile();
              }}
              style={styles.action}
            >
              <Text style={styles.actionText}>Retry brand profile</Text>
            </Pressable>
          </>
        ) : null}
        {success ? <Text style={styles.muted}>{success}</Text> : null}
        {error ? <InlineError error={error} /> : null}
      </AppCard>

      <ThemeModeSelector />

      <AppCard>
        <Text style={styles.cardTitle}>Edit brand profile</Text>
        <View style={styles.formGrid}>
          <TextInput
            editable={canEdit}
            value={form.businessName}
            onChangeText={(businessName) =>
              setForm((prev) => ({ ...prev, businessName }))
            }
            accessibilityLabel="Commercial brand name"
            placeholder="Brand name"
            placeholderTextColor={palette.textMuted}
            style={styles.input}
          />
          <TextInput
            editable={canEdit}
            value={form.slug}
            onChangeText={(slug) => setForm((prev) => ({ ...prev, slug }))}
            accessibilityLabel="Commercial public slug"
            autoCapitalize="none"
            placeholder="public-slug"
            placeholderTextColor={palette.textMuted}
            style={styles.input}
          />
          <TextInput
            editable={canEdit}
            value={form.accountType}
            onChangeText={(accountType) => setForm((prev) => ({ ...prev, accountType }))}
            accessibilityLabel="Commercial brand type"
            placeholder="soil_nutrient_brand, breeder, retailer"
            placeholderTextColor={palette.textMuted}
            style={styles.input}
          />
          <TextInput
            editable={canEdit}
            value={form.storefrontStatus}
            onChangeText={(storefrontStatus) =>
              setForm((prev) => ({ ...prev, storefrontStatus }))
            }
            accessibilityLabel="Commercial storefront visibility"
            placeholder="draft, published, active"
            placeholderTextColor={palette.textMuted}
            style={styles.input}
          />
          <TextInput
            editable={canEdit}
            value={form.websiteUrl}
            onChangeText={(websiteUrl) => setForm((prev) => ({ ...prev, websiteUrl }))}
            accessibilityLabel="Commercial website URL"
            autoCapitalize="none"
            placeholder="https://..."
            placeholderTextColor={palette.textMuted}
            style={styles.input}
          />
          <TextInput
            editable={canEdit}
            value={form.supportEmail}
            onChangeText={(supportEmail) =>
              setForm((prev) => ({ ...prev, supportEmail }))
            }
            accessibilityLabel="Commercial support email"
            autoCapitalize="none"
            placeholder={SUPPORT_CONTACTS.general}
            placeholderTextColor={palette.textMuted}
            style={styles.input}
          />
          <TextInput
            editable={canEdit}
            value={form.forumDisplayName}
            onChangeText={(forumDisplayName) =>
              setForm((prev) => ({ ...prev, forumDisplayName }))
            }
            accessibilityLabel="Commercial forum display name"
            placeholder="Brand forum identity"
            placeholderTextColor={palette.textMuted}
            style={styles.input}
          />
          <TextInput
            editable={canEdit}
            value={form.socialLinks}
            onChangeText={(socialLinks) => setForm((prev) => ({ ...prev, socialLinks }))}
            accessibilityLabel="Commercial external links"
            autoCapitalize="none"
            placeholder="External links, comma separated"
            placeholderTextColor={palette.textMuted}
            style={styles.input}
          />
        </View>
        <TextInput
          editable={canEdit}
          value={form.bio}
          onChangeText={(bio) => setForm((prev) => ({ ...prev, bio }))}
          accessibilityLabel="Commercial public bio"
          multiline
          placeholder="Public profile bio"
          placeholderTextColor={palette.textMuted}
          style={[styles.input, styles.textArea]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Save commercial brand profile"
          disabled={!canEdit || !form.businessName.trim()}
          onPress={submitProfile}
          style={[
            styles.submit,
            !canEdit || !form.businessName.trim() ? styles.submitDisabled : null
          ]}
        >
          <Text style={styles.submitText}>
            {saving ? "Saving..." : "Save brand profile"}
          </Text>
        </Pressable>
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Public storefront discovery</Text>
        <Text style={styles.body}>
          Free, Pro, commercial, and facility users should be able to discover this brand
          from feed campaigns, product cards, courses, forum threads, store search,
          similar storefronts, and direct public store URLs. Use one public store link
          everywhere so customers always land on the same brand experience.
        </Text>
        <View style={styles.urlList}>
          <Text style={styles.urlText}>
            Public storefront:{" "}
            {publicStoreUrl ||
              (loaded
                ? "Save a public slug to create this URL."
                : "Waiting for saved brand details.")}
          </Text>
          <Text style={styles.urlText}>
            Public product detail:{" "}
            {publicStoreUrl
              ? `Save and publish a product to create its URL under ${publicStoreUrl}.`
              : loaded
                ? "Save a public slug and a product to create this URL."
                : "Waiting for saved brand details."}
          </Text>
          <Text style={styles.urlText}>
            Similar storefronts and return-to-feed actions stay available from public
            pages.
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
          <ActionLink href="/home/commercial/community" label="Forum / Q&A" />
          <ActionLink href="/home/commercial/courses" label="Courses" />
          <ActionLink href="/videos?tab=library" label="Videos" />
          <ActionLink href="/home/commercial/trials" label="Product Trials" />
        </View>
      </AppCard>

      <AppCard>
        <Text style={styles.cardTitle}>Billing and account controls</Text>
        <Text style={styles.body}>
          Signed in as {user?.email || "commercial user"}. Plan:{" "}
          {entitlements?.plan || "commercial"}. Workspace mode:{" "}
          {entitlements?.mode || "commercial"}. Keep sign-in, email verification, plan
          status, privacy export, and account deletion in the account profile.
          Brand-facing settings should not be mixed with destructive account controls.
        </Text>
        {storefront?.id ? (
          <Text style={styles.muted}>Brand profile record: {storefront.id}</Text>
        ) : null}
        <View style={styles.actions}>
          <ActionLink href="/account/mode" label="Switch Workspace" />
          <ActionLink href="/profile" label="Open Account Profile" />
        </View>
      </AppCard>

      {canManageCreatorPayouts ? (
        <StripeConnectPayoutCard title="Stripe seller payouts" titleLevel={2} />
      ) : null}

      <CannabisContentControls />
    </AppPage>
  );
}

export function createCommercialProfileStyles(palette: ThemePalette) {
  return StyleSheet.create({
    header: {
      gap: 16
    },
    headerText: {
      gap: 6
    },
    kicker: {
      color: palette.textMuted,
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 0,
      textTransform: "uppercase"
    },
    title: {
      color: palette.text,
      fontSize: 28,
      fontWeight: "800",
      letterSpacing: 0
    },
    subtitle: {
      color: palette.textMuted,
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
      backgroundColor: palette.surface,
      borderColor: palette.accent,
      borderRadius: radius.card,
      borderWidth: 1,
      minHeight: 40,
      justifyContent: "center",
      paddingHorizontal: 14,
      paddingVertical: 10
    },
    actionText: {
      color: palette.link,
      fontSize: 14,
      fontWeight: "700"
    },
    cardTitle: {
      color: palette.text,
      fontSize: 18,
      fontWeight: "800",
      marginBottom: 8
    },
    body: {
      color: palette.textMuted,
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
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      minWidth: 150,
      padding: 12
    },
    metricValue: {
      color: palette.text,
      fontSize: 16,
      fontWeight: "800"
    },
    metricLabel: {
      color: palette.textMuted,
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
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      color: palette.text,
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
      backgroundColor: palette.accent,
      borderRadius: radius.card,
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
      color: palette.accentText,
      fontSize: 14,
      fontWeight: "800"
    },
    urlList: {
      gap: 6,
      marginTop: 12
    },
    urlText: {
      color: palette.textSoft,
      fontSize: 13,
      lineHeight: 19
    },
    muted: {
      color: palette.textMuted,
      fontSize: 13,
      marginTop: 10
    }
  });
}
