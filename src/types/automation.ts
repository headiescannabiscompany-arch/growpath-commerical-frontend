export type AutomationType =
  | "TASK_OVERDUE_ESCALATION"
  | "TASK_STALE_REMINDER"
  | "COMPLIANCE_DAILY_REQUIRED"
  | "COMPLIANCE_WEEKLY_REQUIRED";

export type AutomationPolicy = {
  id: string;
  facilityId: string;
  type: AutomationType;
  enabled: boolean;
  config: Record<string, any>;
  createdAt: string;
  updatedAt: string;
};
