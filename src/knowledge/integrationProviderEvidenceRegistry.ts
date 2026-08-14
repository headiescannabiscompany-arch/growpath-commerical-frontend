export type IntegrationProviderEvidence = {
  id: string;
  connectionMethod: string;
  readiness:
    | "implemented"
    | "credential_ready"
    | "oauth_required"
    | "import_ready"
    | "gateway_required";
  officialSource: string;
  limitations: string[];
  lastReviewedAt: string;
};

export const INTEGRATION_PROVIDER_EVIDENCE: IntegrationProviderEvidence[] = [
  {
    id: "pulse",
    connectionMethod: "customer_api_key",
    readiness: "implemented",
    officialSource: "https://api.pulsegrow.com/docs/index.html",
    limitations: ["Read only", "Room mapping requires user confirmation"],
    lastReviewedAt: "2026-08-14"
  },
  {
    id: "trolmaster",
    connectionMethod: "developer_api_key_per_device",
    readiness: "credential_ready",
    officialSource: "https://www.trolmaster.com/News/ApiGateway?class=Support",
    limitations: [
      "Customer must request and pay for API access per device",
      "Subscribed endpoint contract still requires end-to-end verification"
    ],
    lastReviewedAt: "2026-08-14"
  },
  {
    id: "zentra",
    connectionMethod: "personal_api_token",
    readiness: "implemented",
    officialSource: "https://docs.zentracloud.io/l/en/article/xot1qptzgz-api-token",
    limitations: ["Read only", "Sensor placement and grow mapping require review"],
    lastReviewedAt: "2026-08-14"
  },
  {
    id: "ubibot",
    connectionMethod: "account_read_key",
    readiness: "implemented",
    officialSource: "https://www.ubibot.com/platform-api/1113/get-channels/",
    limitations: ["Read only", "Summary records are not raw samples"],
    lastReviewedAt: "2026-08-14"
  },
  {
    id: "sensorpush",
    connectionMethod: "oauth_account_authorization",
    readiness: "oauth_required",
    officialSource: "https://www.sensorpush.com/gateway-cloud-api",
    limitations: ["Production OAuth registration required", "One request per minute"],
    lastReviewedAt: "2026-08-14"
  },
  {
    id: "tempest",
    connectionMethod: "oauth",
    readiness: "oauth_required",
    officialSource: "https://weatherflow.github.io/Tempest/api/",
    limitations: ["Production OAuth registration required", "Owner-station data only"],
    lastReviewedAt: "2026-08-14"
  },
  {
    id: "bluelab",
    connectionMethod: "csv_history_import",
    readiness: "import_ready",
    officialSource:
      "https://support.bluelab.com/how-to-get-the-most-out-of-history-reporting",
    limitations: ["No verified public cloud API", "User supplies exported history"],
    lastReviewedAt: "2026-08-14"
  },
  {
    id: "weatherlink",
    connectionMethod: "customer_api_key_and_secret",
    readiness: "credential_ready",
    officialSource: "https://weatherlink.github.io/v2-api/",
    limitations: [
      "Read only initially",
      "Historical access may require a WeatherLink Pro or Pro+ subscription"
    ],
    lastReviewedAt: "2026-08-14"
  },
  {
    id: "ecowitt",
    connectionMethod: "customer_cloud_key_or_reviewed_local_gateway",
    readiness: "credential_ready",
    officialSource: "https://www.ecowitt.com/api/quickstart/product?id=299",
    limitations: [
      "Cloud and local contracts require separate adapters",
      "Channel-to-grow placement requires user confirmation"
    ],
    lastReviewedAt: "2026-08-14"
  },
  {
    id: "rachio",
    connectionMethod: "customer_bearer_api_key",
    readiness: "credential_ready",
    officialSource: "https://rachio.readme.io/reference/getting-started",
    limitations: [
      "Monitoring and history only in the initial scope",
      "Irrigation commands require a separate safety-reviewed permission scope"
    ],
    lastReviewedAt: "2026-08-14"
  },
  {
    id: "shelly",
    connectionMethod: "cloud_key_or_local_device_api",
    readiness: "credential_ready",
    officialSource: "https://shelly-api-docs.shelly.cloud/",
    limitations: [
      "Monitoring only in the initial scope",
      "Relay and equipment commands remain disabled"
    ],
    lastReviewedAt: "2026-08-14"
  },
  {
    id: "particle",
    connectionMethod: "owner_authorized_webhook_or_cloud_token",
    readiness: "credential_ready",
    officialSource: "https://docs.particle.io/integrations/webhooks/",
    limitations: [
      "Requires an explicit event schema per device product",
      "Device commands require a separate safety-reviewed scope"
    ],
    lastReviewedAt: "2026-08-14"
  }
];
