export type AutomationType =
  | "TASK_OVERDUE_ESCALATION"
  | "TASK_STALE_REMINDER"
  | "COMPLIANCE_DAILY_REQUIRED"
  | "COMPLIANCE_WEEKLY_REQUIRED"
  | string;

export type AutomationPolicy = {
  id: string;
  facilityId: string;
  type: AutomationType;
  name: string;
  description?: string;
  enabled: boolean;
  trigger?: {
    source?: string;
    eventType?: string;
  };
  conditions?: Array<Record<string, any>>;
  actions?: Array<Record<string, any>>;
  config: Record<string, any>;
  lastTriggeredAt?: string | null;
  lastTriggeredByUserId?: string | null;
  triggerCount?: number;
  createdAt: string;
  updatedAt: string;
};
