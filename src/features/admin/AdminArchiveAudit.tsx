import React, { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  verifyArchiveAudit,
  type ArchiveAuditVerification
} from "@/api/adminEvidenceVault";
import { useAdminSecurityEpoch } from "./useAdminSecurity";
import { useAppTheme } from "@/theme/appTheme";

function resultLabel(receipt: ArchiveAuditVerification) {
  if (!receipt.valid)
    return `Audit chain failed at event ${receipt.brokenSequence}. Requires investigation.`;
  if (!receipt.eventCount) return "No audit events recorded — not an integrity proof.";
  return `${receipt.eventCount} events; recorded chain verified.`;
}

export default function AdminArchiveAudit({ archiveId }: { archiveId: string }) {
  const { palette } = useAppTheme();
  const epoch = useAdminSecurityEpoch();
  const generation = useRef(0);
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [result, setResult] = useState<ArchiveAuditVerification[] | null>(null);

  useEffect(() => {
    generation.current += 1;
    pending.current = false;
    setBusy(false);
    setError(false);
    setResult(null);
    return () => {
      generation.current += 1;
    };
  }, [archiveId, epoch]);

  async function verify() {
    if (pending.current) return;
    pending.current = true;
    const attempt = ++generation.current;
    setBusy(true);
    setError(false);
    setResult(null);
    try {
      const receipts = await Promise.all([
        verifyArchiveAudit(archiveId, "access"),
        verifyArchiveAudit(archiveId, "retention")
      ]);
      if (generation.current === attempt) setResult(receipts);
    } catch {
      if (generation.current === attempt) setError(true);
    } finally {
      if (generation.current === attempt) {
        pending.current = false;
        setBusy(false);
      }
    }
  }

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Verify access and retention audit for ${archiveId}`}
        disabled={busy}
        onPress={() => void verify()}
        style={{ paddingVertical: 8 }}
      >
        <Text style={{ color: palette.link }}>
          {busy ? "Checking audit…" : "Verify access / retention audit"}
        </Text>
      </Pressable>
      {result ? (
        <View accessibilityLiveRegion="polite">
          {result.map((receipt, index) => (
            <Text
              key={index}
              style={{ color: receipt.valid ? palette.textMuted : palette.danger }}
            >
              {index === 0 ? "Access" : "Retention"}: {resultLabel(receipt)}
            </Text>
          ))}
          <Text style={{ color: palette.textMuted }}>
            Checks recorded access and retention events only, not account-removal history
            or archive contents. No data is opened or exported.
          </Text>
        </View>
      ) : null}
      {error ? (
        <Text accessibilityRole="alert" style={{ color: palette.danger }}>
          Audit verification unavailable. No archive or retention changes were made.
        </Text>
      ) : null}
    </View>
  );
}
