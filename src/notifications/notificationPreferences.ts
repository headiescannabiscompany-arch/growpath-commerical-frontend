export type NotificationPreferenceState = {
  pushEnabled: boolean;
  taskReminders: boolean;
  forumReplies: boolean;
  forumMentions: boolean;
  videoActivity: boolean;
  courseAndLiveUpdates: boolean;
  commerceUpdates: boolean;
  facilityAlerts: boolean;
};

export type NotificationPreferenceKey = Exclude<
  keyof NotificationPreferenceState,
  "pushEnabled"
>;

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferenceState = {
  pushEnabled: true,
  taskReminders: true,
  forumReplies: true,
  forumMentions: true,
  videoActivity: true,
  courseAndLiveUpdates: true,
  commerceUpdates: true,
  facilityAlerts: true
};

export const NOTIFICATION_PREFERENCE_OPTIONS: Array<{
  key: keyof NotificationPreferenceState;
  title: string;
  description: string;
}> = [
  {
    key: "pushEnabled",
    title: "Device push",
    description: "Allow GrowPath to send opted-in notifications to this device."
  },
  {
    key: "taskReminders",
    title: "Task reminders",
    description: "Due dates, follow-ups, and reminder-based workflow items."
  },
  {
    key: "forumReplies",
    title: "Forum replies",
    description: "Replies and discussion follow-ups in Forum/Q&A."
  },
  {
    key: "forumMentions",
    title: "Forum mentions",
    description: "Direct @mentions and name references in Forum/Q&A."
  },
  {
    key: "videoActivity",
    title: "Video activity",
    description: "Comments, follows, and library activity for uploaded videos."
  },
  {
    key: "courseAndLiveUpdates",
    title: "Courses and lives",
    description: "Course progress, live reminders, and replay availability."
  },
  {
    key: "commerceUpdates",
    title: "Commerce updates",
    description: "Feed campaigns, storefronts, orders, and related commercial alerts."
  },
  {
    key: "facilityAlerts",
    title: "Facility alerts",
    description: "Facility-specific room, task, SOP, and compliance notifications."
  }
];

export const NOTIFICATION_PREFERENCE_TITLES = NOTIFICATION_PREFERENCE_OPTIONS.reduce<
  Record<string, string>
>((acc, option) => {
  acc[option.key] = option.title;
  return acc;
}, {});

const SOURCE_TYPE_TO_PREFERENCE_KEY: Record<string, NotificationPreferenceKey> = {
  alert: "taskReminders",
  task: "taskReminders",
  comment: "forumReplies",
  forum: "forumReplies",
  mention: "forumMentions",
  video: "videoActivity",
  media: "videoActivity",
  upload: "videoActivity",
  course: "courseAndLiveUpdates",
  lesson: "courseAndLiveUpdates",
  course_assignment: "courseAndLiveUpdates",
  live: "courseAndLiveUpdates",
  live_event: "courseAndLiveUpdates",
  replay: "courseAndLiveUpdates",
  feed_campaign: "commerceUpdates",
  product: "commerceUpdates",
  product_batch: "commerceUpdates",
  product_trial: "commerceUpdates",
  storefront: "commerceUpdates",
  order: "commerceUpdates",
  room: "facilityAlerts",
  sop: "facilityAlerts",
  recipe: "facilityAlerts",
  facility_run: "facilityAlerts",
  sensor_alert: "facilityAlerts",
  toolrun: "facilityAlerts",
  tool_run: "facilityAlerts"
};

export function notificationPreferenceKeyForSourceType(
  sourceType?: string | null
): NotificationPreferenceKey | null {
  const normalized = String(sourceType || "")
    .trim()
    .toLowerCase();
  return SOURCE_TYPE_TO_PREFERENCE_KEY[normalized] || null;
}

export function notificationPreferenceLabelForSourceType(
  sourceType?: string | null
): string {
  const key = notificationPreferenceKeyForSourceType(sourceType);
  return key ? NOTIFICATION_PREFERENCE_TITLES[key] : "Other";
}
