import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import ProductCatalog, { publicCatalogRows } from "@/app/products";
import { getRoutePolicy } from "@/navigation/routeAccess";
import { metadataForPathname } from "@/seo/publicRouteMetadata";

const mockDiscover = jest.fn();
jest.mock("@/api/storefront", () => ({
  discoverPublicProductsAndTrials: (...args: any[]) => mockDiscover(...args)
}));
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({}),
  Link: ({ children, href }: any) => require("react").cloneElement(children, { href })
}));
jest.mock("@/components/layout/AppPage", () => ({
  __esModule: true,
  default: ({ children, header }: any) => (
    <>
      {header}
      {children}
    </>
  )
}));
jest.mock("@/components/layout/AppCard", () => ({
  __esModule: true,
  default: ({ children }: any) => <>{children}</>
}));
jest.mock("@/theme/appTheme", () => {
  const actual = jest.requireActual("@/theme/appTheme");
  return {
    ...actual,
    useAppTheme: () => ({ palette: actual.getThemePalette("day", "light") })
  };
});
const hats = Array.from({ length: 24 }, (_, index) => ({
  id: String(index).padStart(24, "0"),
  name: `Published hat ${index + 1}`,
  discoveryType: "product",
  storefrontSlug: "growpathai",
  storefrontName: "GrowPathAI",
  purchaseIntentEnabled: true
}));
beforeEach(() => {
  mockDiscover.mockReset();
});

it("is public without granting seller permissions", () => {
  expect(getRoutePolicy("/products")).toBeNull();
  expect(metadataForPathname("/products").title).toBe(
    "Products, Offers & Trials | GrowPathAI"
  );
  expect(getRoutePolicy("/home/commercial/products/new")).not.toBeNull();
});

it("uses all returned public products rather than the shortened discovery mix", async () => {
  mockDiscover.mockResolvedValue({
    products: hats,
    trials: [],
    items: hats.slice(0, 12)
  });
  const screen = render(<ProductCatalog />);
  await waitFor(() => expect(screen.getByText("24 results")).toBeTruthy());
  expect(screen.getByText("Published hat 24")).toBeTruthy();
  expect(screen.getByLabelText("Open Published hat 24").props.href).toBe(
    "/store/growpathai/products/000000000000000000000023"
  );
  expect(screen.getAllByText("All products from GrowPathAI")).toHaveLength(24);
  expect(screen.getAllByText("Interest only · Not for sale")).toHaveLength(24);
  expect(screen.queryByText("Buy now")).toBeNull();
  fireEvent.changeText(screen.getByLabelText("Search products"), "sage");
  fireEvent.press(screen.getByRole("button", { name: "Search products" }));
  await waitFor(() =>
    expect(mockDiscover).toHaveBeenLastCalledWith({ q: "sage", limit: 50 })
  );
});

it("offers recovery on failure and a distinct empty search state", async () => {
  mockDiscover
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValue({ products: [], trials: [] });
  const screen = render(<ProductCatalog />);
  await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
  fireEvent.press(screen.getByText("Retry products"));
  await waitFor(() =>
    expect(screen.getByText(/No matching products or trials/)).toBeTruthy()
  );
});

it("deduplicates records without confusing a trial with a product", () => {
  expect(
    publicCatalogRows({
      products: [hats[0], hats[0]],
      trials: [{ ...hats[0], discoveryType: "trial" }]
    })
  ).toHaveLength(2);
});

it("labels a single result and preserves the trial section destination", async () => {
  mockDiscover.mockResolvedValue({
    products: [],
    trials: [{ ...hats[0], discoveryType: "trial" }]
  });
  const screen = render(<ProductCatalog />);
  await waitFor(() => expect(screen.getByText("1 result")).toBeTruthy());
  expect(screen.getByLabelText("Open Published hat 1").props.href).toBe(
    "/store/growpathai#product-trials"
  );
  expect(screen.getByText("Concept trial · Not for sale")).toBeTruthy();
});
