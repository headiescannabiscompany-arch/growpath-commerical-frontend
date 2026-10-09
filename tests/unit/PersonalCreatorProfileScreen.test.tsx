import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import PersonalCreatorProfileScreen from "@/screens/PersonalCreatorProfileScreen";

const mockGet = jest.fn();
const mockSave = jest.fn();
const mockPublish = jest.fn();
const mockUnpublish = jest.fn();
const mockPush = jest.fn();
const mockRetryMe = jest.fn();
let mockAuth: any;

jest.mock("@/auth/AuthContext", () => ({ useAuth: () => mockAuth }));
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock("@/api/creatorProfile", () => ({
  ...jest.requireActual("@/api/creatorProfile"),
  getMyCreatorProfile: (...args: unknown[]) => mockGet(...args),
  saveCreatorProfile: (...args: unknown[]) => mockSave(...args),
  publishCreatorProfile: (...args: unknown[]) => mockPublish(...args),
  unpublishCreatorProfile: (...args: unknown[]) => mockUnpublish(...args)
}));
jest.mock("@/api/apiRequest", () => ({ apiRequest: jest.fn() }));
jest.mock("@/api/links", () => ({
  getLinks: () => {
    throw new Error("Personal editor must not read Commercial links");
  },
  addLink: () => {
    throw new Error("Personal editor must not write Commercial links");
  }
}));
jest.mock("@/components/layout/AppCard", () => {
  const { View } = require("react-native");
  return ({ children }: any) => <View>{children}</View>;
});
jest.mock("@/components/layout/AppPage", () => {
  const { View } = require("react-native");
  return ({ header, children }: any) => (
    <View>
      {header}
      {children}
    </View>
  );
});
jest.mock("@/theme/appTheme", () => {
  const actual = jest.requireActual("@/theme/appTheme");
  return {
    ...actual,
    useAppTheme: () => ({ palette: actual.getThemePalette("day", "light") })
  };
});

const emptyDraft = { displayName: "", bio: "", links: [] };
const draft = {
  displayName: "Synthetic creator",
  bio: "Chosen biography",
  links: [{ label: "Website", url: "https://example.com/creator" }]
};
const snapshot = { ...draft, publishedAt: "2026-10-09T02:00:00.000Z" };
const state = (overrides: any = {}) => ({
  ownerId: "owner-1",
  revision: 4,
  draft,
  published: null,
  ...overrides
});
function deferred<T = any>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
const button = (name: string) => screen.getByRole("button", { name });
const press = (name: string) => fireEvent.press(button(name));
async function ready() {
  await waitFor(() => expect(screen.getByLabelText("Public name")).toBeTruthy());
}

describe("PersonalCreatorProfileScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockReset().mockResolvedValue(state());
    mockSave
      .mockReset()
      .mockImplementation(async (_revision, next) => state({ revision: 5, draft: next }));
    mockPublish
      .mockReset()
      .mockResolvedValue(state({ revision: 5, published: snapshot }));
    mockUnpublish.mockReset().mockResolvedValue(state({ revision: 6 }));
    mockRetryMe.mockReset().mockResolvedValue(undefined);
    mockAuth = {
      isAuthed: true,
      isHydrating: false,
      meStatus: "ready",
      token: "session-one",
      user: {
        id: "owner-1",
        name: "Private Account Name",
        email: "private@example.invalid",
        plan: "free"
      },
      retryMe: mockRetryMe
    };
  });

  it("does not fetch a private draft before sign-in and offers the exact return route", () => {
    mockAuth = { ...mockAuth, isAuthed: false, user: null };
    render(<PersonalCreatorProfileScreen />);
    expect(mockGet).not.toHaveBeenCalled();
    press("Sign in");
    expect(mockPush).toHaveBeenCalledWith(
      "/login?next=%2Fhome%2Fpersonal%2Fmore%2Flinks"
    );
  });

  it.each([{ isHydrating: true }, { meStatus: "loading" }])(
    "waits for auth readiness %#",
    (status) => {
      mockAuth = { ...mockAuth, ...status };
      render(<PersonalCreatorProfileScreen />);
      expect(screen.getByText("Checking your sign-in")).toBeTruthy();
      expect(mockGet).not.toHaveBeenCalled();
    }
  );

  it("recovers a failed sign-in check without duplicate retry or profile calls", async () => {
    const pending = deferred();
    mockRetryMe.mockReturnValue(pending.promise);
    mockAuth.meStatus = "error";
    const view = render(<PersonalCreatorProfileScreen />);
    press("Retry sign-in check");
    press("Retry sign-in check");
    expect(mockRetryMe).toHaveBeenCalledTimes(1);
    expect(mockGet).not.toHaveBeenCalled();
    await act(async () => pending.resolve(undefined));
    mockAuth.meStatus = "ready";
    view.rerender(<PersonalCreatorProfileScreen />);
    await ready();
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it.each(["free", "pro"])(
    "opens for ordinary Personal %s with blank explicit identity and no Commercial import",
    async (plan) => {
      mockAuth.user.plan = plan;
      mockGet.mockResolvedValue(state({ draft: emptyDraft }));
      render(<PersonalCreatorProfileScreen />);
      await ready();
      expect(screen.getByLabelText("Public name").props.value).toBe("");
      expect(screen.queryByText("Private Account Name")).toBeNull();
      expect(screen.queryByText("private@example.invalid")).toBeNull();
      expect(button("Review publication")).toBeDisabled();
      expect(mockSave).not.toHaveBeenCalled();
      expect(mockPublish).not.toHaveBeenCalled();
    }
  );

  it("keeps a failed owner read distinct from an empty editable draft and retries read-only", async () => {
    mockGet.mockRejectedValueOnce(new Error("Network unavailable"));
    render(<PersonalCreatorProfileScreen />);
    await waitFor(() => expect(button("Retry loading profile")).toBeTruthy());
    expect(screen.queryByLabelText("Public name")).toBeNull();
    press("Retry loading profile");
    await ready();
    expect(mockGet).toHaveBeenCalledTimes(2);
    expect(mockSave).not.toHaveBeenCalled();
  });

  it("rejects a wrong-owner read without rendering that person's private draft", async () => {
    mockGet.mockResolvedValue(
      state({
        ownerId: "wrong-owner",
        draft: { ...draft, displayName: "Someone else's private draft" }
      })
    );
    render(<PersonalCreatorProfileScreen />);
    await waitFor(() => expect(button("Retry loading profile")).toBeTruthy());
    expect(screen.queryByLabelText("Public name")).toBeNull();
    expect(screen.queryByText("Someone else's private draft")).toBeNull();
    expect(mockPublish).not.toHaveBeenCalled();
  });

  it("rejects a wrong-owner save response while preserving the intended on-screen draft", async () => {
    mockSave.mockResolvedValue(
      state({
        ownerId: "wrong-owner",
        draft: { ...draft, displayName: "Someone else's private draft" }
      })
    );
    render(<PersonalCreatorProfileScreen />);
    await ready();
    fireEvent.changeText(screen.getByLabelText("Public name"), "My intended draft");
    press("Save private draft");
    await waitFor(() =>
      expect(screen.getByText(/result could not be confirmed/)).toBeTruthy()
    );
    expect(screen.getByLabelText("Public name").props.value).toBe("My intended draft");
    expect(screen.queryByText("Someone else's private draft")).toBeNull();
    expect(button("Review publication")).toBeDisabled();
  });

  it("cancels publication review without publishing, saving or losing the draft", async () => {
    render(<PersonalCreatorProfileScreen />);
    await ready();
    press("Review publication");
    press("Cancel publication");
    expect(screen.queryByRole("button", { name: "Publish reviewed profile" })).toBeNull();
    expect(screen.getByLabelText("Public name").props.value).toBe(draft.displayName);
    expect(mockPublish).not.toHaveBeenCalled();
    expect(mockSave).not.toHaveBeenCalled();
  });

  it("saves privately, then requires explicit review and publication of that stored revision", async () => {
    render(<PersonalCreatorProfileScreen />);
    await ready();
    fireEvent.changeText(screen.getByLabelText("Public name"), "Reviewed public name");
    expect(button("Review publication")).toBeDisabled();
    press("Save private draft");
    await waitFor(() =>
      expect(
        screen.getByText("Draft saved. Your public profile has not changed.")
      ).toBeTruthy()
    );
    expect(mockSave).toHaveBeenCalledWith(4, {
      ...draft,
      displayName: "Reviewed public name"
    });
    expect(mockPublish).not.toHaveBeenCalled();
    press("Review publication");
    expect(screen.getByText("Review exactly what becomes public")).toBeTruthy();
    expect(mockPublish).not.toHaveBeenCalled();
    press("Publish reviewed profile");
    await waitFor(() => expect(mockPublish).toHaveBeenCalledWith(5));
  });

  it("invalidates publication review when the private draft changes", async () => {
    render(<PersonalCreatorProfileScreen />);
    await ready();
    press("Review publication");
    fireEvent.changeText(screen.getByLabelText("About you"), "New unsaved text");
    expect(screen.queryByRole("button", { name: "Publish reviewed profile" })).toBeNull();
    expect(button("Review publication")).toBeDisabled();
    expect(mockPublish).not.toHaveBeenCalled();
  });

  it("serializes a pending save and prevents competing publish or repeated save actions", async () => {
    const pending = deferred();
    mockSave.mockReturnValue(pending.promise);
    render(<PersonalCreatorProfileScreen />);
    await ready();
    fireEvent.changeText(screen.getByLabelText("Public name"), "Updated");
    act(() => {
      press("Save private draft");
      press("Save private draft");
    });
    expect(mockSave).toHaveBeenCalledTimes(1);
    expect(button("Review publication")).toBeDisabled();
    expect(screen.getByLabelText("Public name").props.editable).toBe(false);
    await act(async () =>
      pending.resolve(state({ revision: 5, draft: { ...draft, displayName: "Updated" } }))
    );
  });

  it("serializes publication even when pressed twice immediately", async () => {
    const pending = deferred();
    mockPublish.mockReturnValue(pending.promise);
    render(<PersonalCreatorProfileScreen />);
    await ready();
    press("Review publication");
    act(() => {
      press("Publish reviewed profile");
      press("Publish reviewed profile");
    });
    expect(mockPublish).toHaveBeenCalledTimes(1);
    await act(async () => pending.resolve(state({ revision: 5, published: snapshot })));
  });

  it("retains a stale-save draft and demands explicit discard before reloading server state", async () => {
    mockSave.mockRejectedValue(Object.assign(new Error("Conflict"), { status: 409 }));
    render(<PersonalCreatorProfileScreen />);
    await ready();
    fireEvent.changeText(screen.getByLabelText("About you"), "Keep this unsaved text");
    press("Save private draft");
    await waitFor(() => expect(screen.getByText(/changed in another tab/)).toBeTruthy());
    expect(screen.getByLabelText("About you").props.value).toBe("Keep this unsaved text");
    expect(button("Save private draft")).toBeDisabled();
    expect(button("Review publication")).toBeDisabled();
    press("Reload saved draft");
    expect(mockGet).toHaveBeenCalledTimes(1);
    press("Keep editing");
    expect(screen.getByLabelText("About you").props.value).toBe("Keep this unsaved text");
    press("Reload saved draft");
    press("Discard unsaved edits and reload");
    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(2));
    await ready();
    expect(screen.getByLabelText("About you").props.value).toBe(draft.bio);
  });

  it("allows explicit withdrawal after uncertain publication without assuming success or retrying publish", async () => {
    mockPublish.mockRejectedValue(new Error("Response lost"));
    render(<PersonalCreatorProfileScreen />);
    await ready();
    press("Review publication");
    press("Publish reviewed profile");
    await waitFor(() =>
      expect(screen.getByText(/Publication status needs checking/)).toBeTruthy()
    );
    expect(button("Review publication")).toBeDisabled();
    press("Unpublish creator profile");
    await waitFor(() => expect(mockUnpublish).toHaveBeenCalledTimes(1));
    expect(mockPublish).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(screen.getByText(/Creator profile withdrawn/)).toBeTruthy()
    );
  });

  it("withdraws the published snapshot without losing unsaved local edits or changing videos", async () => {
    mockGet.mockResolvedValue(state({ published: snapshot }));
    render(<PersonalCreatorProfileScreen />);
    await ready();
    fireEvent.changeText(screen.getByLabelText("About you"), "Private work in progress");
    press("Unpublish creator profile");
    await waitFor(() =>
      expect(screen.getByText(/Creator profile withdrawn/)).toBeTruthy()
    );
    expect(screen.getByLabelText("About you").props.value).toBe(
      "Private work in progress"
    );
    expect(screen.getByText(/existing published videos are unchanged/)).toBeTruthy();
    expect(mockSave).not.toHaveBeenCalled();
    expect(button("Save private draft")).not.toBeDisabled();
    expect(screen.queryByRole("button", { name: "View public creator page" })).toBeNull();
  });

  it("does not let withdrawal advance a dirty draft past another tab's newer saved revision", async () => {
    const remoteDraft = { ...draft, bio: "Newer saved edit from another tab" };
    const withdrawn = state({ revision: 7, draft: remoteDraft });
    mockGet
      .mockResolvedValueOnce(state({ published: snapshot }))
      .mockResolvedValue(withdrawn);
    mockUnpublish.mockResolvedValue(withdrawn);
    render(<PersonalCreatorProfileScreen />);
    await ready();
    fireEvent.changeText(screen.getByLabelText("About you"), "My unsaved local work");
    press("Unpublish creator profile");
    await waitFor(() =>
      expect(screen.getByText(/another tab changed the saved draft/)).toBeTruthy()
    );
    expect(screen.getByLabelText("About you").props.value).toBe("My unsaved local work");
    expect(button("Save private draft")).toBeDisabled();
    expect(button("Review publication")).toBeDisabled();
    press("Save private draft");
    expect(mockSave).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "View public creator page" })).toBeNull();
    press("Reload saved draft");
    expect(mockGet).toHaveBeenCalledTimes(1);
    press("Keep editing");
    fireEvent.changeText(
      screen.getByLabelText("About you"),
      "Still my unsaved local work"
    );
    expect(button("Save private draft")).toBeDisabled();
    press("Reload saved draft");
    press("Discard unsaved edits and reload");
    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(2));
    await ready();
    expect(screen.getByLabelText("About you").props.value).toBe(remoteDraft.bio);
    fireEvent.changeText(screen.getByLabelText("About you"), "Reviewed replacement");
    press("Save private draft");
    await waitFor(() =>
      expect(mockSave).toHaveBeenCalledWith(7, {
        ...remoteDraft,
        bio: "Reviewed replacement"
      })
    );
  });

  it("serializes withdrawal and keeps a failed withdrawal visible and recoverable", async () => {
    const pending = deferred();
    mockGet.mockResolvedValue(state({ published: snapshot }));
    mockUnpublish.mockReturnValueOnce(pending.promise);
    render(<PersonalCreatorProfileScreen />);
    await ready();
    act(() => {
      press("Unpublish creator profile");
      press("Unpublish creator profile");
    });
    expect(mockUnpublish).toHaveBeenCalledTimes(1);
    await act(async () => pending.reject(new Error("Response lost")));
    expect(screen.getByText(/result could not be confirmed/)).toBeTruthy();
    expect(screen.getByText(/Publication status needs checking/)).toBeTruthy();
    expect(screen.queryByText(/Published as Synthetic creator/)).toBeNull();
    expect(button("Reload saved draft")).not.toBeDisabled();
    expect(button("Unpublish creator profile")).not.toBeDisabled();
    expect(button("Review publication")).toBeDisabled();
    expect(screen.queryByText(/Creator profile withdrawn/)).toBeNull();
  });

  it("opens only the published creator route with the fixed editor return marker", async () => {
    mockGet.mockResolvedValue(state({ published: snapshot }));
    render(<PersonalCreatorProfileScreen />);
    await ready();
    press("View public creator page");
    expect(mockPush).toHaveBeenCalledWith(
      "/creators/owner-1?from=creator-profile-editor"
    );
    expect(mockPublish).not.toHaveBeenCalled();
  });

  it("bounds links and blocks invalid link saves", async () => {
    mockGet.mockResolvedValue(state({ draft: { ...draft, links: [] } }));
    render(<PersonalCreatorProfileScreen />);
    await ready();
    press("Add link");
    fireEvent.changeText(screen.getByLabelText("Link 1 label"), "Website");
    fireEvent.changeText(screen.getByLabelText("Link 1 address"), "javascript:alert(1)");
    expect(button("Save private draft")).toBeDisabled();
    fireEvent.changeText(
      screen.getByLabelText("Link 1 address"),
      "https://name:password@example.com"
    );
    expect(button("Save private draft")).toBeDisabled();
    fireEvent.changeText(screen.getByLabelText("Link 1 address"), "https://example.com");
    expect(button("Save private draft")).not.toBeDisabled();
    for (let i = 1; i < 8; i++) press("Add link");
    expect(button("Add link")).toBeDisabled();
    expect(screen.getByLabelText("Link 8 label")).toBeTruthy();
    expect(screen.queryByLabelText("Link 9 label")).toBeNull();
    press("Remove link 8");
    expect(button("Add link")).not.toBeDisabled();
  });

  it("discards a late private read when the signed-in account changes", async () => {
    const oldRead = deferred();
    mockGet
      .mockReturnValueOnce(oldRead.promise)
      .mockResolvedValueOnce(
        state({ ownerId: "owner-2", draft: { ...draft, displayName: "Second account" } })
      );
    const view = render(<PersonalCreatorProfileScreen />);
    mockAuth = {
      ...mockAuth,
      token: "session-two",
      user: { id: "owner-2", plan: "free" }
    };
    view.rerender(<PersonalCreatorProfileScreen />);
    await ready();
    await act(async () =>
      oldRead.resolve(state({ draft: { ...draft, displayName: "First account secret" } }))
    );
    expect(screen.getByLabelText("Public name").props.value).toBe("Second account");
    expect(screen.queryByText("First account secret")).toBeNull();
  });

  it("ignores an old account's late save response after a session change", async () => {
    const oldSave = deferred();
    mockSave.mockReturnValue(oldSave.promise);
    const view = render(<PersonalCreatorProfileScreen />);
    await ready();
    fireEvent.changeText(screen.getByLabelText("About you"), "Old account private edit");
    press("Save private draft");
    mockGet.mockResolvedValue(
      state({
        ownerId: "owner-2",
        draft: { ...emptyDraft, displayName: "Second account" }
      })
    );
    mockAuth = { ...mockAuth, token: "session-two", user: { id: "owner-2" } };
    view.rerender(<PersonalCreatorProfileScreen />);
    await ready();
    await act(async () =>
      oldSave.resolve(
        state({ revision: 5, draft: { ...draft, bio: "Old account private edit" } })
      )
    );
    expect(screen.getByLabelText("Public name").props.value).toBe("Second account");
    expect(screen.getByLabelText("About you").props.value).toBe("");
    expect(
      screen.queryByText("Draft saved. Your public profile has not changed.")
    ).toBeNull();
  });
});
