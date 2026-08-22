import { COMMERCIAL_BUSINESS_DESK_WORKSPACE } from "@/api/businessDesk";
import ExpenseReceiptTool from "@/features/businessDesk/ExpenseReceiptTool";

export default function CommercialExpenseReceiptRoute() {
  return (
    <ExpenseReceiptTool
      workspace={COMMERCIAL_BUSINESS_DESK_WORKSPACE}
      workspaceLabel="Commercial"
      basePath="/home/commercial/business-desk"
    />
  );
}
