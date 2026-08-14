import { apiRequest } from "./apiRequest";

export type IntegrationProvider = {
  id: string;
  name: string;
  category: string;
  contractStatus:
    | "implemented"
    | "access_required"
    | "contract_pending"
    | "gateway_required";
  access: string;
  capabilities: string[];
  documentationUrl?: string | null;
  requestUrl?: string | null;
  credentialRequired?: boolean;
  setupNote?: string;
  readOnly: true;
  permissionLevel: "read_only";
};

export type IntegrationConnection = {
  id: string;
  provider: string;
  label: string;
  config: Record<string, unknown>;
  status: "draft" | "configured" | "connected" | "error" | "access_requested";
  auth: {
    type: string;
    encrypted: boolean;
    configured: boolean;
  };
  permissionLevel: "read_only";
  readOnly: true;
  capabilities: string[];
  hasCredentials: boolean;
  lastTestAt?: string | null;
  lastError?: string | null;
  error?: { code: string; message: string; at?: string | null } | null;
  lastSync: {
    at?: string | null;
    status: "never" | "running" | "succeeded" | "failed";
    summary?: Record<string, unknown> | null;
  };
};

export type IntegrationDeviceMapping = {
  deviceId: string;
  deviceName: string;
  roomName: string;
  zoneName: string;
  metrics: string[];
  metricMap?: Record<string, string>;
};

export type IntegrationMappingPreview = {
  provider: string;
  permissionLevel: "read_only";
  deviceCount: number;
  roomCount: number;
  zoneCount: number;
  mappings: IntegrationDeviceMapping[];
};

export type IntegrationGrowSpace = {
  id: string;
  connectionId: string;
  provider: string;
  name: string;
  zoneName: string;
  roomId?: string | null;
  growId?: string | null;
  devices: Array<{
    providerDeviceId: string;
    name: string;
    metrics: string[];
    metricMap?: Record<string, string>;
    permissionLevel: "read_only";
  }>;
  permissionLevel: "read_only";
  provenance?: Record<string, unknown>;
};

function dataOf(response: any) {
  return response?.data ?? response;
}

export async function listIntegrationProviders(): Promise<IntegrationProvider[]> {
  const response = await apiRequest("/api/integrations/providers");
  return dataOf(response)?.providers ?? [];
}

export async function listIntegrationConnections(): Promise<IntegrationConnection[]> {
  const response = await apiRequest("/api/integrations/connections");
  return dataOf(response)?.connections ?? [];
}

export async function createIntegrationConnection(input: {
  provider: string;
  label?: string;
  credentials?: Record<string, string>;
  config?: Record<string, string>;
}): Promise<IntegrationConnection> {
  const response = await apiRequest("/api/integrations/connections", {
    method: "POST",
    body: input
  });
  return dataOf(response).connection;
}

export async function testIntegrationConnection(
  id: string
): Promise<IntegrationConnection> {
  const response = await apiRequest(`/api/integrations/connections/${id}/test`, {
    method: "POST"
  });
  return dataOf(response).connection;
}

export async function listIntegrationDevices(id: string): Promise<any[]> {
  const response = await apiRequest(`/api/integrations/connections/${id}/devices`);
  return dataOf(response)?.devices ?? [];
}

export async function fetchIntegrationStructure(id: string): Promise<{
  devices: any[];
  suggestedMappings: IntegrationDeviceMapping[];
}> {
  const response = await apiRequest(`/api/integrations/connections/${id}/structure`);
  const data = dataOf(response);
  return {
    devices: data?.devices ?? [],
    suggestedMappings: data?.suggestedMappings ?? []
  };
}

export async function previewIntegrationMapping(
  id: string,
  mappings: IntegrationDeviceMapping[]
): Promise<IntegrationMappingPreview> {
  const response = await apiRequest(
    `/api/integrations/connections/${id}/mapping/preview`,
    { method: "POST", body: { mappings } }
  );
  return dataOf(response).preview;
}

export async function confirmIntegrationMapping(
  id: string,
  mappings: IntegrationDeviceMapping[]
): Promise<IntegrationConnection> {
  const response = await apiRequest(
    `/api/integrations/connections/${id}/mapping/confirm`,
    { method: "POST", body: { mappings } }
  );
  return dataOf(response).connection;
}

export async function autoBuildIntegrationSpaces(
  id: string,
  input: { mode: "personal" | "facility" | "commercial"; targetRef: string }
): Promise<{ mode: string; targetRef: string; spaces: any[]; createdOrUpdated: number }> {
  const response = await apiRequest(`/api/integrations/connections/${id}/auto-build`, {
    method: "POST",
    body: input
  });
  return dataOf(response);
}

export async function listIntegrationSpaces(input: {
  mode: "personal" | "facility" | "commercial";
  targetRef: string;
}): Promise<IntegrationGrowSpace[]> {
  const query = new URLSearchParams({ mode: input.mode, targetRef: input.targetRef });
  const response = await apiRequest(`/api/integrations/spaces?${query.toString()}`);
  return dataOf(response)?.spaces ?? [];
}

export type IntegrationHistoryImportSummary = {
  provider: string;
  startIso: string;
  endIso: string;
  devices: number;
  failures: number;
  pulled: number;
  ingested: number;
  updated: number;
};

export async function importIntegrationHistory(
  id: string,
  input: {
    mode: "personal" | "facility" | "commercial";
    targetRef: string;
    startIso: string;
    endIso: string;
    timezone?: string;
  }
): Promise<IntegrationHistoryImportSummary> {
  const response = await apiRequest(
    `/api/integrations/connections/${id}/history/import`,
    { method: "POST", body: input }
  );
  return dataOf(response).summary;
}

export async function createIntegrationAccessRequest(provider: string) {
  const response = await apiRequest("/api/integrations/access-requests", {
    method: "POST",
    body: { provider, organization: "GrowPath" }
  });
  return dataOf(response);
}
