import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { apiRequest } from "@/api/apiRequest";
import { useAuth } from "@/auth/AuthContext";
import { readStagingBackstageDraftHostId } from "./liveBackstageStagingWeb";

const title = "Synthetic QA Backstage rehearsal 2026-11-23";
const attemptKey = "growpath:backstage:rehearsal-draft:2026-11-23";

type DraftScope = { hostId: string; token: string };
type DraftReceipt = {
  session?: {
    _id?: string;
    owner?: { id?: string };
    title?: string;
    status?: string;
    visibility?: string;
    sessionType?: string;
    isPublished?: boolean;
    chatEnabled?: boolean;
    startsAt?: string | null;
    endsAt?: string | null;
    scheduledStart?: string;
    scheduledEnd?: string;
  };
};

export function StagingBackstageDraft() {
  const { user, token, isHydrating, meStatus } = useAuth();
  const hostId = readStagingBackstageDraftHostId();
  const accountId = user?.id;
  const scope = useMemo<DraftScope | null>(() => !isHydrating && meStatus === "ready" &&
    hostId && accountId === hostId && token && /^[A-Za-z0-9._~-]{1,8192}$/.test(token)
    ? { hostId, token } : null, [accountId, hostId, isHydrating, meStatus, token]);
  const latest = useRef(scope);
  latest.current = scope;
  const inFlight = useRef<AbortController | null>(null);
  const [receipt, setReceipt] = useState<{ scope: DraftScope; id: string } | null>(null);
  const [saving, setSaving] = useState<DraftScope | null>(null);

  useEffect(() => {
    const cancel = () => inFlight.current?.abort();
    if (!scope) return;
    window.addEventListener("pagehide", cancel);
    return () => {
      window.removeEventListener("pagehide", cancel);
      cancel();
    };
  }, [scope]);

  let attempted = false;
  if (scope) {
    try {
      attempted = window.sessionStorage.getItem(attemptKey) !== null;
    } catch {
      // Refuse a save when the tab cannot remember the attempt after a reload.
      attempted = true;
    }
  }

  async function save() {
    if (!scope || inFlight.current || latest.current !== scope ||
        readStagingBackstageDraftHostId() !== scope.hostId) return;
    try {
      if (window.sessionStorage.getItem(attemptKey) !== null) return;
      window.sessionStorage.setItem(attemptKey, "requested");
    } catch {
      return;
    }
    const controller = new AbortController();
    inFlight.current = controller;
    setSaving(scope);
    const current = () => !controller.signal.aborted && latest.current === scope &&
      readStagingBackstageDraftHostId() === scope.hostId;
    try {
      const result = await apiRequest<DraftReceipt>("/api/lives", {
        method: "POST",
        body: { title, sessionType: "live", visibility: "private", status: "draft", isPublished: false, chatEnabled: false },
        auth: false,
        headers: { Authorization: `Bearer ${scope.token}` },
        retries: 0,
        timeoutMs: 8000,
        redirect: "error",
        cache: "no-store",
        notifyTransport: false,
        notifyTokenBalance: false,
        invalidateOn401: false,
        signal: controller.signal
      });
      if (!current()) return;
      const draft = result?.session;
      const id = draft?._id;
      if (typeof id === "string" && /^[a-f0-9]{24}$/.test(id) &&
          draft?.owner?.id === scope.hostId && draft.title === title &&
          draft.status === "draft" && draft.visibility === "private" &&
          draft.sessionType === "live" && draft.isPublished === false &&
          draft.chatEnabled === false && !draft.startsAt && !draft.endsAt &&
          !draft.scheduledStart && !draft.scheduledEnd) {
        setReceipt({ scope, id });
      }
    } catch {
      // A missing response does not establish whether the draft was saved.
    } finally {
      if (inFlight.current === controller) {
        inFlight.current = null;
        if (current()) setSaving(null);
      }
    }
  }

  if (!hostId) return <Text accessibilityRole="alert">This private draft setup is unavailable.</Text>;
  if (isHydrating || (token && (meStatus === "idle" || meStatus === "loading"))) {
    return <Text accessibilityLiveRegion="polite">Checking the signed-in staging account…</Text>;
  }
  if (!scope) return <Text accessibilityRole="alert">Sign in as the approved staging host to save this draft.</Text>;
  if (receipt?.scope === scope) {
    return <Text accessibilityLiveRegion="polite">Private draft saved. Session ID {receipt.id}.</Text>;
  }
  if (inFlight.current && saving === scope) {
    return <Text accessibilityLiveRegion="polite">Saving the private draft…</Text>;
  }
  if (attempted) {
    return <Text accessibilityRole="alert">Check the host’s Live records for the saved private draft before attempting another save.</Text>;
  }
  return (
    <View>
      <Text accessibilityRole="header">Private rehearsal draft</Text>
      <Text>{title}</Text>
      <Pressable accessibilityRole="button" onPress={save}>
        <Text>Save private draft</Text>
      </Pressable>
    </View>
  );
}
