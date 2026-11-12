import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import { ApiError } from "@/api/apiRequest";
import GrowOverviewScreen from "@/app/home/personal/(tabs)/grows/[growId]";

let mockAccountId = "account-1";
const mockGetPersonalGrowTimeline = jest.fn();
const mockListPersonalGrows = jest.fn();
const mockListPersonalLogs = jest.fn();
const mockListPersonalTasks = jest.fn();
const mockListToolRuns = jest.fn();

jest.mock("@/auth/AuthContext", () => ({
  ...jest.requireActual("@/auth/AuthContext"),
  useAuth: () => ({ user: { id: mockAccountId } }),
  useOptionalAuth: () => ({ user: { id: mockAccountId } })
}));

jest.mock("@/api/grows", () => ({
  getPersonalGrowTimeline: (...args: any[]) => mockGetPersonalGrowTimeline(...args),
  listPersonalGrows: (...args: any[]) => mockListPersonalGrows(...args)
}));

jest.mock("@/api/logs", () => ({
  listPersonalLogs: (...args: any[]) => mockListPersonalLogs(...args)
}));

jest.mock("@/api/tasks", () => ({
  listPersonalTasks: (...args: any[]) => mockListPersonalTasks(...args)
}));

jest.mock("@/api/toolRuns", () => ({
  listToolRuns: (...args: any[]) => mockListToolRuns(...args)
}));

jest.mock("expo-router", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    useLocalSearchParams: () => ({ growId: "grow-1" }),
    useRouter: () => ({
      back: jest.fn(),
      replace: jest.fn(),
      canGoBack: () => false
    }),
    Link: ({ children, href }: any) =>
      React.createElement(
        React.Fragment,
        null,
        children,
        React.createElement(Text, { accessibilityLabel: `Overview link ${href}` })
      )
  };
});

jest.mock("@react-navigation/native", () => {
  const React = require("react");
  return {
    useFocusEffect: (callback: any) => {
      React.useEffect(() => callback(), [callback]);
    }
  };
});

jest.mock("@/components/feed/PersonalFeedPlacement", () => {
  const { View } = require("react-native");
  return function MockPersonalFeedPlacement() {
    return <View testID="personal-feed-placement" />;
  };
});

jest.mock("@/components/personal/GrowWorkspaceNav", () => {
  const { View } = require("react-native");
  return function MockGrowWorkspaceNav() {
    return <View testID="grow-workspace-nav" />;
  };
});

describe("GrowOverviewScreen", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockAccountId = "account-1";
    mockListPersonalGrows.mockResolvedValue([
      {
        id: "grow-1",
        name: "Connected Run",
        status: "flowering",
        cropCommonName: "Tomato",
        scientificName: "Solanum lycopersicum",
        cultivar: "Sungold",
        commonNames: ["Garden tomato"],
        planning: {
          lifeSpanPath: "climate_dependent_perennial",
          productionPattern: "cultivar_dependent",
          dormancyPattern: "climate_dependent"
        },
        growTags: ["Cannabis", "Indoor"],
        growInterests: { crops: ["Cannabis"], environment: ["Indoor"] },
        updatedAt: "2026-07-07T00:00:00.000Z"
      }
    ]);
    mockListPersonalLogs.mockResolvedValue([{ id: "log-1" }]);
    mockListPersonalTasks.mockResolvedValue([{ id: "task-1" }]);
    mockListToolRuns.mockResolvedValue([{ id: "run-1" }]);
    mockGetPersonalGrowTimeline.mockResolvedValue([
      {
        id: "ProductBatch:batch-linked-1",
        type: "product_batch",
        sourceModel: "ProductBatch",
        sourceId: "",
        sourceType: "product_batch",
        linkedProductBatchId: "batch-linked-1",
        title: "Batch follow-up saved",
        summary: "Linked product batch timeline event.",
        timestamp: "2026-07-07T12:00:00.000Z"
      },
      {
        id: "Task:task-linked-1",
        type: "task_created",
        sourceModel: "Task",
        sourceId: "",
        growId: "grow-1",
        linkedGrowId: "grow-1",
        linkedTaskId: "task-linked-1",
        title: "Topdress follow-up",
        summary: "Recipe-created task.",
        timestamp: "2026-07-07T13:00:00.000Z"
      },
      {
        id: "FeedCampaign:campaign-linked-1",
        type: "campaign",
        sourceModel: "FeedCampaign",
        sourceId: "",
        linkedFeedCampaignId: "campaign-linked-1",
        title: "Course campaign attached",
        summary: "Linked campaign timeline event.",
        timestamp: "2026-07-07T14:00:00.000Z"
      },
      {
        id: "GrowLog:log-1",
        type: "log_created",
        sourceModel: "GrowLog",
        sourceId: "log-1",
        title: "Legacy journal preview",
        summary: "Legacy rows stay display-only in overview.",
        timestamp: "2026-07-07T15:00:00.000Z"
      }
    ]);
  });

  it("retries a failed grow read and recovers the same overview", async () => {
    let rejectRead!: (error: ApiError) => void;
    mockListPersonalGrows.mockReturnValueOnce(new Promise((_, reject) => {
      rejectRead = reject;
    }));

    const screen = render(<GrowOverviewScreen />);
    await act(async () => {
      rejectRead(new ApiError("NETWORK_ERROR", null));
    });
    expect(screen.getByText("Could not load this grow")).toBeTruthy();
    expect(screen.queryByText(/^Status:/)).toBeNull();
    expect(screen.queryByText("Recent timeline")).toBeNull();
    expect(screen.queryByTestId("grow-workspace-nav")).toBeNull();
    expect(mockGetPersonalGrowTimeline).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "Retry" }));
    });

    expect(screen.getByText("Connected Run")).toBeTruthy();
    expect(screen.queryByText("Could not load this grow")).toBeNull();
    expect(screen.getByTestId("grow-workspace-nav")).toBeTruthy();
    expect(mockListPersonalGrows).toHaveBeenCalledTimes(2);
    expect(mockListPersonalGrows).toHaveBeenNthCalledWith(1, { verifyRecords: true });
    expect(mockListPersonalGrows).toHaveBeenNthCalledWith(2, { verifyRecords: true });
    expect(mockGetPersonalGrowTimeline).toHaveBeenCalledWith("grow-1");
    expect(mockListToolRuns).toHaveBeenCalledWith({ growId: "grow-1", workspaceType: "personal" });
  });

  it("shows unavailability when the verified Personal list has no matching grow", async () => {
    mockListPersonalGrows.mockResolvedValueOnce([{ id: "grow-2", name: "Other grow" }]);

    const screen = render(<GrowOverviewScreen />);
    expect(await screen.findByText("Grow unavailable")).toBeTruthy();
    expect(screen.queryByText("Other grow")).toBeNull();
    expect(screen.queryByText(/^Status:/)).toBeNull();
    expect(screen.queryByTestId("grow-workspace-nav")).toBeNull();
    expect(mockGetPersonalGrowTimeline).not.toHaveBeenCalled();
  });

  it("ignores an earlier account's pending read for the same grow ID", async () => {
    let finishPreviousRead!: (rows: { id: string; name: string }[]) => void;
    mockListPersonalGrows.mockReturnValueOnce(new Promise((resolve) => {
      finishPreviousRead = resolve;
    }));

    const screen = render(<GrowOverviewScreen />);
    await waitFor(() => expect(mockListPersonalGrows).toHaveBeenCalledTimes(1));

    mockAccountId = "account-2";
    screen.rerender(<GrowOverviewScreen />);
    expect(await screen.findByText("Connected Run")).toBeTruthy();

    await act(async () => {
      finishPreviousRead([{ id: "grow-1", name: "Previous account grow" }]);
    });

    expect(screen.queryByText("Previous account grow")).toBeNull();
    expect(screen.getByText("Connected Run")).toBeTruthy();
  });

  it("opens explicit linked timeline preview sources with the shared source resolver", async () => {
    const screen = render(<GrowOverviewScreen />);

    await waitFor(() =>
      expect(mockGetPersonalGrowTimeline).toHaveBeenCalledWith("grow-1")
    );

    expect(screen.getByText("Connected Run")).toBeTruthy();
    expect(screen.getByText("Crop identity and lifecycle")).toBeTruthy();
    expect(screen.getByText("Tomato")).toBeTruthy();
    expect(screen.getByText("Solanum lycopersicum")).toBeTruthy();
    expect(screen.getByText("Sungold")).toBeTruthy();
    expect(screen.getByText("Tender perennial / climate-dependent")).toBeTruthy();
    expect(screen.getByText("Depends on cultivar / growth habit")).toBeTruthy();
    expect(screen.getByText("Other names: Garden tomato")).toBeTruthy();
    expect(
      screen.getByLabelText(
        "Overview link /home/personal/tools/auto-grow-calendar?growId=grow-1"
      )
    ).toBeTruthy();
    expect(screen.getByText("Pheno / Genetics")).toBeTruthy();
    expect(screen.getByText("Harvest / Diagnosis")).toBeTruthy();
    expect(screen.getByLabelText("Pheno Matrix from grow_detail_pheno")).toBeTruthy();
    expect(
      screen.getByLabelText("Harvest Readiness from grow_detail_harvest")
    ).toBeTruthy();
    expect(screen.getByText("Batch follow-up saved")).toBeTruthy();
    expect(screen.getByText("Topdress follow-up")).toBeTruthy();
    expect(screen.getByText("Course campaign attached")).toBeTruthy();
    expect(screen.getByLabelText("Overview link /store?q=batch-linked-1")).toBeTruthy();
    expect(
      screen.getAllByLabelText("Overview link /home/personal/grows/grow-1/tasks").length
    ).toBeGreaterThan(0);
    expect(
      screen.getByLabelText("Overview link /feed?campaignId=campaign-linked-1")
    ).toBeTruthy();
    expect(screen.queryByLabelText("Overview link /home/personal/logs/log-1")).toBeNull();
  });

  it("restores harvest links from saved cannabis workflow evidence on a legacy grow", async () => {
    mockListPersonalGrows.mockResolvedValue([
      {
        id: "grow-1",
        name: "Legacy grow",
        updatedAt: "2026-07-20T00:00:00.000Z"
      }
    ]);
    mockListToolRuns.mockResolvedValue([
      {
        id: "run-harvest",
        growId: "grow-1",
        toolName: "harvest_readiness"
      }
    ]);

    const screen = render(<GrowOverviewScreen />);

    await waitFor(() => expect(screen.getByText("Harvest / Diagnosis")).toBeTruthy());
    expect(
      screen.getByLabelText("Harvest Readiness from grow_detail_harvest")
    ).toBeTruthy();
  });
});
