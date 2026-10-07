import React, { useEffect, useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import AppCard from "@/components/layout/AppCard";
import { getAdminSecurityIdentityEpoch, getAdminStepUpExpiry } from "@/api/adminPasskeys";
import { useAdminSecurityEpoch } from "./useAdminSecurity";
import { useAppTheme } from "@/theme/appTheme";
import {
  cleanupReviewedDocument,
  inspectDocumentReview,
  newDocumentControlId,
  readDocumentRecovery,
  reassignDocumentCleanup,
  recordDocumentReview,
  type DocumentRecoveryRow,
  type DocumentReview
} from "@/api/adminFacilityDocuments";

export default function AdminFacilityDocuments() {
  const epoch = useAdminSecurityEpoch();
  return <Controls key={getAdminSecurityIdentityEpoch()} securityEpoch={epoch} />;
}
function Controls({ securityEpoch }: { securityEpoch: number }) {
  const { palette } = useAppTheme();
  const [rows, setRows] = useState<DocumentRecoveryRow[] | null>(null),
    [next, setNext] = useState<string | null>(null);
  const [selected, setSelected] = useState(""),
    [review, setReview] = useState<DocumentReview | null>(null);
  const [disposition, setDisposition] = useState<"retain" | "request_cleanup">("retain"),
    [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [handoff, setHandoff] = useState<{
    assetId: string;
    previousExecutionId: string;
  } | null>(null);
  const alive = useRef(true),
    lock = useRef(false);
  const request = useRef<{ signature: string; reviewId: string } | null>(null),
    execution = useRef<{ reviewId: string; id: string } | null>(null);
  const reassignment = useRef<{
    reviewId: string;
    executionId: string;
  } | null>(null);
  const verified = Date.parse(getAdminStepUpExpiry() || "") > Date.now();
  const latestSecurityEpoch = useRef(securityEpoch);
  latestSecurityEpoch.current = securityEpoch;
  useEffect(() => {
    setConfirmation("");
    setMessage("");
  }, [securityEpoch]);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  async function run(fn: (current: () => boolean) => Promise<void>) {
    if (
      lock.current ||
      !(Date.parse(getAdminStepUpExpiry() || "") > Date.now()) ||
      !alive.current
    )
      return;
    lock.current = true;
    setBusy(true);
    setMessage("");
    try {
      await fn(() => alive.current && latestSecurityEpoch.current === securityEpoch);
    } catch {
      if (alive.current && latestSecurityEpoch.current === securityEpoch)
        setMessage(
          "Not confirmed. Controls may be disabled, your passkey may need verification, or this record requires further review. Recheck; do not assume a failed response means no change occurred."
        );
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  function button(label: string, action: () => void, unavailable = false) {
    return (
      <Pressable
        accessibilityRole="button"
        disabled={busy || !verified || unavailable}
        accessibilityState={{ disabled: busy || !verified || unavailable }}
        onPress={action}
        style={{ paddingVertical: 8 }}
      >
        <Text
          style={{
            color: busy || !verified || unavailable ? palette.textMuted : palette.link
          }}
        >
          {label}
        </Text>
      </Pressable>
    );
  }
  async function load(after = "") {
    await run(async (current) => {
      const result = await readDocumentRecovery(after);
      if (!current()) return;
      setRows(result.rows);
      setNext(result.nextAfterId);
      // Keep an ambiguous operation's exact IDs and selection for an explicit
      // retry. Refresh never invents a new cleanup execution.
      if (!request.current && !execution.current && !reassignment.current) {
        setSelected("");
        setReview(null);
        setHandoff(null);
      }
      setConfirmation("");
    });
  }
  async function inspect(assetId: string) {
    await run(async (current) => {
      setSelected(assetId);
      setHandoff(null);
      setReview(null);
      setConfirmation("");
      const result = await inspectDocumentReview(assetId);
      if (current()) setReview(result);
    });
  }
  const reviewPhrase = `REVIEW ${selected} ${disposition}`;
  const deletePhrase = `DELETE REVOKED ${selected} ${review?.reviewId || ""}`;
  const handoffPhrase = handoff
    ? `REASSIGN REVOKED ${handoff.assetId} ${handoff.previousExecutionId}`
    : "";
  function prepareHandoff(row: DocumentRecoveryRow) {
    if (
      lock.current ||
      request.current ||
      execution.current ||
      reassignment.current ||
      row.code !== "REVOKED_CLEANUP_RECHECK_REQUIRED" ||
      !row.cleanupClaim
    )
      return;
    setSelected(row.assetId);
    setReview(null);
    setConfirmation("");
    setMessage("");
    setHandoff({
      assetId: row.assetId,
      previousExecutionId: row.cleanupClaim.executionId
    });
  }
  async function reassign() {
    if (!handoff || confirmation !== handoffPhrase) return;
    await run(async (current) => {
      if (!reassignment.current)
        reassignment.current = {
          reviewId: newDocumentControlId(),
          executionId: newDocumentControlId()
        };
      const result = await reassignDocumentCleanup(
        handoff.assetId,
        handoff.previousExecutionId,
        reassignment.current.reviewId,
        reassignment.current.executionId,
        confirmation
      );
      if (!current()) return;
      reassignment.current = null;
      setHandoff(null);
      setConfirmation("");
      if (result.released) {
        setReview(null);
        setRows(
          (previous) => previous?.filter((row) => row.assetId !== handoff.assetId) ?? null
        );
        setMessage(
          "Server reports this reassigned cleanup is already complete. No further removal was requested."
        );
        return;
      }
      execution.current = { reviewId: result.reviewId, id: result.executionId };
      setReview({
        reviewId: result.reviewId,
        current: true,
        code: "REVOKED_CLEANUP_RECHECK_REQUIRED",
        disposition: "request_cleanup",
        cleanupAuthorized: false
      });
      setMessage(
        "Cleanup reassigned. Reassignment did not remove files or return storage allowance. Removal still requires the separate confirmation below and fresh server checks."
      );
    });
  }
  async function saveReview() {
    if (!selected || !review || confirmation !== reviewPhrase) return;
    await run(async (current) => {
      const signature = `${selected}:${disposition}`;
      if (request.current?.signature !== signature)
        request.current = { signature, reviewId: newDocumentControlId() };
      const result = await recordDocumentReview(
        selected,
        request.current.reviewId,
        disposition,
        confirmation
      );
      if (!current()) return;
      request.current = null;
      setReview(result);
      setConfirmation("");
      setMessage(
        "Review recorded. This review is not deletion permission; removal requires a separate confirmation and fresh server checks."
      );
    });
  }
  async function remove() {
    if (
      !review?.current ||
      !review.reviewId ||
      review.disposition !== "request_cleanup" ||
      confirmation !== deletePhrase
    )
      return;
    await run(async (current) => {
      if (execution.current?.reviewId !== review.reviewId)
        execution.current = { reviewId: review.reviewId!, id: newDocumentControlId() };
      await cleanupReviewedDocument(
        selected,
        review.reviewId!,
        execution.current.id,
        confirmation
      );
      if (!current()) return;
      execution.current = null;
      setReview(null);
      setRows((previous) => previous?.filter((row) => row.assetId !== selected) ?? null);
      setConfirmation("");
      setMessage(
        "Server confirmed removal of this revoked copy and its storage allowance accounting. No course or account was deleted."
      );
    });
  }
  return (
    <AppCard
      title="Private course document recovery"
      titleLevel={2}
      subtitle="Owner-only controls. Verify your passkey in Admin security first. Disabled until document scanning is enabled."
    >
      <Text style={{ color: palette.textMuted }}>
        Review metadata only; files are not opened. An idle worker is not proof that an
        interrupted writer stopped. Held or uncertain files stay private.
      </Text>
      {button(busy ? "Checking…" : "Open / refresh document review", () => void load())}
      {verified && rows?.length === 0 ? (
        <Text style={{ color: palette.text }}>
          No records returned in this scoped page.
        </Text>
      ) : null}
      {verified &&
        rows?.map((row) => (
          <View
            key={row.assetId}
            style={{ borderTopWidth: 1, borderColor: palette.border, paddingVertical: 8 }}
          >
            <Text style={{ color: palette.text }}>{row.instruction}</Text>
            <Text selectable style={{ color: palette.textMuted }}>
              Document reference: {row.assetId}
            </Text>
            {[
              "RETAINED_AFTER_ACTIVATION",
              "RETENTION_REVIEW_REQUIRED",
              "RETAINED_COURSE_REFERENCE",
              "RETAINED_REFERENCE_OPERATION",
              "RETAINED_EVIDENCE_HOLD"
            ].includes(row.code)
              ? button(
                  "Review this document",
                  () => void inspect(row.assetId),
                  Boolean(request.current || execution.current || reassignment.current)
                )
              : null}
            {row.code === "REVOKED_CLEANUP_RECHECK_REQUIRED" && row.cleanupClaim
              ? button(
                  "Review cleanup reassignment",
                  () => prepareHandoff(row),
                  Boolean(request.current || execution.current || reassignment.current)
                )
              : null}
          </View>
        ))}
      {verified && next ? button("Next review page", () => void load(next)) : null}
      {verified && handoff ? (
        <View>
          <Text style={{ color: palette.text }}>
            Reassign interrupted cleanup for document {handoff.assetId}. Only another
            configured platform owner can take over from the initiating owner. This does
            not grant a role, remove files or return storage allowance. The server
            rechecks the existing claim, holds and course references.
          </Text>
          <Text selectable style={{ color: palette.text }}>
            To reassign only, type: {handoffPhrase}
          </Text>
          {reassignment.current ? (
            <Text style={{ color: palette.textMuted }}>
              Keep this operation open. Retry uses the same reassignment references; do
              not start another request after an uncertain response.
            </Text>
          ) : null}
          <TextInput
            accessibilityLabel="Cleanup reassignment confirmation"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!busy && verified}
            value={confirmation}
            onChangeText={setConfirmation}
            style={{
              borderWidth: 1,
              borderColor: palette.border,
              color: palette.text,
              padding: 8
            }}
          />
          {button(
            "Confirm cleanup reassignment",
            () => void reassign(),
            confirmation !== handoffPhrase
          )}
          {button(
            "Cancel reassignment",
            () => {
              setHandoff(null);
              setSelected("");
              setConfirmation("");
            },
            Boolean(reassignment.current)
          )}
        </View>
      ) : null}
      {verified && selected && review ? (
        <View>
          {request.current || execution.current ? (
            <Text style={{ color: palette.textMuted }}>
              Keep this operation open and use its existing references. After an uncertain
              response, retry the same action; do not switch documents or create another
              decision.
            </Text>
          ) : null}
          <Text style={{ color: palette.text }}>
            Selected document: {selected}.{" "}
            {review.current ? "Current recorded review" : "New review needed"}. Server
            state: {review.code.replace(/_/g, " ").toLowerCase()}.
          </Text>
          {button(
            "Retain file",
            () => {
              setDisposition("retain");
              setConfirmation("");
            },
            Boolean(request.current || execution.current)
          )}
          {button(
            "Request a separate cleanup review",
            () => {
              setDisposition("request_cleanup");
              setConfirmation("");
            },
            Boolean(request.current || execution.current)
          )}
          <Text selectable style={{ color: palette.text }}>
            To record this decision, type: {reviewPhrase}
          </Text>
          {review.current &&
          review.disposition === "request_cleanup" &&
          review.reviewId ? (
            <Text selectable style={{ color: palette.text }}>
              Permanent revoked-copy removal is separate. To request it, type:{" "}
              {deletePhrase}
            </Text>
          ) : null}
          <TextInput
            accessibilityLabel="Document review confirmation"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!busy && verified}
            value={confirmation}
            onChangeText={setConfirmation}
            style={{
              borderWidth: 1,
              borderColor: palette.border,
              color: palette.text,
              padding: 8
            }}
          />
          {button(
            "Record document review",
            () => void saveReview(),
            confirmation !== reviewPhrase || Boolean(execution.current)
          )}
          {review.current && review.disposition === "request_cleanup"
            ? button(
                "Permanently remove reviewed revoked copy",
                () => void remove(),
                confirmation !== deletePhrase
              )
            : null}
        </View>
      ) : null}
      {verified && message ? (
        <Text accessibilityLiveRegion="polite" style={{ color: palette.text }}>
          {message}
        </Text>
      ) : null}
    </AppCard>
  );
}
