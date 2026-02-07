// src/types/contracts.ts
// Canonical contract types (Phase 2.3 - additive, minimal)
// These types exist to stop drift and unblock typing, not to "design the universe"

export type ID = string;

export type ApiError = { code: string; message: string };
export type ApiErrorEnvelope = { error: ApiError };

export type FacilityRole = "OWNER" | "MANAGER" | "STAFF" | "VIEWER";

export type Facility = {
  id: ID;
  name?: string;
};

export type TeamMember = {
  userId: ID;
  role: FacilityRole;
  name?: string;
  email?: string; // Phase 2.3.3
};

export type Plant = {
  id: ID;
  name?: string;
  growId?: ID;
  daysInStage?: number;
  stage?: string; // Phase 2.3.3
  roomId?: ID; // Phase 2.3.3
};

export type Grow = {
  id: ID;
  name?: string;
  yield?: number;
  notes?: string;
  startedAt?: string; // Phase 2.3.3
  endedAt?: string | null; // Phase 2.3.3
};

export type AuditLog = {
  timestamp: string; // ISO
  userName: string;
  action: string;
  details?: string;
};

export type TaskStats = {
  perDay?: number; // Phase 2.3.3 - TrendsDashboard
  total?: number;
  open?: number;
  overdue?: number;
  completedThisWeek?: number;
  perStaff?: Record<string, number>;
};

// Common route params "escape hatch" (until navigation types formalized)
export type RouteParams = Record<string, string | undefined>;
