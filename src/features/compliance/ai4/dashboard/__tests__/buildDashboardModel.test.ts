import { buildDashboardModel } from "../buildDashboardModel";

describe("buildDashboardModel (drift-stopper)", () => {
  test("sort order is deterministic for openDeviations, recurringDeviations, recommendedSops", () => {
    const nowISO = "2026-02-08T12:00:00.000Z";
    const model = buildDashboardModel({
      facilityId: "FAC_A",
      nowISO,
      reports: [],
      comparisons: [],
      deviationsSummary: {
        success: true,
        facilityId: "FAC_A",
        recurringDeviations: [
          {
            code: "B",
            label: "B",
            count: 2,
            lastSeenAt: "2026-02-01T00:00:00.000Z",
            severity: "MED"
          },
          {
            code: "A",
            label: "A",
            count: 2,
            lastSeenAt: "2026-02-02T00:00:00.000Z",
            severity: "MED"
          },
          {
            code: "C",
            label: "C",
            count: 5,
            lastSeenAt: "2026-01-01T00:00:00.000Z",
            severity: "LOW"
          }
        ],
        openDeviations: [
          {
            id: "2",
            code: "X",
            label: "X",
            openedAt: "2026-02-01T00:00:00.000Z",
            severity: "LOW"
          },
          {
            id: "1",
            code: "X",
            label: "X",
            openedAt: "2026-02-08T00:00:00.000Z",
            severity: "HIGH"
          },
          {
            id: "3",
            code: "X",
            label: "X",
            openedAt: "2026-02-08T00:00:00.000Z",
            severity: "HIGH"
          },
          {
            id: "4",
            code: "X",
            label: "X",
            openedAt: "2026-02-07T00:00:00.000Z",
            severity: "MED"
          }
        ]
      },
      sopsRecommended: {
        success: true,
        facilityId: "FAC_A",
        recommendedSops: [
          { sopId: "SOP_2", title: "Dry Room Airflow", reason: "x" },
          { sopId: "SOP_1", title: "Clone Hygiene", reason: "x" },
          { sopId: "SOP_3", title: "Clone Hygiene", reason: "x" }
        ]
      }
    } as any);

    // Adjust paths to wherever these arrays live in your model contract:
    // For this example, assume actionQueue is a flat array with kind/meta fields
    const open = model.actionQueue.filter((a: any) =>
      a.label.startsWith("Investigate deviation")
    );
    const recurring = model.actionQueue.filter((a: any) =>
      a.label.startsWith("Recurring deviation")
    );
    const sops = model.actionQueue.filter((a: any) => a.label.startsWith("Review SOP"));

    // openDeviations: HIGH→MED→LOW, openedAt desc, id asc
    expect(open.map((x: any) => x.targetId)).toEqual(["1", "3", "4", "2"]);

    // recurringDeviations: count desc, lastSeenAt desc, code asc
    expect(recurring.map((x: any) => x.targetId)).toEqual(["C", "A", "B"]);

    // recommendedSops: title asc, sopId asc
    expect(sops.map((x: any) => x.targetId)).toEqual(["SOP_1", "SOP_3", "SOP_2"]);
  });

  test("golden snapshot: model output is stable", () => {
    const nowISO = "2026-02-08T12:00:00.000Z";
    const model = buildDashboardModel({
      facilityId: "FAC_A",
      nowISO,
      reports: [],
      comparisons: [],
      deviationsSummary: {
        success: true,
        facilityId: "FAC_A",
        recurringDeviations: [],
        openDeviations: []
      },
      sopsRecommended: {
        success: true,
        facilityId: "FAC_A",
        recommendedSops: []
      }
    } as any);
    expect(model).toMatchSnapshot();
  });
});
