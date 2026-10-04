import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useOptionalAuth } from "@/auth/AuthContext";
import { useAppTheme } from "@/theme/appTheme";
import { useTestimonialBoundary } from "@/components/testimonials/useTestimonialBoundary";
import PrivateTestimonialPhoto from "@/components/testimonials/PrivateTestimonialPhoto";
import {
  getAdminTestimonials,
  reviewTestimonial,
  TESTIMONIAL_STATUSES,
  type AdminTestimonials,
  type TestimonialStatus
} from "@/api/testimonials";

/** Review only. The submitted words, chosen name, and photo cannot be edited here. */
export default function TestimonialReviewPanel({
  authorized = false
}: {
  authorized?: boolean;
}) {
  const auth = useOptionalAuth();
  const { palette } = useAppTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        panel: { gap: 12 },
        card: {
          backgroundColor: palette.card,
          borderColor: palette.border,
          borderWidth: 1,
          padding: 16,
          borderRadius: 12,
          gap: 12
        },
        heading: { color: palette.text, fontSize: 18, fontWeight: "700" },
        text: { color: palette.textMuted, fontSize: 16, lineHeight: 24 },
        button: {
          backgroundColor: palette.accent,
          padding: 12,
          minHeight: 44,
          borderRadius: 8
        },
        buttonText: { color: palette.accentText, fontWeight: "700" },
        secondary: {
          borderColor: palette.border,
          borderWidth: 1,
          padding: 12,
          minHeight: 44,
          borderRadius: 8
        },
        input: {
          color: palette.text,
          backgroundColor: palette.page,
          borderColor: palette.border,
          borderWidth: 1,
          padding: 12,
          minHeight: 80,
          borderRadius: 8
        },
        filters: { flexDirection: "row", flexWrap: "wrap", gap: 8 }
      }),
    [palette]
  );
  const [status, setStatus] = useState<TestimonialStatus>("pending_review");
  const boundary = useTestimonialBoundary(
    `admin:${status}`,
    authorized && String(auth?.user?.role || "").toLowerCase() === "admin"
  );
  const { key, enabled, current, begin, finish, idle, busy } = boundary;
  const [data, setData] = useState<AdminTestimonials | null>(null);
  const [loadedKey, setLoadedKey] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [pageError, setPageError] = useState("");
  const [kind, setKind] = useState("read");
  const [message, setMessage] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [exactReviewed, setExactReviewed] = useState(false);
  const [audienceApproved, setAudienceApproved] = useState(false);
  const [photoReady, setPhotoReady] = useState(false);
  const snapshot = enabled && loadedKey === key ? data : null;
  const selected = snapshot?.submissions.find((row) => row.id === selectedId) || null;
  const ready = Boolean(snapshot && !error && !(busy && kind === "read"));
  const view = useRef({
    snapshot,
    selected,
    ready,
    reason,
    exactReviewed,
    audienceApproved,
    photoReady
  });
  view.current = {
    snapshot,
    selected,
    ready,
    reason,
    exactReviewed,
    audienceApproved,
    photoReady
  };

  const load = useCallback(
    async (cursor?: string | null) => {
      const operation = begin();
      if (!operation) return;
      setKind("read");
      setError("");
      setPageError("");
      setExactReviewed(false);
      setAudienceApproved(false);
      try {
        const result = await getAdminTestimonials(
          status,
          cursor,
          operation.controller.signal
        );
        if (!current(operation.key)) return;
        setData((old) => ({
          ...result,
          submissions:
            cursor && old
              ? [
                  ...old.submissions,
                  ...result.submissions.filter(
                    (row) => !old.submissions.some((existing) => existing.id === row.id)
                  )
                ]
              : result.submissions
        }));
        setLoadedKey(operation.key);
      } catch {
        if (!current(operation.key)) return;
        if (cursor)
          setPageError("Earlier submissions could not be loaded. Retry this page.");
        else
          setError(
            "Feedback review could not be loaded. Refresh before taking a review action."
          );
      } finally {
        finish(operation);
      }
    },
    [begin, current, finish, status]
  );

  useEffect(() => {
    setData(null);
    setLoadedKey(null);
    setError("");
    setPageError("");
    setMessage("");
    setSelectedId(null);
    setReason("");
    setExactReviewed(false);
    setAudienceApproved(false);
    setPhotoReady(false);
    if (enabled) void load();
  }, [key, enabled, load]);

  const canReview = () =>
    enabled &&
    current(key) &&
    idle() &&
    view.current.ready &&
    view.current.snapshot === snapshot &&
    view.current.selected === selected;
  async function review(action: "publish" | "reject" | "hide") {
    if (
      !canReview() ||
      !selected ||
      !view.current.exactReviewed ||
      view.current.reason !== reason
    )
      return;
    if (
      action === "publish" &&
      (!selected.consent.granted ||
        !view.current.audienceApproved ||
        (selected.photoEvidenceAssetId && !view.current.photoReady))
    )
      return;
    if (action !== "publish" && reason.trim().length < 3) return;
    if (
      reason.trim().length > 500 ||
      (action === "hide"
        ? selected.status !== "published"
        : selected.status !== "pending_review")
    )
      return;
    const operation = begin();
    if (!operation) return;
    setKind("review");
    setMessage("");
    try {
      const result = await reviewTestimonial(
        selected,
        action,
        reason,
        action === "publish" && audienceApproved,
        operation.controller.signal
      );
      if (!current(operation.key)) return;
      setData((old) =>
        old
          ? { ...old, submissions: old.submissions.filter((row) => row.id !== result.id) }
          : old
      );
      setSelectedId(null);
      setReason("");
      setExactReviewed(false);
      setAudienceApproved(false);
      setPhotoReady(false);
      setMessage(
        `Review confirmed: ${result.status.replaceAll("_", " ")}.${result.synthetic ? " Synthetic QA feedback remains excluded from public testimonials." : ""}`
      );
    } catch {
      if (current(operation.key)) {
        setError(
          "The review action could not be confirmed. Refresh the current version before retrying; no quote or photo was edited."
        );
        setExactReviewed(false);
        setAudienceApproved(false);
      }
    } finally {
      finish(operation);
    }
  }
  if (!enabled) return null;
  return (
    <View style={styles.panel}>
      <Text accessibilityRole="header" aria-level={2} style={styles.heading}>
        Feedback review
      </Text>
      <Text style={styles.text}>
        Review the exact submitted words, chosen public name and optional photo. Private
        feedback is never eligible for publication. There is no quote-editing or automatic
        publication.
      </Text>
      <View style={styles.filters}>
        {TESTIMONIAL_STATUSES.map((choice) => (
          <Pressable
            key={choice}
            accessibilityRole="button"
            accessibilityState={{ selected: choice === status, disabled: busy }}
            disabled={busy}
            onPress={() => {
              if (current(key) && idle()) setStatus(choice);
            }}
            style={styles.secondary}
          >
            <Text style={styles.text}>{choice.replaceAll("_", " ")}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Refresh feedback review"
        disabled={busy}
        onPress={() => void load()}
        style={styles.button}
      >
        <Text style={styles.buttonText}>
          {busy && kind === "read" ? "Loading..." : error ? "Retry" : "Refresh"}
        </Text>
      </Pressable>
      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.text}>
          {error}
        </Text>
      ) : null}
      {snapshot && !ready ? (
        <Text style={styles.text}>
          Previously loaded submissions are shown for reference. Review actions are
          unavailable until their current status is verified.
        </Text>
      ) : null}
      {message ? (
        <Text accessibilityLiveRegion="polite" style={styles.text}>
          {message}
        </Text>
      ) : null}
      {ready && !snapshot?.submissions.length ? (
        <Text style={styles.text}>
          No {status.replaceAll("_", " ")} feedback submissions.
        </Text>
      ) : null}
      {snapshot?.submissions.map((row) => (
        <Pressable
          key={row.id}
          accessibilityRole="button"
          accessibilityLabel={`Review feedback from ${row.publicName}`}
          disabled={!ready || busy}
          onPress={() => {
            if (
              !current(key) ||
              !idle() ||
              !view.current.ready ||
              view.current.snapshot !== snapshot ||
              !snapshot.submissions.includes(row)
            )
              return;
            setSelectedId(row.id);
            setReason("");
            setExactReviewed(false);
            setAudienceApproved(false);
            setPhotoReady(!row.photoEvidenceAssetId);
            setMessage("");
          }}
          style={styles.secondary}
        >
          <Text style={styles.heading}>{row.publicName}</Text>
          <Text style={styles.text}>
            {row.status.replaceAll("_", " ")}
            {row.synthetic ? " · Synthetic QA — never public" : ""}
          </Text>
        </Pressable>
      ))}
      {selected ? (
        <View style={styles.card}>
          <Text accessibilityRole="header" aria-level={3} style={styles.heading}>
            Exact submitted version
          </Text>
          <Text style={styles.heading}>{selected.publicName}</Text>
          <Text style={styles.text}>{selected.feedbackText}</Text>
          <Text style={styles.text}>
            Version {selected.revision}.{" "}
            {selected.consent.granted
              ? "Publication permission recorded for this exact version."
              : "Private feedback: no publication permission."}
          </Text>
          {selected.synthetic ? (
            <Text style={styles.text}>
              Synthetic QA feedback. This cannot appear in the public testimonial list.
            </Text>
          ) : null}
          {selected.photoEvidenceAssetId ? (
            <PrivateTestimonialPhoto
              key={`${key}:${selected.id}:${selected.revision}`}
              path={`/api/admin/testimonials/${encodeURIComponent(selected.id)}/photo`}
              contextKey={`${key}:${selected.id}:${selected.revision}`}
              onReady={(value) => {
                if (
                  current(key) &&
                  view.current.selected?.id === selected.id &&
                  view.current.selected?.revision === selected.revision
                )
                  setPhotoReady(value);
              }}
            />
          ) : (
            <Text style={styles.text}>No photo submitted.</Text>
          )}
          {selected.status === "pending_review" || selected.status === "published" ? (
            <>
              <Text style={styles.text}>
                Internal reason (required for reject or hide; 3–500 characters). This does
                not change the submitted quote.
              </Text>
              <TextInput
                accessibilityLabel="Internal testimonial review reason"
                value={reason}
                onChangeText={(value) => {
                  if (canReview()) setReason(value);
                }}
                maxLength={500}
                editable={ready && !busy}
                multiline
                style={styles.input}
              />
              <Pressable
                accessibilityRole="checkbox"
                accessibilityLabel="I reviewed the exact submitted version"
                accessibilityState={{ checked: exactReviewed, disabled: !ready || busy }}
                disabled={!ready || busy}
                onPress={() => {
                  if (canReview()) setExactReviewed((value) => !value);
                }}
                style={styles.secondary}
              >
                <Text style={styles.text}>
                  {exactReviewed ? "☑" : "☐"} I reviewed this exact submitted name,
                  feedback and optional photo.
                </Text>
              </Pressable>
              {selected.status === "pending_review" ? (
                <>
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityLabel="Approve this exact content for the public audience"
                    accessibilityState={{
                      checked: audienceApproved,
                      disabled: !ready || busy
                    }}
                    disabled={!ready || busy}
                    onPress={() => {
                      if (canReview()) setAudienceApproved((value) => !value);
                    }}
                    style={styles.secondary}
                  >
                    <Text style={styles.text}>
                      {audienceApproved ? "☑" : "☐"} This exact quote and optional photo
                      are crop-neutral, appropriate for the public audience, and contain
                      no private personal or operational details.
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    disabled={
                      !ready ||
                      busy ||
                      !exactReviewed ||
                      !audienceApproved ||
                      !selected.consent.granted ||
                      Boolean(selected.photoEvidenceAssetId && !photoReady)
                    }
                    onPress={() => void review("publish")}
                    style={styles.button}
                  >
                    <Text style={styles.buttonText}>Publish exact submission</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    disabled={
                      !ready || busy || !exactReviewed || reason.trim().length < 3
                    }
                    onPress={() => void review("reject")}
                    style={styles.secondary}
                  >
                    <Text style={styles.text}>Reject submission</Text>
                  </Pressable>
                </>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  disabled={!ready || busy || !exactReviewed || reason.trim().length < 3}
                  onPress={() => void review("hide")}
                  style={styles.secondary}
                >
                  <Text style={styles.text}>Hide from public testimonials</Text>
                </Pressable>
              )}
            </>
          ) : (
            <Text style={styles.text}>
              This status has no publication or editing action.
            </Text>
          )}
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
            {pageError ? "Retry earlier submissions" : "Load earlier submissions"}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
