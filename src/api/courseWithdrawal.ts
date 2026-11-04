import { apiRequest } from "./apiRequest";
export type CourseWithdrawalInput = {
  requestId: string; name: string; email: string; contractReference: string; confirmed: true;
};
export type CourseWithdrawalReceipt = {
  received: true; receiptId: string; receivedAt: string; name: string; email: string;
  contractReference: string; receiptText: string; emailStatus: "sent" | "not_sent" | "unknown";
};
export async function sendCourseWithdrawal(input: CourseWithdrawalInput): Promise<CourseWithdrawalReceipt> {
  const result = await apiRequest("/api/support/course-withdrawal", {
    method: "POST", auth: false, body: { ...input }
  }) as CourseWithdrawalReceipt;
  if (result?.received !== true || typeof result.receiptId !== "string" || !/^[a-f0-9]{24}$/.test(result.receiptId) ||
      typeof result.receivedAt !== "string" || !Number.isFinite(Date.parse(result.receivedAt)) ||
      new Date(result.receivedAt).toISOString() !== result.receivedAt ||
      result.name !== input.name || result.email !== input.email || result.contractReference !== input.contractReference ||
      typeof result.receiptText !== "string" || !result.receiptText.includes(result.receiptId) ||
      !result.receiptText.includes(result.receivedAt) || result.receiptText.length > 4000 ||
      ![input.name, input.email, input.contractReference].every((text) => result.receiptText.includes(text)) ||
      !["sent", "not_sent", "unknown"].includes(result.emailStatus))
    throw new Error("Withdrawal outcome unknown");
  return { received: true, receiptId: result.receiptId, receivedAt: result.receivedAt,
    name: result.name, email: result.email, contractReference: result.contractReference,
    receiptText: result.receiptText, emailStatus: result.emailStatus };
}
