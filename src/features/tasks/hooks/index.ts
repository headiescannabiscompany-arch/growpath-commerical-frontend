// Phase 2.3.6: Barrel export for tasks hooks
// Re-export from sibling feature areas where task hooks actually live
export * from "../../../hooks/usePersonalTasks";
export * from "../../../hooks/useFacilityTasks";
export { useFacilityTasks as useTasks } from "../../../hooks/useFacilityTasks";
