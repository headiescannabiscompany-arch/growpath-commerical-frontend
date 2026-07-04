const mockInit = jest.fn();
const mockCaptureException = jest.fn();
const mockWithScope = jest.fn((fn) => fn({ setExtra: jest.fn() }));
const mockWrap = jest.fn((component) => component);

jest.mock("@sentry/react-native", () => ({
  init: (...args: any[]) => mockInit.apply(null, args),
  captureException: (...args: any[]) => mockCaptureException.apply(null, args),
  withScope: (...args: any[]) => mockWithScope.apply(null, args),
  wrap: (...args: any[]) => mockWrap.apply(null, args)
}));

describe("frontend monitoring", () => {
  const originalEnv = process.env;

  function mockConfig(sentryDsn = "") {
    jest.doMock("@/config/config", () => ({
      config: {
        env: "test",
        sentryDsn
      }
    }));
  }

  beforeEach(() => {
    jest.resetModules();
    mockInit.mockReset();
    mockCaptureException.mockReset();
    mockWithScope.mockClear();
    mockWrap.mockClear();
    process.env = { ...originalEnv };
    delete process.env.EXPO_PUBLIC_SENTRY_DSN;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("stays disabled when no public Sentry DSN is configured", () => {
    mockConfig();
    const monitoring = require("@/utils/monitoring");

    expect(monitoring.initMonitoring()).toEqual({
      initialized: true,
      enabled: false,
      provider: "none"
    });
    expect(monitoring.captureException(new Error("no-dsn"))).toBe(false);
    expect(mockInit).not.toHaveBeenCalled();
  });

  it("initializes Sentry and captures boundary exceptions when configured", () => {
    mockConfig("https://public@example.ingest.sentry.io/1");
    const monitoring = require("@/utils/monitoring");

    expect(monitoring.initMonitoring()).toEqual({
      initialized: true,
      enabled: true,
      provider: "sentry"
    });
    expect(mockInit).toHaveBeenCalledWith(
      expect.objectContaining({
        dsn: "https://public@example.ingest.sentry.io/1",
        enableAutoSessionTracking: true
      })
    );

    const err = new Error("screen crash");
    expect(monitoring.captureException(err, { screen: "Profile" })).toBe(true);
    expect(mockWithScope).toHaveBeenCalled();
  });
});
