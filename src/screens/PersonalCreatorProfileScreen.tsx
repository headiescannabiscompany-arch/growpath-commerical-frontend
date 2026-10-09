import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/auth/AuthContext";
import {
  CreatorProfileDraft,
  CreatorProfileState,
  creatorDraftIssue,
  getMyCreatorProfile,
  publishCreatorProfile,
  saveCreatorProfile,
  unpublishCreatorProfile
} from "@/api/creatorProfile";
import AppPage from "@/components/layout/AppPage";
import AppCard from "@/components/layout/AppCard";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { CREATOR_PROFILE_EDITOR_PATH, safeLoginPath } from "@/utils/authReturnPath";

export default function PersonalCreatorProfileScreen() {
  const auth = useAuth();
  const router = useRouter();
  const { palette } = useAppTheme();
  const [retrying, setRetrying] = useState(false);
  const retryBusy = useRef(false);
  if (auth.isHydrating || auth.meStatus === "loading" || auth.meStatus === "error") {
    return (
      <AppPage
        routeKey="creator-profile-editor"
        backFallbackHref="/home/personal/profile"
      >
        <Text style={{ color: palette.text }}>
          {auth.meStatus === "error"
            ? "Sign-in check unavailable"
            : "Checking your sign-in"}
        </Text>
        {auth.meStatus === "error" ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: retrying }}
            disabled={retrying}
            onPress={async () => {
              if (retryBusy.current) return;
              retryBusy.current = true;
              setRetrying(true);
              try {
                await auth.retryMe();
              } catch {
                /* Keep the recoverable sign-in error. */
              } finally {
                retryBusy.current = false;
                setRetrying(false);
              }
            }}
          >
            <Text style={{ color: palette.accent, padding: 12 }}>
              Retry sign-in check
            </Text>
          </Pressable>
        ) : (
          <ActivityIndicator accessibilityLabel="Checking your sign-in" />
        )}
      </AppPage>
    );
  }
  if (!auth.isAuthed || !(auth.user?.id || auth.user?._id)) {
    return (
      <AppPage
        routeKey="creator-profile-editor"
        backFallbackHref="/home/personal/profile"
      >
        <Text style={{ color: palette.text }}>
          Sign in to manage your creator profile and links.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            router.push(safeLoginPath("", CREATOR_PROFILE_EDITOR_PATH) as any)
          }
        >
          <Text style={{ color: palette.accent, padding: 12 }}>Sign in</Text>
        </Pressable>
      </AppPage>
    );
  }
  const ownerId = String(auth.user?.id || auth.user?._id);
  return <CreatorEditor key={JSON.stringify([ownerId, auth.token])} ownerId={ownerId} />;
}

function CreatorEditor({ ownerId }: { ownerId: string }) {
  const router = useRouter();
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [saved, setSaved] = useState<CreatorProfileState | null>(null);
  const [draft, setDraft] = useState<CreatorProfileDraft>({
    displayName: "",
    bio: "",
    links: []
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [reloadRequired, setReloadRequired] = useState(false);
  const [reloadConfirm, setReloadConfirm] = useState(false);
  const [publicationUnknown, setPublicationUnknown] = useState(false);
  const mounted = useRef(true);
  const requestBusy = useRef(false);
  const dirty = Boolean(saved && JSON.stringify(saved.draft) !== JSON.stringify(draft));
  const issue = creatorDraftIssue(draft);

  async function load() {
    if (requestBusy.current) return;
    requestBusy.current = true;
    setLoading(true);
    setError("");
    setNotice("");
    setReviewing(false);
    setReloadConfirm(false);
    try {
      const result = await getMyCreatorProfile();
      if (result.ownerId !== ownerId) throw new Error("Creator profile owner mismatch");
      if (!mounted.current) return;
      setSaved(result);
      setDraft(result.draft);
      setReloadRequired(false);
      setPublicationUnknown(false);
    } catch {
      if (mounted.current)
        setError(
          "Your saved creator profile could not be loaded. Retry without changing anything."
        );
    } finally {
      requestBusy.current = false;
      if (mounted.current) setLoading(false);
    }
  }
  useEffect(() => {
    mounted.current = true;
    void load();
    return () => {
      mounted.current = false;
    };
    // This editor is remounted for every authenticated account/token change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function mutate(action: "save" | "publish" | "unpublish") {
    if (!saved || requestBusy.current || (action !== "unpublish" && reloadRequired))
      return;
    if (action === "save" && issue) {
      setError(issue);
      return;
    }
    if (action === "publish" && (!reviewing || dirty || !saved.draft.displayName.trim()))
      return;
    requestBusy.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result =
        action === "save"
          ? await saveCreatorProfile(saved.revision, draft)
          : action === "publish"
            ? await publishCreatorProfile(saved.revision)
            : await unpublishCreatorProfile();
      if (result.ownerId !== ownerId) throw new Error("Creator profile owner mismatch");
      if (!mounted.current) return;
      const changedElsewhere =
        action === "unpublish" &&
        dirty &&
        JSON.stringify(result.draft) !== JSON.stringify(saved.draft) &&
        JSON.stringify(result.draft) !== JSON.stringify(draft);
      setSaved(result);
      if (action !== "unpublish" || !dirty) setDraft(result.draft);
      setReviewing(false);
      setPublicationUnknown(false);
      setReloadRequired(changedElsewhere);
      if (changedElsewhere)
        setError(
          "The profile is withdrawn, but another tab changed the saved draft. Reload before saving your on-screen edits."
        );
      setNotice(
        action === "save"
          ? "Draft saved. Your public profile has not changed."
          : action === "publish"
            ? "Your reviewed creator profile is now public."
            : "Creator profile withdrawn. Your draft is kept; existing published videos are unchanged."
      );
    } catch (reason: any) {
      if (!mounted.current) return;
      setReviewing(false);
      setReloadRequired(true);
      if (action === "publish" || action === "unpublish") setPublicationUnknown(true);
      setError(
        reason?.status === 409
          ? "This profile changed in another tab. Reload the saved draft and review it before publishing."
          : "The result could not be confirmed. Your on-screen draft is kept. Reload saved state before trying again."
      );
    } finally {
      requestBusy.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  function change(next: CreatorProfileDraft) {
    setDraft(next);
    setReviewing(false);
    setNotice("");
  }
  function button(
    label: string,
    onPress: () => void,
    disabled = false,
    secondary = false
  ) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        style={[
          styles.button,
          secondary && styles.secondary,
          disabled && styles.disabled
        ]}
      >
        <Text style={secondary ? styles.secondaryText : styles.buttonText}>{label}</Text>
      </Pressable>
    );
  }
  return (
    <AppPage
      routeKey="creator-profile-editor"
      backFallbackHref="/home/personal/profile"
      header={
        <View style={styles.stack}>
          <Text accessibilityRole="header" aria-level={1} style={styles.title}>
            Creator profile & links
          </Text>
          <Text style={styles.copy}>
            Choose what people see on your creator page. You do not need a video, paid
            plan or payout account.
          </Text>
        </View>
      }
    >
      <AppCard style={styles.stack}>
        <Text style={styles.copy}>
          Drafts are private. Saving does not publish. Publishing makes your chosen name,
          about text and links visible to anyone with the page link.
        </Text>
        <Text style={styles.copy}>
          Commercial profile links are managed separately and are not copied here.
        </Text>
      </AppCard>
      {loading ? (
        <ActivityIndicator
          accessibilityLabel="Loading your creator profile"
          color={palette.accent}
        />
      ) : null}
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
      {notice ? (
        <Text accessibilityLiveRegion="polite" style={styles.copy}>
          {notice}
        </Text>
      ) : null}
      {!loading && !saved ? button("Retry loading profile", () => void load()) : null}
      {!loading && saved ? (
        <>
          <AppCard style={styles.stack}>
            <Text accessibilityRole="header" aria-level={2} style={styles.heading}>
              Private draft
            </Text>
            <Text style={styles.label}>Public name</Text>
            <TextInput
              accessibilityLabel="Public name"
              value={draft.displayName}
              maxLength={80}
              editable={!busy}
              style={styles.input}
              onChangeText={(displayName) => change({ ...draft, displayName })}
            />
            <Text style={styles.label}>About you (optional)</Text>
            <TextInput
              accessibilityLabel="About you"
              value={draft.bio}
              maxLength={1000}
              editable={!busy}
              multiline
              style={[styles.input, styles.bio]}
              onChangeText={(bio) => change({ ...draft, bio })}
            />
            {draft.links.map((link, index) => (
              <View key={index} style={styles.linkBlock}>
                <Text style={styles.label}>Link {index + 1}</Text>
                <TextInput
                  accessibilityLabel={`Link ${index + 1} label`}
                  value={link.label}
                  maxLength={80}
                  editable={!busy}
                  style={styles.input}
                  placeholder="YouTube, website, store…"
                  placeholderTextColor={palette.textMuted}
                  onChangeText={(label) =>
                    change({
                      ...draft,
                      links: draft.links.map((row, i) =>
                        i === index ? { ...row, label } : row
                      )
                    })
                  }
                />
                <TextInput
                  accessibilityLabel={`Link ${index + 1} address`}
                  value={link.url}
                  maxLength={2048}
                  editable={!busy}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  style={styles.input}
                  placeholder="https://"
                  placeholderTextColor={palette.textMuted}
                  onChangeText={(url) =>
                    change({
                      ...draft,
                      links: draft.links.map((row, i) =>
                        i === index ? { ...row, url } : row
                      )
                    })
                  }
                />
                {button(
                  `Remove link ${index + 1}`,
                  () =>
                    change({
                      ...draft,
                      links: draft.links.filter((_, i) => i !== index)
                    }),
                  busy,
                  true
                )}
              </View>
            ))}
            {button(
              "Add link",
              () => change({ ...draft, links: [...draft.links, { label: "", url: "" }] }),
              busy || draft.links.length >= 8,
              true
            )}
            {issue ? <Text style={styles.copy}>{issue}</Text> : null}
            <View style={styles.actions}>
              {button(
                "Save private draft",
                () => void mutate("save"),
                busy || reloadRequired || Boolean(issue) || !dirty
              )}
              {button(
                "Reload saved draft",
                () => (dirty ? setReloadConfirm(true) : void load()),
                busy,
                true
              )}
            </View>
            {reloadConfirm ? (
              <View style={styles.stack}>
                <Text style={styles.copy}>
                  Reloading replaces your unsaved on-screen edits with the last saved
                  draft.
                </Text>
                {button("Discard unsaved edits and reload", () => void load(), busy)}
                {button("Keep editing", () => setReloadConfirm(false), busy, true)}
              </View>
            ) : null}
            {dirty ? (
              <Text style={styles.copy}>
                Unsaved changes. Save and review before publishing.
              </Text>
            ) : null}
            {button(
              "Review publication",
              () => {
                setReviewing(true);
                setError("");
              },
              busy || reloadRequired || dirty || !saved.draft.displayName.trim()
            )}
          </AppCard>
          {reviewing ? (
            <AppCard style={styles.stack}>
              <Text accessibilityRole="header" aria-level={2} style={styles.heading}>
                Review exactly what becomes public
              </Text>
              <Text style={styles.label}>{saved.draft.displayName}</Text>
              {saved.draft.bio ? (
                <Text style={styles.copy}>{saved.draft.bio}</Text>
              ) : null}
              {saved.draft.links.map((link, i) => (
                <Text key={i} style={styles.copy}>
                  {link.label}: {link.url}
                </Text>
              ))}
              <Text style={styles.copy}>
                Anyone can read this page. Do not include private contact details, access
                tokens or links to private files. Future edits stay private until you
                publish again.
              </Text>
              {button("Publish reviewed profile", () => void mutate("publish"), busy)}
              {button("Cancel publication", () => setReviewing(false), busy, true)}
            </AppCard>
          ) : null}
          <AppCard style={styles.stack}>
            <Text accessibilityRole="header" aria-level={2} style={styles.heading}>
              Public profile
            </Text>
            <Text style={styles.copy}>
              {publicationUnknown
                ? "Publication status needs checking. Reload saved state, or withdraw any published profile."
                : saved.published
                  ? `Published as ${saved.published.displayName}. Only the last published version is visible.`
                  : "No profile or links have been published here. Existing public videos can still have a creator page."}
            </Text>
            {saved.published
              ? button(
                  "View public creator page",
                  () =>
                    router.push(
                      `/creators/${encodeURIComponent(saved.ownerId)}?from=creator-profile-editor` as any
                    ),
                  busy,
                  true
                )
              : null}
            {saved.published || publicationUnknown
              ? button(
                  "Unpublish creator profile",
                  () => void mutate("unpublish"),
                  busy,
                  true
                )
              : null}
          </AppCard>
        </>
      ) : null}
    </AppPage>
  );
}

const createStyles = (palette: ThemePalette) =>
  StyleSheet.create({
    stack: { gap: 12 },
    title: { fontSize: 28, fontWeight: "900", color: palette.heroText },
    heading: { fontSize: 20, fontWeight: "800", color: palette.text },
    label: { fontWeight: "700", color: palette.text },
    copy: { color: palette.textMuted, lineHeight: 22 },
    error: { color: palette.danger, lineHeight: 22 },
    input: {
      color: palette.text,
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      minHeight: 46
    },
    bio: { minHeight: 100, textAlignVertical: "top" },
    linkBlock: { gap: 8, borderTopWidth: 1, borderColor: palette.border, paddingTop: 12 },
    actions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    button: {
      backgroundColor: palette.accent,
      padding: 12,
      borderRadius: 8,
      minHeight: 44,
      alignSelf: "flex-start",
      maxWidth: "100%"
    },
    buttonText: { color: palette.accentText, fontWeight: "700" },
    secondary: {
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border
    },
    secondaryText: { color: palette.accent, fontWeight: "700" },
    disabled: { opacity: 0.5 }
  });
