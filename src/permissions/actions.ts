export type FacilityAction =
  // Tasks
  | "task.view"
  | "task.create"
  | "task.edit"
  | "task.assign"
  | "task.complete"

  // Team
  | "team.view"
  | "team.invite"
  | "team.role.change"
  | "team.remove"

  // Compliance
  | "compliance.view"
  | "compliance.create"
  | "compliance.signoff"
  | "compliance.export"

  // Admin / Settings
  | "facility.settings.view"
  | "facility.settings.edit";
