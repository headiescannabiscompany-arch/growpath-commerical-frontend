import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import {
  fetchRegulatedCommerce,
  submitRegulatedAuthorization,
  type RegulatedCommerceWorkspace
} from "@/api/regulatedCommerce";
import { InlineError } from "@/components/InlineError";
import AppCard from "@/components/layout/AppCard";
import AppPage from "@/components/layout/AppPage";
import { type ThemePalette, useAppTheme } from "@/theme/appTheme";
import { radius } from "@/theme/theme";

const roleLabels: Record<string, string> = {
  nursery: "Nursery",
  cultivator: "Cultivator / grower",
  breeder_seed_bank: "Breeder / seed bank",
  distributor: "Distributor",
  dispensary: "Dispensary",
  retailer: "Retailer"
};

const productLabels: Record<string, string> = {
  hemp_seed: "Hemp seed",
  cannabis_seed: "Cannabis seed",
  hemp_plant: "Hemp plant",
  cannabis_plant: "Cannabis plant",
  hemp_product: "Hemp product",
  regulated_cannabis_product: "Regulated cannabis product"
};

function toggle(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

export function requiresStorefrontSetup(error: any) {
  return String(error?.message || error?.error?.message || error || "")
    .toLowerCase()
    .includes("set up a storefront first");
}

export default function RegulatedCommerceRoute() {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [workspace, setWorkspace] = useState<RegulatedCommerceWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<any>(null);
  const [feedback, setFeedback] = useState("");
  const [form, setForm] = useState({
    businessRoles: [] as string[],
    productClasses: [] as string[],
    countryCode: "",
    subdivisionCode: "",
    locality: "",
    authorizationType: "",
    authorizationIdentifier: "",
    issuer: "",
    evidenceUrl: "",
    effectiveAt: "",
    expiresAt: ""
  });
  const storefrontSetupRequired = requiresStorefrontSetup(error);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setWorkspace(await fetchRegulatedCommerce());
    } catch (loadError) {
      setError(loadError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit() {
    if (saving) return;
    setError(null);
    setFeedback("");
    if (!form.businessRoles.length || !form.productClasses.length) {
      setError(new Error("Choose at least one business role and product class."));
      return;
    }
    if (
      !form.countryCode.trim() ||
      !form.authorizationType.trim() ||
      !form.authorizationIdentifier.trim() ||
      !form.issuer.trim()
    ) {
      setError(
        new Error(
          "Country, authorization type, identifier, and issuing authority are required."
        )
      );
      return;
    }
    setSaving(true);
    try {
      const result = await submitRegulatedAuthorization({
        businessRoles: form.businessRoles,
        productClasses: form.productClasses,
        jurisdiction: {
          countryCode: form.countryCode.trim().toUpperCase(),
          subdivisionCode: form.subdivisionCode.trim().toUpperCase(),
          locality: form.locality.trim()
        },
        authorizationType: form.authorizationType.trim(),
        authorizationIdentifier: form.authorizationIdentifier.trim(),
        issuer: form.issuer.trim(),
        evidenceUrl: form.evidenceUrl.trim(),
        effectiveAt: form.effectiveAt.trim() || null,
        expiresAt: form.expiresAt.trim() || null
      });
      setFeedback(
        result?.message ||
          "Authorization submitted for review. No sales capability was enabled."
      );
      setForm((current) => ({
        ...current,
        authorizationType: "",
        authorizationIdentifier: "",
        issuer: "",
        evidenceUrl: "",
        effectiveAt: "",
        expiresAt: ""
      }));
      await load();
    } catch (submitError) {
      setError(submitError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppPage
      routeKey="commercial-regulated-commerce"
      showBack
      backFallbackHref="/home/commercial/storefront"
      header={
        <View style={styles.header}>
          <Text style={styles.kicker}>Commercial workspace</Text>
          <Text accessibilityRole="header" aria-level={1} style={styles.title}>
            Regulated commerce
          </Text>
          <Text style={styles.subtitle}>
            Describe every role your business performs, submit authorization evidence, and
            see exactly which routes have been reviewed.
          </Text>
        </View>
      }
    >
      <AppCard
        title="How access works"
        titleLevel={2}
        subtitle="Your profile, website, inventory, and transaction permissions are separate capabilities."
      >
        <Text style={styles.body}>
          A nursery, grower, seed bank, distributor, dispensary, or retailer may hold
          several roles. A paid plan or business label never proves a sale is lawful.
          GrowPath evaluates the seller, product, origin, destination, buyer eligibility,
          and fulfillment route under a recorded policy version.
        </Text>
        <Text style={styles.warning}>
          Submitting evidence does not enable checkout, payment, reservation, delivery,
          shipping, export, or import. Those require a separate reviewed route decision.
        </Text>
      </AppCard>

      {loading ? <ActivityIndicator color={palette.accent} /> : null}
      {error && !storefrontSetupRequired ? (
        <InlineError error={error} onRetry={load} />
      ) : null}
      {storefrontSetupRequired ? (
        <AppCard
          title="Storefront setup required"
          titleLevel={2}
          subtitle="Create the Commercial storefront identity before submitting regulated-business authorization evidence."
        >
          <Text style={styles.body}>
            This is a setup step, not a failed legal review. No commerce capability has
            been enabled or denied.
          </Text>
          <Link href="/home/commercial/storefront/edit" asChild>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Set up Commercial storefront"
              style={styles.primaryButton}
            >
              <Text style={styles.primaryText}>Set Up Storefront</Text>
            </Pressable>
          </Link>
        </AppCard>
      ) : null}
      {feedback ? (
        <Text accessibilityLiveRegion="polite" style={styles.success}>
          {feedback}
        </Text>
      ) : null}

      {workspace ? (
        <>
          <AppCard
            title="Business authorization evidence"
            titleLevel={2}
            subtitle={`For ${workspace.storefront.name}. Select every applicable role and product class.`}
          >
            <Text style={styles.label}>Business roles</Text>
            <View style={styles.choices}>
              {workspace.businessRoles.map((role) => {
                const selected = form.businessRoles.includes(role);
                return (
                  <Pressable
                    key={role}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={roleLabels[role] || role}
                    onPress={() =>
                      setForm((current) => ({
                        ...current,
                        businessRoles: toggle(current.businessRoles, role)
                      }))
                    }
                    style={[styles.choice, selected && styles.choiceSelected]}
                  >
                    <Text
                      style={selected ? styles.choiceSelectedText : styles.choiceText}
                    >
                      {roleLabels[role] || role}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.label}>Product classes</Text>
            <View style={styles.choices}>
              {workspace.productClasses.map((productClass) => {
                const selected = form.productClasses.includes(productClass);
                return (
                  <Pressable
                    key={productClass}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={productLabels[productClass] || productClass}
                    onPress={() =>
                      setForm((current) => ({
                        ...current,
                        productClasses: toggle(current.productClasses, productClass)
                      }))
                    }
                    style={[styles.choice, selected && styles.choiceSelected]}
                  >
                    <Text
                      style={selected ? styles.choiceSelectedText : styles.choiceText}
                    >
                      {productLabels[productClass] || productClass}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {[
              ["Country code", "US", "countryCode"],
              ["State / province code", "MA", "subdivisionCode"],
              ["City or locality", "Boston", "locality"],
              [
                "Authorization type",
                "Cannabis establishment license",
                "authorizationType"
              ],
              ["Authorization identifier", "License number", "authorizationIdentifier"],
              ["Issuing authority", "Government or licensing authority", "issuer"],
              ["Public evidence URL", "https://...", "evidenceUrl"],
              ["Effective date", "YYYY-MM-DD", "effectiveAt"],
              ["Expiry date", "YYYY-MM-DD", "expiresAt"]
            ].map(([label, placeholder, field]) => (
              <View key={field} style={styles.field}>
                <Text style={styles.label}>{label}</Text>
                <TextInput
                  accessibilityLabel={label}
                  autoCapitalize={
                    field === "countryCode" || field === "subdivisionCode"
                      ? "characters"
                      : "sentences"
                  }
                  autoCorrect={false}
                  placeholder={placeholder}
                  placeholderTextColor={palette.textMuted}
                  selectionColor={palette.accent}
                  value={(form as any)[field]}
                  onChangeText={(value) =>
                    setForm((current) => ({ ...current, [field]: value }))
                  }
                  style={styles.input}
                />
              </View>
            ))}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Submit business authorization for review"
              accessibilityState={{ disabled: saving }}
              disabled={saving}
              onPress={() => void submit()}
              style={[styles.primaryButton, saving && styles.disabled]}
            >
              <Text style={styles.primaryText}>
                {saving ? "Submitting…" : "Submit for review"}
              </Text>
            </Pressable>
          </AppCard>

          <AppCard
            title="Authorization history"
            titleLevel={2}
            subtitle="Pending, verified, rejected, expired, and revoked evidence stays visible for audit."
          >
            {workspace.authorizations.length ? (
              workspace.authorizations.map((authorization) => (
                <View key={authorization.id || authorization._id} style={styles.record}>
                  <Text style={styles.recordTitle}>
                    {authorization.authorizationType} · {authorization.reviewStatus}
                  </Text>
                  <Text style={styles.meta}>
                    {authorization.authorizationIdentifier} · {authorization.issuer}
                  </Text>
                  <Text style={styles.meta}>
                    {authorization.businessRoles
                      .map((role) => roleLabels[role] || role)
                      .join(", ")}
                  </Text>
                  <Text style={styles.meta}>
                    {authorization.productClasses
                      .map((item) => productLabels[item] || item)
                      .join(", ")}
                  </Text>
                  {authorization.reviewNotes ? (
                    <Text style={styles.meta}>{authorization.reviewNotes}</Text>
                  ) : null}
                </View>
              ))
            ) : (
              <Text style={styles.meta}>No authorization evidence submitted yet.</Text>
            )}
          </AppCard>

          <AppCard
            title="Reviewed capability routes"
            titleLevel={2}
            subtitle="A decision applies only to the exact route shown."
          >
            {workspace.decisions.length ? (
              workspace.decisions.map((decision) => (
                <View key={decision.id || decision._id} style={styles.record}>
                  <Text style={styles.recordTitle}>
                    {decision.capability.replaceAll("_", " ")} · {decision.decision}
                  </Text>
                  <Text style={styles.meta}>
                    {decision.origin.countryCode}
                    {decision.origin.subdivisionCode
                      ? `-${decision.origin.subdivisionCode}`
                      : ""}
                    {" → "}
                    {decision.destination.countryCode}
                    {decision.destination.subdivisionCode
                      ? `-${decision.destination.subdivisionCode}`
                      : ""}
                    {" · "}
                    {productLabels[decision.productClass] || decision.productClass}
                  </Text>
                  <Text style={styles.meta}>Policy {decision.policyVersion}</Text>
                  <Text style={styles.meta}>
                    {decision.reasonCodes.join(", ").replaceAll("_", " ")}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.meta}>No route has been approved.</Text>
            )}
          </AppCard>
        </>
      ) : null}
    </AppPage>
  );
}

const createStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    header: { gap: 6 },
    kicker: {
      color: palette.accent,
      fontSize: 13,
      fontWeight: "900",
      letterSpacing: 0.8,
      textTransform: "uppercase"
    },
    title: { color: palette.text, fontSize: 32, fontWeight: "900" },
    subtitle: { color: palette.textSoft, fontSize: 16, lineHeight: 23 },
    body: { color: palette.textSoft, lineHeight: 22 },
    warning: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.warning,
      borderRadius: radius.card,
      borderWidth: 1,
      color: palette.text,
      lineHeight: 21,
      marginTop: 12,
      padding: 12
    },
    success: {
      backgroundColor: palette.accentSoft,
      borderColor: palette.accent,
      borderRadius: radius.card,
      borderWidth: 1,
      color: palette.text,
      padding: 12
    },
    label: { color: palette.text, fontWeight: "800", marginBottom: 6, marginTop: 12 },
    choices: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    choice: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 10
    },
    choiceSelected: { backgroundColor: palette.accentSoft, borderColor: palette.accent },
    choiceText: { color: palette.textSoft, fontWeight: "700" },
    choiceSelectedText: { color: palette.link, fontWeight: "900" },
    field: { marginTop: 4 },
    input: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      color: palette.text,
      padding: 12
    },
    primaryButton: {
      alignItems: "center",
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      marginTop: 16,
      padding: 13
    },
    primaryText: { color: palette.accentText, fontWeight: "900" },
    disabled: { opacity: 0.55 },
    record: {
      borderBottomColor: palette.borderSoft,
      borderBottomWidth: 1,
      paddingVertical: 12
    },
    recordTitle: { color: palette.text, fontWeight: "900", textTransform: "capitalize" },
    meta: { color: palette.textMuted, lineHeight: 20, marginTop: 4 }
  });
