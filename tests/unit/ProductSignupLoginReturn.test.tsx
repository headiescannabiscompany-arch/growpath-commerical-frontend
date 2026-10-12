import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import { ApiError } from "@/api/apiRequest";
import LoginScreen from "@/app/login";
import VerifyEmailScreen from "@/app/verify-email";
import {
  PRODUCT_SIGNUP_CONTINUATION_TTL_MS,
  readShopperSignupContinuation,
  rememberShopperSignupContinuation
} from "@/utils/shopperProductContinuation";

const mockLogin = jest.fn();
const mockApiRequest = jest.fn();
const mockConfirmEmailVerification = jest.fn();
const mockRequestEmailVerification = jest.fn();
const mockReadAccountContinuation = jest.fn();
const mockConsumeAccountContinuation = jest.fn();
const mockReplace = jest.fn();
const mockPush = jest.fn();
let mockParams: Record<string, string | string[]> = {};
let mockAuth: {
  token: string | null;
  user: { id: string; email: string } | null;
  isAuthed: boolean;
  isHydrating: boolean;
  meStatus: "idle" | "loading" | "ready" | "error";
} = {
  token: null,
  user: null,
  isAuthed: false,
  isHydrating: false,
  meStatus: "idle"
};

jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({ ...mockAuth, login: mockLogin })
}));
jest.mock("@/api/apiRequest", () => ({
  ...jest.requireActual("@/api/apiRequest"),
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));
jest.mock("@/api/auth", () => ({
  requestEmailVerification: (...args: any[]) => mockRequestEmailVerification(...args),
  confirmEmailVerification: (...args: any[]) => mockConfirmEmailVerification(...args)
}));
jest.mock("@/api/shopperContinuation", () => ({
  readAccountShopperContinuation: (...args: any[]) =>
    mockReadAccountContinuation(...args),
  consumeAccountShopperContinuation: (...args: any[]) =>
    mockConsumeAccountContinuation(...args)
}));
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({ replace: mockReplace, push: mockPush })
}));

const email = "shopper@example.com";
const PRODUCT_PATH = "/store/growpathai/products/6aa5967eb77d250e5aecf795";
const SHARED_COURSE = "/courses?courseId=6aa2f5c5d339157652995f10";
const STOREFRONT_COURSE = "/store/growpathai/courses/6aa2f5c5d339157652995f10";
const nextProduct = "/store/growpathai/products/6aa5967eb77d250e5aecf796";
const originalWindow = (globalThis as any).window;
let localValues = new Map<string, string>();
let revisionSequence = 0;

function storage(values: Map<string, string>) {
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key)
  };
}

function freshBrowserTab() {
  (globalThis as any).window = {
    location: { hostname: "growpath.test", pathname: "/login", search: "", hash: "" },
    localStorage: storage(localValues),
    sessionStorage: storage(new Map<string, string>()),
    crypto: {
      getRandomValues: (values: Uint32Array) => {
        values.fill(++revisionSequence);
        return values;
      }
    }
  };
}

function readyAccount(accountEmail = email) {
  mockAuth = {
    token: "synthetic-session-token",
    user: { id: "synthetic-shopper", email: accountEmail },
    isAuthed: true,
    isHydrating: false,
    meStatus: "ready"
  };
}

function deferred<T = void>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function submit(screen: ReturnType<typeof render>, enteredEmail = email) {
  fireEvent.changeText(screen.getByLabelText("Email address"), enteredEmail);
  fireEvent.changeText(screen.getByLabelText("Password"), "synthetic-password");
  fireEvent.press(screen.getByLabelText("Sign in"));
}

async function showCurrentAuth(screen: ReturnType<typeof render>) {
  await act(async () => {
    screen.rerender(<LoginScreen />);
  });
}

describe.each([
  ["product", PRODUCT_PATH],
  ["shared course", SHARED_COURSE],
  ["storefront course", STOREFRONT_COURSE]
])("%s signup continuation through existing login", (_kind, destination) => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLogin.mockReset().mockResolvedValue(undefined);
    mockConfirmEmailVerification.mockReset().mockResolvedValue({ user: { email } });
    mockRequestEmailVerification.mockResolvedValue({ emailSent: true });
    mockReadAccountContinuation.mockReset().mockResolvedValue(null);
    mockConsumeAccountContinuation.mockReset().mockResolvedValue(null);
    mockParams = {};
    mockAuth = {
      token: null,
      user: null,
      isAuthed: false,
      isHydrating: false,
      meStatus: "idle"
    };
    localValues = new Map();
    revisionSequence = 0;
    freshBrowserTab();
  });

  afterAll(() => {
    (globalThis as any).window = originalWindow;
  });

  afterEach(() => {
    // Login/verification are mocked explicitly; returning must not invoke any
    // course enrollment, purchase, access, or product-interest API as a side effect.
    expect(mockApiRequest).not.toHaveBeenCalled();
    jest.restoreAllMocks();
  });

  it("passes the exact canonical shopper destination from login into account creation", () => {
    mockParams = { next: destination };
    const screen = render(<LoginScreen />);
    fireEvent.press(screen.getByLabelText("Create account"));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/register",
      params: { next: destination }
    });
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it.each([
    { next: [destination] },
    { next: `${destination}?quantity=2` },
    { next: "https://elsewhere.example/product" },
    { next: `${SHARED_COURSE}&courseId=6aa2f5c5d339157652995f10` },
    { next: "/account/gift-checkout/success?session_id=cs_test_valid_session" }
  ])("does not add unsupported registration continuity for $next", ({ next }) => {
    mockParams = { next };
    const screen = render(<LoginScreen />);
    fireEvent.press(screen.getByLabelText("Create account"));
    expect(mockPush).toHaveBeenCalledWith({ pathname: "/register", params: undefined });
  });

  it.each(["/claim-complimentary-access", "/claim-gift"])(
    "preserves the existing claim registration destination %s",
    (next) => {
      mockParams = { next };
      rememberShopperSignupContinuation(email, destination);
      const screen = render(<LoginScreen />);
      fireEvent.press(screen.getByLabelText("Create account"));
      expect(mockPush).toHaveBeenCalledWith({ pathname: "/register", params: { next } });
      expect(readShopperSignupContinuation(email)).not.toBeNull();
    }
  );

  it("does not consume or navigate from stored state merely by rendering login", () => {
    rememberShopperSignupContinuation(email, destination);
    readyAccount();
    render(<LoginScreen />);
    expect(mockLogin).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
    expect(readShopperSignupContinuation(email)).not.toBeNull();
  });

  it("captures the continuation at deliberate submit and waits for matching settled session readiness", async () => {
    const login = deferred();
    mockLogin.mockReturnValueOnce(login.promise);
    const screen = render(<LoginScreen />);
    rememberShopperSignupContinuation(email, destination);
    submit(screen, " Shopper@Example.com ");
    expect(mockLogin).toHaveBeenCalledWith(email, "synthetic-password");
    readyAccount(" SHOPPER@example.com ");
    mockAuth.meStatus = "loading";
    await showCurrentAuth(screen);
    await act(async () => {
      login.resolve();
    });
    expect(mockReplace).not.toHaveBeenCalled();
    expect(readShopperSignupContinuation(email)).not.toBeNull();
    mockAuth.meStatus = "ready";
    mockAuth.isHydrating = true;
    await showCurrentAuth(screen);
    expect(mockReplace).not.toHaveBeenCalled();
    mockAuth.isHydrating = false;
    await showCurrentAuth(screen);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith(destination));
    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(readShopperSignupContinuation(email)).toBeNull();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("does not resume from a ready session until this login promise also succeeds", async () => {
    const login = deferred();
    mockLogin.mockReturnValueOnce(login.promise);
    rememberShopperSignupContinuation(email, destination);
    const screen = render(<LoginScreen />);
    submit(screen);
    readyAccount();
    await showCurrentAuth(screen);
    expect(mockReplace).not.toHaveBeenCalled();
    await act(async () => {
      login.resolve();
    });
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith(destination));
    expect(readShopperSignupContinuation(email)).toBeNull();
  });

  it.each(["error", "idle"] as const)(
    "retains the continuation when resolved login leaves session %s",
    async (meStatus) => {
      rememberShopperSignupContinuation(email, destination);
      mockLogin.mockImplementationOnce(async () => {
        readyAccount();
        mockAuth.meStatus = meStatus;
        if (meStatus === "idle")
          Object.assign(mockAuth, { token: null, user: null, isAuthed: false });
      });
      const screen = render(<LoginScreen />);
      submit(screen);
      await act(async () => {});
      await showCurrentAuth(screen);
      expect(mockReplace).not.toHaveBeenCalledWith(destination);
      expect(readShopperSignupContinuation(email)).not.toBeNull();
    }
  );

  it("preserves a failed-login continuation and consumes it only after a later verified successful attempt", async () => {
    rememberShopperSignupContinuation(email, destination);
    mockLogin.mockRejectedValueOnce(
      new ApiError("BAD_LOGIN", 401, { message: "Invalid email or password." })
    );
    const screen = render(<LoginScreen />);
    submit(screen);
    await screen.findByText("Invalid email or password.");
    expect(mockReplace).not.toHaveBeenCalled();
    expect(readShopperSignupContinuation(email)).not.toBeNull();
    mockLogin.mockImplementationOnce(async () => {
      readyAccount();
    });
    submit(screen);
    await act(async () => {});
    await showCurrentAuth(screen);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith(destination));
    expect(readShopperSignupContinuation(email)).toBeNull();
  });

  it("does not consume or resume a destination when the authenticated email differs", async () => {
    rememberShopperSignupContinuation(email, destination);
    mockLogin.mockImplementationOnce(async () => {
      readyAccount("other@example.com");
    });
    const screen = render(<LoginScreen />);
    submit(screen);
    await act(async () => {});
    await showCurrentAuth(screen);
    expect(mockReplace).not.toHaveBeenCalledWith(destination);
    expect(readShopperSignupContinuation(email)).not.toBeNull();
  });

  it("does not consume or navigate after this login screen is unmounted", async () => {
    const login = deferred();
    mockLogin.mockReturnValueOnce(login.promise);
    rememberShopperSignupContinuation(email, destination);
    const screen = render(<LoginScreen />);
    submit(screen);
    screen.unmount();
    readyAccount();
    await act(async () => {
      login.resolve();
    });
    expect(mockReplace).not.toHaveBeenCalled();
    expect(readShopperSignupContinuation(email)).not.toBeNull();
  });

  it("prevents a second login submission from superseding an in-flight attempt", async () => {
    const login = deferred();
    mockLogin.mockReturnValueOnce(login.promise);
    rememberShopperSignupContinuation(email, destination);
    const screen = render(<LoginScreen />);
    submit(screen);
    fireEvent(screen.getByLabelText("Password"), "submitEditing");
    expect(mockLogin).toHaveBeenCalledTimes(1);
    readyAccount();
    await showCurrentAuth(screen);
    await act(async () => {
      login.resolve();
    });
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith(destination));
    expect(mockReplace).toHaveBeenCalledTimes(1);
  });

  it.each(["logout", "token switch"])(
    "invalidates a pending continuation after %s instead of resuming in a later session",
    async (change) => {
      const login = deferred();
      mockLogin.mockReturnValueOnce(login.promise);
      rememberShopperSignupContinuation(email, destination);
      const screen = render(<LoginScreen />);
      submit(screen);
      readyAccount();
      mockAuth.meStatus = "loading";
      await showCurrentAuth(screen);
      await act(async () => {
        login.resolve();
      });
      expect(mockReplace).not.toHaveBeenCalled();
      if (change === "logout") {
        Object.assign(mockAuth, {
          token: null,
          user: null,
          isAuthed: false,
          meStatus: "idle"
        });
      } else {
        mockAuth.token = "different-later-session-token";
        mockAuth.meStatus = "ready";
      }
      await showCurrentAuth(screen);
      readyAccount();
      await showCurrentAuth(screen);
      expect(mockReplace).not.toHaveBeenCalledWith(destination);
      expect(readShopperSignupContinuation(email)).not.toBeNull();
    }
  );

  it.each([nextProduct, SHARED_COURSE, STOREFRONT_COURSE])(
    "does not erase or adopt another tab's newer destination %s while login is in flight",
    async (newerDestination) => {
      const login = deferred();
      mockLogin.mockReturnValueOnce(login.promise);
      rememberShopperSignupContinuation(email, destination);
      const screen = render(<LoginScreen />);
      submit(screen);
      rememberShopperSignupContinuation(email, newerDestination);
      const replacement = readShopperSignupContinuation(email);
      readyAccount();
      await showCurrentAuth(screen);
      await act(async () => {
        login.resolve();
      });
      expect(mockReplace).not.toHaveBeenCalledWith(destination);
      expect(mockReplace).not.toHaveBeenCalledWith(newerDestination);
      expect(mockReplace).toHaveBeenCalledWith("/account/workspace");
      expect(readShopperSignupContinuation(email)).toEqual(replacement);
    }
  );

  it.each([
    "/claim-complimentary-access",
    "/claim-gift",
    nextProduct,
    SHARED_COURSE,
    STOREFRONT_COURSE
  ])(
    "gives explicit safe next %s precedence without consuming stored signup state",
    async (next) => {
      rememberShopperSignupContinuation(email, destination);
      mockParams = { next };
      mockLogin.mockImplementationOnce(async () => {
        readyAccount();
      });
      const screen = render(<LoginScreen />);
      submit(screen);
      await waitFor(() => expect(mockReplace).toHaveBeenCalledWith(next));
      expect(mockReplace).toHaveBeenCalledTimes(1);
      expect(readShopperSignupContinuation(email)).not.toBeNull();
    }
  );

  it("retains saved continuity after unverified login and does not silently send email", async () => {
    rememberShopperSignupContinuation(email, destination);
    const snapshot = readShopperSignupContinuation(email);
    mockLogin.mockRejectedValueOnce(
      new ApiError("EMAIL_NOT_VERIFIED", 403, {
        error: {
          code: "EMAIL_NOT_VERIFIED",
          message: "Please verify your email address before signing in."
        }
      })
    );
    const screen = render(<LoginScreen />);
    submit(screen);
    await screen.findByLabelText("Resend verification email");
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockRequestEmailVerification).not.toHaveBeenCalled();
    expect(readShopperSignupContinuation(email)).toEqual(snapshot);
  });

  it.each(["expiry", "opposite-kind replacement"])(
    "fails safely on %s while the successful login waits for session readiness",
    async (change) => {
      const start = Date.now();
      const clock = jest.spyOn(Date, "now").mockReturnValue(start);
      rememberShopperSignupContinuation(email, destination);
      mockLogin.mockImplementationOnce(async () => {
        readyAccount();
        mockAuth.meStatus = "loading";
      });
      const screen = render(<LoginScreen />);
      submit(screen);
      await act(async () => {});
      await showCurrentAuth(screen);
      expect(mockReplace).not.toHaveBeenCalled();
      const newerDestination = destination === PRODUCT_PATH ? SHARED_COURSE : nextProduct;
      if (change === "expiry")
        clock.mockReturnValue(start + PRODUCT_SIGNUP_CONTINUATION_TTL_MS);
      else rememberShopperSignupContinuation(email, newerDestination);
      const savedValues = new Map(localValues);
      mockAuth.meStatus = "ready";
      await showCurrentAuth(screen);
      expect(mockReplace).toHaveBeenCalledTimes(1);
      expect(mockReplace).toHaveBeenCalledWith("/account/workspace");
      expect(localValues).toEqual(savedValues);
      if (change !== "expiry")
        expect(readShopperSignupContinuation(email)?.path).toBe(newerDestination);
    }
  );

  it("does not use another signup email's stored destination", async () => {
    rememberShopperSignupContinuation("different@example.com", destination);
    mockLogin.mockImplementationOnce(async () => {
      readyAccount();
    });
    const screen = render(<LoginScreen />);
    submit(screen);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/account/workspace"));
    expect(mockReplace).not.toHaveBeenCalledWith(destination);
    expect(readShopperSignupContinuation("different@example.com")).not.toBeNull();
  });

  it("degrades unavailable storage to the normal workspace handoff without blocking login", async () => {
    Object.defineProperty((globalThis as any).window, "localStorage", {
      configurable: true,
      get: () => {
        throw new Error("Storage denied");
      }
    });
    mockLogin.mockImplementationOnce(async () => {
      readyAccount();
    });
    const screen = render(<LoginScreen />);
    submit(screen);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/account/workspace"));
    expect(mockReplace).not.toHaveBeenCalledWith(destination);
  });

  it("resumes token-only verification in a new same-origin tab only after verified login", async () => {
    rememberShopperSignupContinuation(email, destination);
    freshBrowserTab();
    mockParams = { token: "synthetic-verification-token" };
    const verification = render(<VerifyEmailScreen />);
    await verification.findByText("Your email is verified. You can sign in to GrowPath.");
    expect(mockConfirmEmailVerification).toHaveBeenCalledWith(
      "synthetic-verification-token"
    );
    expect(readShopperSignupContinuation(email)).not.toBeNull();
    fireEvent.press(verification.getByLabelText("Go to sign in"));
    expect(mockReplace).toHaveBeenCalledWith("/login?email=shopper%40example.com");
    verification.unmount();
    mockReplace.mockClear();
    mockParams = { email };
    mockLogin.mockImplementationOnce(async () => {
      readyAccount();
    });
    const login = render(<LoginScreen />);
    expect(login.getByDisplayValue(email)).toBeTruthy();
    submit(login);
    await act(async () => {});
    await showCurrentAuth(login);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith(destination));
    expect(readShopperSignupContinuation(email)).toBeNull();
    expect(mockPush).not.toHaveBeenCalled();
  });

  function serverRecord(plan = "free") {
    return {
      path: destination,
      revision: "a".repeat(32),
      expiresAt: new Date(Date.now() + 60000).toISOString(),
      plan,
      mode: plan === "free" || plan === "pro" ? "personal" : plan
    };
  }

  it("recovers the account-owned destination in an independent empty browser store", async () => {
    const record = serverRecord();
    mockReadAccountContinuation.mockResolvedValue(record);
    mockConsumeAccountContinuation.mockResolvedValue(record);
    localValues = new Map();
    freshBrowserTab();
    mockLogin.mockImplementationOnce(async () => readyAccount());
    const screen = render(<LoginScreen />);
    expect(mockReadAccountContinuation).not.toHaveBeenCalled();
    submit(screen);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith(destination));
    expect(mockConsumeAccountContinuation).toHaveBeenCalledWith(
      record,
      "synthetic-session-token",
      expect.anything()
    );
    expect(localValues.size).toBe(0);
  });

  it.each(["pro", "commercial", "facility"])(
    "preserves %s guild/walkthrough without consuming the paid choice",
    async (plan) => {
      const record = serverRecord(plan);
      mockReadAccountContinuation.mockResolvedValue(record);
      mockLogin.mockImplementationOnce(async () => readyAccount());
      const screen = render(<LoginScreen />);
      submit(screen);
      await waitFor(() =>
        expect(mockReplace).toHaveBeenCalledWith({
          pathname: "/onboarding/guilds",
          params: { next: "/onboarding/walkthroughs", plan, mode: record.mode }
        })
      );
      expect(mockConsumeAccountContinuation).not.toHaveBeenCalled();
    }
  );

  it.each(["read", "consume"])(
    "ignores a late server %s after an account A-to-B-to-A transition",
    async (stage) => {
      const pending = deferred<any>();
      const record = serverRecord();
      mockReadAccountContinuation.mockResolvedValue(record);
      mockConsumeAccountContinuation.mockResolvedValue(record);
      (stage === "read"
        ? mockReadAccountContinuation
        : mockConsumeAccountContinuation
      ).mockReturnValueOnce(pending.promise);
      mockLogin.mockImplementationOnce(async () => readyAccount());
      const screen = render(<LoginScreen />);
      submit(screen);
      await waitFor(() =>
        expect(
          stage === "read" ? mockReadAccountContinuation : mockConsumeAccountContinuation
        ).toHaveBeenCalled()
      );
      readyAccount("other@example.com");
      await showCurrentAuth(screen);
      readyAccount();
      await showCurrentAuth(screen);
      await act(async () => pending.resolve(record));
      expect(mockReplace).not.toHaveBeenCalled();
      if (stage === "read") expect(mockConsumeAccountContinuation).not.toHaveBeenCalled();
    }
  );

  it("does not read or consume server state when an explicit claim takes precedence", async () => {
    mockParams = { next: "/claim-gift" };
    mockLogin.mockImplementationOnce(async () => readyAccount());
    const screen = render(<LoginScreen />);
    submit(screen);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/claim-gift"));
    expect(mockReadAccountContinuation).not.toHaveBeenCalled();
    expect(mockConsumeAccountContinuation).not.toHaveBeenCalled();
  });

  it("uses the accepted local fallback when optional server recovery fails", async () => {
    rememberShopperSignupContinuation(email, destination);
    mockReadAccountContinuation.mockRejectedValue(
      new Error("Optional endpoint unavailable")
    );
    mockLogin.mockImplementationOnce(async () => readyAccount());
    const screen = render(<LoginScreen />);
    submit(screen);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith(destination));
  });

  it.each([null, new Error("Uncertain consume")])(
    "does not replay an unconfirmed server consume: %p",
    async (outcome) => {
      mockReadAccountContinuation.mockResolvedValue(serverRecord());
      if (outcome instanceof Error)
        mockConsumeAccountContinuation.mockRejectedValue(outcome);
      else mockConsumeAccountContinuation.mockResolvedValue(outcome);
      mockLogin.mockImplementationOnce(async () => readyAccount());
      const screen = render(<LoginScreen />);
      submit(screen);
      await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/account/workspace"));
      expect(mockConsumeAccountContinuation).toHaveBeenCalledTimes(1);
    }
  );
});
