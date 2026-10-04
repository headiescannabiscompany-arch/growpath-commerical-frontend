import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { Link } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import { useAppTheme, type ThemePalette } from "@/theme/appTheme";
import { useTestimonialBoundary } from "@/components/testimonials/useTestimonialBoundary";
import PrivateTestimonialPhoto from "@/components/testimonials/PrivateTestimonialPhoto";
import {
  getMyTestimonials,
  getTestimonialPolicy,
  newTestimonialRequestId,
  previewTestimonial,
  removeTestimonialPhoto,
  submitTestimonial,
  uploadTestimonialPhoto,
  withdrawTestimonial,
  type MyTestimonials,
  type TestimonialPhotoDraft,
  type TestimonialPolicy,
  type TestimonialPreview,
  type TestimonialSubmitInput
} from "@/api/testimonials";

export default function FeedbackScreen() {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createFeedbackStyles(palette), [palette]);
  const boundary = useTestimonialBoundary();
  const { key, enabled, begin, current, finish, busy, idle } = boundary;
  const [records, setRecords] = useState<MyTestimonials | null>(null);
  const [policy, setPolicy] = useState<TestimonialPolicy | null>(null);
  const [loadedKey, setLoadedKey] = useState<number | null>(null);
  const [readError, setReadError] = useState("");
  const [message, setMessage] = useState("");
  const [kind, setKind] = useState("");
  const [publicName, setPublicName] = useState("");
  const [feedbackText, setFeedbackText] = useState("");
  const [photo, setPhoto] = useState<TestimonialPhotoDraft | null>(null);
  const photoRef = useRef<TestimonialPhotoDraft | null>(null);
  const [preview, setPreview] = useState<TestimonialPreview | null>(null);
  const [photoReady, setPhotoReady] = useState(false);
  const [consent, setConsent] = useState(false);
  const [attempt, setAttempt] = useState<TestimonialSubmitInput | null>(null);
  const attemptRef = useRef<TestimonialSubmitInput | null>(null);
  const [withdrawConfirmed, setWithdrawConfirmed] = useState(false);
  const [pageError, setPageError] = useState("");
  const [accountRetrying, setAccountRetrying] = useState(false);
  const accountRetry = useRef<object | null>(null);
  const snapshot = loadedKey === key ? records : null;
  const ready =
    enabled &&
    loadedKey === key &&
    Boolean(policy) &&
    !readError &&
    !(busy && kind === "read");
  const readyRef = useRef(ready);
  readyRef.current = ready;
  const locked = !ready || busy || Boolean(attempt);
  const view = useRef({
    key,
    snapshot,
    preview,
    publicName,
    feedbackText,
    consent,
    photoReady,
    withdrawConfirmed
  });
  view.current = {
    key,
    snapshot,
    preview,
    publicName,
    feedbackText,
    consent,
    photoReady,
    withdrawConfirmed
  };
  const canEdit = () =>
    current(key) &&
    readyRef.current &&
    idle() &&
    !attemptRef.current &&
    view.current.snapshot === snapshot &&
    !snapshot?.current;
  function clearPreview() {
    view.current.preview = null;
    setPreview(null);
    setPhotoReady(false);
    setConsent(false);
  }

  const load = useCallback(
    async (cursor?: string | null) => {
      const operation = begin();
      if (!operation) return;
      setKind("read");
      setReadError("");
      setPageError("");
      setWithdrawConfirmed(false);
      try {
        const [nextPolicy, nextRecords] = await Promise.all([
          getTestimonialPolicy(operation.controller.signal),
          getMyTestimonials(cursor, operation.controller.signal)
        ]);
        if (!current(operation.key)) return;
        setPolicy(nextPolicy);
        setRecords((old) => ({
          ...nextRecords,
          history:
            cursor && old
              ? [
                  ...old.history,
                  ...nextRecords.history.filter(
                    (row) => !old.history.some((earlier) => earlier.id === row.id)
                  )
                ]
              : nextRecords.history
        }));
        setLoadedKey(operation.key);
        const resolvedWithdrawal = nextRecords.history.find(
          (row) => row.clientSubmissionId === attemptRef.current?.clientSubmissionId
        );
        if (attemptRef.current && (nextRecords.current || resolvedWithdrawal)) {
          attemptRef.current = null;
          setAttempt(null);
          setPreview(null);
          setConsent(false);
          photoRef.current = null;
          setPhoto(null);
          setPublicName("");
          setFeedbackText("");
          setMessage(
            resolvedWithdrawal && !nextRecords.current
              ? "The earlier submission was saved and has already been withdrawn. It was not submitted again."
              : "Your current feedback submission is confirmed below."
          );
        }
      } catch {
        if (!current(operation.key)) return;
        if (cursor)
          setPageError(
            "Earlier feedback could not be loaded. Retry the same history page."
          );
        else
          setReadError(
            "Your feedback records could not be loaded. Retry before submitting or withdrawing."
          );
      } finally {
        finish(operation);
      }
    },
    [begin, current, finish]
  );

  useEffect(() => {
    setRecords(null);
    setPolicy(null);
    setLoadedKey(null);
    setReadError("");
    setMessage("");
    setPageError("");
    setPublicName("");
    setFeedbackText("");
    setPhoto(null);
    photoRef.current = null;
    setPreview(null);
    setPhotoReady(false);
    setConsent(false);
    setAttempt(null);
    attemptRef.current = null;
    setWithdrawConfirmed(false);
    setAccountRetrying(false);
    accountRetry.current = null;
    if (enabled) void load();
  }, [enabled, key, load]);

  async function retryAccount() {
    if (
      !current(key) ||
      accountRetry.current ||
      !boundary.auth?.isAuthed ||
      !boundary.auth.retryMe
    )
      return;
    const request = {};
    accountRetry.current = request;
    setAccountRetrying(true);
    try {
      await boundary.auth.retryMe();
    } catch {
      /* AuthContext owns the read error. */
    } finally {
      if (accountRetry.current === request) {
        accountRetry.current = null;
        if (current(key)) setAccountRetrying(false);
      }
    }
  }

  function edit(change: () => void) {
    if (!canEdit()) return;
    change();
    clearPreview();
    setMessage("");
  }
  async function pickPhoto(retry = false) {
    if (!canEdit()) return;
    const operation = begin();
    if (!operation) return;
    setKind("photo");
    setMessage("");
    clearPreview();
    try {
      let draft = retry ? photoRef.current : null;
      if (!draft) {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!current(operation.key)) return;
        if (!permission.granted) {
          setMessage(
            "Photo access was not granted. You can submit feedback without a photo."
          );
          return;
        }
        const selection = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsMultipleSelection: false,
          selectionLimit: 1,
          quality: 1,
          exif: false,
          allowsEditing: false
        });
        if (!current(operation.key) || selection.canceled) return;
        const chosen = selection.assets?.[0];
        if (!chosen?.uri) return;
        draft = {
          uri: chosen.uri,
          file: chosen.file,
          fileName: chosen.fileName,
          mimeType: chosen.mimeType,
          fileSize: chosen.fileSize,
          width: chosen.width,
          height: chosen.height,
          clientUploadKey: newTestimonialRequestId()
        };
        photoRef.current = draft;
        setPhoto(draft);
      }
      await uploadTestimonialPhoto(draft, operation.controller.signal);
      if (!current(operation.key)) return;
      setPhoto({ ...draft });
      setMessage(
        "Photo saved privately for your preview. It is not public or approved for AI use."
      );
    } catch {
      if (current(operation.key))
        setMessage(
          "The selected photo was not confirmed. Retry the same upload, or continue without a photo after removing it."
        );
    } finally {
      finish(operation);
    }
  }
  async function removePhoto() {
    if (!canEdit()) return;
    const operation = begin();
    if (!operation) return;
    setKind("photo");
    setMessage("");
    try {
      const selected = photoRef.current;
      if (selected?.evidenceId)
        await removeTestimonialPhoto(selected.evidenceId, operation.controller.signal);
      if (!current(operation.key)) return;
      photoRef.current = null;
      setPhoto(null);
      clearPreview();
      setMessage("Photo removed from this draft. Nothing was published.");
    } catch {
      if (current(operation.key))
        setMessage(
          "The private photo could not be removed. Your selection is retained; retry."
        );
    } finally {
      finish(operation);
    }
  }
  async function makePreview() {
    if (
      !canEdit() ||
      view.current.publicName !== publicName ||
      view.current.feedbackText !== feedbackText ||
      (photoRef.current && !photoRef.current.evidenceId)
    )
      return;
    const operation = begin();
    if (!operation) return;
    setKind("preview");
    setMessage("");
    clearPreview();
    try {
      const result = await previewTestimonial(
        {
          publicName,
          feedbackText,
          photoEvidenceAssetId: photoRef.current?.evidenceId || null
        },
        operation.controller.signal
      );
      if (!current(operation.key)) return;
      if (result.consentVersion !== policy?.version) {
        setReadError(
          "The permission statement changed. Refresh this page, then preview again."
        );
        return;
      }
      setPreview(result);
      setPhotoReady(!result.photoEvidenceAssetId);
    } catch {
      if (current(operation.key))
        setMessage(
          "A preview could not be prepared. Check the name, feedback and optional photo, then retry."
        );
    } finally {
      finish(operation);
    }
  }
  async function submit() {
    if (
      !current(key) ||
      !readyRef.current ||
      view.current.snapshot !== snapshot ||
      snapshot?.current ||
      !preview ||
      view.current.preview !== preview ||
      view.current.consent !== consent ||
      (preview.photoEvidenceAssetId && !view.current.photoReady)
    )
      return;
    const operation = begin();
    if (!operation) return;
    setKind("submit");
    setMessage("");
    const exact = attemptRef.current || {
      clientSubmissionId: newTestimonialRequestId(),
      publicName: preview.publicName,
      feedbackText: preview.feedbackText,
      photoEvidenceAssetId: preview.photoEvidenceAssetId,
      previewDigest: preview.contentDigest,
      consent: { granted: consent, version: preview.consentVersion }
    };
    attemptRef.current = exact;
    setAttempt(exact);
    try {
      const result = await submitTestimonial(exact, operation.controller.signal);
      if (!current(operation.key)) return;
      setRecords((old) => ({
        current: result.submission.isCurrent ? result.submission : null,
        history: result.submission.isCurrent
          ? old?.history || []
          : [
              result.submission,
              ...(old?.history || []).filter((row) => row.id !== result.submission.id)
            ],
        nextCursor: old?.nextCursor || null
      }));
      attemptRef.current = null;
      setAttempt(null);
      setPreview(null);
      setConsent(false);
      setPhoto(null);
      photoRef.current = null;
      setPublicName("");
      setFeedbackText("");
      setMessage(
        result.submission.status === "withdrawn"
          ? "The earlier submission was saved and has already been withdrawn. It was not submitted again."
          : result.replayed
            ? "Your previously saved feedback is confirmed below with its current status."
            : result.submission.consent.granted
              ? "Feedback submitted for Admin review. Nothing is published automatically."
              : "Private feedback saved. You did not give publication permission."
      );
    } catch {
      if (current(operation.key))
        setMessage(
          "Submission could not be confirmed. Retry this exact submission, or refresh to check whether it was saved. Your request key and permission choice are unchanged."
        );
    } finally {
      finish(operation);
    }
  }
  async function withdraw() {
    if (
      !current(key) ||
      !readyRef.current ||
      view.current.snapshot !== snapshot ||
      !snapshot?.current ||
      !view.current.withdrawConfirmed ||
      !withdrawConfirmed
    )
      return;
    const row = snapshot.current;
    const operation = begin();
    if (!operation) return;
    setKind("withdraw");
    setMessage("");
    try {
      const result = await withdrawTestimonial(
        row.id,
        row.revision,
        operation.controller.signal
      );
      if (!current(operation.key)) return;
      setRecords((old) => ({
        current: null,
        history: [
          result,
          ...(old?.history || []).filter((earlier) => earlier.id !== result.id)
        ],
        nextCursor: old?.nextCursor || null
      }));
      setWithdrawConfirmed(false);
      setMessage(
        "Feedback withdrawn. GrowPathAI's public copy is unavailable; outside screenshots and copies cannot be recalled."
      );
    } catch {
      if (current(operation.key)) {
        setReadError(
          "Withdrawal could not be confirmed. Refresh your current status before retrying."
        );
        setWithdrawConfirmed(false);
      }
    } finally {
      finish(operation);
    }
  }
  const privatePreviewPath = preview?.photoEvidenceAssetId
    ? preview.photoPreviewUrl ||
      `/api/testimonials/photos/${encodeURIComponent(preview.photoEvidenceAssetId)}?version=${encodeURIComponent(preview.photoSourceVersion || "")}`
    : "";
  return (
    <ScreenBoundary title="Feedback" showBack backFallbackHref="/account/workspace">
      <ScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" aria-level={1} style={styles.title}>
          Share your experience
        </Text>
        <Text style={styles.text}>
          Tell us what worked and what needs work. Private feedback is welcome.
          Publication is optional and always needs separate Admin review.
        </Text>
        <Text style={styles.text}>
          This belongs to your individual account, not your employer or Facility. No
          payment or AI permission is required.
        </Text>
        {!enabled ? (
          <View style={styles.card}>
            <Text style={styles.text}>
              {boundary.auth?.isAuthed
                ? "Your account identity must finish loading successfully before feedback can be read or changed."
                : "Sign in to submit or withdraw feedback."}
            </Text>
            {boundary.auth?.isAuthed ? (
              <Pressable
                accessibilityRole="button"
                disabled={
                  accountRetrying ||
                  boundary.auth.isHydrating ||
                  boundary.auth.meStatus === "loading"
                }
                onPress={() => void retryAccount()}
                style={styles.secondary}
              >
                <Text style={styles.text}>
                  {accountRetrying || boundary.auth.meStatus === "loading"
                    ? "Loading account..."
                    : "Retry account"}
                </Text>
              </Pressable>
            ) : (
              <Link href="/login?next=%2Ffeedback" style={styles.link}>
                Sign in
              </Link>
            )}
          </View>
        ) : (
          <>
            <Text style={styles.text}>
              Signed in as{" "}
              {String(boundary.auth?.user?.email || "your individual account")}. This
              account label is not your public name.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Refresh my feedback"
              disabled={busy}
              style={styles.button}
              onPress={() => void load()}
            >
              <Text style={styles.buttonText}>
                {busy && kind === "read" ? "Loading..." : readError ? "Retry" : "Refresh"}
              </Text>
            </Pressable>
            {readError ? (
              <Text accessibilityLiveRegion="polite" style={styles.text}>
                {readError}
              </Text>
            ) : null}
            {snapshot && !ready ? (
              <Text style={styles.text}>
                Previously loaded feedback is shown below. Refresh to verify its current
                status.
              </Text>
            ) : null}
            {message ? (
              <Text accessibilityLiveRegion="polite" style={styles.text}>
                {message}
              </Text>
            ) : null}
            {snapshot?.current ? (
              <View style={styles.card}>
                <Text accessibilityRole="header" aria-level={2} style={styles.heading}>
                  Your current feedback
                </Text>
                <Text style={styles.text}>
                  Status: {snapshot.current.status.replaceAll("_", " ")}
                </Text>
                {snapshot.current.synthetic ? (
                  <Text style={styles.text}>
                    Synthetic QA feedback — excluded from public testimonials.
                  </Text>
                ) : null}
                <Text style={styles.heading}>{snapshot.current.publicName}</Text>
                <Text style={styles.text}>{snapshot.current.feedbackText}</Text>
                <Text style={styles.text}>
                  {snapshot.current.consent.granted
                    ? "Publication permission was given for this exact submitted version."
                    : "Private feedback only. Publication permission was not given."}
                </Text>
                {snapshot.current.photoEvidenceAssetId ? (
                  <PrivateTestimonialPhoto
                    key={`${key}:${snapshot.current.id}:${snapshot.current.revision}`}
                    path={
                      snapshot.current.photoPreviewUrl ||
                      `/api/testimonials/${encodeURIComponent(snapshot.current.id)}/photo`
                    }
                    contextKey={`${key}:${snapshot.current.id}:${snapshot.current.revision}`}
                  />
                ) : null}
                <Text style={styles.text}>
                  Submitted words, name and photo cannot be edited. Withdraw this
                  submission before creating a replacement. Withdrawal removes
                  GrowPathAI&apos;s public copy, not outside screenshots or copies.
                </Text>
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{
                    checked: withdrawConfirmed,
                    disabled: !ready || busy
                  }}
                  disabled={!ready || busy}
                  onPress={() => {
                    if (
                      current(key) &&
                      readyRef.current &&
                      idle() &&
                      view.current.snapshot === snapshot
                    )
                      setWithdrawConfirmed((value) => !value);
                  }}
                  style={styles.secondary}
                >
                  <Text style={styles.text}>
                    {withdrawConfirmed ? "☑" : "☐"} I want to withdraw this exact
                    submission and any publication permission.
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={!ready || busy || !withdrawConfirmed}
                  onPress={() => void withdraw()}
                  style={styles.button}
                >
                  <Text style={styles.buttonText}>
                    {kind === "withdraw" && busy ? "Withdrawing..." : "Withdraw feedback"}
                  </Text>
                </Pressable>
              </View>
            ) : ready && policy ? (
              <View style={styles.card}>
                <Text accessibilityRole="header" aria-level={2} style={styles.heading}>
                  Your feedback
                </Text>
                <Text style={styles.text}>
                  Choose a public name ({policy.minPublicNameLength}–
                  {policy.maxPublicNameLength} characters). It is not published unless you
                  give permission and Admin approves.
                </Text>
                <TextInput
                  accessibilityLabel="Chosen public name"
                  value={publicName}
                  onChangeText={(value) => edit(() => setPublicName(value))}
                  editable={!locked}
                  maxLength={policy.maxPublicNameLength}
                  autoComplete="off"
                  style={styles.input}
                />
                <Text style={styles.text}>
                  Use your own words ({policy.minFeedbackLength}–
                  {policy.maxFeedbackLength} characters). Do not include private account,
                  contact or operational details.
                </Text>
                <TextInput
                  accessibilityLabel="Your feedback"
                  value={feedbackText}
                  onChangeText={(value) => edit(() => setFeedbackText(value))}
                  editable={!locked}
                  maxLength={policy.maxFeedbackLength}
                  multiline
                  style={[styles.input, { minHeight: 130 }]}
                />
                <Text style={styles.text}>
                  One optional photo. We do not request location metadata or AI use for
                  this feedback photo.
                </Text>
                {photo ? (
                  <View style={{ gap: 8 }}>
                    <Image
                      source={{ uri: photo.uri }}
                      style={{ width: 160, height: 160 }}
                      resizeMode="contain"
                      accessibilityLabel="Selected private feedback photo"
                    />
                    <Text style={styles.text}>
                      {photo.evidenceId
                        ? "Protected photo ready for preview."
                        : "Upload needs confirmation."}
                    </Text>
                    {!photo.evidenceId ? (
                      <Pressable
                        accessibilityRole="button"
                        disabled={locked}
                        onPress={() => void pickPhoto(true)}
                        style={styles.secondary}
                      >
                        <Text style={styles.text}>Retry photo upload</Text>
                      </Pressable>
                    ) : null}
                    <Pressable
                      accessibilityRole="button"
                      disabled={locked}
                      onPress={() => void removePhoto()}
                      style={styles.secondary}
                    >
                      <Text style={styles.text}>Remove draft photo</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    disabled={locked}
                    onPress={() => void pickPhoto()}
                    style={styles.secondary}
                  >
                    <Text style={styles.text}>Add optional photo</Text>
                  </Pressable>
                )}
                <Pressable
                  accessibilityRole="button"
                  disabled={
                    locked ||
                    Boolean(photo && !photo.evidenceId) ||
                    publicName.trim().length < policy.minPublicNameLength ||
                    feedbackText.trim().length < policy.minFeedbackLength
                  }
                  onPress={() => void makePreview()}
                  style={styles.button}
                >
                  <Text style={styles.buttonText}>
                    {busy && kind === "preview"
                      ? "Preparing preview..."
                      : "Preview exact submission"}
                  </Text>
                </Pressable>
                {preview ? (
                  <View style={styles.card}>
                    <Text
                      accessibilityRole="header"
                      aria-level={3}
                      style={styles.heading}
                    >
                      Private preview — not submitted or published
                    </Text>
                    <Text style={styles.heading}>{preview.publicName}</Text>
                    <Text style={styles.text}>{preview.feedbackText}</Text>
                    {privatePreviewPath ? (
                      <PrivateTestimonialPhoto
                        key={`${key}:${preview.contentDigest}`}
                        path={privatePreviewPath}
                        contextKey={`${key}:${preview.contentDigest}`}
                        onReady={(value) => {
                          if (current(key) && view.current.preview === preview)
                            setPhotoReady(value);
                        }}
                      />
                    ) : (
                      <Text style={styles.text}>No photo selected.</Text>
                    )}
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityLabel="Allow publication of this exact preview"
                      accessibilityState={{
                        checked: consent,
                        disabled: busy || Boolean(attempt)
                      }}
                      disabled={busy || Boolean(attempt)}
                      onPress={() => {
                        if (canEdit() && view.current.preview === preview)
                          setConsent((value) => !value);
                      }}
                      style={styles.secondary}
                    >
                      <Text style={styles.text}>
                        {consent ? "☑" : "☐"} {policy.statement}
                      </Text>
                    </Pressable>
                    <Text style={styles.text}>
                      Leave this unchecked to send private feedback only. Withdrawing
                      later cannot recall screenshots or copies somebody already made.
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      disabled={
                        busy || Boolean(preview.photoEvidenceAssetId && !photoReady)
                      }
                      onPress={() => void submit()}
                      style={styles.button}
                    >
                      <Text style={styles.buttonText}>
                        {busy && kind === "submit"
                          ? "Submitting..."
                          : attempt
                            ? "Retry exact submission"
                            : consent
                              ? "Submit for Admin review"
                              : "Submit private feedback"}
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ) : null}
            {snapshot?.history.length ? (
              <View style={styles.card}>
                <Text accessibilityRole="header" aria-level={2} style={styles.heading}>
                  Withdrawal history
                </Text>
                {snapshot.history.map((row) => (
                  <View key={row.id}>
                    <Text style={styles.heading}>{row.publicName}</Text>
                    <Text style={styles.text}>{row.feedbackText}</Text>
                    <Text style={styles.text}>
                      Withdrawn{row.synthetic ? " · Synthetic QA feedback" : ""}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
            {pageError ? <Text style={styles.text}>{pageError}</Text> : null}
            {snapshot?.nextCursor ? (
              <Pressable
                accessibilityRole="button"
                disabled={!ready || busy}
                onPress={() => void load(snapshot.nextCursor)}
                style={styles.secondary}
              >
                <Text style={styles.text}>
                  {pageError ? "Retry earlier feedback" : "Load earlier feedback"}
                </Text>
              </Pressable>
            ) : null}
          </>
        )}
      </ScrollView>
    </ScreenBoundary>
  );
}

export function createFeedbackStyles(palette: ThemePalette) {
  return StyleSheet.create({
    content: { padding: 20, gap: 16, width: "100%", maxWidth: 900, alignSelf: "center" },
    title: { color: palette.text, fontSize: 26, fontWeight: "800" },
    heading: { color: palette.text, fontSize: 18, fontWeight: "700" },
    text: { color: palette.textMuted, fontSize: 16, lineHeight: 24 },
    link: { color: palette.link, minHeight: 44, paddingVertical: 12 },
    card: {
      backgroundColor: palette.card,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 12,
      padding: 16,
      gap: 12
    },
    input: {
      color: palette.text,
      backgroundColor: palette.page,
      borderColor: palette.border,
      borderWidth: 1,
      padding: 12,
      borderRadius: 8,
      minHeight: 44
    },
    button: {
      backgroundColor: palette.accent,
      padding: 12,
      borderRadius: 8,
      minHeight: 44
    },
    buttonText: { color: palette.accentText, fontWeight: "700", textAlign: "center" },
    secondary: {
      borderColor: palette.border,
      borderWidth: 1,
      padding: 12,
      borderRadius: 8,
      minHeight: 44
    }
  });
}
