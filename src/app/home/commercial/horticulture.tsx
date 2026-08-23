import { COMMERCIAL_BUSINESS_DESK_WORKSPACE } from "@/api/businessDesk";
import HorticultureOperationsScreen from "@/features/horticulture/HorticultureOperationsScreen";

export default function CommercialHorticultureRoute() {
  return (
    <HorticultureOperationsScreen
      workspace={COMMERCIAL_BUSINESS_DESK_WORKSPACE}
      workspaceLabel="Commercial"
    />
  );
}
