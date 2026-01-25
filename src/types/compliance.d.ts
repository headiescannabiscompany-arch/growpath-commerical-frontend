export type ComplianceLogType =
  | "DAILY_CHECK"
  | "SANITATION"
  | "PEST_CONTROL"
  | "NUTRIENT_MIX"
  | "IPM_SPRAY"
  | "EQUIPMENT_CAL"
  | "INCIDENT"
  | "OTHER";

export type ComplianceLog = {
  id: string;
  facilityId: string;
  type: ComplianceLogType;
  title: string;
  notes?: string;
  createdAt: string;
  createdBy: { userId: string; email?: string; name?: string };
  // Optional attachments later
  // attachments?: { id: string; url: string; name: string }[];
};
