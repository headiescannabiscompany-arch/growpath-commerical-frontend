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
  type ArchiveAccessReview,
  type LegalArchiveExportReceipt,
  type LegalArchivePackage
} from "@/api/adminArchiveAccess";
import {
  LEGAL_EVIDENCE_ARCHIVE_SCOPES,
  type LegalEvidenceArchiveScope
} from "@/api/adminEvidenceVault";
import { getAdminSecurityEpoch, getAdminStepUpExpiry } from "@/api/adminPasskeys";
import { useAdminSecurityEpoch } from "./useAdminSecurity";
import { useAppTheme } from "@/theme/appTheme";

type SavedExport = Pick<LegalArchivePackage, "filename" | "sha256" | "auditEventId">;

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
  const [prepareExport, setPrepareExport] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [secondConfirmation, setSecondConfirmation] = useState("");
  const [review, setReview] = useState<ArchiveAccessReview | null>(null);
  const [receipt, setReceipt] = useState<ArchiveAccessReceipt | LegalArchiveExportReceipt | null>(null);
  const [download, setDownload] = useState<SavedExport | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const generation = useRef(0);
  const pending = useRef(false);
  const token = useRef<ArchiveAccessReview | null>(null);
  const preparedFile = useRef<LegalArchivePackage | null>(null);
  const expected = archiveAccessConfirmation(archiveId, requestId, prepareExport);
  const browserExportAvailable = Platform.OS === "web" &&
    typeof document !== "undefined" &&
    typeof globalThis.crypto?.subtle?.digest === "function" &&
    typeof URL.createObjectURL === "function";
  const exportCanProceed = !prepareExport ||
    (browserExportAvailable && Date.parse(getAdminStepUpExpiry() || "") > Date.now());
  const ready =
    /^[a-f0-9]{24}$/.test(archiveId) &&
    /^[a-f0-9]{24}$/.test(requestId) &&
    purpose.trim().length >= 8 &&
    scopes.length > 0 &&
    acknowledged &&
    exportCanProceed &&
    confirmation === expected;

  function clearSensitive() {
    generation.current += 1;
    pending.current = false;
    token.current = null;
    preparedFile.current = null;
    setReview(null);
    setReceipt(null);
    setDownload(null);
    setSecondConfirmation("");
    setBusy(false);
    setMessage("");
  }

  useEffect(() => {
    function hide() {
      clearSensitive();
      setExpanded(false);
      setPurpose("");
      setPrepareExport(false);
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
      preparedFile.current = null;
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
      confirmation: expected,
      ...(prepareExport ? { prepareExport: true } : {})
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
    setDownload(null);
    preparedFile.current = null;
    // Consume local state before I/O. A failed/uncertain read must never reuse the token.
    token.current = null;
    setReview(null);
    setSecondConfirmation("");
    const current = () =>
      generation.current === attempt && epoch === getAdminSecurityEpoch();
    try {
      if (open) {
        const result = await openArchiveAccess(input, currentReview!);
        if (current()) {
          if ("exportPackage" in result) preparedFile.current = result.exportPackage;
          setReceipt(result);
        }
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
            ? prepareExport
              ? "The export outcome is unconfirmed. Check the request audit before starting another review."
              : "Archive access was not confirmed. Nothing is displayed. Review again; this token will not be retried."
            : prepareExport
              ? "Export review is unavailable. Check the current passkey, matching archive hold, and explicit export approval for these scopes."
            : "Review unavailable. Verify your passkey and the independently approved request, active hold, IDs and scopes. No archive data was opened."
        );
    } finally {
      if (current()) {
        pending.current = false;
        setBusy(false);
      }
    }
  }

  function savePreparedExport() {
    const file = preparedFile.current;
    if (
      !file ||
      !browserExportAvailable ||
      document.hidden ||
      epoch !== getAdminSecurityEpoch() ||
      !(Date.parse(getAdminStepUpExpiry() || "") > Date.now())
    ) return;

    // Consume the local save action before asking the browser to persist the file.
    preparedFile.current = null;
    setReceipt(null);
    const { filename, sha256, auditEventId, content } = file;
    try {
      const anchor = document.createElement("a");
      const url = URL.createObjectURL(new Blob([content], { type: "application/json;charset=utf-8" }));
      try {
        anchor.href = url;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        setDownload({ filename, sha256, auditEventId });
      } finally {
        anchor.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch {
      setMessage(`The server prepared package ${auditEventId}, but the browser could not request the download. Check the audit before a new review.`);
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
        setPrepareExport(false);
        setConfirmation("");
        setAcknowledged(false);
      })}
      {expanded ? (
        <View style={{ gap: 10 }}>
          <Text style={{ color: palette.textMuted }}>
            Requires an active hold, an independently approved legal request and the
            minimum necessary scopes. Enter only the IDs from that case.
          </Text>
          {browserExportAvailable ? (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityLabel="Prepare approved legal JSON export"
              accessibilityState={{ checked: prepareExport }}
              onPress={() => change(() => setPrepareExport(!prepareExport))}
            >
              <Text style={{ color: palette.text }}>
                {prepareExport ? "☑" : "☐"} Prepare approved legal JSON export
              </Text>
            </Pressable>
          ) : null}
          {prepareExport ? (
            <Text style={{ color: palette.textMuted }}>
              Requires explicit export approval from the independent reviewer and your
              current passkey. The JSON file saves to this device for handling under the
              approved request.
              {!exportCanProceed ? " Verify your passkey in Admin security to continue." : ""}
            </Text>
          ) : null}
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
            busy ? "Checking…" : prepareExport ? "Review legal export" : "Review scoped access",
            () => void run(false),
            !ready || busy
          )}
          {review ? (
            <View style={{ gap: 8 }}>
              <Text style={{ color: palette.text }}>
                {prepareExport ? "Export review passed. " : "Scope review passed; no archive data opened. "}
                Review expires{" "}
                {new Date(review.reviewExpiresAt).toLocaleString()}.
              </Text>
              <Text style={{ color: palette.textMuted }}>
                {prepareExport ? "To prepare the legal file once" : "To open the selected data once"}, type again: {review.nextConfirmation}
              </Text>
              {field(
                "Second archive access confirmation",
                secondConfirmation,
                setSecondConfirmation,
                100
              )}
              {button(
                prepareExport ? "Prepare approved legal JSON once" : "Open selected archive data once",
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
          {receipt && "data" in receipt ? (
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
          {receipt && "exportPackage" in receipt ? (
            <View style={{ gap: 8 }}>
              <Text style={{ color: palette.text }}>Legal JSON package prepared and audited.</Text>
              <Text style={{ color: palette.textMuted }}>{receipt.exportPackage.filename}</Text>
              <Text style={{ color: palette.textMuted }}>SHA-256 {receipt.exportPackage.sha256}</Text>
              <Text style={{ color: palette.textMuted }}>Audit reference {receipt.exportPackage.auditEventId}</Text>
              {button("Save approved legal JSON once", savePreparedExport, !exportCanProceed)}
              {button("Clear prepared package", clearSensitive)}
            </View>
          ) : null}
          {download ? (
            <View style={{ gap: 8 }} accessibilityLiveRegion="polite">
              <Text style={{ color: palette.text }}>Browser download requested for {download.filename}.</Text>
              <Text style={{ color: palette.textMuted }}>SHA-256 {download.sha256}</Text>
              <Text style={{ color: palette.textMuted }}>Audit reference {download.auditEventId}</Text>
              {button("Clear export receipt", clearSensitive)}
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
