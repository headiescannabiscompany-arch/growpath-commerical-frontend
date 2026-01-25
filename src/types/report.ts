export type FacilityReport = {
  facilityId: string;
  tasks: {
    total: number;
    open: number;
    overdue: number;
    completedLast7d: number;
  };
  compliance: {
    totalLogs: number;
    missedLast7d: number;
    byType: Record<string, number>;
  };
  automation: {
    policiesEnabled: number;
    triggersLast7d: number;
  };
  team: {
    totalMembers: number;
    byRole: Record<string, number>;
  };
};
