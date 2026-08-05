import { Link, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import {
  addFieldStudyCollaborator,
  FieldObservation,
  FieldObservationInput,
  FieldStudy,
  getFieldStudy,
  removeFieldStudyCollaborator,
  updateFieldStudy,
  updateFieldObservation
} from "@/api/fieldStudies";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { sharePublicLink } from "@/utils/publicLinks";
import { radius } from "@/theme/theme";

function observationName(observation: FieldObservation) {
  return (
    observation.identity?.commonName ||
    observation.identity?.scientificName ||
    observation.title ||
    "Unconfirmed plant"
  );
}

function observationHasPhotoEvidence(observation: FieldObservation) {
  return Boolean(
    observation.photoUrls?.some(Boolean) ||
    observation.evidenceAssets?.some(
      (asset) =>
        (asset.kind === "photo" || asset.kind === "video_frame") &&
        (asset.assetId || asset.id || asset.url || asset.uri)
    )
  );
}

function observationIsCannabis(observation: FieldObservation) {
  const candidateNames = (observation.identity?.candidates || []).flatMap((candidate) => [
    candidate.commonName,
    candidate.scientificName
  ]);
  return /\b(cannabis|hemp|marijuana)\b/i.test(
    [
      observation.title,
      observation.identity?.commonName,
      observation.identity?.scientificName,
      ...candidateNames
    ]
      .filter(Boolean)
      .join(" ")
  );
}

function natureReadiness(study: FieldStudy, observation: FieldObservation) {
  const hasCoordinates =
    observation.location?.latitude != null && observation.location?.longitude != null;
  const locationIsPublic =
    observation.location?.privacy === "public_approximate" ||
    (observation.location?.privacy === "public_exact" &&
      observation.location?.exactLocationPublicConfirmed === true);
  const cannabisIdentity = observationIsCannabis(observation);
  const checks = [
    {
      key: "photo",
      label: "Photo evidence attached",
      complete: observationHasPhotoEvidence(observation)
    },
    {
      key: "coordinates",
      label: "Device coordinates captured",
      complete: hasCoordinates
    },
    {
      key: "study",
      label: "Field Study is public",
      complete: study.visibility === "public"
    },
    {
      key: "location",
      label:
        observation.location?.privacy === "public_exact"
          ? "Exact public location is explicitly confirmed"
          : "Approximate location is shared",
      complete: locationIsPublic
    },
    ...(cannabisIdentity
      ? [
          {
            key: "cannabis-context",
            label: "Cannabis/hemp public sharing is confirmed",
            complete: observation.publication?.cannabisContextConfirmed === true
          }
        ]
      : []),
    {
      key: "publication",
      label: "Observation is published",
      complete: observation.publication?.status === "published"
    }
  ];
  return {
    checks,
    complete: checks.every((check) => check.complete)
  };
}

export default function FieldStudyDetailScreen() {
  return (
    <ScreenBoundary
      title="Field Study"
      showBack
      backFallbackHref="/home/personal/field-studies"
    >
      <FieldStudyDetailContent />
    </ScreenBoundary>
  );
}

function FieldStudyDetailContent() {
  const params = useLocalSearchParams<{ studyId?: string }>();
  const studyId = String(params.studyId || "");
  const { palette } = useAppTheme();
  const styles = useMemo(() => createFieldStudyDetailStyles(palette), [palette]);
  const [study, setStudy] = useState<FieldStudy | null>(null);
  const [observations, setObservations] = useState<FieldObservation[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "verifier" | "viewer">("viewer");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingObservationId, setSavingObservationId] = useState("");
  const [pendingRemovalId, setPendingRemovalId] = useState("");
  const [pendingApproximateId, setPendingApproximateId] = useState("");
  const [pendingCannabisId, setPendingCannabisId] = useState("");
  const [error, setError] = useState("");

  const canManage = study?.accessRole === "owner";
  const canEdit = study?.accessRole === "owner" || study?.accessRole === "editor";
  const publicPath = study?.slug ? `/field-observations/${study.slug}` : "";

  const load = useCallback(async () => {
    if (!studyId) {
      setStudy(null);
      setObservations([]);
      setError("Choose a Field Study to continue.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await getFieldStudy(studyId);
      setStudy(response.study);
      setObservations(response.observations);
    } catch (loadError: any) {
      setStudy(null);
      setObservations([]);
      setError(loadError?.message || "Field Study could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [studyId]);

  useEffect(() => {
    void load();
  }, [load]);

  const publishStudy = useCallback(async () => {
    if (!study || saving) return;
    setSaving(true);
    setError("");
    try {
      const nextVisibility = study.visibility === "public" ? "private" : "public";
      const updated = await updateFieldStudy(studyId, {
        visibility: nextVisibility
      });
      setStudy(updated);
    } catch (publishError: any) {
      setError(publishError?.message || "Sharing settings could not be updated.");
    } finally {
      setSaving(false);
    }
  }, [saving, study, studyId]);

  const addCollaborator = useCallback(async () => {
    if (!email.trim() || saving) return;
    setSaving(true);
    setError("");
    try {
      const updated = await addFieldStudyCollaborator(studyId, email.trim(), role);
      setStudy(updated);
      setEmail("");
    } catch (collaboratorError: any) {
      setError(
        collaboratorError?.message ||
          "That collaborator could not be added. They need a GrowPathAI account."
      );
    } finally {
      setSaving(false);
    }
  }, [email, role, saving, studyId]);

  const removeCollaborator = useCallback(
    async (collaboratorId: string) => {
      if (!collaboratorId || saving) return;
      setSaving(true);
      setError("");
      try {
        setStudy(await removeFieldStudyCollaborator(studyId, collaboratorId));
      } catch (removeError: any) {
        setError(removeError?.message || "This collaborator could not be removed.");
      } finally {
        setSaving(false);
      }
    },
    [saving, studyId]
  );

  const patchObservation = useCallback(
    async (observation: FieldObservation, patch: FieldObservationInput) => {
      const observationId = String(observation.id || observation._id || "");
      if (!observationId || savingObservationId) return;
      setSavingObservationId(observationId);
      setError("");
      try {
        const preservedPatch = {
          ...patch,
          ...(patch.identity
            ? { identity: { ...observation.identity, ...patch.identity } }
            : {}),
          ...(patch.location
            ? { location: { ...observation.location, ...patch.location } }
            : {}),
          ...(patch.publication
            ? { publication: { ...observation.publication, ...patch.publication } }
            : {})
        };
        const updated = await updateFieldObservation(
          studyId,
          observationId,
          preservedPatch
        );
        setObservations((current) =>
          current.map((item) =>
            String(item.id || item._id) === observationId ? updated : item
          )
        );
      } catch (updateError: any) {
        setError(
          updateError?.message ||
            "This observation could not be updated. Check its evidence and permissions."
        );
      } finally {
        setSavingObservationId("");
      }
    },
    [savingObservationId, studyId]
  );

  const observationCountLabel = useMemo(
    () => `${observations.length} observation${observations.length === 1 ? "" : "s"}`,
    [observations.length]
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={palette.accent} />
        <Text style={styles.muted}>Loading Field Study...</Text>
      </View>
    );
  }

  if (!study) {
    return (
      <View style={styles.centered}>
        <Text accessibilityRole="header" aria-level={1} style={styles.title}>
          Field Study unavailable
        </Text>
        <Text accessibilityRole="alert" style={styles.error}>
          {error || "This study could not be found."}
        </Text>
        {studyId ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry Field Study"
            onPress={() => void load()}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryText}>Retry</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text accessibilityRole="header" aria-level={1} style={styles.title}>
            {study.title}
          </Text>
          <Text style={styles.muted}>
            {study.regionLabel || "Region not set"} · {observationCountLabel} ·{" "}
            {study.accessRole}
          </Text>
        </View>
        <Text style={styles.badge}>{study.visibility}</Text>
      </View>

      {study.description ? (
        <Text style={styles.description}>{study.description}</Text>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.actionRow}>
        {canEdit ? (
          <Link
            href={`/home/personal/tools/species-crop-id?fieldStudyId=${studyId}`}
            asChild
          >
            <Pressable style={styles.primaryButton}>
              <Text style={styles.primaryText}>Add Plant Observation</Text>
            </Pressable>
          </Link>
        ) : null}
        {canEdit ? (
          <Link
            href={`/home/personal/tools/saved-runs?toolType=species_crop_id&fieldStudyId=${studyId}`}
            asChild
          >
            <Pressable style={styles.secondaryButton}>
              <Text style={styles.secondaryText}>Link Saved Plant IDs</Text>
            </Pressable>
          </Link>
        ) : null}
        {study.visibility !== "private" && publicPath ? (
          <Pressable
            onPress={() => void sharePublicLink(study.title, publicPath)}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryText}>Share Public View</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.privacyPanel}>
        <Text style={styles.panelTitle}>Location and publishing safety</Text>
        <Text style={styles.panelText}>
          Observations are drafts unless you publish them. Private and collaborator-only
          coordinates never appear on the public map. Public approximate locations are
          rounded; sensitive species receive a wider regional location.
        </Text>
        {canManage ? (
          <Pressable
            accessibilityRole="button"
            disabled={saving}
            onPress={() => void publishStudy()}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryText}>
              {study.visibility === "public" ? "Make Study Private" : "Publish Study"}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {canManage ? (
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Invite an existing GrowPathAI account</Text>
          <Text style={styles.panelText}>
            Editors can add and change observations. Verifiers can review identification
            status. Viewers can only read the shared study.
          </Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="Collaborator email"
            placeholderTextColor={palette.textMuted}
            selectionColor={palette.accent}
            style={styles.input}
            value={email}
          />
          <View style={styles.roleRow}>
            {(["editor", "verifier", "viewer"] as const).map((item) => (
              <Pressable
                key={item}
                onPress={() => setRole(item)}
                style={[styles.roleButton, role === item && styles.roleButtonSelected]}
              >
                <Text style={[styles.roleText, role === item && styles.roleTextSelected]}>
                  {item}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            disabled={!email.trim() || saving}
            onPress={() => void addCollaborator()}
            style={[styles.primaryButton, (!email.trim() || saving) && styles.disabled]}
          >
            <Text style={styles.primaryText}>{saving ? "Saving..." : "Add Person"}</Text>
          </Pressable>
          {(study.collaborators || []).map((collaborator) => {
            const collaboratorId = String(collaborator.userId);
            const confirmingRemoval = pendingRemovalId === collaboratorId;
            return (
              <View key={collaboratorId} style={styles.collaboratorBlock}>
                <View style={styles.collaboratorRow}>
                  <Text style={styles.collaborator}>
                    {collaborator.displayName || "GrowPathAI member"} ·{" "}
                    {collaborator.role}
                  </Text>
                  <Pressable
                    disabled={saving}
                    onPress={() => setPendingRemovalId(collaboratorId)}
                    style={styles.removeButton}
                  >
                    <Text style={styles.removeButtonText}>Remove</Text>
                  </Pressable>
                </View>
                {confirmingRemoval ? (
                  <View style={styles.inlineConfirmation}>
                    <Text style={styles.panelText}>
                      Remove this person from the Field Study? They will immediately lose
                      access.
                    </Text>
                    <View style={styles.observationActions}>
                      <Pressable
                        disabled={saving}
                        onPress={() => {
                          setPendingRemovalId("");
                          void removeCollaborator(collaboratorId);
                        }}
                        style={styles.removeButton}
                      >
                        <Text style={styles.removeButtonText}>Confirm Remove</Text>
                      </Pressable>
                      <Pressable
                        disabled={saving}
                        onPress={() => setPendingRemovalId("")}
                        style={styles.smallButton}
                      >
                        <Text style={styles.smallButtonText}>Cancel</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : null}

      <Text accessibilityRole="header" style={styles.sectionTitle}>
        Observations
      </Text>
      {!observations.length ? (
        <View style={styles.empty}>
          <Text style={styles.panelTitle}>No observations yet</Text>
          <Text style={styles.panelText}>
            Run Plant ID and collect the requested photo angles and context, or link an
            earlier saved Plant ID to this study as a private draft observation.
          </Text>
        </View>
      ) : (
        observations.map((observation) => {
          const id = String(observation.id || observation._id || "");
          const publication = observation.publication?.status || "draft";
          const locationPrivacy = observation.location?.privacy || "private";
          const observationSaving = savingObservationId === id;
          const readiness = natureReadiness(study, observation);
          const cannabisIdentity = observationIsCannabis(observation);
          const confirmingApproximate = pendingApproximateId === id;
          const confirmingCannabis = pendingCannabisId === id;
          return (
            <View key={id} style={styles.observationCard}>
              <View style={styles.headerRow}>
                <Text style={styles.observationTitle}>
                  {observationName(observation)}
                </Text>
                <Text style={styles.badge}>{publication}</Text>
              </View>
              {observation.identity?.scientificName ? (
                <Text style={styles.scientificName}>
                  {observation.identity.scientificName}
                </Text>
              ) : null}
              <Text style={styles.muted}>
                {observation.identity?.verificationStatus || "ai_candidate"} ·{" "}
                {observation.identity?.confidence || "unknown"} confidence · location{" "}
                {locationPrivacy.replace(/_/g, " ")}
              </Text>
              {(observation.identity?.missingEvidence || []).length ? (
                <Text style={styles.missing}>
                  Still needed: {observation.identity?.missingEvidence?.join(", ")}
                </Text>
              ) : null}
              <View style={styles.readinessPanel}>
                <Text style={styles.panelTitle}>Nature map readiness</Text>
                {readiness.checks.map((check) => (
                  <Text
                    key={check.key}
                    style={check.complete ? styles.readyItem : styles.neededItem}
                  >
                    {check.complete ? "Ready" : "Needed"}: {check.label}
                  </Text>
                ))}
                <Text style={styles.panelText}>
                  {readiness.complete
                    ? "Ready to appear on Nature after the server validates the owned public photo derivative."
                    : "Complete each needed item before this finding can appear on Nature."}
                </Text>
              </View>
              {study.accessRole !== "viewer" ? (
                <View style={styles.observationActions}>
                  <Pressable
                    disabled={observationSaving}
                    onPress={() =>
                      void patchObservation(observation, {
                        identity: {
                          verificationStatus:
                            study.accessRole === "verifier"
                              ? "community_suggestion"
                              : "user_confirmed"
                        }
                      })
                    }
                    style={styles.smallButton}
                  >
                    <Text style={styles.smallButtonText}>
                      {study.accessRole === "verifier"
                        ? "Record Reviewer Suggestion"
                        : "Confirm Identity"}
                    </Text>
                  </Pressable>
                  <Pressable
                    disabled={observationSaving}
                    onPress={() =>
                      void patchObservation(observation, {
                        identity: { verificationStatus: "needs_evidence" }
                      })
                    }
                    style={styles.smallButton}
                  >
                    <Text style={styles.smallButtonText}>Needs More Evidence</Text>
                  </Pressable>
                  {canEdit ? (
                    <>
                      <Pressable
                        disabled={observationSaving}
                        onPress={() =>
                          void patchObservation(observation, {
                            publication: {
                              status:
                                publication === "published" ? "withdrawn" : "published"
                            }
                          })
                        }
                        style={styles.smallButton}
                      >
                        <Text style={styles.smallButtonText}>
                          {publication === "published"
                            ? "Withdraw Observation"
                            : "Publish Observation"}
                        </Text>
                      </Pressable>
                      {cannabisIdentity ? (
                        observation.publication?.cannabisContextConfirmed ? (
                          <Pressable
                            disabled={observationSaving}
                            onPress={() =>
                              void patchObservation(observation, {
                                publication: { cannabisContextConfirmed: false }
                              })
                            }
                            style={styles.smallButton}
                          >
                            <Text style={styles.smallButtonText}>
                              Revoke Cannabis Public Sharing
                            </Text>
                          </Pressable>
                        ) : (
                          <Pressable
                            disabled={observationSaving}
                            onPress={() => setPendingCannabisId(id)}
                            style={styles.smallButton}
                          >
                            <Text style={styles.smallButtonText}>
                              Review Cannabis/Hemp Sharing
                            </Text>
                          </Pressable>
                        )
                      ) : null}
                      {confirmingCannabis ? (
                        <View style={styles.inlineConfirmation}>
                          <Text style={styles.panelText}>
                            Confirm that this cannabis/hemp finding may be shared publicly
                            when every other Nature requirement is complete. This does not
                            publish it by itself.
                          </Text>
                          <View style={styles.observationActions}>
                            <Pressable
                              disabled={observationSaving}
                              onPress={() => {
                                setPendingCannabisId("");
                                void patchObservation(observation, {
                                  publication: { cannabisContextConfirmed: true }
                                });
                              }}
                              style={styles.smallButton}
                            >
                              <Text style={styles.smallButtonText}>
                                Confirm Cannabis/Hemp Sharing
                              </Text>
                            </Pressable>
                            <Pressable
                              disabled={observationSaving}
                              onPress={() => setPendingCannabisId("")}
                              style={styles.smallButton}
                            >
                              <Text style={styles.smallButtonText}>Cancel</Text>
                            </Pressable>
                          </View>
                        </View>
                      ) : null}
                      {observation.location?.latitude != null &&
                      observation.location?.longitude != null ? (
                        <>
                          {locationPrivacy === "private" ? (
                            <Pressable
                              disabled={observationSaving}
                              onPress={() =>
                                void patchObservation(observation, {
                                  location: {
                                    privacy: "collaborators",
                                    exactLocationPublicConfirmed: false
                                  }
                                })
                              }
                              style={styles.smallButton}
                            >
                              <Text style={styles.smallButtonText}>
                                Share with Study Team
                              </Text>
                            </Pressable>
                          ) : null}
                          {locationPrivacy !== "private" ? (
                            <Pressable
                              disabled={observationSaving}
                              onPress={() =>
                                void patchObservation(observation, {
                                  location: {
                                    privacy: "private",
                                    exactLocationPublicConfirmed: false
                                  }
                                })
                              }
                              style={styles.smallButton}
                            >
                              <Text style={styles.smallButtonText}>
                                Make Location Private
                              </Text>
                            </Pressable>
                          ) : null}
                          {locationPrivacy === "private" ||
                          locationPrivacy === "collaborators" ? (
                            <Pressable
                              disabled={observationSaving}
                              onPress={() => setPendingApproximateId(id)}
                              style={styles.smallButton}
                            >
                              <Text style={styles.smallButtonText}>
                                Share Approximate Location
                              </Text>
                            </Pressable>
                          ) : null}
                          {confirmingApproximate ? (
                            <View style={styles.inlineConfirmation}>
                              <Text style={styles.panelText}>
                                Share a rounded location on Nature? GrowPath keeps the
                                captured exact coordinates protected. Sensitive species
                                receive a wider regional point.
                              </Text>
                              <View style={styles.observationActions}>
                                <Pressable
                                  disabled={observationSaving}
                                  onPress={() => {
                                    setPendingApproximateId("");
                                    void patchObservation(observation, {
                                      location: {
                                        privacy: "public_approximate",
                                        exactLocationPublicConfirmed: false
                                      }
                                    });
                                  }}
                                  style={styles.smallButton}
                                >
                                  <Text style={styles.smallButtonText}>
                                    Confirm Approximate Sharing
                                  </Text>
                                </Pressable>
                                <Pressable
                                  disabled={observationSaving}
                                  onPress={() => setPendingApproximateId("")}
                                  style={styles.smallButton}
                                >
                                  <Text style={styles.smallButtonText}>Cancel</Text>
                                </Pressable>
                              </View>
                            </View>
                          ) : null}
                        </>
                      ) : null}
                    </>
                  ) : null}
                  {observationSaving ? (
                    <Text style={styles.muted}>Saving observation...</Text>
                  ) : null}
                </View>
              ) : null}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

export function createFieldStudyDetailStyles(palette: ThemePalette) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: palette.page },
    content: { gap: 14, padding: 20, paddingBottom: 48 },
    centered: {
      alignItems: "center",
      backgroundColor: palette.page,
      flex: 1,
      gap: 10,
      justifyContent: "center",
      padding: 24
    },
    headerRow: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: 10,
      justifyContent: "space-between"
    },
    headerCopy: { flex: 1, gap: 4 },
    title: { color: palette.text, fontSize: 27, fontWeight: "800" },
    description: { color: palette.textSoft, fontSize: 15, lineHeight: 22 },
    muted: { color: palette.textMuted, lineHeight: 20 },
    error: { color: palette.danger, lineHeight: 20 },
    badge: {
      backgroundColor: palette.surfaceStrong,
      borderRadius: 999,
      color: palette.textSoft,
      fontSize: 11,
      fontWeight: "800",
      overflow: "hidden",
      paddingHorizontal: 8,
      paddingVertical: 4,
      textTransform: "uppercase"
    },
    actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
    primaryButton: {
      alignItems: "center",
      alignSelf: "flex-start",
      backgroundColor: palette.accent,
      borderRadius: radius.card,
      justifyContent: "center",
      minHeight: 42,
      paddingHorizontal: 14,
      paddingVertical: 9
    },
    primaryText: { color: palette.accentText, fontWeight: "800" },
    secondaryButton: {
      alignItems: "center",
      alignSelf: "flex-start",
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      justifyContent: "center",
      minHeight: 42,
      paddingHorizontal: 14,
      paddingVertical: 9
    },
    secondaryText: { color: palette.text, fontWeight: "800" },
    privacyPanel: {
      backgroundColor: palette.accentSoft,
      borderColor: palette.success,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 8,
      padding: 15
    },
    panel: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 9,
      padding: 15
    },
    panelTitle: { color: palette.text, fontSize: 16, fontWeight: "800" },
    panelText: { color: palette.textMuted, lineHeight: 20 },
    input: {
      backgroundColor: palette.surfaceStrong,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      color: palette.text,
      minHeight: 44,
      paddingHorizontal: 12,
      paddingVertical: 9
    },
    roleRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    roleButton: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 7
    },
    roleButtonSelected: { backgroundColor: palette.accent, borderColor: palette.accent },
    roleText: { color: palette.text, fontWeight: "700", textTransform: "capitalize" },
    roleTextSelected: { color: palette.accentText },
    disabled: { opacity: 0.5 },
    collaborator: { color: palette.textSoft, fontSize: 13, textTransform: "capitalize" },
    collaboratorBlock: { gap: 7 },
    collaboratorRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: 9,
      justifyContent: "space-between"
    },
    removeButton: {
      borderColor: palette.danger,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 6
    },
    removeButtonText: {
      color: palette.danger,
      fontSize: 12,
      fontWeight: "800"
    },
    sectionTitle: { color: palette.text, fontSize: 20, fontWeight: "800", marginTop: 4 },
    empty: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderStyle: "dashed",
      borderWidth: 1,
      gap: 6,
      padding: 16
    },
    observationCard: {
      backgroundColor: palette.card,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 5,
      padding: 15
    },
    observationTitle: { color: palette.text, flex: 1, fontSize: 17, fontWeight: "800" },
    scientificName: { color: palette.textSoft, fontStyle: "italic" },
    missing: { color: palette.warning, lineHeight: 20, marginTop: 3 },
    readinessPanel: {
      backgroundColor: palette.surfaceMuted,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      gap: 4,
      marginTop: 8,
      padding: 12
    },
    readyItem: { color: palette.success, fontWeight: "800", lineHeight: 19 },
    neededItem: { color: palette.warning, fontWeight: "800", lineHeight: 19 },
    inlineConfirmation: {
      backgroundColor: palette.surfaceStrong,
      borderColor: palette.border,
      borderRadius: radius.card,
      borderWidth: 1,
      flexBasis: "100%",
      gap: 7,
      padding: 10
    },
    observationActions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 7,
      marginTop: 7
    },
    smallButton: {
      backgroundColor: palette.surface,
      borderColor: palette.border,
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 7
    },
    smallButtonText: { color: palette.text, fontSize: 12, fontWeight: "800" }
  });
}
