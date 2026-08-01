import { Link, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
  FieldStudy,
  getFieldStudy,
  removeFieldStudyCollaborator,
  updateFieldStudy,
  updateFieldObservation
} from "@/api/fieldStudies";
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

export default function FieldStudyDetailScreen() {
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
  const [error, setError] = useState("");

  const canManage = study?.accessRole === "owner";
  const canEdit = study?.accessRole === "owner" || study?.accessRole === "editor";
  const publicPath = study?.slug ? `/field-observations/${study.slug}` : "";

  const load = useCallback(async () => {
    if (!studyId) return;
    setLoading(true);
    setError("");
    try {
      const response = await getFieldStudy(studyId);
      setStudy(response.study);
      setObservations(response.observations);
    } catch (loadError: any) {
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
    async (observation: FieldObservation, patch: Record<string, any>) => {
      const observationId = String(observation.id || observation._id || "");
      if (!observationId || savingObservationId) return;
      setSavingObservationId(observationId);
      setError("");
      try {
        const updated = await updateFieldObservation(studyId, observationId, patch);
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
        <Text accessibilityRole="header" style={styles.title}>
          Field Study unavailable
        </Text>
        <Text style={styles.error}>{error || "This study could not be found."}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Link href="/home/personal/field-studies" asChild>
        <Pressable accessibilityRole="link">
          <Text style={styles.backLink}>← Field Studies</Text>
        </Pressable>
      </Link>
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text accessibilityRole="header" style={styles.title}>
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
            onPress={() => {
              if (study.visibility === "public") {
                void publishStudy();
                return;
              }
              Alert.alert(
                "Publish this Field Study?",
                "Only observations separately marked Published will appear. Exact coordinates stay hidden unless explicitly confirmed.",
                [
                  { text: "Cancel", style: "cancel" },
                  { text: "Publish Study", onPress: () => void publishStudy() }
                ]
              );
            }}
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
          {(study.collaborators || []).map((collaborator) => (
            <View key={collaborator.userId} style={styles.collaboratorRow}>
              <Text style={styles.collaborator}>
                {collaborator.displayName || "GrowPathAI member"} · {collaborator.role}
              </Text>
              <Pressable
                disabled={saving}
                onPress={() =>
                  Alert.alert(
                    "Remove collaborator?",
                    "They will immediately lose access to this Field Study.",
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Remove",
                        style: "destructive",
                        onPress: () =>
                          void removeCollaborator(String(collaborator.userId))
                      }
                    ]
                  )
                }
                style={styles.removeButton}
              >
                <Text style={styles.removeButtonText}>Remove</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}

      <Text accessibilityRole="header" style={styles.sectionTitle}>
        Observations
      </Text>
      {!observations.length ? (
        <View style={styles.empty}>
          <Text style={styles.panelTitle}>No observations yet</Text>
          <Text style={styles.panelText}>
            Run Plant ID, collect the requested photo angles and context, then save the
            result to this study.
          </Text>
        </View>
      ) : (
        observations.map((observation) => {
          const id = String(observation.id || observation._id || "");
          const publication = observation.publication?.status || "draft";
          const locationPrivacy = observation.location?.privacy || "private";
          const observationSaving = savingObservationId === id;
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
                          {publication === "published" ? "Withdraw" : "Publish"}
                        </Text>
                      </Pressable>
                      {observation.location?.latitude != null &&
                      observation.location?.longitude != null ? (
                        <Pressable
                          disabled={observationSaving}
                          onPress={() =>
                            void patchObservation(observation, {
                              location: {
                                privacy:
                                  locationPrivacy === "private"
                                    ? "collaborators"
                                    : locationPrivacy === "collaborators"
                                      ? "public_approximate"
                                      : "private"
                              }
                            })
                          }
                          style={styles.smallButton}
                        >
                          <Text style={styles.smallButtonText}>
                            Change Location Sharing
                          </Text>
                        </Pressable>
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
    backLink: { color: palette.link, fontWeight: "800" },
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
