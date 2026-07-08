import { switchAccountMode } from "@/features/mode/switchAccountMode";

describe("switchAccountMode", () => {
  it("persists preferred mode before switching and routing", async () => {
    const calls: string[] = [];
    const setPreferredMode = jest.fn(async () => {
      calls.push("preferred");
    });
    const setMode = jest.fn(() => {
      calls.push("mode");
    });
    const router = {
      replace: jest.fn(() => {
        calls.push("route");
      })
    };

    await switchAccountMode("commercial", {
      currentMode: "personal",
      setMode,
      router,
      setPreferredMode
    });

    expect(setPreferredMode).toHaveBeenCalledWith("commercial");
    expect(setMode).toHaveBeenCalledWith("commercial");
    expect(router.replace).toHaveBeenCalledWith("/home/commercial");
    expect(calls).toEqual(["preferred", "mode", "route"]);
  });

  it("does nothing when the requested mode is already current", async () => {
    const setPreferredMode = jest.fn();
    const setMode = jest.fn();
    const router = { replace: jest.fn() };

    await switchAccountMode("facility", {
      currentMode: "facility",
      setMode,
      router,
      setPreferredMode
    });

    expect(setPreferredMode).not.toHaveBeenCalled();
    expect(setMode).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });
});
