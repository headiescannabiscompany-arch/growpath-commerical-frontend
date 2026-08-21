export type LiveLifecycleRecord = {
  id?: string;
  _id?: string;
  title?: string;
  status?: string;
  isPublished?: boolean;
  startsAt?: string | null;
  scheduledStart?: string | null;
};

export function liveSessionId(session: LiveLifecycleRecord) {
  return String(session?.id || session?._id || "").trim();
}

export function isUnpublishedLiveDraft(session: LiveLifecycleRecord) {
  return session?.isPublished !== true && String(session?.status || "draft") === "draft";
}

export function isUnpublishedLive(session: LiveLifecycleRecord) {
  return session?.isPublished !== true;
}

export function liveHasSchedule(session: LiveLifecycleRecord) {
  return Boolean(String(session?.startsAt || session?.scheduledStart || "").trim());
}

export function livePublishIntent(session: LiveLifecycleRecord) {
  const scheduled = liveHasSchedule(session);
  return {
    goLiveNow: !scheduled,
    label: scheduled ? "Publish scheduled session" : "Publish live now"
  };
}
