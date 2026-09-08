import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { Pressable, Text, View } from "react-native";

import type { FacilityCourseLiveEvent } from "@/api/facilityCourseLiveEvents";
import { useFacilityCourseLiveEvents } from "@/hooks/useFacilityCourseLiveEvents";

const mockListFacilityCourseLiveEvents = jest.fn();

let mockAuthState: { user: { id?: string; _id?: string } | null };
let mockEntitlementsState: {
  ready: boolean;
  facilityId: string | null;
  facilityRole: string | null;
};
let mockFacilityState: {
  selectedId: string | null;
  selected: { id: string; canonicalFacilityId?: string } | null;
};

jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({
    ...mockAuthState,
    user: mockAuthState.user ? { ...mockAuthState.user } : null
  })
}));

jest.mock("@/entitlements", () => ({
  useEntitlements: () => ({ ...mockEntitlementsState })
}));

jest.mock("@/state/useFacility", () => ({
  useFacility: () => ({
    ...mockFacilityState,
    selected: mockFacilityState.selected ? { ...mockFacilityState.selected } : null
  })
}));

jest.mock("@/api/facilityCourseLiveEvents", () => ({
  listFacilityCourseLiveEvents: (...args: any[]) =>
    mockListFacilityCourseLiveEvents(...args)
}));

function liveEvent(
  sessionId: string,
  facilityId = "facility-public-a"
): FacilityCourseLiveEvent {
  return {
    facilityId,
    workspaceType: "facility",
    courseId: `course-${sessionId}`,
    courseTitle: `Course ${sessionId}`,
    sessionId,
    title: `Live ${sessionId}`,
    scheduledStart: "2026-09-10T18:00:00.000Z",
    scheduledEnd: "2026-09-10T19:00:00.000Z",
    timezone: "America/New_York",
    status: "scheduled",
    reminderPlan: { label: "1 hour before" },
    rsvped: false
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
}

function Probe({ marker = "initial" }: { marker?: string }) {
  const result = useFacilityCourseLiveEvents();
  return (
    <View>
      <Pressable
        accessibilityLabel="refresh Facility course events"
        onPress={() => void result.refresh()}
      />
      <Text testID="marker">{marker}</Text>
      <Text testID="events">
        {result.liveEvents.map((event) => event.sessionId).join(",") || "none"}
      </Text>
      <Text testID="loading">{result.loading ? "loading" : "idle"}</Text>
      <Text testID="error">{result.error || "none"}</Text>
    </View>
  );
}

describe("useFacilityCourseLiveEvents", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthState = { user: { id: "user-a" } };
    mockEntitlementsState = {
      ready: true,
      facilityId: "facility-public-a",
      facilityRole: "VIEWER"
    };
    mockFacilityState = {
      selectedId: "facility-public-a",
      selected: null
    };
    mockListFacilityCourseLiveEvents.mockResolvedValue([]);
  });

  it.each([
    {
      label: "there is no signed-in user",
      arrange: () => {
        mockAuthState = { user: null };
      }
    },
    {
      label: "there is no authoritative Facility scope",
      arrange: () => {
        mockEntitlementsState.facilityId = null;
        mockFacilityState.selectedId = null;
      }
    }
  ])("does not fetch when $label", async ({ arrange }) => {
    arrange();
    const screen = render(<Probe />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockListFacilityCourseLiveEvents).not.toHaveBeenCalled();
    expect(screen.getByTestId("events").props.children).toBe("none");
    expect(screen.getByTestId("loading").props.children).toBe("idle");
    expect(screen.getByTestId("error").props.children).toBe("none");
  });

  it("falls back to the authoritative entitlement Facility on a shared hard reload", async () => {
    mockFacilityState.selectedId = null;
    mockFacilityState.selected = null;
    mockListFacilityCourseLiveEvents.mockResolvedValue([liveEvent("session-a")]);

    const screen = render(<Probe />);

    await waitFor(() =>
      expect(mockListFacilityCourseLiveEvents).toHaveBeenCalledWith("facility-public-a")
    );
    expect(await screen.findByText("session-a")).toBeTruthy();
  });

  it("fails closed when the selected Facility row does not match the entitlement", async () => {
    mockFacilityState = {
      selectedId: "facility-row-b",
      selected: {
        id: "facility-row-b",
        canonicalFacilityId: "facility-public-b"
      }
    };

    const screen = render(<Probe />);

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockListFacilityCourseLiveEvents).not.toHaveBeenCalled();
    expect(screen.getByTestId("events").props.children).toBe("none");
    expect(screen.getByTestId("loading").props.children).toBe("idle");
  });

  it("does not refetch when provider objects change identity but scope values stay stable", async () => {
    mockListFacilityCourseLiveEvents.mockResolvedValue([liveEvent("session-a")]);
    const screen = render(<Probe />);

    expect(await screen.findByText("session-a")).toBeTruthy();
    expect(mockListFacilityCourseLiveEvents).toHaveBeenCalledTimes(1);

    screen.rerender(<Probe marker="rerendered" />);
    expect(screen.getByText("rerendered")).toBeTruthy();
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockListFacilityCourseLiveEvents).toHaveBeenCalledTimes(1);
  });

  it("single-flights refresh calls for the same user and Facility", async () => {
    const request = deferred<FacilityCourseLiveEvent[]>();
    mockListFacilityCourseLiveEvents.mockReturnValue(request.promise);
    const screen = render(<Probe />);
    await waitFor(() =>
      expect(mockListFacilityCourseLiveEvents).toHaveBeenCalledTimes(1)
    );

    fireEvent.press(screen.getByLabelText("refresh Facility course events"));
    fireEvent.press(screen.getByLabelText("refresh Facility course events"));
    expect(mockListFacilityCourseLiveEvents).toHaveBeenCalledTimes(1);

    await act(async () => {
      request.resolve([liveEvent("session-a")]);
      await request.promise;
    });
    expect(screen.getByTestId("events").props.children).toBe("session-a");
  });

  it("discards a stale result after the signed-in user and Facility switch", async () => {
    const first = deferred<FacilityCourseLiveEvent[]>();
    const second = deferred<FacilityCourseLiveEvent[]>();
    mockListFacilityCourseLiveEvents
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const screen = render(<Probe />);
    await waitFor(() =>
      expect(mockListFacilityCourseLiveEvents).toHaveBeenCalledTimes(1)
    );

    mockAuthState = { user: { id: "user-b" } };
    mockEntitlementsState = {
      ready: true,
      facilityId: "facility-public-b",
      facilityRole: "STAFF"
    };
    mockFacilityState = {
      selectedId: "facility-public-b",
      selected: null
    };
    screen.rerender(<Probe marker="facility-b" />);
    await waitFor(() =>
      expect(mockListFacilityCourseLiveEvents).toHaveBeenCalledTimes(2)
    );

    await act(async () => {
      first.resolve([liveEvent("session-a", "facility-public-a")]);
      await first.promise;
    });
    expect(screen.getByTestId("events").props.children).toBe("none");
    expect(screen.getByTestId("loading").props.children).toBe("loading");

    await act(async () => {
      second.resolve([liveEvent("session-b", "facility-public-b")]);
      await second.promise;
    });
    expect(screen.getByTestId("events").props.children).toBe("session-b");
    expect(mockListFacilityCourseLiveEvents.mock.calls[1]).toEqual(["facility-public-b"]);
  });

  it("discards a stale error after the signed-in user and Facility switch", async () => {
    const first = deferred<FacilityCourseLiveEvent[]>();
    const second = deferred<FacilityCourseLiveEvent[]>();
    mockListFacilityCourseLiveEvents
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const screen = render(<Probe />);
    await waitFor(() =>
      expect(mockListFacilityCourseLiveEvents).toHaveBeenCalledTimes(1)
    );

    mockAuthState = { user: { id: "user-b" } };
    mockEntitlementsState = {
      ready: true,
      facilityId: "facility-public-b",
      facilityRole: "VIEWER"
    };
    mockFacilityState = {
      selectedId: "facility-public-b",
      selected: null
    };
    screen.rerender(<Probe marker="facility-b" />);
    await waitFor(() =>
      expect(mockListFacilityCourseLiveEvents).toHaveBeenCalledTimes(2)
    );

    await act(async () => {
      first.reject(new Error("old Facility failed"));
      await first.promise.catch(() => undefined);
    });
    expect(screen.getByTestId("error").props.children).toBe("none");
    expect(screen.getByTestId("loading").props.children).toBe("loading");

    await act(async () => {
      second.resolve([liveEvent("session-b", "facility-public-b")]);
      await second.promise;
    });
    expect(screen.getByTestId("events").props.children).toBe("session-b");
    expect(screen.getByTestId("error").props.children).toBe("none");
  });

  it("clears Facility events immediately on logout without another request", async () => {
    mockListFacilityCourseLiveEvents.mockResolvedValue([liveEvent("session-a")]);
    const screen = render(<Probe />);
    expect(await screen.findByText("session-a")).toBeTruthy();
    expect(mockListFacilityCourseLiveEvents).toHaveBeenCalledTimes(1);

    mockAuthState = { user: null };
    screen.rerender(<Probe marker="logged-out" />);

    await waitFor(() => expect(screen.getByTestId("events").props.children).toBe("none"));
    expect(screen.getByTestId("loading").props.children).toBe("idle");
    expect(screen.getByTestId("error").props.children).toBe("none");
    expect(mockListFacilityCourseLiveEvents).toHaveBeenCalledTimes(1);
  });
});
