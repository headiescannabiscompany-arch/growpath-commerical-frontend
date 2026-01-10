/**
 * Facility Data Contracts & Type Definitions
 * Phase 1: Foundation for facility operations
 * 
 * These types ensure consistency across frontend/backend and enable
 * Phase 2+ features to bolt on without interface changes.
 */

// ============================================================
// ENUMS
// ============================================================

export const FacilityRole = {
  OWNER: "OWNER",
  SUPER_ADMIN: "SUPER_ADMIN",
  FACILITY_ADMIN: "FACILITY_ADMIN",
  CULTIVATION_LEAD: "CULTIVATION_LEAD",
  POST_HARVEST_LEAD: "POST_HARVEST_LEAD",
  QA_COMPLIANCE: "QA_COMPLIANCE",
  TECHNICIAN: "TECHNICIAN",
  VIEWER: "VIEWER"
};

export const RoomType = {
  VEGETATIVE: "VEGETATIVE",
  FLOWERING: "FLOWERING",
  CLONE: "CLONE",
  MOTHER: "MOTHER",
  DRY_CURE: "DRY_CURE",
  STORAGE: "STORAGE"
};

export const ZoneType = {
  VEG: "veg",
  FLOWER: "flower",
  MOTHER: "mother",
  CLONE: "clone",
  DRY_CURE: "dry_cure",
  PROCESSING: "processing",
  STORAGE: "storage",
  OTHER: "other"
};

export const TaskStatus = {
  OPEN: "OPEN",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  AWAITING_VERIFY: "AWAITING_VERIFY",
  VERIFIED: "VERIFIED",
  REJECTED: "REJECTED",
  CANCELED: "CANCELED"
};

export const TaskPriority = {
  LOW: "LOW",
  NORMAL: "NORMAL",
  HIGH: "HIGH",
  URGENT: "URGENT"
};

// ============================================================
// ROLE HELPERS
// ============================================================

export const isAdminRole = (role) => {
  return [
    FacilityRole.OWNER,
    FacilityRole.SUPER_ADMIN,
    FacilityRole.FACILITY_ADMIN
  ].includes(role);
};

export const canVerifyTasks = (role) => {
  return [
    FacilityRole.OWNER,
    FacilityRole.SUPER_ADMIN,
    FacilityRole.FACILITY_ADMIN,
    FacilityRole.CULTIVATION_LEAD,
    FacilityRole.POST_HARVEST_LEAD,
    FacilityRole.QA_COMPLIANCE
  ].includes(role);
};

export const canViewReports = (role) => {
  return [
    FacilityRole.OWNER,
    FacilityRole.SUPER_ADMIN,
    FacilityRole.FACILITY_ADMIN,
    FacilityRole.CULTIVATION_LEAD,
    FacilityRole.POST_HARVEST_LEAD,
    FacilityRole.QA_COMPLIANCE
  ].includes(role);
};

export const canManageTeam = (role) => {
  return [
    FacilityRole.OWNER,
    FacilityRole.SUPER_ADMIN,
    FacilityRole.FACILITY_ADMIN,
    FacilityRole.CULTIVATION_LEAD,
    FacilityRole.POST_HARVEST_LEAD,
    FacilityRole.QA_COMPLIANCE
  ].includes(role);
};

export const hasGlobalFacilityAccess = (role) => {
  return [
    FacilityRole.OWNER,
    FacilityRole.SUPER_ADMIN,
    FacilityRole.FACILITY_ADMIN,
    FacilityRole.CULTIVATION_LEAD,
    FacilityRole.POST_HARVEST_LEAD,
    FacilityRole.QA_COMPLIANCE
  ].includes(role);
};

export const canCompleteTasks = (role) => {
  return role !== FacilityRole.VIEWER;
};

export const canCreateDeviations = (role) => {
  return role !== FacilityRole.VIEWER;
};

// ============================================================
// PHASE 1 ENTITIES
// ============================================================

/**
 * @typedef {Object} Facility
 * @property {string} _id - MongoDB ObjectId
 * @property {string} name - Facility name
 * @property {string} [address] - Physical address
 * @property {string} [licenseNumber] - State license number
 * @property {string} [metrcLicenseNumber] - Metrc facility license (if assigned)
 * @property {Object} [defaultUnits] - Metric defaults for Maryland
 * @property {string} createdByUserId - User who created facility
 * @property {Date} createdAt - Creation timestamp
 * @property {Date} [updatedAt] - Last update timestamp
 */

/**
 * @typedef {Object} Zone
 * @property {string} _id - MongoDB ObjectId
 * @property {string} facilityId - Parent facility ID
 * @property {string} name - Zone name
 * @property {ZoneType} zoneType - Zone type (veg, flower, dry_cure, etc.)
 * @property {string} [notes] - Optional notes
 * @property {boolean} [isActive]
 * @property {Date} createdAt
 * @property {Date} [updatedAt]
 */

/**
 * @typedef {Object} Room
 * @property {string} _id - MongoDB ObjectId
 * @property {string} facilityId - Parent facility ID
 * @property {string} [zoneId] - Optional Zone grouping
 * @property {string} name - Room name/identifier
 * @property {RoomType} roomType - Room type enum
 * @property {RoomSize} [size] - Room dimensions
 * @property {EnvironmentalBaselines} [baselines] - Target environmental ranges
 * @property {string} [rackLabel] - Optional rack identifier
 * @property {string} [tableLabel] - Optional table/bench identifier
 * @property {string} [batchId] - Internal batch/cycle id
 * @property {string} [lotId] - Harvest lot identifier
 * @property {string} [metrcPackageId] - Metrc package identifier
 * @property {Date} [lastActivityAt] - Last logged activity timestamp
 * @property {string} [currentStage] - Current cultivation stage
 * @property {string} [notes] - Admin notes
 * @property {Date} createdAt - Creation timestamp
 * @property {Date} [updatedAt] - Last update timestamp
 */

/**
 * @typedef {Object} RoomSize
 * @property {number} length - Room length
 * @property {number} width - Room width
 * @property {string} unit - Measurement unit (ft, m)
 */

/**
 * @typedef {Object} EnvironmentalBaselines
 * @property {TemperatureRange} [temperature] - Temperature targets
 * @property {HumidityRange} [humidity] - Humidity targets
 * @property {VPDBaseline} [vpd] - VPD targets in kPa
 * @property {CO2Target} [co2] - CO2 concentration target
 * @property {PPFDTarget} [ppfd] - Light intensity target
 */

/**
 * @typedef {Object} TemperatureRange
 * @property {number} min - Minimum temperature
 * @property {number} max - Maximum temperature
 * @property {string} unit - Temperature unit (F, C)
 */

/**
 * @typedef {Object} HumidityRange
 * @property {number} min - Minimum humidity %
 * @property {number} max - Maximum humidity %
 * @property {string} unit - Always "%" (for consistency)
 */

/**
 * @typedef {Object} VPDBaseline
 * @property {number} target - Target VPD value
 * @property {string} unit - Always "kPa"
 */

/**
 * @typedef {Object} PPFDTarget
 * @property {number} target - Target PPFD value
 * @property {string} unit - Always "µmol/m²/s"
 */

/**
 * @typedef {Object} CO2Target
 * @property {number} target - Target CO2 ppm
 * @property {string} unit - Always "ppm"
 */

/**
 * @typedef {Object} UserFacilityAccess
 * @property {string} facilityId - Facility ID
 * @property {string} facilityName - Facility display name
 * @property {FacilityRole} role - User's role in this facility
 * @property {string[]} [roomIds] - Room IDs (if TECHNICIAN with scoped access)
 */

/**
 * @typedef {Object} UserFacilityRole
 * Backend model mapping user to facility + role
 * @property {string} _id - MongoDB ObjectId
 * @property {string} userId - User ID
 * @property {string} facilityId - Facility ID
 * @property {FacilityRole} role - Assigned role
 * @property {Date} createdAt - Role assignment date
 */

/**
 * @typedef {Object} UserRoomAccess
 * Backend model for tech room scoping (optional)
 * @property {string} _id - MongoDB ObjectId
 * @property {string} userId - User ID
 * @property {string} facilityId - Facility ID
 * @property {string} roomId - Room ID
 * @property {Date} createdAt - Access grant date
 */

// ============================================================
// PHASE 2+ ENTITIES (SCAFFOLD NOW)
// ============================================================

/**
 * @typedef {Object} TaskInstance
 * @property {string} _id - MongoDB ObjectId
 * @property {string} facilityId - Parent facility
 * @property {string} roomId - Target room
 * @property {string} [batchCycleId] - Optional batch cycle reference (Phase 4+)
 * @property {string} [sopTemplateId] - Optional SOP template reference
 * @property {string} title - Task name
 * @property {string} [description] - Task details
 * @property {string} [assignedToUserId] - Assigned user (null = unassigned)
 * @property {string} createdByUserId - Creator user ID
 * @property {TaskStatus} status - Current task status
 * @property {TaskPriority} [priority] - Task priority (default: NORMAL)
 * @property {Date} [dueAt] - Due date/time
 * @property {Date} [completedAt] - Completion timestamp
 * @property {Date} [verifiedAt] - Verification timestamp
 * @property {boolean} verificationRequired - Whether task needs verification
 * @property {TaskInput[]} [requiredInputs] - Input fields + captured values
 * @property {string[]} [photos] - Photo URLs
 * @property {string} [rejectionReason] - If status === REJECTED
 * @property {Date} createdAt - Creation timestamp
 * @property {Date} [updatedAt] - Last update timestamp
 */

/**
 * @typedef {Object} TaskInput
 * @property {string} field - Input field name
 * @property {string} type - Input type (number, text, dropdown, checkbox)
 * @property {string} [unit] - Unit for numeric inputs (g, L, °F, etc.)
 * @property {any} value - Captured value
 * @property {boolean} required - Whether input is required
 */

/**
 * @typedef {Object} SOPTemplate
 * Phase 2: Reusable task templates
 * @property {string} _id
 * @property {string} facilityId
 * @property {string} title
 * @property {string} category - (watering, feeding, IPM, etc.)
 * @property {string} [description]
 * @property {TaskInput[]} requiredInputs
 * @property {boolean} verificationRequired
 * @property {number} [estimatedDurationMinutes]
 * @property {Date} createdAt
 */

/**
 * @typedef {Object} Deviation
 * Phase 4: Track issues and corrective actions
 * @property {string} _id
 * @property {string} facilityId
 * @property {string} roomId
 * @property {string} [taskId] - Related task if created from task
 * @property {string} reportedByUserId
 * @property {string} title
 * @property {string} description
 * @property {string} severity - (LOW, MEDIUM, HIGH, CRITICAL)
 * @property {string} status - (OPEN, IN_PROGRESS, RESOLVED)
 * @property {string} [correctiveAction] - What was done to fix
 * @property {string} [resolvedByUserId]
 * @property {Date} [resolvedAt]
 * @property {Date} createdAt
 */

/**
 * @typedef {Object} ShiftHandoffNote
 * Phase 2: Shift-to-shift communication
 * @property {string} _id
 * @property {string} facilityId
 * @property {string} userId - Author
 * @property {string} message
 * @property {Date} createdAt
 */

// ============================================================
// API RESPONSE TYPES
// ============================================================

/**
 * @typedef {Object} ApiResponse
 * @property {any} [data] - Response data if successful
 * @property {string} [error] - Error message if failed
 * @property {boolean} [success] - Success indicator
 */

/**
 * @typedef {Object} PaginatedResponse
 * @property {any[]} data - Array of results
 * @property {number} page - Current page number
 * @property {number} pageSize - Items per page
 * @property {number} total - Total result count
 * @property {number} totalPages - Total page count
 */

/**
 * @typedef {Object} TaskFilters
 * @property {string} [facilityId] - Filter by facility
 * @property {string} [roomId] - Filter by room
 * @property {string} [assignedToUserId] - Filter by assignee
 * @property {TaskStatus} [status] - Filter by status
 * @property {TaskPriority} [priority] - Filter by priority
 * @property {boolean} [unassignedOnly] - Show only unassigned tasks
 * @property {boolean} [verificationRequired] - Show only tasks needing verify
 * @property {Date} [dueBefore] - Due before date
 * @property {Date} [dueAfter] - Due after date
 */

// ============================================================
// UI STATE TYPES
// ============================================================

/**
 * @typedef {Object} FacilityContextState
 * State managed by AuthContext for facility mode
 * @property {"personal" | "facility"} mode - Current app mode
 * @property {string | null} selectedFacilityId - Active facility ID
 * @property {UserFacilityAccess[]} facilitiesAccess - User's facility access list
 */

/**
 * @typedef {Object} RoomAlert
 * UI-level alert for room flags
 * @property {string} roomId
 * @property {string} roomName
 * @property {string} alertType - (overdue_tasks, no_activity, deviation, env_out_of_range)
 * @property {string} message
 * @property {string} severity - (info, warning, error)
 */

// ============================================================
// VALIDATION HELPERS
// ============================================================

export const isValidRoomType = (type) => {
  return Object.values(RoomType).includes(type);
};

export const isValidTaskStatus = (status) => {
  return Object.values(TaskStatus).includes(status);
};

export const isValidFacilityRole = (role) => {
  return Object.values(FacilityRole).includes(role);
};

export const isValidZoneType = (type) => {
  return Object.values(ZoneType).includes(type);
};

// ============================================================
// DISPLAY HELPERS
// ============================================================

export const getRoleDisplayName = (role) => {
  const names = {
    [FacilityRole.OWNER]: "Owner",
    [FacilityRole.SUPER_ADMIN]: "Super Admin",
    [FacilityRole.FACILITY_ADMIN]: "Facility Admin",
    [FacilityRole.CULTIVATION_LEAD]: "Cultivation Lead",
    [FacilityRole.POST_HARVEST_LEAD]: "Post-Harvest Lead",
    [FacilityRole.QA_COMPLIANCE]: "QA/Compliance",
    [FacilityRole.TECHNICIAN]: "Technician",
    [FacilityRole.VIEWER]: "Viewer"
  };
  return names[role] || role;
};

export const getRoomTypeDisplayName = (type) => {
  const names = {
    [RoomType.VEGETATIVE]: "Vegetative",
    [RoomType.FLOWERING]: "Flowering",
    [RoomType.CLONE]: "Clone/Propagation",
    [RoomType.MOTHER]: "Mother Plants",
    [RoomType.DRY_CURE]: "Dry & Cure",
    [RoomType.STORAGE]: "Storage"
  };
  return names[type] || type;
};

export const getTaskStatusDisplayName = (status) => {
  const names = {
    [TaskStatus.OPEN]: "Open",
    [TaskStatus.IN_PROGRESS]: "In Progress",
    [TaskStatus.COMPLETED]: "Completed",
    [TaskStatus.AWAITING_VERIFY]: "Awaiting Verification",
    [TaskStatus.VERIFIED]: "Verified",
    [TaskStatus.REJECTED]: "Rejected",
    [TaskStatus.CANCELED]: "Canceled"
  };
  return names[status] || status;
};

export const getTaskPriorityDisplayName = (priority) => {
  const names = {
    [TaskPriority.LOW]: "Low",
    [TaskPriority.NORMAL]: "Normal",
    [TaskPriority.HIGH]: "High",
    [TaskPriority.URGENT]: "Urgent"
  };
  return names[priority] || priority;
};

// ============================================================
// EXPORTS
// ============================================================

export default {
  FacilityRole,
  RoomType,
  ZoneType,
  TaskStatus,
  TaskPriority,
  isAdminRole,
  canVerifyTasks,
  canViewReports,
  canManageTeam,
  hasGlobalFacilityAccess,
  canCompleteTasks,
  canCreateDeviations,
  isValidRoomType,
  isValidZoneType,
  isValidTaskStatus,
  isValidFacilityRole,
  getRoleDisplayName,
  getRoomTypeDisplayName,
  getTaskStatusDisplayName,
  getTaskPriorityDisplayName
};
