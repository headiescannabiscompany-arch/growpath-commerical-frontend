import React from "react";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { AppState, type AppStateStatus } from "react-native";
import { apiRequest } from "@/api/apiRequest";
import {
  getPublicMarketingObservations,
  selectPublicMarketingObservations
} from "@/api/publicMarketingActivity";
import PublicCommunityActivity from "@/components/marketing/PublicCommunityActivity";

jest.mock("@/api/apiRequest", () => ({ apiRequest: jest.fn() }));
jest.mock("expo-router", () => ({
  Link: ({ children, ...props }: any) =>
    require("react").createElement(
      require("react-native").Text,
      { ...props, accessibilityRole: "link" },
      children
    )
}));
const published = {
  title: "Basil flowers",
  publishedAt: "2026-08-26T00:14:18.765Z",
  study: { slug: "garden-observations" },
  notes: "Private working note must not pass through",
  location: { latitude: 1, longitude: 2 },
  photoUrls: ["https://example.invalid/private.jpg"],
  ownerId: "private-owner"
};

describe("anonymous marketing activity projection", () => {
  it("returns only a title, publication date and rebuilt public link", () => {
    expect(selectPublicMarketingObservations({ observations: [published] })).toEqual([
      {
        title: published.title,
        publishedAt: published.publishedAt,
        href: "/field-observations/garden-observations"
      }
    ]);
  });
  it.each([
    { title: "QA synthetic demo" },
    { study: { slug: "test-fixture" } },
    { publication: { status: "draft" } },
    { publication: { status: "withdrawn" } },
    { study: { slug: "garden", visibility: "private" } },
    { study: { slug: "garden", status: "archived" } },
    { study: { slug: "https://example.invalid" } },
    { study: { slug: "../private" } },
    { title: "x".repeat(161) },
    { title: "Bad\ncontrol" },
    { publishedAt: "invalid" },
    { publishedAt: "2026-08-26" },
    { publishedAt: "2099-01-01T00:00:00Z" },
    { publishedAt: undefined }
  ])("omits ineligible or malformed records %j", (overrides) => {
    expect(
      selectPublicMarketingObservations({
        observations: [{ ...published, ...overrides }]
      })
    ).toEqual([]);
  });
  it("deduplicates, orders by actual publication date, and bounds the slice", () => {
    const rows = [1, 2, 3, 4].map((day) => ({
      ...published,
      publishedAt: `2026-08-0${day}T00:00:00Z`
    }));
    const result = selectPublicMarketingObservations({
      data: { observations: [...rows, rows[3]] }
    });
    expect(result).toHaveLength(3);
    expect(result.map((row) => row.publishedAt)).toEqual(
      rows
        .slice(1)
        .reverse()
        .map((row) => row.publishedAt)
    );
    expect(selectPublicMarketingObservations({ observations: {} })).toEqual([]);
  });
  it("uses a bounded anonymous request without global session or banner effects", async () => {
    jest.mocked(apiRequest).mockResolvedValue({ observations: [published] });
    const controller = new AbortController();
    await getPublicMarketingObservations(controller.signal);
    expect(apiRequest).toHaveBeenCalledWith("/api/personal/field-studies/public", {
      auth: false,
      params: { limit: 3 },
      signal: controller.signal,
      timeoutMs: 8000,
      retries: 0,
      cache: "no-store",
      notifyTransport: false,
      invalidateOn401: false
    });
  });
  it("reports malformed API responses as unavailable rather than an empty community", async () => {
    jest.mocked(apiRequest).mockResolvedValue({ unexpected: [] });
    await expect(getPublicMarketingObservations()).rejects.toThrow(
      "Public observations are unavailable."
    );
  });
});

describe("public activity lifecycle", () => {
  let onState: (state: AppStateStatus) => void;
  const remove = jest.fn();
  beforeEach(() => {
    jest.spyOn(AppState, "addEventListener").mockImplementation((_event, callback) => {
      onState = callback;
      return { remove };
    });
  });
  it("shows actual dates and directory links without presenting endorsements", async () => {
    jest.mocked(apiRequest).mockResolvedValue({ observations: [published] });
    const screen = render(<PublicCommunityActivity />);
    expect(await screen.findByText("Basil flowers")).toBeTruthy();
    expect(screen.getByText("Published Aug 26, 2026")).toBeTruthy();
    expect(
      screen.getByText(/not customer reviews or verified growing results/)
    ).toBeTruthy();
    expect(screen.getByText("Open Forum discussions — sign in required")).toBeTruthy();
    expect(JSON.stringify(screen.toJSON())).not.toContain("Private working note");
  });
  it("keeps an empty feed honest", async () => {
    jest.mocked(apiRequest).mockResolvedValue({ observations: [] });
    const screen = render(<PublicCommunityActivity />);
    expect(
      await screen.findByText("No public observations to show here yet.")
    ).toBeTruthy();
    expect(screen.queryByText("From public field observations")).toBeNull();
  });
  it("recovers a failed public read with one explicit retry", async () => {
    jest
      .mocked(apiRequest)
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ observations: [published] });
    const screen = render(<PublicCommunityActivity />);
    fireEvent.press(
      await screen.findByRole("button", { name: "Retry public observations" })
    );
    expect(await screen.findByText("Basil flowers")).toBeTruthy();
    expect(apiRequest).toHaveBeenCalledTimes(2);
    expect(
      screen.queryByText("Public observations are temporarily unavailable.")
    ).toBeNull();
  });
  it("clears old public records in background and refreshes withdrawal on return", async () => {
    jest
      .mocked(apiRequest)
      .mockResolvedValueOnce({ observations: [published] })
      .mockResolvedValueOnce({ observations: [] });
    const screen = render(<PublicCommunityActivity />);
    await screen.findByText("Basil flowers");
    act(() => onState("background"));
    expect(screen.queryByText("Basil flowers")).toBeNull();
    act(() => onState("active"));
    expect(
      await screen.findByText("No public observations to show here yet.")
    ).toBeTruthy();
  });
  it("aborts and ignores late stale reads, including unmount", async () => {
    let finish: (value: unknown) => void = () => {};
    jest
      .mocked(apiRequest)
      .mockReturnValueOnce(
        new Promise((resolve) => {
          finish = resolve;
        })
      )
      .mockResolvedValueOnce({ observations: [] });
    const screen = render(<PublicCommunityActivity />);
    const signal = jest.mocked(apiRequest).mock.calls[0][1]?.signal;
    act(() => {
      onState("background");
      onState("active");
    });
    await screen.findByText("No public observations to show here yet.");
    await act(async () => finish({ observations: [published] }));
    expect(signal?.aborted).toBe(true);
    expect(screen.queryByText("Basil flowers")).toBeNull();
    screen.unmount();
    await waitFor(() => expect(remove).toHaveBeenCalled());
  });
});
