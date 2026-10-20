import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import {
  getAdminSecurityEpoch,
  getAdminSecurityIdentityEpoch,
  subscribeAdminSecurity
} from "@/api/adminPasskeys";
import {
  createInternalCourseCheckoutSupportClient,
  createInternalCourseCheckoutSupportHistoryClient,
  createInternalCourseGiftSupportReferenceClient,
  createInternalCourseGiftDeliveryReviewClient
} from "@/api/courseCheckoutSupportClient";
import { ScreenBoundary } from "@/components/ScreenBoundary";
import { enterCourseGiftDiagnosticScope } from "@/utils/courseGiftDiagnosticPrivacy";
import { useAppTheme } from "@/theme/appTheme";
import AdminPasskeySecurity from "./AdminPasskeySecurity";

type Client = ReturnType<typeof createInternalCourseCheckoutSupportClient>;
type Kind = Parameters<Client["prepare"]>[0];
const emptyForm = () => ({
  target: "",
  buyer: "",
  checkoutAttemptId: "",
  sessionId: "",
  operationId: "",
  issuanceRequestId: "",
  expectedStateVersion: "",
  expectedGeneration: "",
  reason: "",
  confirmation: ""
});
type Form = ReturnType<typeof emptyForm>;
const LIMITS: Record<keyof Form, number> = {
  target: 24,
  buyer: 24,
  checkoutAttemptId: 36,
  sessionId: 255,
  operationId: 36,
  issuanceRequestId: 36,
  expectedStateVersion: 16,
  expectedGeneration: 16,
  reason: 1000,
  confirmation: 400
};

/** Public entry stays inert; only the guarded staging Admin outlet selects the
 * internal panel. Selection is not authorization or gifting activation.
 */
export default function CourseCheckoutSupportPanel() {
  return null;
}

/** Existing web-only building block; the staging outlet adds explicit admission
 * and identity/target cleanup without replacing these clients or passkey controls.
 */
export function InternalCourseCheckoutSupportPanel() {
  const [client, setClient] = useState<Client | null>(null);
  const [historyClient, setHistoryClient] = useState<Client | null>(null);
  const [referenceClient, setReferenceClient] = useState<Client | null>(null);
  const [deliveryClient, setDeliveryClient] = useState<Client | null>(null);
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const releasePrivacy = enterCourseGiftDiagnosticScope();
    const current = createInternalCourseCheckoutSupportClient({ platform: "web" });
    const history = createInternalCourseCheckoutSupportHistoryClient({ platform: "web" });
    const reference = createInternalCourseGiftSupportReferenceClient({ platform: "web" });
    const delivery = createInternalCourseGiftDeliveryReviewClient({ platform: "web" });
    setClient(current);
    setHistoryClient(history);
    setReferenceClient(reference);
    setDeliveryClient(delivery);
    return () => {
      current.dispose();
      history.dispose();
      reference.dispose();
      delivery.dispose();
      releasePrivacy();
    };
  }, []);
  if (
    Platform.OS !== "web" ||
    !client ||
    !historyClient ||
    !referenceClient ||
    !deliveryClient
  )
    return null;
  return (
    <ScreenBoundary name="CourseGiftSupport" showBack={false}>
      <SupportReview
        client={client}
        historyClient={historyClient}
        referenceClient={referenceClient}
        deliveryClient={deliveryClient}
      />
    </ScreenBoundary>
  );
}

function SupportReview({
  client,
  historyClient,
  referenceClient,
  deliveryClient
}: {
  client: Client;
  historyClient: Client;
  referenceClient: Client;
  deliveryClient: Client;
}) {
  const { palette } = useAppTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        panel: { padding: 16, gap: 12, backgroundColor: palette.surface },
        text: { color: palette.text, fontSize: 14, lineHeight: 21 },
        title: { color: palette.text, fontSize: 18, fontWeight: "700" },
        input: {
          borderWidth: 1,
          borderColor: palette.border,
          color: palette.text,
          backgroundColor: palette.page,
          padding: 10,
          minHeight: 44,
          borderRadius: 8
        },
        button: {
          borderWidth: 1,
          borderColor: palette.border,
          padding: 12,
          borderRadius: 8
        },
        row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
        disabled: { opacity: 0.45 }
      }),
    [palette]
  );
  const securityEpoch = useSyncExternalStore(
    subscribeAdminSecurity,
    getAdminSecurityEpoch,
    () => 0
  );
  const [identity] = useState(getAdminSecurityIdentityEpoch);
  const [form, setForm] = useState(emptyForm);
  const [kind, setKind] = useState<Kind>("courseGift");
  const [snapshot, setSnapshot] = useState(() => client.snapshot());
  const [historySnapshot, setHistorySnapshot] = useState(() => historyClient.snapshot());
  const [referenceSnapshot, setReferenceSnapshot] = useState(() =>
    referenceClient.snapshot()
  );
  const [deliverySnapshot, setDeliverySnapshot] = useState(() =>
    deliveryClient.snapshot()
  );
  const [referenceAction, setReferenceAction] = useState(
    "recover_course_gift_exact_open_session"
  );
  const [historyMessage, setHistoryMessage] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [message, setMessage] = useState("");
  const active = useRef(true);
  const busy = useRef(false);
  const sameIdentity = identity === getAdminSecurityIdentityEpoch();
  // Check synchronously as well as on notification, before exposing private input.
  const now = client.snapshot();
  const closed = !sameIdentity || now.status === "disposed";
  const locked = now.needsStepUp;
  const pending = [snapshot, historySnapshot, referenceSnapshot, deliverySnapshot].some(
    (value) => value.status === "pending"
  );
  const referenceFrozen = ["pending", "uncertain", "reference_issued"].includes(
    referenceSnapshot.status
  );
  const reference = referenceClient.snapshot().reference;
  const hasReference = !!reference && reference.operationId === form.operationId;
  const frozen = ["pending", "uncertain", "bound_for_review"].includes(snapshot.status);
  const done = snapshot.status === "bound_for_review";

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  useEffect(() => {
    setAcknowledged(false);
    setSnapshot(client.snapshot());
    setHistorySnapshot(historyClient.snapshot());
    setReferenceSnapshot(referenceClient.snapshot());
    setDeliverySnapshot(deliveryClient.snapshot());
    setHistoryMessage("");
    if (identity !== getAdminSecurityIdentityEpoch()) {
      setForm(emptyForm());
      setReviewed(false);
      setMessage("");
    }
  }, [client, historyClient, referenceClient, deliveryClient, securityEpoch, identity]);

  function button(label: string, action: () => void, disabled = false) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={action}
        style={[styles.button, disabled && styles.disabled]}
      >
        <Text style={styles.text}>{label}</Text>
      </Pressable>
    );
  }
  function change(key: keyof Form, value: string) {
    if (
      busy.current ||
      frozen ||
      locked ||
      closed ||
      (referenceFrozen &&
        [
          "target",
          "buyer",
          "checkoutAttemptId",
          "issuanceRequestId",
          "operationId"
        ].includes(key)) ||
      identity !== getAdminSecurityIdentityEpoch()
    )
      return;
    setForm((before) => ({ ...before, [key]: value }));
    setReviewed(false);
    setAcknowledged(false);
    setMessage("");
    setHistorySnapshot(historyClient.clearHistory());
    setHistoryMessage("");
    setDeliverySnapshot(deliveryClient.clearHistory());
  }
  function field(key: keyof Form, label: string) {
    return (
      <View key={key} style={{ gap: 4 }}>
        <Text style={styles.text}>{label}</Text>
        <TextInput
          accessibilityLabel={label}
          value={form[key]}
          onChangeText={(value) => change(key, value)}
          editable={
            !frozen &&
            !pending &&
            !(
              referenceFrozen &&
              [
                "target",
                "buyer",
                "checkoutAttemptId",
                "issuanceRequestId",
                "operationId"
              ].includes(key)
            )
          }
          maxLength={LIMITS[key]}
          autoComplete="off"
          textContentType="none"
          autoCorrect={false}
          autoCapitalize="none"
          spellCheck={false}
          style={styles.input}
        />
      </View>
    );
  }
  function review() {
    if (busy.current || frozen || locked || closed) return;
    try {
      const gift = kind === "courseGift";
      if (
        gift &&
        (!hasReference || referenceAction !== "recover_course_gift_exact_open_session")
      )
        throw new Error();
      const next = client.prepare(kind, {
        [gift ? "giftId" : "courseId"]: form.target,
        [gift ? "purchaserUserId" : "buyerUserId"]: form.buyer,
        checkoutAttemptId: form.checkoutAttemptId,
        sessionId: form.sessionId,
        operationId: form.operationId,
        reason: form.reason,
        confirmation: form.confirmation
      });
      setSnapshot(next);
      setReviewed(true);
      setAcknowledged(false);
      setMessage("");
    } catch {
      setReviewed(false);
      setAcknowledged(false);
      setMessage(
        "Review the original evidence and exact confirmation. No request was submitted."
      );
    }
  }

  async function issueReference() {
    if (busy.current || closed || locked || frozen || kind !== "courseGift") return;
    busy.current = true;
    setAcknowledged(false);
    setReviewed(false);
    setMessage("");
    try {
      if (!referenceFrozen)
        referenceClient.prepare("courseGift", {
          giftId: form.target,
          purchaserUserId: form.buyer,
          checkoutAttemptId: form.checkoutAttemptId,
          issuanceRequestId: form.issuanceRequestId,
          action: referenceAction
        });
      const task = referenceClient.submit(true);
      setReferenceSnapshot(referenceClient.snapshot());
      const next = await task;
      if (active.current && identity === getAdminSecurityIdentityEpoch()) {
        setReferenceSnapshot(next);
        if (next.reference)
          setForm((before) => ({ ...before, operationId: next.reference!.operationId }));
      }
    } catch {
      if (active.current && identity === getAdminSecurityIdentityEpoch()) {
        setReferenceSnapshot(referenceClient.snapshot());
        setMessage(
          "Reference not confirmed. Keep the original request ID; verify your existing passkey and original references."
        );
      }
    } finally {
      busy.current = false;
    }
  }

  async function inspectDelivery() {
    if (
      busy.current ||
      closed ||
      locked ||
      !hasReference ||
      referenceAction !== "inspect_course_gift_delivery_recovery"
    )
      return;
    busy.current = true;
    setAcknowledged(false);
    setMessage("");
    try {
      if (
        !/^(0|[1-9]\d*)$/.test(form.expectedStateVersion) ||
        !/^[1-9]\d*$/.test(form.expectedGeneration)
      )
        throw new Error();
      deliveryClient.prepare("courseGift", {
        giftId: form.target,
        purchaserUserId: form.buyer,
        checkoutAttemptId: form.checkoutAttemptId,
        operationId: reference!.operationId,
        expectedStateVersion: Number(form.expectedStateVersion),
        expectedGeneration: Number(form.expectedGeneration)
      });
      const task = deliveryClient.submit(true);
      setDeliverySnapshot(deliveryClient.snapshot());
      const next = await task;
      if (active.current && identity === getAdminSecurityIdentityEpoch())
        setDeliverySnapshot(next);
    } catch {
      if (active.current && identity === getAdminSecurityIdentityEpoch()) {
        setDeliverySnapshot(deliveryClient.snapshot());
        setMessage(
          "Delivery review unavailable. Use the exact current version and generation from authorized original evidence; do not guess or resend."
        );
      }
    } finally {
      busy.current = false;
    }
  }
  async function submit() {
    if (busy.current || closed || locked || done || !reviewed || !acknowledged) return;
    busy.current = true;
    setAcknowledged(false);
    setMessage("");
    try {
      const request = client.submit(true);
      setSnapshot(client.snapshot());
      const next = await request;
      if (active.current && identity === getAdminSecurityIdentityEpoch())
        setSnapshot(next);
    } catch {
      if (active.current && identity === getAdminSecurityIdentityEpoch()) {
        setSnapshot(client.snapshot());
        setMessage(
          "The action could not be confirmed. Verify your existing passkey before continuing."
        );
      }
    } finally {
      busy.current = false;
    }
  }

  async function inspectHistory() {
    if (busy.current || closed || locked) return;
    setAcknowledged(false);
    setHistoryMessage("");
    try {
      const gift = kind === "courseGift";
      historyClient.prepare(kind, {
        [gift ? "giftId" : "courseId"]: form.target,
        [gift ? "purchaserUserId" : "buyerUserId"]: form.buyer,
        checkoutAttemptId: form.checkoutAttemptId,
        operationId: form.operationId
      });
    } catch {
      setHistorySnapshot(historyClient.snapshot());
      setHistoryMessage(
        "Enter the four exact original references for this history read. No request was submitted."
      );
      return;
    }
    busy.current = true;
    try {
      const request = historyClient.submit(true);
      setHistorySnapshot(historyClient.snapshot());
      const next = await request;
      if (active.current && identity === getAdminSecurityIdentityEpoch())
        setHistorySnapshot(next);
    } catch {
      if (active.current && identity === getAdminSecurityIdentityEpoch()) {
        setHistorySnapshot(historyClient.snapshot());
        setHistoryMessage(
          "History could not be checked. Verify your existing passkey before continuing."
        );
      }
    } finally {
      busy.current = false;
    }
  }

  if (closed)
    return (
      <Text style={styles.text}>
        Account or security session changed. Private review cleared. Reopen only with the
        original evidence.
      </Text>
    );
  return (
    <View accessibilityLabel="Private course checkout review" style={styles.panel}>
      <Text accessibilityRole="header" style={styles.title}>
        Private course checkout review
      </Text>
      <Text style={styles.text}>
        Internal preview only. Live support actions and course gifting remain disabled.
        Server Owner, passkey and exact-evidence checks still apply.
      </Text>
      <Text style={styles.text}>
        Use verified original records, not an email, contact message or guessed
        identifier. This screen does not search for candidates or create a new checkout.
      </Text>
      <Text style={styles.text}>
        Closing or reloading loses this private form and its original reason. Do not start
        a replacement operation after uncertainty. Original-evidence and cross-device
        recovery need separate support review.
      </Text>
      {!pending && <AdminPasskeySecurity verificationOnly />}
      {locked ? (
        <Text style={styles.text}>
          Private fields hidden. Verify your existing passkey to continue this same
          review. Verification never submits it.
        </Text>
      ) : (
        <>
          <View style={styles.row}>
            {(["courseGift", "commercialCourse"] as const).map((value) => (
              <Pressable
                key={value}
                accessibilityRole="radio"
                accessibilityLabel={
                  value === "courseGift" ? "Course gift" : "Ordinary Commercial course"
                }
                accessibilityState={{
                  checked: kind === value,
                  disabled: frozen || pending || referenceFrozen
                }}
                disabled={frozen || pending || referenceFrozen}
                style={[styles.button, frozen && styles.disabled]}
                onPress={() => {
                  if (busy.current || frozen || referenceFrozen) return;
                  setKind(value);
                  setForm(emptyForm());
                  setReviewed(false);
                  setAcknowledged(false);
                  setMessage("");
                  setHistorySnapshot(historyClient.clearHistory());
                  setHistoryMessage("");
                }}
              >
                <Text style={styles.text}>
                  {value === "courseGift" ? "Course gift" : "Ordinary Commercial course"}
                </Text>
              </Pressable>
            ))}
          </View>
          {field(
            "target",
            kind === "courseGift" ? "Original gift ID" : "Original course ID"
          )}
          {field(
            "buyer",
            kind === "courseGift"
              ? "Original purchaser user ID"
              : "Original buyer user ID"
          )}
          {field("checkoutAttemptId", "Original checkout attempt ID")}
          {kind === "courseGift" && (
            <>
              <Text style={styles.text}>
                A server-issued reference is required before gift review. It does not
                verify original evidence or authorize a recovery, resend, refund or access
                change.
              </Text>
              <View style={styles.row}>
                {(
                  [
                    "recover_course_gift_exact_open_session",
                    "inspect_course_gift_delivery_recovery"
                  ] as const
                ).map((action) => (
                  <Pressable
                    key={action}
                    accessibilityRole="radio"
                    accessibilityLabel={
                      action === "recover_course_gift_exact_open_session"
                        ? "Checkout evidence review"
                        : "Delivery technical review"
                    }
                    accessibilityState={{
                      checked: referenceAction === action,
                      disabled: referenceFrozen || pending || frozen
                    }}
                    disabled={referenceFrozen || pending || frozen}
                    onPress={() => {
                      if (busy.current || referenceFrozen || frozen) return;
                      setReferenceAction(action);
                      setReviewed(false);
                      setAcknowledged(false);
                    }}
                    style={styles.button}
                  >
                    <Text style={styles.text}>
                      {action === "recover_course_gift_exact_open_session"
                        ? "Checkout evidence review"
                        : "Delivery technical review"}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {field("issuanceRequestId", "Original reference request ID")}
              {button(
                "Prepare new reference request ID",
                () => {
                  if (
                    busy.current ||
                    referenceFrozen ||
                    form.issuanceRequestId ||
                    frozen ||
                    locked ||
                    closed
                  )
                    return;
                  try {
                    change("issuanceRequestId", globalThis.crypto.randomUUID());
                  } catch {
                    setMessage("Request ID unavailable. No request was submitted.");
                  }
                },
                pending || referenceFrozen || !!form.issuanceRequestId || frozen
              )}
              <Text style={styles.text}>
                Create a request ID only for a genuinely new review. After uncertainty or
                reload, re-enter the exact original references and request ID. This screen
                stores nothing in the browser. Missing original evidence or request ID
                requires manual review, not a replacement.
              </Text>
              {button(
                referenceSnapshot.status === "uncertain"
                  ? "Retry same reference request"
                  : "Issue or recover support reference",
                () => void issueReference(),
                pending || referenceSnapshot.status === "reference_issued" || frozen
              )}
              {referenceSnapshot.status === "pending" && (
                <Text style={styles.text}>
                  Issuing reference only. Do not start another request.
                </Text>
              )}
              {referenceSnapshot.status === "uncertain" && (
                <Text style={styles.text}>
                  Reference outcome uncertain or unavailable. Keep this exact request ID;
                  no automatic retry.
                </Text>
              )}
              {hasReference && (
                <Text style={styles.text}>
                  Reference issued. Original evidence remains unverified; no recovery
                  action has run.
                </Text>
              )}
            </>
          )}
          {field("operationId", "Original support operation ID")}
          <Text style={styles.text}>
            Read-only recovery history uses only these four original references and the
            original operator's current Owner/passkey authority. It cannot restore a lost
            Session ID or reason, transfer an operation, or authorize a retry.
          </Text>
          {button(
            "Check recorded recovery history",
            () => void inspectHistory(),
            pending
          )}
          {historySnapshot.status === "pending" && (
            <Text accessibilityLiveRegion="polite" style={styles.text}>
              Reading recorded history only. No recovery action is being submitted.
            </Text>
          )}
          {historySnapshot.history && (
            <Text accessibilityLiveRegion="polite" style={styles.text}>
              {historySnapshot.history.status === "binding_recorded"
                ? "A binding was recorded for review. "
                : historySnapshot.history.status === "request_recorded"
                  ? "A recovery request was recorded; binding is not established by this read. "
                  : "History is unknown or cannot be matched. This is not proof that no action occurred. "}
              This is historical evidence only, not current payment, refund, course
              access, payout or support resolution. Keep the original evidence; nothing is
              retried.
            </Text>
          )}
          {historySnapshot.status === "uncertain" && (
            <Text accessibilityLiveRegion="polite" style={styles.text}>
              History is unavailable. No conclusion about recorded actions or payment can
              be drawn. A deliberate history recheck is read-only.
            </Text>
          )}
          {historyMessage ? (
            <Text accessibilityLiveRegion="polite" style={styles.text}>
              {historyMessage}
            </Text>
          ) : null}
          {kind === "courseGift" &&
          referenceAction === "inspect_course_gift_delivery_recovery" ? (
            <>
              {field("expectedStateVersion", "Original gift state version")}
              {field("expectedGeneration", "Original delivery generation")}
              {button(
                "Read delivery technical assessment",
                () => void inspectDelivery(),
                pending || !hasReference
              )}
              {deliverySnapshot.deliveryReview && (
                <Text style={styles.text}>
                  Technical snapshot only: version{" "}
                  {deliverySnapshot.deliveryReview.observedStateVersion}, generation{" "}
                  {deliverySnapshot.deliveryReview.observedGeneration}. Original evidence
                  is still required. Nothing was rescheduled, sent, restored or refunded.
                </Text>
              )}
              {deliverySnapshot.status === "uncertain" && (
                <Text style={styles.text}>
                  Technical assessment unavailable. This does not prove delivery or
                  permission to resend.
                </Text>
              )}
            </>
          ) : (
            <>
              {field("sessionId", "Original provider Session ID")}
              {field("reason", "Exact original review reason")}
              <Text style={styles.text}>
                Type RECOVER {kind === "courseGift" ? "COURSE GIFT" : "COURSE CHECKOUT"},
                followed by the original gift/course ID, checkout attempt ID and provider
                Session ID, separated by single spaces.
              </Text>
              {field("confirmation", "Exact recovery confirmation")}
              {!frozen &&
                button(
                  "Review original evidence",
                  review,
                  pending || (kind === "courseGift" && !hasReference)
                )}
              {reviewed && !done && (
                <>
                  <Text style={styles.text}>
                    Review every value above. Once attempted, this exact operation and
                    reason are frozen for same-request recovery, including after a denial
                    or timeout.
                  </Text>
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityLabel="I reviewed the exact original evidence"
                    accessibilityState={{ checked: acknowledged, disabled: pending }}
                    disabled={pending}
                    onPress={() => {
                      if (!busy.current) setAcknowledged(!acknowledged);
                    }}
                    style={styles.button}
                  >
                    <Text style={styles.text}>
                      {acknowledged ? "Checked: " : "Not checked: "}I reviewed the exact
                      original evidence
                    </Text>
                  </Pressable>
                  {button(
                    snapshot.status === "uncertain"
                      ? "Retry this exact review"
                      : "Submit evidence for review",
                    () => void submit(),
                    pending || !acknowledged
                  )}
                </>
              )}
            </>
          )}
        </>
      )}
      {snapshot.status === "pending" && (
        <Text accessibilityLiveRegion="polite" style={styles.text}>
          Checking original evidence. Do not start another operation. A timeout does not
          cancel remote work.
        </Text>
      )}
      {snapshot.status === "uncertain" && (
        <Text accessibilityLiveRegion="polite" style={styles.text}>
          {snapshot.code === "NOT_RELEASED"
            ? "Support is not enabled here. "
            : snapshot.code === "DENIED"
              ? "This support action was not authorized. "
              : "The result is uncertain. "}
          Keep this same operation and exact reason. This is not proof of no payment. No
          automatic retry or replacement charge is allowed.
        </Text>
      )}
      {done && !locked && (
        <Text accessibilityLiveRegion="polite" style={styles.text}>
          Evidence linked for review only. This does not confirm payment, issue a refund,
          grant course access, settle a payout or resolve a support ticket. Unusable gifts
          require manual refund review.
        </Text>
      )}
      {message && !locked ? (
        <Text accessibilityLiveRegion="polite" style={styles.text}>
          {message}
        </Text>
      ) : null}
    </View>
  );
}
