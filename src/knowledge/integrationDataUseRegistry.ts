export const INTEGRATION_DATA_USE_CONSUMERS = [
  "display",
  "analytics",
  "AI",
  "search",
  "recommendations",
  "tasks",
  "alerts",
  "exports"
] as const;

export type IntegrationDataConsumer = (typeof INTEGRATION_DATA_USE_CONSUMERS)[number];

export type IntegrationDataUseRule = {
  field: string;
  description: string;
  consumers: IntegrationDataConsumer[];
  secret?: boolean;
};

export const INTEGRATION_DATA_USE_REGISTRY: IntegrationDataUseRule[] = [
  {
    field: "connectionId",
    description: "Encrypted-credential connection that produced the device structure.",
    consumers: ["display", "analytics", "exports"]
  },
  {
    field: "workspaceMode",
    description: "Personal, Commercial, or Facility ownership boundary.",
    consumers: ["display", "analytics", "search", "exports"]
  },
  {
    field: "workspaceId",
    description:
      "Canonical account or Facility ownership reference used to isolate connections and imports.",
    consumers: ["display", "analytics", "search", "exports"]
  },
  {
    field: "targetRef",
    description: "Owned grow or Commercial evidence-run receiving the import.",
    consumers: ["display", "analytics", "AI", "search", "exports"]
  },
  {
    field: "targetType",
    description:
      "Reviewed target kind distinguishing a grow from an explicit Commercial evidence run.",
    consumers: ["display", "analytics", "AI", "search", "exports"]
  },
  {
    field: "provider",
    description: "Original controller or monitoring provider.",
    consumers: ["display", "analytics", "search", "exports"]
  },
  {
    field: "providerDeviceId",
    description: "Provider-owned device identifier used for idempotent updates.",
    consumers: ["display", "analytics", "exports"]
  },
  {
    field: "spaceName",
    description: "User-reviewed room, tent, greenhouse, bed, or outdoor-area mapping.",
    consumers: ["display", "analytics", "AI", "search", "tasks", "alerts", "exports"]
  },
  {
    field: "zoneName",
    description: "Optional user-reviewed sub-area within a grow space.",
    consumers: ["display", "analytics", "AI", "search", "tasks", "alerts", "exports"]
  },
  {
    field: "roomId",
    description: "Canonical Facility room selected or created after mapping review.",
    consumers: ["display", "analytics", "AI", "search", "tasks", "alerts", "exports"]
  },
  {
    field: "sourceTimezone",
    description:
      "Reviewed IANA timezone used to interpret source-local history timestamps.",
    consumers: ["display", "analytics", "AI", "search", "exports"]
  },
  {
    field: "sourceFileIdentity",
    description:
      "Bounded file name, size, media type, modification time, and URI scheme retained without a device-local URI.",
    consumers: ["display", "analytics", "search", "exports"]
  },
  {
    field: "headerRowIndex",
    description: "Reviewed CSV header-row position used to reproduce parsing.",
    consumers: ["display", "analytics", "exports"]
  },
  {
    field: "columns",
    description: "Bounded source column names presented during import review.",
    consumers: ["display", "analytics", "AI", "search", "exports"]
  },
  {
    field: "historyWindow",
    description: "Provider-declared history start, end, and sampling interval.",
    consumers: ["display", "analytics", "AI", "search", "exports"]
  },
  {
    field: "temperatureUnit",
    description: "Reviewed source temperature unit used for deterministic conversion.",
    consumers: ["display", "analytics", "AI", "exports"]
  },
  {
    field: "roomMapping",
    description: "Reviewed room or grow-space name attached to the imported source.",
    consumers: ["display", "analytics", "AI", "search", "tasks", "alerts", "exports"]
  },
  {
    field: "importReview",
    description:
      "Confirmed provider, workspace, grow, room, timezone, file, and column-review provenance.",
    consumers: ["display", "analytics", "AI", "search", "tasks", "alerts", "exports"]
  },
  {
    field: "metricMap",
    description:
      "Reviewed provider-key to sensor-label mapping used during normalization.",
    consumers: ["display", "analytics", "AI", "exports"]
  },
  {
    field: "providerMetricKey",
    description: "Untouched provider metric key retained beside normalization.",
    consumers: ["display", "analytics", "AI", "exports"]
  },
  {
    field: "canonicalMetric",
    description: "Reviewed GrowPath metric mapping or explicit unmapped state.",
    consumers: [
      "display",
      "analytics",
      "AI",
      "recommendations",
      "tasks",
      "alerts",
      "exports"
    ]
  },
  {
    field: "timestamp",
    description: "Source reading time normalized with the reviewed grow timezone.",
    consumers: [
      "display",
      "analytics",
      "AI",
      "search",
      "recommendations",
      "tasks",
      "alerts",
      "exports"
    ]
  },
  {
    field: "rawValue",
    description: "Unmodified provider value retained as source evidence.",
    consumers: ["display", "analytics", "AI", "exports"]
  },
  {
    field: "rawUnit",
    description: "Provider-supplied unit required for defensible conversion.",
    consumers: ["display", "analytics", "AI", "exports"]
  },
  {
    field: "normalizedValue",
    description:
      "Canonical values derived only when the provider key and unit support it.",
    consumers: [
      "display",
      "analytics",
      "AI",
      "recommendations",
      "tasks",
      "alerts",
      "exports"
    ]
  },
  {
    field: "normalizedUnit",
    description:
      "Canonical unit or explicit mixed/unmapped state for the stored snapshot.",
    consumers: ["display", "analytics", "AI", "exports"]
  },
  {
    field: "syncReceipt",
    description:
      "Import range, device outcomes, inserts, updates, failures, and provider.",
    consumers: ["display", "analytics", "tasks", "alerts", "exports"]
  },
  {
    field: "credentials",
    description: "Encrypted provider credential; only configured state may be displayed.",
    consumers: ["display"],
    secret: true
  }
];
