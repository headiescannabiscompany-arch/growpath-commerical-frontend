import { reviewFeedingSchedule } from "@/features/personal/tools/feedingScheduleReview";

describe("reviewFeedingSchedule", () => {
  it("flags high-risk late flower schedules with EC and pH drift", () => {
    const review = reviewFeedingSchedule({
      productName: "Bloom Line",
      medium: "coco",
      stage: "late_flower",
      inputEC: 2.8,
      runoffEC: 4.1,
      inputPH: 7,
      runoffPH: 6.3,
      waterSource: "well",
      schedule: [
        {
          week: 9,
          stage: "late flower",
          amount: "heavy grow nitrogen feed"
        }
      ]
    });

    expect(review.riskLevel).toBe("high");
    expect(review.warnings).toEqual(
      expect.arrayContaining([
        "Late flower/ripening schedules should avoid heavy late nitrogen or high EC unless intentionally justified.",
        "Coco/hydro-style feeding should track runoff or root-zone EC trends, not just input schedule.",
        "Input EC is high for many cultivars/stages. Confirm tolerance before applying.",
        "Runoff EC is materially higher than input EC; review buildup before increasing feed.",
        "Input pH is outside a common fertigation target range. Verify medium-specific targets.",
        "Runoff pH drift is large enough to trend before changing feed strength.",
        "City/well water may contain alkalinity or minerals that change pH/EC interpretation."
      ])
    );
    expect(review.tasksToCreate[0]).toMatchObject({
      title: "Review feeding schedule before applying",
      priority: "high"
    });
  });

  it("keeps low-risk schedules cautious instead of pretending they are exact", () => {
    const review = reviewFeedingSchedule({
      productName: "Base",
      medium: "soil",
      stage: "veg",
      schedule: [{ week: 2, stage: "veg", amount: "light feed" }]
    });

    expect(review.riskLevel).toBe("low");
    expect(review.recommendations).toContain(
      "Do not treat a generated schedule as a product label replacement."
    );
  });
});
