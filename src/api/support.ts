import { apiRequest } from "./apiRequest";

export type SupportContactTopic =
  | "account"
  | "billing"
  | "orders"
  | "sales"
  | "technical"
  | "commercial"
  | "courses"
  | "live"
  | "facility"
  | "partners"
  | "privacy"
  | "legal"
  | "security"
  | "general";

export type SupportContactRequest = {
  topic: SupportContactTopic;
  name: string;
  email: string;
  subject?: string;
  message: string;
  accountEmail?: string;
  company?: string;
};

export type SupportContactResponse = {
  ok: true;
  emailSent?: boolean;
  routedTo?: string;
  providerMessageId?: string | null;
  message?: string;
};

export async function sendSupportContact(
  body: SupportContactRequest
): Promise<SupportContactResponse> {
  return apiRequest("/api/support/contact", {
    method: "POST",
    auth: false,
    body
  }) as Promise<SupportContactResponse>;
}
