import { describe, expect, it } from "@jest/globals";

import {
  buildFeedbackPayload,
  labelsFromText,
  parseFeedbackRating,
  parseJsonObject
} from "../../src/utils/aiValidationLab";

describe("ai validation lab helpers", () => {
  it("parses JSON objects and rejects arrays", () => {
    expect(parseJsonObject('{"humidity":80}', "prediction")).toEqual({
      humidity: 80
    });

    expect(() => parseJsonObject("[1,2]", "prediction")).toThrow(
      "prediction must be a JSON object"
    );
  });

  it("surfaces invalid JSON with a useful error", () => {
    expect(() => parseJsonObject("{", "observed")).toThrow();
  });

  it("enforces feedback rating bounds before sending to the API", () => {
    expect(parseFeedbackRating("4")).toBe(4);
    expect(() => parseFeedbackRating("0")).toThrow(
      "rating must be a number between 1 and 5"
    );
    expect(() => parseFeedbackRating("6")).toThrow(
      "rating must be a number between 1 and 5"
    );
  });

  it("normalizes labels and feedback payload fields", () => {
    expect(labelsFromText(" facility, qa, ,inspection ")).toEqual([
      "facility",
      "qa",
      "inspection"
    ]);

    expect(
      buildFeedbackPayload({
        targetType: " ai_call ",
        targetId: " run-1 ",
        rating: "5",
        comment: " useful ",
        labels: " facility,qa "
      })
    ).toEqual({
      targetType: "ai_call",
      targetId: "run-1",
      rating: 5,
      comment: "useful",
      labels: ["facility", "qa"]
    });
  });

  it("requires feedback target identity", () => {
    expect(() =>
      buildFeedbackPayload({
        targetType: "",
        targetId: "run-1",
        rating: "3",
        comment: "",
        labels: ""
      })
    ).toThrow("targetType is required");
  });
});
