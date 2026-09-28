import React from "react";
import { act, fireEvent, render } from "@testing-library/react-native";
import { FlatList } from "react-native";

import MarketplacePurchasedLibrary from "@/components/commerce/MarketplacePurchasedLibrary";
import type { MarketplacePurchaseLibrary } from "@/api/marketplaceBuyer";

const mockPurchases = jest.fn();
const mockDownload = jest.fn();
const mockBack = jest.fn();
let mockUser: { id: string } | null = { id: "buyer-1" };

jest.mock("@/auth/AuthContext", () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock("@/api/marketplaceBuyer", () => ({
  getMarketplacePurchases: (...args: unknown[]) => mockPurchases(...args)
}));
jest.mock("@/utils/marketplaceDownload", () => ({
  downloadAndSaveMarketplaceContent: (...args: unknown[]) => mockDownload(...args)
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function library(ids: string[] = [], pages = 1): MarketplacePurchaseLibrary {
  return {
    purchases: ids.map((id) => ({
      purchaseId: `purchase-${id}`,
      upload: { id, title: `Guide ${id}`, price: 10 }
    })),
    pagination: { pages }
  };
}

const emptyText = "No purchased storefront offers found.";
const retryLabel = "Retry loading purchased offers";
const loadingText = "Loading purchased offers...";
const showLibrary = () => render(<MarketplacePurchasedLibrary onBack={mockBack} />);

describe("Purchased library readiness and retry", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockUser = { id: "buyer-1" };
    mockPurchases.mockReset().mockResolvedValue(library());
    mockDownload.mockReset().mockResolvedValue(undefined);
    mockBack.mockReset();
  });

  afterEach(() => {
    act(() => jest.runOnlyPendingTimers());
    jest.useRealTimers();
  });

  it("distinguishes pending initial load from a verified empty library", async () => {
    const request = deferred<MarketplacePurchaseLibrary>();
    mockPurchases.mockReturnValue(request.promise);
    const screen = showLibrary();

    expect(screen.getByText(loadingText)).toBeTruthy();
    expect(screen.queryByText(emptyText)).toBeNull();
    expect(screen.queryByLabelText(retryLabel)).toBeNull();
    await act(async () => request.resolve(library()));
    expect(screen.getByText(emptyText)).toBeTruthy();
    expect(screen.queryByText(loadingText)).toBeNull();
    expect(mockDownload).not.toHaveBeenCalled();
  });

  it.each([
    [401, "Not authenticated"],
    [503, "Service unavailable"]
  ])(
    "does not describe HTTP %s as an empty purchase history",
    async (status, message) => {
      mockPurchases.mockRejectedValue(Object.assign(new Error(message), { status }));
      const screen = showLibrary();

      await screen.findByText(message);
      expect(screen.queryByText(emptyText)).toBeNull();
      expect(screen.getByLabelText(retryLabel)).toBeTruthy();
      expect(screen.queryByText(loadingText)).toBeNull();
      fireEvent.press(screen.getByLabelText("Back to storefront offers"));
      expect(mockBack).toHaveBeenCalledTimes(1);
      expect(mockDownload).not.toHaveBeenCalled();
    }
  );

  it.each([false, true])(
    "retries deliberately and recovers to populated=%s",
    async (populated) => {
      mockPurchases.mockRejectedValueOnce(new Error("Not authenticated"));
      const screen = showLibrary();
      await screen.findByText("Not authenticated");
      const retry = deferred<MarketplacePurchaseLibrary>();
      mockPurchases.mockReturnValueOnce(retry.promise);

      fireEvent.press(screen.getByLabelText(retryLabel));
      expect(screen.getByText(loadingText)).toBeTruthy();
      expect(screen.queryByText("Not authenticated")).toBeNull();
      expect(screen.queryByText(emptyText)).toBeNull();
      expect(screen.queryByLabelText(retryLabel)).toBeNull();
      expect(mockPurchases).toHaveBeenLastCalledWith(1, 20);

      await act(async () => retry.resolve(library(populated ? ["one"] : [])));
      expect(screen.queryByText(loadingText)).toBeNull();
      expect(screen.queryByLabelText(retryLabel)).toBeNull();
      if (populated) {
        expect(screen.getByText("Guide one")).toBeTruthy();
        expect(screen.queryByText(emptyText)).toBeNull();
      } else {
        expect(screen.getByText(emptyText)).toBeTruthy();
      }
      expect(mockDownload).not.toHaveBeenCalled();
    }
  );

  it("retains explicit recovery after a second failed list attempt", async () => {
    mockPurchases.mockRejectedValueOnce(new Error("Not authenticated"));
    const screen = showLibrary();
    await screen.findByText("Not authenticated");
    const retry = deferred<MarketplacePurchaseLibrary>();
    mockPurchases.mockReturnValueOnce(retry.promise);
    fireEvent.press(screen.getByLabelText(retryLabel));
    await act(async () => retry.reject(new Error("Service unavailable")));

    expect(screen.getByText("Service unavailable")).toBeTruthy();
    expect(screen.getByLabelText(retryLabel)).toBeTruthy();
    expect(screen.queryByText(emptyText)).toBeNull();
    expect(screen.queryByText(loadingText)).toBeNull();
    expect(mockPurchases).toHaveBeenCalledTimes(2);
    expect(mockDownload).not.toHaveBeenCalled();
  });

  it("retains loaded rows and retries the same failed pagination page once", async () => {
    mockPurchases.mockResolvedValueOnce(library(["one"], 3));
    const screen = showLibrary();
    await screen.findByText("Guide one");
    mockPurchases.mockRejectedValueOnce(new Error("Page two unavailable"));
    fireEvent(screen.UNSAFE_getByType(FlatList), "onEndReached");
    await screen.findByText("Page two unavailable");

    expect(screen.getByText("Guide one")).toBeTruthy();
    expect(screen.queryByText(emptyText)).toBeNull();
    expect(mockPurchases).toHaveBeenLastCalledWith(2, 20);
    fireEvent(screen.UNSAFE_getByType(FlatList), "onEndReached");
    expect(mockPurchases).toHaveBeenCalledTimes(2);
    const retry = deferred<MarketplacePurchaseLibrary>();
    mockPurchases.mockReturnValueOnce(retry.promise);
    const retryButton = screen.getByLabelText(retryLabel);
    act(() => {
      fireEvent.press(retryButton);
      fireEvent.press(retryButton);
    });
    expect(mockPurchases).toHaveBeenCalledTimes(3);
    expect(mockPurchases).toHaveBeenLastCalledWith(2, 20);
    expect(screen.getByText("Guide one")).toBeTruthy();
    expect(screen.queryByText(emptyText)).toBeNull();
    await act(async () => retry.resolve(library(["two"], 3)));
    expect(screen.getAllByText("Guide one")).toHaveLength(1);
    expect(screen.getAllByText("Guide two")).toHaveLength(1);
    mockPurchases.mockResolvedValueOnce(library(["three"], 3));
    fireEvent(screen.UNSAFE_getByType(FlatList), "onEndReached");
    await screen.findByText("Guide three");
    expect(mockPurchases).toHaveBeenLastCalledWith(3, 20);
    expect(mockDownload).not.toHaveBeenCalled();
  });

  it("keeps successful refresh results and failed page-one refresh semantics truthful", async () => {
    mockPurchases.mockResolvedValueOnce(library(["one"], 2));
    const screen = showLibrary();
    await screen.findByText("Guide one");
    const refresh = deferred<MarketplacePurchaseLibrary>();
    mockPurchases.mockReturnValueOnce(refresh.promise);
    act(() => screen.UNSAFE_getByType(FlatList).props.refreshControl.props.onRefresh());
    expect(screen.getByText("Guide one")).toBeTruthy();
    expect(screen.queryByText(emptyText)).toBeNull();
    await act(async () => refresh.reject(new Error("Refresh unavailable")));
    expect(screen.getByText("Refresh unavailable")).toBeTruthy();
    expect(screen.queryByText("Guide one")).toBeNull();
    expect(screen.queryByText(emptyText)).toBeNull();

    mockPurchases.mockResolvedValueOnce(library(["replacement"]));
    fireEvent.press(screen.getByLabelText(retryLabel));
    await screen.findByText("Guide replacement");
    expect(mockPurchases).toHaveBeenLastCalledWith(1, 20);
    expect(screen.queryByText("Guide one")).toBeNull();
    expect(screen.queryByLabelText(retryLabel)).toBeNull();
  });

  it("does not treat a download error as a list failure or retry a download", async () => {
    mockPurchases.mockResolvedValue(library(["one"]));
    mockDownload.mockRejectedValueOnce(new Error("Download access denied"));
    const screen = showLibrary();
    fireEvent.press(await screen.findByLabelText("Download Guide one"));
    await screen.findByText("Download access denied");

    expect(screen.getByText("Guide one")).toBeTruthy();
    expect(screen.queryByLabelText(retryLabel)).toBeNull();
    expect(screen.queryByText(emptyText)).toBeNull();
    expect(mockPurchases).toHaveBeenCalledTimes(1);
    expect(mockDownload).toHaveBeenCalledTimes(1);
    expect(mockDownload).toHaveBeenCalledWith("one", {
      signal: expect.any(AbortSignal),
      allowLegacyExternal: false
    });
  });

  it("keeps a pagination failure retry available while a retained item downloads", async () => {
    mockPurchases.mockResolvedValueOnce(library(["one"], 2));
    const screen = showLibrary();
    await screen.findByText("Guide one");
    mockPurchases.mockRejectedValueOnce(new Error("Page two unavailable"));
    fireEvent(screen.UNSAFE_getByType(FlatList), "onEndReached");
    await screen.findByText("Page two unavailable");
    fireEvent.press(screen.getByLabelText("Download Guide one"));
    await screen.findByText("The authorized download was opened.");

    expect(screen.getByText("Page two unavailable")).toBeTruthy();
    expect(screen.getByLabelText(retryLabel)).toBeTruthy();
    expect(mockPurchases).toHaveBeenCalledTimes(2);
    expect(mockDownload).toHaveBeenCalledTimes(1);
  });

  it.each(["success", "failure"])(
    "ignores an old account's late list %s",
    async (result) => {
      const previous = deferred<MarketplacePurchaseLibrary>();
      mockPurchases.mockReturnValueOnce(previous.promise);
      const screen = showLibrary();
      mockUser = { id: "buyer-2" };
      mockPurchases.mockResolvedValueOnce(library(["current"]));
      screen.rerender(<MarketplacePurchasedLibrary onBack={mockBack} />);
      await screen.findByText("Guide current");
      await act(async () => {
        if (result === "success") previous.resolve(library(["previous"]));
        else previous.reject(new Error("Previous account unavailable"));
      });
      expect(screen.getByText("Guide current")).toBeTruthy();
      expect(screen.queryByText("Guide previous")).toBeNull();
      expect(screen.queryByText("Previous account unavailable")).toBeNull();
      expect(screen.queryByLabelText(retryLabel)).toBeNull();
    }
  );

  it("clears old account failure and retry state when the identity changes", async () => {
    mockPurchases.mockRejectedValueOnce(new Error("Previous account unavailable"));
    const screen = showLibrary();
    await screen.findByText("Previous account unavailable");
    mockUser = null;
    const next = deferred<MarketplacePurchaseLibrary>();
    mockPurchases.mockReturnValueOnce(next.promise);
    screen.rerender(<MarketplacePurchasedLibrary onBack={mockBack} />);
    expect(screen.queryByText("Previous account unavailable")).toBeNull();
    expect(screen.queryByLabelText(retryLabel)).toBeNull();
    expect(screen.queryByText(emptyText)).toBeNull();
    await act(async () => next.reject(new Error("Not authenticated")));
    expect(screen.getByText("Not authenticated")).toBeTruthy();
    expect(screen.queryByText(emptyText)).toBeNull();
  });

  it.each(["success", "failure"])(
    "ignores a late list %s after unmount",
    async (result) => {
      const request = deferred<MarketplacePurchaseLibrary>();
      mockPurchases.mockReturnValueOnce(request.promise);
      const screen = showLibrary();
      screen.unmount();
      await act(async () => {
        if (result === "success") request.resolve(library(["old"]));
        else request.reject(new Error("Unavailable after unmount"));
      });
      expect(mockPurchases).toHaveBeenCalledTimes(1);
      expect(mockDownload).not.toHaveBeenCalled();
    }
  );

  it.each(["account change", "unmount"])(
    "aborts an active download on %s",
    async (reason) => {
      mockPurchases.mockResolvedValueOnce(library(["one"]));
      const download = deferred<void>();
      mockDownload.mockReturnValueOnce(download.promise);
      const screen = showLibrary();
      fireEvent.press(await screen.findByLabelText("Download Guide one"));
      const signal = mockDownload.mock.calls[0][1].signal as AbortSignal;
      expect(signal.aborted).toBe(false);
      if (reason === "account change") {
        mockUser = { id: "buyer-2" };
        mockPurchases.mockResolvedValueOnce(library());
        screen.rerender(<MarketplacePurchasedLibrary onBack={mockBack} />);
        await screen.findByText(emptyText);
      } else {
        screen.unmount();
      }
      expect(signal.aborted).toBe(true);
      await act(async () => download.resolve(undefined));
      if (reason === "account change") {
        expect(screen.queryByText("The authorized download was opened.")).toBeNull();
        expect(screen.queryByLabelText(retryLabel)).toBeNull();
      }
      expect(mockDownload).toHaveBeenCalledTimes(1);
    }
  );
});
