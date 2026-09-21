import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import ReportModal from "@/components/ReportModal";

const mockSubmitReport = jest.fn();
jest.mock("@/api/reports", () => ({
  submitReport: (...args: any[]) => mockSubmitReport(...args)
}));
jest.mock("@/components/ReportBugButton", () => () => null);

const restrictedChoices = [
  ["Suspected child exploitation", "child_exploitation"],
  ["Suspected human trafficking", "human_trafficking"],
  ["Repeated hard-drug sales", "repeated_hard_drug_sales"],
  ["Imminent threat of harm", "imminent_threat"]
];

function setup() {
  const onClose = jest.fn();
  const screen = render(
    <ReportModal
      visible
      onClose={onClose}
      onSuccess={jest.fn()}
      contentType="growTimelinePublicCopy"
      contentId="synthetic-timeline"
      contentTitle="Synthetic QA only"
      targetUrl="/grow-timeline/synthetic"
    />
  );
  return { ...screen, onClose };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSubmitReport.mockResolvedValue({ ok: true });
});

describe("explicit restricted safety report routing", () => {
  it.each(restrictedChoices)(
    "submits %s as its exact backend category",
    async (label, category) => {
      const screen = setup();
      fireEvent.press(screen.getByText(label));
      expect(screen.getByText(/does not contact law enforcement/i)).toBeTruthy();
      fireEvent.changeText(
        screen.getByLabelText("Report reason"),
        "SYNTHETIC QA ONLY: no real incident or allegation."
      );
      fireEvent.press(screen.getByLabelText("Submit"));
      await waitFor(() => expect(screen.onClose).toHaveBeenCalledTimes(1));
      expect(mockSubmitReport).toHaveBeenCalledTimes(1);
      expect(mockSubmitReport).toHaveBeenCalledWith(
        expect.objectContaining({
          category,
          contentType: "growTimelinePublicCopy",
          contentId: "synthetic-timeline"
        })
      );
    }
  );

  it.each([
    ["Exploitation", "exploitation"],
    ["Immediate danger", "danger"],
    ["Illegal sales", "illegal_sales"]
  ])("does not silently reclassify the existing %s choice", async (label, category) => {
    const screen = setup();
    fireEvent.press(screen.getByText(label));
    fireEvent.changeText(
      screen.getByLabelText("Report reason"),
      "Synthetic existing-category check."
    );
    fireEvent.press(screen.getByLabelText("Submit"));
    await waitFor(() => expect(screen.onClose).toHaveBeenCalledTimes(1));
    expect(mockSubmitReport).toHaveBeenCalledWith(expect.objectContaining({ category }));
  });

  it("selecting a restricted category alone sends nothing and still requires a reason", () => {
    const screen = setup();
    fireEvent.press(screen.getByText(restrictedChoices[0][0]));
    expect(screen.getByLabelText("Submit").props.accessibilityState.disabled).toBe(true);
    fireEvent.press(screen.getByLabelText("Cancel"));
    expect(screen.onClose).toHaveBeenCalledTimes(1);
    expect(mockSubmitReport).not.toHaveBeenCalled();
  });
});
