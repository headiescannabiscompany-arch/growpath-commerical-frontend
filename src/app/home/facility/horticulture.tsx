import FacilityBusinessDeskWorkspaceBoundary from "@/features/businessDesk/BusinessDeskWorkspaceBoundary";
import HorticultureOperationsScreen from "@/features/horticulture/HorticultureOperationsScreen";

export default function FacilityHorticultureRoute() {
  return (
    <FacilityBusinessDeskWorkspaceBoundary>
      {(workspace) => (
        <HorticultureOperationsScreen workspace={workspace} workspaceLabel="Facility" />
      )}
    </FacilityBusinessDeskWorkspaceBoundary>
  );
}
