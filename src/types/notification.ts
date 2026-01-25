export type NotificationType =
  | "TASK_ASSIGNED"
  | "TASK_OVERDUE"
  | "COMPLIANCE_REQUIRED"
  | "COMPLIANCE_MISSED"
  | "AUTOMATION_TRIGGERED"
  | "TEAM_INVITE";

export type Notification = {
  id: string;
  facilityId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  metadata?: Record<string, any>;
};
