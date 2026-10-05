const mockInit = jest.fn();
jest.mock("@heycatch/sdk", () => ({
  analytics: { init: (...args: unknown[]) => mockInit(...args) }
}));
import { initializeMarketingAnalytics } from "../../src/analytics/heycatch.web";
import { initializeMarketingAnalytics as initializeNative } from "../../src/analytics/heycatch";
describe("HeyCatch entry contract", () => {
  beforeEach(() => mockInit.mockClear());
  it("initializes the stable SDK with the publishable key and privacy filter", () => {
    initializeMarketingAnalytics();
    expect(mockInit).toHaveBeenCalledWith(
      expect.objectContaining({
        projectKey: "hck_pk_Vu7gSIhkxVCmtc6M8S_lkn4S_EQjzMOE",
        install: { framework: "react", frameworkVersion: "19", agent: "codex" },
        beforeSend: expect.any(Function),
        respectDnt: true,
        requestBatching: false,
        maskAllElementAttributes: true,
        persistence: "sessionStorage"
      })
    );
    expect(mockInit.mock.calls[0][0]).not.toHaveProperty("apiHost");
    expect(mockInit.mock.calls[0][0]).not.toHaveProperty("tracingHosts");
  });
  it("does not initialize native analytics", () => {
    initializeNative();
    expect(mockInit).not.toHaveBeenCalled();
  });
});
