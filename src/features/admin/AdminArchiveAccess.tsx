import React, { useEffect, useRef, useState } from "react";
import {
  AppState,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View
} from "react-native";
import {
  archiveAccessConfirmation,
  openArchiveAccess,
  reviewArchiveAccess,
  type ArchiveAccessProposal,
  type ArchiveAccessReceipt,
  type ArchiveAccessReview
} from "@/api/adminArchiveAccess";
import {
  LEGAL_EVIDENCE_ARCHIVE_SCOPES,
  type LegalEvidenceArchiveScope
} from "@/api/adminEvidenceVault";
import { getAdminSecurityEpoch } from "@/api/adminPasskeys";
import { useAdminSecurityEpoch } from "./useAdminSecurity";
import { useAppTheme } from "@/theme/appTheme";

/** Closed by default; no request, archive content, or one-use token is persisted. */
export default function AdminArchiveAccess({ authorized }: { authorized: boolean }) {
  const epoch = useAdminSecurityEpoch();
  return authorized ? <ArchiveAccessSession key={epoch} epoch={epoch} /> : null;
}

function ArchiveAccessSession({ epoch }: { epoch: number }) {
  const { palette } = useAppTheme();
  const [expanded, setExpanded] = useState(false);
  const [archiveId, setArchiveId] = useState("");
  const [requestId, setRequestId] = useState("");
  const [purpose, setPurpose] = useState("");
  const [scopes, setScopes] = useState<LegalEvidenceArchiveScope[]>([]);
  const [acknowledged, setAcknowledged] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [secondConfirmation, setSecondConfirmation] = useState("");
  const [review, setReview] = useState<ArchiveAccessReview | null>(null);
  const [receipt, setReceipt] = useState<ArchiveAccessReceipt | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const generation = useRef(0);
  const pending = useRef(false);
  const token = useRef<ArchiveAccessReview | null>(null);
  const expected = archiveAccessConfirmation(archiveId, requestId);
  const ready =
    /^[a-f0-9]{24}$/.test(archiveId) &&
    /^[a-f0-9]{24}$/.test(requestId) &&
    purpose.trim().length >= 8 &&
    scopes.length > 0 &&
    acknowledged &&
    confirmation === expected;

  function clearSensitive() {
    generation.current += 1;
    pending.current = false;
    token.current = null;
    setReview(null);
    setReceipt(null);
    setSecondConfirmation("");
    setBusy(false);
    setMessage("");
  }

  useEffect(() => {
    function hide() {
      clearSensitive();
      setExpanded(false);
      setPurpose("");
      setConfirmation("");
      setAcknowledged(false);
    }
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") hide();
    });
    const onVisibility = () => {
      if (document.hidden) hide();
    };
    if (Platform.OS === "web" && typeof document !== "undefined")
      document.addEventListener("visibilitychange", onVisibility);
    return () => {
      generation.current += 1;
      token.current = null;
      subscription?.remove();
      if (Platform.OS === "web" && typeof document !== "undefined")
        document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    if (!review && !receipt) return;
    const delay = review
      ? Math.max(0, Date.parse(review.reviewExpiresAt) - Date.now())
      : 5 * 60_000;
    const timer = setTimeout(() => {
      clearSensitive();
      setMessage(
        "Private review expired and was cleared. Start a fresh review if needed."
      );
    }, delay);
    return () => clearTimeout(timer);
  }, [review, receipt]);

  function change(update: () => void) {
    clearSensitive();
    setConfirmation("");
    setAcknowledged(false);
    update();
  }

  function proposal(): ArchiveAccessProposal {
    return {
      archiveId,
      evidenceRequestId: requestId,
      purpose: purpose.trim(),
      scopes: [...scopes].sort(),
      minimumNecessaryAcknowledged: true,
      confirmation: expected
    };
  }

  async function run(open: boolean) {
    if (!ready || pending.current || epoch !== getAdminSecurityEpoch()) return;
    const currentReview = token.current;
    if (
      open &&
      (!currentReview ||
        secondConfirmation !== expected ||
        Date.parse(currentReview.reviewExpiresAt) <= Date.now())
    )
      return;
    const input = proposal();
    const attempt = ++generation.current;
    pending.current = true;
    setBusy(true);
    setMessage("");
    setReceipt(null);
    // Consume local state before I/O. A failed/uncertain read must never reuse the token.
    token.current = null;
    setReview(null);
    setSecondConfirmation("");
    const current = () =>
      generation.current === attempt && epoch === getAdminSecurityEpoch();
    try {
      if (open) {
        const result = await openArchiveAccess(input, currentReview!);
        if (current()) setReceipt(result);
      } else {
        const result = await reviewArchiveAccess(input);
        if (current()) {
          token.current = result;
          setReview(result);
        }
      }
    } catch {
      if (current())
        setMessage(
          open
            ? "Archive access was not confirmed. Nothing is displayed. Review again; this token will not be retried."
            : "Review unavailable. Verify your passkey and the independently approved request, active hold, IDs and scopes. No archive data was opened."
        );
    } finally {
      if (current()) {
        pending.current = false;
        setBusy(false);
      }
    }
  }

  const inputStyle = {
    color: palette.text,
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    minHeight: 42
  };
  function button(label: string, onPress: () => void, disabled = false) {
    return (
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPress={onPress}
        style={{ paddingVertical: 10, opacity: disabled ? 0.45 : 1 }}
      >
        <Text style={{ color: palette.link, fontWeight: "700" }}>{label}</Text>
      </Pressable>
    );
  }
  function field(
    label: string,
    value: string,
    onChangeText: (value: string) => void,
    maxLength: number
  ) {
    return (
      <View>
        <Text style={{ color: palette.text }}>{label}</Text>
        <TextInput
          accessibilityLabel={label}
          value={value}
          onChangeText={onChangeText}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={maxLength}
          style={inputStyle}
        />
      </View>
    );
  }

  return (
    <View style={{ gap: 8 }}>
      {button(expanded ? "Close scoped archive access" : "Scoped archive access", () => {
        clearSensitive();
        setExpanded(!expanded);
        setPurpose("");
        setConfirmation("");
        setAcknowledged(false);
      })}
      {expanded ? (
        <View style={{ gap: 10 }}>
          <Text style={{ color: palette.textMuted }}>
            Restricted in-app review only. Requires an active hold, an independently
            approved legal request, minimum-necessary scopes and Admin verification. This
            does not approve a request or send data. Only enter IDs from an authorized
            case. No archive is opened by filling this form.
          </Text>
          {field(
            "Archive ID",
            archiveId,
            (value) => change(() => setArchiveId(value.trim().toLowerCase())),
            24
          )}
          {field(
            "Approved evidence request ID",
            requestId,
            (value) => change(() => setRequestId(value.trim().toLowerCase())),
            24
          )}
          {field(
            "Purpose of this access",
            purpose,
            (value) => change(() => setPurpose(value)),
            2000
          )}
          <Text style={{ color: palette.text }}>
            Select only scopes covered by the approved request
          </Text>
          <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
            {LEGAL_EVIDENCE_ARCHIVE_SCOPES.map((scope) => (
              <Pressable
                key={scope}
                accessibilityRole="checkbox"
                accessibilityLabel={scope}
                accessibilityState={{ checked: scopes.includes(scope) }}
                onPress={() =>
                  change(() =>
                    setScopes((previous) =>
                      previous.includes(scope)
                        ? previous.filter((item) => item !== scope)
                        : [...previous, scope]
                    )
                  )
                }
                style={{ paddingVertical: 8 }}
              >
                <Text style={{ color: palette.text }}>
                  {scopes.includes(scope) ? "☑" : "☐"} {scope}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityLabel="Minimum necessary access only"
            accessibilityState={{ checked: acknowledged }}
            onPress={() => {
              clearSensitive();
              setAcknowledged(!acknowledged);
            }}
          >
            <Text style={{ color: palette.text }}>
              {acknowledged ? "☑" : "☐"} I confirm these scopes are the minimum necessary
              for this approved request.
            </Text>
          </Pressable>
          <Text style={{ color: palette.textMuted }}>Type exactly: {expected}</Text>
          {field(
            "Exact archive review confirmation",
            confirmation,
            (value) => {
              clearSensitive();
              setConfirmation(value);
            },
            100
          )}
          {button(
            busy ? "Checking…" : "Review scoped access",
            () => void run(false),
            !ready || busy
          )}
          {review ? (
            <View style={{ gap: 8 }}>
              <Text style={{ color: palette.text }}>
                Scope review passed; no archive data opened. Review expires{" "}
                {new Date(review.reviewExpiresAt).toLocaleString()}.
              </Text>
              <Text style={{ color: palette.textMuted }}>
                To open the selected data once, type again: {review.nextConfirmation}
              </Text>
              {field(
                "Second archive access confirmation",
                secondConfirmation,
                setSecondConfirmation,
                100
              )}
              {button(
                "Open selected archive data once",
                () => void run(true),
                busy || secondConfirmation !== expected
              )}
            </View>
          ) : null}
          {message ? (
            <Text accessibilityRole="alert" style={{ color: palette.warning }}>
              {message}
            </Text>
          ) : null}
          {receipt ? (
            <View style={{ gap: 8 }}>
              <Text style={{ color: palette.text }}>
                Private scoped data — not exported or sent. Clears when closed,
                backgrounded, locked, or after five minutes.
              </Text>
              <Text style={{ color: palette.textMuted }}>
                Request date window:{" "}
                {receipt.dateWindow.from
                  ? new Date(receipt.dateWindow.from).toLocaleString()
                  : "No start bound"}{" "}
                —{" "}
                {receipt.dateWindow.to
                  ? new Date(receipt.dateWindow.to).toLocaleString()
                  : "No end bound"}
              </Text>
              {Object.entries(receipt.itemCounts).map(([name, count]) => (
                <Text key={name} style={{ color: palette.textMuted }}>
                  {name}: {count}
                </Text>
              ))}
              <ScopedDataView data={receipt.data} />
              {button("Clear private data", clearSensitive)}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/** Plain text only: never render HTML, media, or follow stored URLs. */
function ScopedDataView({ data }: { data: Record<string, unknown> }) {
  const { palette } = useAppTheme();
  const [page, setPage] = useState(0);
  const text = JSON.stringify(data, null, 2);
  const pages = Math.max(1, Math.ceil(text.length / 5000));
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: palette.textMuted }}>
        Private data page {page + 1} of {pages}
      </Text>
      <ScrollView style={{ maxHeight: 300 }} nestedScrollEnabled>
        <Text style={{ color: palette.text }}>
          {text.slice(page * 5000, (page + 1) * 5000)}
        </Text>
      </ScrollView>
      <Pressable
        accessibilityRole="button"
        disabled={page === 0}
        onPress={() => setPage(page - 1)}
      >
        <Text style={{ color: palette.link }}>Previous private data page</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        disabled={page + 1 >= pages}
        onPress={() => setPage(page + 1)}
      >
        <Text style={{ color: palette.link }}>Next private data page</Text>
      </Pressable>
    </View>
  );
}
