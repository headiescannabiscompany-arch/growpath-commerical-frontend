import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import ResultQuestionCard from "../ResultQuestionCard";

describe("ResultQuestionCard", () => {
  it("keeps blank submissions disabled and explains the AI credit", () => {
    const onSubmit = jest.fn();
    const screen = render(
      <ResultQuestionCard sourceKey="run-1" suggestions={[]} onSubmit={onSubmit} />
    );

    expect(screen.getByText("Ask about this result")).toBeTruthy();
    expect(
      screen.getByText(
        "Sending this follow-up uses 1 AI credit. Choosing or editing a suggestion does not."
      )
    ).toBeTruthy();
    const submit = screen.getByLabelText("Ask AI about this result for 1 AI credit");
    expect(submit.props.accessibilityState).toEqual({ disabled: true, busy: false });
    fireEvent.press(submit);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("fills suggestions for review, submits the edited question, and reports evidence", async () => {
    const onSubmit = jest.fn().mockResolvedValue({
      answer: "The visible structure is not developed enough to classify yet.",
      providerLabel: "GrowPath context + image review",
      evidenceInspected: true,
      limitations: ["Add a sharp node close-up.", "Use neutral light."]
    });
    const screen = render(
      <ResultQuestionCard
        sourceKey="run-1"
        suggestions={["Male, female, intersex, or unclear?"]}
        onSubmit={onSubmit}
      />
    );

    fireEvent.press(
      screen.getByLabelText("Use suggested question: Male, female, intersex, or unclear?")
    );
    const input = screen.getByLabelText("Ask about this result");
    expect(input.props.value).toBe("Male, female, intersex, or unclear?");
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.changeText(
      input,
      "Male, female, intersex, or still unclear from these photos?"
    );
    fireEvent.press(screen.getByLabelText("Ask AI about this result for 1 AI credit"));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        "Male, female, intersex, or still unclear from these photos?"
      )
    );
    expect(
      await screen.findByText(
        "The visible structure is not developed enough to classify yet."
      )
    ).toBeTruthy();
    expect(screen.getByText("Provider: GrowPath context + image review")).toBeTruthy();
    expect(screen.getByText("Evidence inspected: Yes")).toBeTruthy();
    expect(screen.getByText("- Add a sharp node close-up.")).toBeTruthy();
    expect(screen.getByText("- Use neutral light.")).toBeTruthy();
  });

  it("shows pending and error states", async () => {
    let rejectRequest: (error: Error) => void = () => {};
    const onSubmit = jest.fn(
      () =>
        new Promise<{ answer: string }>((_resolve, reject) => {
          rejectRequest = reject;
        })
    );
    const screen = render(
      <ResultQuestionCard sourceKey="run-1" suggestions={[]} onSubmit={onSubmit} />
    );

    fireEvent.changeText(
      screen.getByLabelText("Ask about this result"),
      "What is missing?"
    );
    fireEvent.press(screen.getByLabelText("Ask AI about this result for 1 AI credit"));

    expect(screen.getByText("Asking AI about this result...")).toBeTruthy();
    expect(
      screen.getByLabelText("Ask AI about this result for 1 AI credit").props
        .accessibilityState
    ).toEqual({ disabled: true, busy: true });

    rejectRequest(new Error("The image review service is unavailable."));
    expect(
      await screen.findByText("The image review service is unavailable.")
    ).toBeTruthy();
    await waitFor(() =>
      expect(
        screen.getByLabelText("Ask AI about this result for 1 AI credit").props
          .accessibilityState
      ).toEqual({ disabled: false, busy: false })
    );
  });

  it("preserves state across prop updates and resets it only for a new source", async () => {
    const firstSubmit = jest.fn().mockResolvedValue({
      answer: "Inspect the leaf underside.",
      evidenceInspected: false
    });
    const screen = render(
      <ResultQuestionCard
        sourceKey="run-1"
        suggestions={["What should I photograph next?"]}
        onSubmit={firstSubmit}
      />
    );

    fireEvent.changeText(
      screen.getByLabelText("Ask about this result"),
      "What should I photograph next?"
    );
    fireEvent.press(screen.getByLabelText("Ask AI about this result for 1 AI credit"));
    expect(await screen.findByText("Inspect the leaf underside.")).toBeTruthy();
    expect(screen.getByText("Provider: Not reported")).toBeTruthy();
    expect(screen.getByText("Evidence inspected: No")).toBeTruthy();

    screen.rerender(
      <ResultQuestionCard
        sourceKey="run-1"
        suggestions={["What visible evidence supports this?"]}
        onSubmit={jest.fn()}
      />
    );
    expect(screen.getByLabelText("Ask about this result").props.value).toBe(
      "What should I photograph next?"
    );
    expect(screen.getByText("Inspect the leaf underside.")).toBeTruthy();

    screen.rerender(
      <ResultQuestionCard
        sourceKey="run-2"
        suggestions={["What visible evidence supports this?"]}
        onSubmit={jest.fn()}
      />
    );
    await waitFor(() =>
      expect(screen.getByLabelText("Ask about this result").props.value).toBe("")
    );
    expect(screen.queryByText("Inspect the leaf underside.")).toBeNull();
  });
});
