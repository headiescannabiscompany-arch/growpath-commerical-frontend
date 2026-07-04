import { apiRequest } from "../apiRequest";
import {
  createGrowpathModuleRecord,
  listGrowpathModuleRecords,
  updateGrowpathModuleRecord
} from "../growpathModules";

jest.mock("../apiRequest", () => ({
  apiRequest: jest.fn()
}));

const mockApiRequest = apiRequest as jest.MockedFunction<typeof apiRequest>;

describe("growpathModules API", () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
  });

  test("lists durable module records through the shared endpoint", async () => {
    mockApiRequest.mockResolvedValueOnce({
      items: [
        {
          _id: "record-1",
          recordType: "pheno_hunt",
          title: "Sour Diesel hunt",
          warnings: ["Missing flower score"],
          tags: ["early_sex"]
        }
      ]
    });

    const records = await listGrowpathModuleRecords({
      recordType: "pheno_hunt",
      growId: "grow-1"
    });

    expect(mockApiRequest).toHaveBeenCalledWith("/api/growpath-modules", {
      method: "GET",
      params: { recordType: "pheno_hunt", growId: "grow-1" }
    });
    expect(records[0].id).toBe("record-1");
    expect(records[0].warnings).toEqual(["Missing flower score"]);
    expect(records[0].tags).toEqual(["early_sex"]);
  });

  test("creates and updates module records", async () => {
    mockApiRequest
      .mockResolvedValueOnce({
        item: {
          _id: "record-2",
          recordType: "ipm_scout",
          title: "Leaf stippling scout",
          agreementStatus: "agrees"
        }
      })
      .mockResolvedValueOnce({
        item: {
          _id: "record-2",
          recordType: "ipm_scout",
          title: "Leaf stippling scout",
          userDecision: "uncertain"
        }
      });

    const created = await createGrowpathModuleRecord({
      recordType: "ipm_scout",
      title: "Leaf stippling scout",
      localRuleResult: { suspectedIssues: [{ issueName: "thrips possible" }] },
      aiVerificationResult: { likelyIssues: [{ issueName: "possible thrips pressure" }] }
    });

    expect(created.agreementStatus).toBe("agrees");
    expect(mockApiRequest).toHaveBeenCalledWith("/api/growpath-modules", {
      method: "POST",
      body: {
        recordType: "ipm_scout",
        title: "Leaf stippling scout",
        localRuleResult: { suspectedIssues: [{ issueName: "thrips possible" }] },
        aiVerificationResult: {
          likelyIssues: [{ issueName: "possible thrips pressure" }]
        }
      }
    });

    const updated = await updateGrowpathModuleRecord("record-2", {
      userDecision: "uncertain"
    });

    expect(updated?.userDecision).toBe("uncertain");
    expect(mockApiRequest).toHaveBeenLastCalledWith("/api/growpath-modules/record-2", {
      method: "PATCH",
      body: { userDecision: "uncertain" }
    });
  });
});
