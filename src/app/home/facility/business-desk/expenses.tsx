import ExpenseReceiptTool from "@/features/businessDesk/ExpenseReceiptTool";
import FacilityBusinessDeskWorkspaceBoundary from "@/features/businessDesk/BusinessDeskWorkspaceBoundary";

export default function FacilityExpenseReceiptRoute() {
  return (
    <FacilityBusinessDeskWorkspaceBoundary>
      {(workspace) => (
        <ExpenseReceiptTool
          workspace={workspace}
          workspaceLabel="Facility"
          basePath="/home/facility/business-desk"
        />
      )}
    </FacilityBusinessDeskWorkspaceBoundary>
  );
}
