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
};

export type IntegrationConnection = {
  id: string;
  provider: string;
  label: string;
  config: Record<string, unknown>;
  status: "draft" | "configured" | "connected" | "error" | "access_requested";
  hasCredentials: boolean;
  lastTestAt?: string | null;
  lastError?: string | null;
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

export async function createIntegrationAccessRequest(provider: string) {
  const response = await apiRequest("/api/integrations/access-requests", {
    method: "POST",
    body: { provider, organization: "GrowPath" }
  });
  return dataOf(response);
}
