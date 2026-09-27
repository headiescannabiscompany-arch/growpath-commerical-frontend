import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import RegisterScreen from "@/app/register";
import GuildOnboardingScreen from "@/app/onboarding/guilds";

const PRODUCT_NEXT = "/store/growpathai/products/6a90f76bf113936857750634";
const OTHER_PRODUCT = "/store/growpathai/products/6a90f76bf113936857750635";
const mockSignup = jest.fn();
const mockRemember = jest.fn();
const mockReplace = jest.fn();
const mockListGuilds = jest.fn();
const mockJoinGuild = jest.fn();
const mockUpdateInterests = jest.fn();
const mockRetryMe = jest.fn();
let mockParams: Record<string, string | string[]> = {};
let mockAuthState: any;

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({ replace: mockReplace })
}));

jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => mockAuthState
}));

jest.mock("@/utils/shopperProductContinuation", () => ({
  rememberProductSignupContinuation: (...args: any[]) => mockRemember(...args)
}));

jest.mock("@/api/communitySocial", () => ({
  listGuilds: (...args: any[]) => mockListGuilds(...args),
  joinGuild: (...args: any[]) => mockJoinGuild(...args)
}));

jest.mock("@/api/users", () => ({
  updateGrowInterests: (...args: any[]) => mockUpdateInterests(...args)
}));

jest.mock("@/components/forms/CalendarDateField", () => {
  const React = require("react");
  const { TextInput } = require("react-native");
  return function MockCalendarDateField({ accessibilityLabel, onChange, value }: any) {
    return React.createElement(TextInput, {
      accessibilityLabel,
      onChangeText: onChange,
      value
    });
  };
});

function deferred() {
  let resolve!: (value: any) => void;
  const promise = new Promise<any>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function fillSignup(screen: ReturnType<typeof render>) {
  fireEvent.changeText(screen.getByLabelText("Register name"), "Shopper User");
  fireEvent.changeText(screen.getByLabelText("Register email"), " Shopper@Example.com ");
  fireEvent.changeText(screen.getByLabelText("Register password"), "test-password");
  fireEvent.changeText(screen.getByLabelText("Register date of birth"), "1990-01-01");
}

function pressHandler(screen: ReturnType<typeof render>, label: string) {
  return screen.UNSAFE_root.findAll(
    (node: { props: { accessibilityLabel?: string; onPress?: unknown } }) =>
      node.props.accessibilityLabel === label && typeof node.props.onPress === "function"
  )[0].props.onPress;
}

describe("product-only Free signup handoff", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockParams = { next: PRODUCT_NEXT };
    mockAuthState = {
      signup: (...args: any[]) => mockSignup(...args),
      retryMe: (...args: any[]) => mockRetryMe(...args),
      token: "current-session",
      user: { id: "shopper-1", growInterests: { crops: ["Herbs"] } }
    };
    mockSignup.mockResolvedValue({ emailVerificationRequired: true, emailSent: true });
    mockRemember.mockReturnValue(true);
    mockListGuilds.mockResolvedValue([
      { id: "herb-group", name: "Herbs group", description: "Herbs", memberCount: 3 }
    ]);
    mockJoinGuild.mockResolvedValue({});
    mockUpdateInterests.mockResolvedValue({});
    mockRetryMe.mockResolvedValue({});
  });

  it.each([true, false])(
    "remembers only a successful Free verification-required signup when emailSent is %s",
    async (emailSent: boolean) => {
      mockSignup.mockResolvedValue({ emailVerificationRequired: true, emailSent });
      const screen = render(<RegisterScreen />);
      fillSignup(screen);
      fireEvent.press(screen.getByLabelText("Create Free account"));

      await waitFor(() => expect(mockRemember).toHaveBeenCalledTimes(1));
      expect(mockRemember).toHaveBeenCalledWith("shopper@example.com", PRODUCT_NEXT);
      expect(mockSignup).toHaveBeenCalledWith({
        name: "Shopper User",
        displayName: "Shopper User",
        email: "shopper@example.com",
        password: "test-password",
        plan: "free",
        mode: "personal",
        dateOfBirth: "1990-01-01",
        showCannabisContent: false
      });
      expect(screen.getByLabelText("Register password")).toHaveProp("value", "");
      expect(screen.getByText(/Account created\./)).toBeTruthy();
      expect(mockReplace).not.toHaveBeenCalled();
    }
  );

  it("keeps the successful verification message when browser storage is unavailable", async () => {
    mockRemember.mockReturnValue(false);
    const screen = render(<RegisterScreen />);
    fillSignup(screen);
    fireEvent.press(screen.getByLabelText("Create Free account"));
    expect(await screen.findByText(/Account created\. Check your email/)).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("does not remember failed signup and retains the product on Back to login", async () => {
    mockSignup.mockRejectedValue(new Error("Signup unavailable"));
    const screen = render(<RegisterScreen />);
    fillSignup(screen);
    fireEvent.press(screen.getByLabelText("Create Free account"));
    await screen.findByText("Signup unavailable");
    expect(mockRemember).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
    fireEvent.press(screen.getByLabelText("Back to login"));
    expect(mockReplace).toHaveBeenCalledWith(
      `/login?email=shopper%40example.com&next=${encodeURIComponent(PRODUCT_NEXT)}`
    );
  });

  it("keeps immediate-token Free signup on guild onboarding before returning to the product", async () => {
    mockSignup.mockResolvedValue({
      token: "new-session",
      emailVerificationRequired: true
    });
    const screen = render(<RegisterScreen />);
    fillSignup(screen);
    fireEvent.press(screen.getByLabelText("Create Free account"));
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith({
        pathname: "/onboarding/guilds",
        params: { next: PRODUCT_NEXT, mode: "personal", plan: "free" }
      })
    );
    expect(mockRemember).not.toHaveBeenCalled();
  });

  it("allows the signup operation's own session transition before guild onboarding", async () => {
    const pending = deferred();
    mockSignup.mockReturnValue(pending.promise);
    mockAuthState = { ...mockAuthState, token: null, user: null };
    const screen = render(<RegisterScreen />);
    fillSignup(screen);
    fireEvent.press(screen.getByLabelText("Create Free account"));
    mockAuthState = {
      ...mockAuthState,
      token: "new-session",
      user: { id: "new-shopper" }
    };
    screen.rerender(<RegisterScreen />);
    await act(async () => pending.resolve({ token: "new-session" }));
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: "/onboarding/guilds",
      params: { next: PRODUCT_NEXT, mode: "personal", plan: "free" }
    });
    expect(mockRemember).not.toHaveBeenCalled();
  });

  it.each([{}, { next: "/courses?courseId=6aa2f5c5d339157652995f10" }])(
    "keeps ordinary Free onboarding when no valid product continuation exists: %p",
    async (params) => {
      mockParams = params.next ? { next: params.next } : {};
      mockSignup.mockResolvedValue({ token: "new-session" });
      const screen = render(<RegisterScreen />);
      fillSignup(screen);
      fireEvent.press(screen.getByLabelText("Create Free account"));
      await waitFor(() =>
        expect(mockReplace).toHaveBeenCalledWith({
          pathname: "/onboarding/guilds",
          params: { next: "/home/personal", mode: "personal", plan: "free" }
        })
      );
      expect(mockRemember).not.toHaveBeenCalled();
    }
  );

  it.each([
    ["Pro", "pro", "personal"],
    ["Commercial", "commercial", "commercial"],
    ["Facility", "facility", "facility"]
  ])(
    "preserves %s signup and walkthrough routing without a product record",
    async (label, plan, mode) => {
      const screen = render(<RegisterScreen />);
      fillSignup(screen);
      fireEvent.press(screen.getByLabelText(`Select ${label} account`));
      fireEvent.press(screen.getByLabelText(`Create ${label} account`));
      await screen.findByText(/Account created\./);
      expect(mockSignup).toHaveBeenCalledWith(expect.objectContaining({ plan, mode }));
      expect(mockRemember).not.toHaveBeenCalled();
      expect(mockReplace).not.toHaveBeenCalled();

      mockSignup.mockResolvedValue({ token: "paid-plan-session" });
      fireEvent.changeText(screen.getByLabelText("Register password"), "test-password");
      fireEvent.press(screen.getByLabelText(`Create ${label} account`));
      await waitFor(() =>
        expect(mockReplace).toHaveBeenCalledWith({
          pathname: "/onboarding/guilds",
          params: { next: "/onboarding/walkthroughs", mode, plan }
        })
      );
      expect(mockRemember).not.toHaveBeenCalled();
    }
  );

  it.each([
    { next: [PRODUCT_NEXT] },
    { next: `${PRODUCT_NEXT}?buy=true` },
    { next: "https://example.com/product" },
    { next: "/courses?courseId=6aa2f5c5d339157652995f10" },
    { next: "/home/commercial/storefront" },
    { next: "/subscribe/success?session_id=cs_123" }
  ])("does not persist or forward an unsupported signup return %p", async ({ next }) => {
    mockParams = { next };
    const screen = render(<RegisterScreen />);
    fillSignup(screen);
    fireEvent.press(screen.getByLabelText("Create Free account"));
    await screen.findByText(/Account created\./);
    expect(mockRemember).not.toHaveBeenCalled();
    fireEvent.press(screen.getByLabelText("Back to login"));
    expect(mockReplace).toHaveBeenCalledWith("/login?email=shopper%40example.com");
  });

  it.each(["/claim-gift?token=private-gift-token", "/claim-complimentary-access"])(
    "preserves claim precedence for %s without writing product continuation",
    async (next: string) => {
      mockParams = { next };
      const expected = next.split("?")[0];
      const screen = render(<RegisterScreen />);
      fillSignup(screen);
      expect(screen.queryByLabelText("Select Commercial account")).toBeNull();
      fireEvent.press(screen.getByLabelText("Create Free account"));
      await screen.findByText(/Account created\./);
      expect(mockRemember).not.toHaveBeenCalled();
      fireEvent.press(screen.getByLabelText("Back to login"));
      expect(mockReplace).toHaveBeenCalledWith(
        `/login?email=shopper%40example.com&next=${encodeURIComponent(expected)}`
      );
      mockReplace.mockClear();
      mockSignup.mockResolvedValue({ token: "claim-session" });
      fireEvent.changeText(screen.getByLabelText("Register password"), "test-password");
      fireEvent.press(screen.getByLabelText("Create Free account"));
      await waitFor(() => expect(mockReplace).toHaveBeenCalledWith(expected));
      expect(mockRemember).not.toHaveBeenCalled();
    }
  );

  it("guards duplicate submissions in the handler before the continuation write", async () => {
    const pending = deferred();
    mockSignup.mockReturnValue(pending.promise);
    const screen = render(<RegisterScreen />);
    fillSignup(screen);
    const submit = pressHandler(screen, "Create Free account");
    act(() => {
      void submit();
      void submit();
    });
    expect(mockSignup).toHaveBeenCalledTimes(1);
    expect(mockRemember).not.toHaveBeenCalled();
    await act(async () =>
      pending.resolve({ emailVerificationRequired: true, emailSent: true })
    );
    expect(mockRemember).toHaveBeenCalledTimes(1);
  });

  it.each(["unmount", "destination"])(
    "ignores a stale signup completion after %s",
    async (change: string) => {
      const pending = deferred();
      mockSignup.mockReturnValue(pending.promise);
      const screen = render(<RegisterScreen />);
      fillSignup(screen);
      fireEvent.press(screen.getByLabelText("Create Free account"));
      if (change === "unmount") screen.unmount();
      else {
        mockParams = { next: OTHER_PRODUCT };
        screen.rerender(<RegisterScreen />);
      }
      await act(async () =>
        pending.resolve({ emailVerificationRequired: true, emailSent: true })
      );
      expect(mockRemember).not.toHaveBeenCalled();
      expect(mockReplace).not.toHaveBeenCalled();
    }
  );

  describe("guild onboarding", () => {
    it("returns to the product only after all existing saves succeed", async () => {
      const pendingJoin = deferred();
      mockJoinGuild.mockReturnValue(pendingJoin.promise);
      const screen = render(<GuildOnboardingScreen />);
      fireEvent.press(await screen.findByLabelText("Join Herbs group"));
      fireEvent.press(screen.getByLabelText("Continue after selecting forum groups"));
      await waitFor(() => expect(mockJoinGuild).toHaveBeenCalledWith("herb-group"));
      expect(mockUpdateInterests).toHaveBeenCalledWith({ crops: ["Herbs"] });
      expect(mockRetryMe).toHaveBeenCalledTimes(1);
      expect(mockReplace).not.toHaveBeenCalled();
      await act(async () => pendingJoin.resolve({}));
      expect(mockReplace).toHaveBeenCalledWith(PRODUCT_NEXT);
      expect(mockRemember).not.toHaveBeenCalled();
    });

    it.each(["interests", "refresh", "membership"])(
      "retains product continuation after a failed %s save and retries explicitly",
      async (stage: string) => {
        const operation =
          stage === "interests"
            ? mockUpdateInterests
            : stage === "refresh"
              ? mockRetryMe
              : mockJoinGuild;
        operation.mockRejectedValueOnce(new Error("Onboarding save failed"));
        const screen = render(<GuildOnboardingScreen />);
        fireEvent.press(await screen.findByLabelText("Join Herbs group"));
        fireEvent.press(screen.getByLabelText("Continue after selecting forum groups"));
        await screen.findByText("Onboarding save failed");
        expect(mockReplace).not.toHaveBeenCalled();
        fireEvent.press(screen.getByLabelText("Continue after selecting forum groups"));
        await waitFor(() => expect(mockReplace).toHaveBeenCalledWith(PRODUCT_NEXT));
      }
    );

    it.each([
      { next: [PRODUCT_NEXT] },
      { next: `${PRODUCT_NEXT}#buy` },
      { next: "/courses?courseId=6aa2f5c5d339157652995f10" }
    ])("rejects non-scalar or unsupported product return %p", async ({ next }) => {
      mockParams = { next };
      const screen = render(<GuildOnboardingScreen />);
      await screen.findByLabelText("Join Herbs group");
      fireEvent.press(screen.getByLabelText("Continue after selecting forum groups"));
      await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/"));
    });

    it.each(["/", "/home/personal", "/claim-gift?token=private-gift-token"])(
      "preserves existing onboarding destination %s",
      async (next: string) => {
        mockParams = { next };
        const screen = render(<GuildOnboardingScreen />);
        await screen.findByLabelText("Join Herbs group");
        fireEvent.press(screen.getByLabelText("Continue after selecting forum groups"));
        await waitFor(() => expect(mockReplace).toHaveBeenCalledWith(next.split("?")[0]));
      }
    );

    it("retains paid-plan walkthrough parameters", async () => {
      mockParams = {
        next: "/onboarding/walkthroughs",
        plan: "facility",
        mode: "facility"
      };
      const screen = render(<GuildOnboardingScreen />);
      await screen.findByLabelText("Join Herbs group");
      fireEvent.press(screen.getByLabelText("Continue after selecting forum groups"));
      await waitFor(() =>
        expect(mockReplace).toHaveBeenCalledWith({
          pathname: "/onboarding/walkthroughs",
          params: { plan: "facility", mode: "facility" }
        })
      );
    });

    it("prevents duplicate guild saves through the underlying handler", async () => {
      const pending = deferred();
      mockUpdateInterests.mockReturnValue(pending.promise);
      const screen = render(<GuildOnboardingScreen />);
      await screen.findByLabelText("Join Herbs group");
      const save = pressHandler(screen, "Continue after selecting forum groups");
      act(() => {
        void save();
        void save();
      });
      expect(mockUpdateInterests).toHaveBeenCalledTimes(1);
      await act(async () => pending.resolve({}));
      expect(mockReplace).toHaveBeenCalledTimes(1);
    });

    it.each(["unmount", "session", "destination"])(
      "stops remaining saves and navigation after %s changes",
      async (change: string) => {
        const pending = deferred();
        mockUpdateInterests.mockReturnValue(pending.promise);
        const screen = render(<GuildOnboardingScreen />);
        await screen.findByLabelText("Join Herbs group");
        fireEvent.press(screen.getByLabelText("Continue after selecting forum groups"));
        if (change === "unmount") screen.unmount();
        else {
          if (change === "session")
            mockAuthState = { ...mockAuthState, token: "different-session" };
          else mockParams = { next: OTHER_PRODUCT };
          screen.rerender(<GuildOnboardingScreen />);
        }
        await act(async () => pending.resolve({}));
        expect(mockRetryMe).not.toHaveBeenCalled();
        expect(mockJoinGuild).not.toHaveBeenCalled();
        expect(mockReplace).not.toHaveBeenCalled();
      }
    );
  });
});
