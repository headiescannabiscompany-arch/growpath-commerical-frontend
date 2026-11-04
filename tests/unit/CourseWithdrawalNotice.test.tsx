import React from "react";
import { act, fireEvent, render } from "@testing-library/react-native";
import { apiRequest } from "@/api/apiRequest";
import { sendCourseWithdrawal, type CourseWithdrawalInput } from "@/api/courseWithdrawal";
import Form from "@/components/support/CourseWithdrawalNoticeForm";
import Page from "@/app/course-withdrawal";
import Terms from "@/app/terms";
import Support from "@/app/support";
jest.mock("@/api/apiRequest", () => ({ apiRequest: jest.fn() }));
jest.mock("expo-router", () => ({
  Link: ({ children, href }: any) => { const { Text } = require("react-native"); return <Text accessibilityRole="link" testID={`link:${href}`}>{children}</Text>; },
  useLocalSearchParams: () => ({})
}));
jest.mock("@/components/nav/BackButton", () => () => null);
jest.mock("expo-router/head", () => () => null);
jest.mock("@/theme/appTheme", () => {
  const actual = jest.requireActual("@/theme/appTheme");
  return { ...actual, useAppTheme: () => ({ palette: actual.getThemePalette("night", "dark") }) };
});
const api = apiRequest as jest.Mock;
const originalCrypto = Object.getOwnPropertyDescriptor(globalThis, "crypto");
const newId = jest.fn(() => "a0000000-0000-4000-8000-000000000001");
beforeAll(() => { Object.defineProperty(globalThis, "crypto", { configurable: true, value: { randomUUID: newId } }); });
afterAll(() => {
  if (originalCrypto) Object.defineProperty(globalThis, "crypto", originalCrypto);
  else Reflect.deleteProperty(globalThis, "crypto");
});
const INPUT: CourseWithdrawalInput = { requestId: "a0000000-0000-4000-8000-000000000001", name: "Synthetic learner",
  email: "synthetic@example.invalid", contractReference: "#ORDER-1", confirmed: true };
const ID = "b".repeat(24), AT = "2026-11-04T15:00:00.000Z";
const receipt = (input = INPUT) => ({ received: true, receiptId: ID, receivedAt: AT,
  name: input.name, email: input.email, contractReference: input.contractReference,
  receiptText: `Synthetic acknowledgement ${ID}\nReceived: ${AT}\n${input.name}\n${input.email}\n${input.contractReference}`,
  emailStatus: "sent" });
beforeEach(() => {
  jest.clearAllMocks();
  // The project's resetMocks setting clears implementations before each case.
  newId.mockReturnValue(INPUT.requestId);
  api.mockImplementation(async (_url, options) => receipt(options.body));
});
const press = async (view: ReturnType<typeof render>, title: string) => act(async () => { fireEvent.press(view.getByText(title)); });
const fill = (view: ReturnType<typeof render>) => {
  fireEvent.changeText(view.getByLabelText("Consumer name"), INPUT.name);
  fireEvent.changeText(view.getByLabelText("Acknowledgement email"), INPUT.email);
  fireEvent.changeText(view.getByLabelText("Course contract reference"), INPUT.contractReference);
};
const review = async (view: ReturnType<typeof render>) => { fill(view); await press(view, "Withdraw from course contract / Vertrag widerrufen"); };
const confirm = async (view: ReturnType<typeof render>) => press(view, "Confirm withdrawal / Widerruf bestätigen");

describe("R09 course withdrawal customer flow", () => {
  it("requires details and an explicit confirmation, without a reason or request on review", async () => {
    const view = render(<Page />);await press(view, "Withdraw from course contract / Vertrag widerrufen");
    expect(api).not.toHaveBeenCalled();expect(newId).not.toHaveBeenCalled();
    await review(view);expect(view.getByText("I withdraw from the course contract identified above.")).toBeTruthy();expect(api).not.toHaveBeenCalled();
  });
  it("submits exactly the reviewed statement and displays the received acknowledgement", async () => {
    const view = render(<Form />);await review(view);await confirm(view);
    expect(api).toHaveBeenCalledWith("/api/support/course-withdrawal", { method: "POST", auth: false, body: INPUT });
    expect(view.getByText("Withdrawal notice received")).toBeTruthy();expect(view.getByText(receipt().receiptText)).toBeTruthy();expect(api).toHaveBeenCalledTimes(1);
  });
  it("recovers uncertain intake with the same request and locked original payload", async () => {
    api.mockRejectedValueOnce(new Error("synthetic uncertainty"));const view = render(<Form />);
    await review(view);await confirm(view);expect(view.queryByText("Edit notice")).toBeNull();
    await press(view, "Retry the same withdrawal notice");
    expect(api.mock.calls[0][1].body).toEqual(api.mock.calls[1][1].body);expect(newId).toHaveBeenCalledTimes(1);expect(view.getByText("Withdrawal notice received")).toBeTruthy();
  });
  it("does not duplicate a pending confirmation", async () => {
    let resolve!: (value: any) => void;api.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    const view = render(<Form />);await review(view);
    await act(async () => { fireEvent.press(view.getByText("Confirm withdrawal / Widerruf bestätigen"));fireEvent.press(view.getByText("Confirm withdrawal / Widerruf bestätigen")); });
    expect(api).toHaveBeenCalledTimes(1);await act(async () => resolve(receipt()));
  });
  it("keeps a saveable receipt when email is uncertain without automatic retry", async () => {
    api.mockResolvedValueOnce({ ...receipt(), emailStatus: "unknown" });const view = render(<Form />);await review(view);await confirm(view);
    expect(view.getByText(/Email acknowledgement was not confirmed/)).toBeTruthy();expect(view.getByText("Save acknowledgement")).toBeTruthy();expect(view.getByText(receipt().receiptText).props.selectable).toBe(true);expect(api).toHaveBeenCalledTimes(1);
  });
  it("allows correction before confirmation without retaining a stale draft request", async () => {
    const view = render(<Form />);await review(view);await press(view, "Edit notice");
    fireEvent.changeText(view.getByLabelText("Course contract reference"), "#ORDER-CORRECTED");
    await press(view, "Withdraw from course contract / Vertrag widerrufen");await confirm(view);
    expect(api.mock.calls[0][1].body.contractReference).toBe("#ORDER-CORRECTED");expect(newId).toHaveBeenCalledTimes(1);
  });
  it("makes the withdrawal function discoverable in Terms and Support", () => {
    const terms = render(<Terms />);expect(terms.getByTestId("link:/course-withdrawal")).toBeTruthy();terms.unmount();
    const support = render(<Support />);expect(support.getByTestId("link:/course-withdrawal")).toBeTruthy();expect(api).not.toHaveBeenCalled();
  });
  it("rejects a reply for different submitted contact or contract details", async () => {
    api.mockResolvedValueOnce({ ...receipt(), email: "other@example.invalid" });await expect(sendCourseWithdrawal(INPUT)).rejects.toThrow("Withdrawal outcome unknown");
  });
  it("rejects an invalid or back-formatted receipt date", async () => {
    api.mockResolvedValueOnce({ ...receipt(), receivedAt: "November 4, 2026" });await expect(sendCourseWithdrawal(INPUT)).rejects.toThrow("Withdrawal outcome unknown");
  });
  it("projects acknowledgement data without provider or unrelated private fields", async () => {
    api.mockResolvedValueOnce({ ...receipt(), providerMessageId: "PRIVATE-ID", recipientEmail: "PRIVATE-RECIPIENT" });
    const result = await sendCourseWithdrawal(INPUT);expect(JSON.stringify(result)).not.toContain("PRIVATE");
  });
});
