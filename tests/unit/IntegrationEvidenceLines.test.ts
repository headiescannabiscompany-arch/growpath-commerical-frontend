import { integrationEvidenceLines } from "@/app/home/personal/(tabs)/tools/integrations";

describe("integrationEvidenceLines", () => {
  it("does not call untested or unsynced device data fresh", () => {
    const lines = integrationEvidenceLines({
      id: "connection-1",
      provider: "pulse",
      label: "Pulse",
      config: {},
      status: "configured",
      auth: { type: "api_key", encrypted: true, configured: true },
      permissionLevel: "read_only",
      readOnly: true,
      capabilities: ["device_discovery"],
      hasCredentials: true,
      lastSync: { status: "never" }
    });

    expect(lines.join(" ")).toMatch(/read-only/i);
    expect(lines.join(" ")).toMatch(/not been tested/i);
    expect(lines.join(" ")).toMatch(/freshness is not established/i);
  });

  it("shows exact sync/test evidence and provider failure without inventing a threshold", () => {
    const lines = integrationEvidenceLines({
      id: "connection-2",
      provider: "zentra",
      label: "Zentra",
      config: {},
      status: "error",
      auth: { type: "api_key", encrypted: true, configured: true },
      permissionLevel: "read_only",
      readOnly: true,
      capabilities: ["history"],
      hasCredentials: true,
      lastTestAt: "2026-08-22T12:00:00.000Z",
      lastSync: { at: "2026-08-22T13:00:00.000Z", status: "failed" },
      error: { code: "PROVIDER_TIMEOUT", message: "Provider timed out" }
    });

    expect(lines.join(" ")).toMatch(/last connection test/i);
    expect(lines.join(" ")).toMatch(/last data sync/i);
    expect(lines.join(" ")).toMatch(/actual reporting cadence/i);
    expect(lines.join(" ")).toMatch(/provider timed out/i);
  });
});
