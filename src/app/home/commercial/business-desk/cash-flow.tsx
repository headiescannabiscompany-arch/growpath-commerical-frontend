import { COMMERCIAL_BUSINESS_DESK_WORKSPACE } from "@/api/businessDesk";
import CashFlowSnapshotTool from "@/features/businessDesk/CashFlowSnapshotTool";

export default function CommercialCashFlowSnapshotRoute() {
  return (
    <CashFlowSnapshotTool
      workspace={COMMERCIAL_BUSINESS_DESK_WORKSPACE}
      canViewCurrentCash
      workspaceLabel="Commercial"
      basePath="/home/commercial/business-desk"
    />
  );
}
