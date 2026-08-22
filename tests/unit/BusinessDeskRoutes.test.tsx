import React from "react";
import { render } from "@testing-library/react-native";

import CommercialBusinessDeskRoute from "@/app/home/commercial/business-desk";
import CommercialBusinessAskRoute from "@/app/home/commercial/business-desk/ask-ai";
import CommercialCashFlowRoute from "@/app/home/commercial/business-desk/cash-flow";
import CommercialExpenseRoute from "@/app/home/commercial/business-desk/expenses";
import CommercialJobRoute from "@/app/home/commercial/business-desk/jobs";
import CommercialLeadRoute from "@/app/home/commercial/business-desk/leads";
import CommercialPriceMarginRoute from "@/app/home/commercial/business-desk/price-margin";
import CommercialQuoteRoute from "@/app/home/commercial/business-desk/quotes";
import CommercialVendorRoute from "@/app/home/commercial/business-desk/vendors";
import CommercialBusinessAskSourceRoute from "@/app/home/commercial/business-desk/source";
import FacilityBusinessDeskRoute from "@/app/home/facility/business-desk";
import FacilityBusinessAskRoute from "@/app/home/facility/business-desk/ask-ai";
import FacilityCashFlowRoute from "@/app/home/facility/business-desk/cash-flow";
import FacilityExpenseRoute from "@/app/home/facility/business-desk/expenses";
import FacilityJobRoute from "@/app/home/facility/business-desk/jobs";
import FacilityLeadRoute from "@/app/home/facility/business-desk/leads";
import FacilityPriceMarginRoute from "@/app/home/facility/business-desk/price-margin";
import FacilityQuoteRoute from "@/app/home/facility/business-desk/quotes";
import FacilityVendorRoute from "@/app/home/facility/business-desk/vendors";
import FacilityBusinessAskSourceRoute from "@/app/home/facility/business-desk/source";

let mockFacilityRole = "OWNER";

jest.mock("@/api/businessDesk", () => ({
  COMMERCIAL_BUSINESS_DESK_WORKSPACE: { workspaceType: "commercial" }
}));

jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "commercial-owner-1",
      displayName: "Commercial Owner",
      email: "owner@example.test"
    }
  })
}));

jest.mock("@/features/businessDesk/PriceMarginTool", () => {
  const React = require("react");
  const { View } = require("react-native");
  return (props: any) =>
    React.createElement(View, {
      ...props,
      workspaceType: props.workspace?.workspaceType,
      facilityId: props.workspace?.facilityId,
      testID: "business-desk-tool-price-margin"
    });
});
jest.mock("@/features/businessDesk/QuoteEstimateTool", () => {
  const React = require("react");
  const { View } = require("react-native");
  return (props: any) =>
    React.createElement(View, {
      ...props,
      workspaceType: props.workspace?.workspaceType,
      facilityId: props.workspace?.facilityId,
      testID: "business-desk-tool-quotes"
    });
});
jest.mock("@/features/businessDesk/LeadFollowUpTool", () => {
  const React = require("react");
  const { View } = require("react-native");
  return (props: any) =>
    React.createElement(View, {
      ...props,
      workspaceType: props.workspace?.workspaceType,
      facilityId: props.workspace?.facilityId,
      testID: "business-desk-tool-leads"
    });
});
jest.mock("@/features/businessDesk/JobNotesTool", () => {
  const React = require("react");
  const { View } = require("react-native");
  return (props: any) =>
    React.createElement(View, {
      ...props,
      workspaceType: props.workspace?.workspaceType,
      facilityId: props.workspace?.facilityId,
      testID: "business-desk-tool-jobs"
    });
});
jest.mock("@/features/businessDesk/ExpenseReceiptTool", () => {
  const React = require("react");
  const { View } = require("react-native");
  return (props: any) =>
    React.createElement(View, {
      ...props,
      workspaceType: props.workspace?.workspaceType,
      facilityId: props.workspace?.facilityId,
      testID: "business-desk-tool-expenses"
    });
});
jest.mock("@/features/businessDesk/VendorCompareTool", () => {
  const React = require("react");
  const { View } = require("react-native");
  return (props: any) =>
    React.createElement(View, {
      ...props,
      workspaceType: props.workspace?.workspaceType,
      facilityId: props.workspace?.facilityId,
      testID: "business-desk-tool-vendors"
    });
});
jest.mock("@/features/businessDesk/CashFlowSnapshotTool", () => {
  const React = require("react");
  const { View } = require("react-native");
  return (props: any) =>
    React.createElement(View, {
      ...props,
      workspaceType: props.workspace?.workspaceType,
      facilityId: props.workspace?.facilityId,
      testID: "business-desk-tool-cash-flow"
    });
});
jest.mock("@/features/businessDesk/BusinessAskTool", () => {
  const React = require("react");
  const { View } = require("react-native");
  return (props: any) =>
    React.createElement(View, {
      ...props,
      workspaceType: props.workspace?.workspaceType,
      facilityId: props.workspace?.facilityId,
      testID: "business-desk-tool-ask-ai"
    });
});
jest.mock("@/features/businessDesk/BusinessAskCitationSource", () => {
  const React = require("react");
  const { View } = require("react-native");
  return (props: any) =>
    React.createElement(View, {
      ...props,
      workspaceType: props.workspace?.workspaceType,
      facilityId: props.workspace?.facilityId,
      testID: "business-desk-tool-source"
    });
});
jest.mock("@/features/businessDesk/BusinessDeskHub", () => {
  const React = require("react");
  const { View } = require("react-native");
  return (props: any) =>
    React.createElement(View, { ...props, testID: "business-desk-tool-hub" });
});

jest.mock("@/features/businessDesk/BusinessDeskWorkspaceBoundary", () => ({
  __esModule: true,
  default: ({ children }: any) =>
    children({ workspaceType: "facility", facilityId: "facility-1" })
}));

jest.mock("@/entitlements", () => ({
  useEntitlements: () => ({ facilityRole: mockFacilityRole })
}));

const deterministicRoutes = [
  ["price-margin", CommercialPriceMarginRoute, FacilityPriceMarginRoute],
  ["quotes", CommercialQuoteRoute, FacilityQuoteRoute],
  ["leads", CommercialLeadRoute, FacilityLeadRoute],
  ["jobs", CommercialJobRoute, FacilityJobRoute],
  ["expenses", CommercialExpenseRoute, FacilityExpenseRoute],
  ["vendors", CommercialVendorRoute, FacilityVendorRoute],
  ["cash-flow", CommercialCashFlowRoute, FacilityCashFlowRoute]
] as const;

const providerRoutes = [
  ["ask-ai", CommercialBusinessAskRoute, FacilityBusinessAskRoute],
  ["source", CommercialBusinessAskSourceRoute, FacilityBusinessAskSourceRoute]
] as const;

describe("Business Desk route registrations", () => {
  beforeEach(() => {
    mockFacilityRole = "OWNER";
  });

  it.each(deterministicRoutes)(
    "registers %s in Commercial with its own-workspace scope and Desk back target",
    (toolId, CommercialRoute) => {
      const screen = render(<CommercialRoute />);
      const tool = screen.getByTestId(`business-desk-tool-${toolId}`);

      expect(tool.props.workspaceType).toBe("commercial");
      expect(tool.props.workspaceLabel).toBe("Commercial");
      expect(tool.props.basePath).toBe("/home/commercial/business-desk");
    }
  );

  it.each(providerRoutes)(
    "registers provider route %s in Commercial with its own-workspace scope",
    (toolId, CommercialRoute) => {
      const screen = render(<CommercialRoute />);
      const tool = screen.getByTestId(`business-desk-tool-${toolId}`);
      expect(tool.props.workspaceType).toBe("commercial");
      expect(tool.props.workspaceLabel).toBe("Commercial");
      expect(tool.props.basePath).toBe("/home/commercial/business-desk");
    }
  );

  it.each(providerRoutes)(
    "registers provider route %s inside the selected Facility boundary",
    (toolId, _CommercialRoute, FacilityRoute) => {
      const screen = render(<FacilityRoute />);
      const tool = screen.getByTestId(`business-desk-tool-${toolId}`);
      expect(tool.props.workspaceType).toBe("facility");
      expect(tool.props.facilityId).toBe("facility-1");
      expect(tool.props.workspaceLabel).toBe("Facility");
      expect(tool.props.basePath).toBe("/home/facility/business-desk");
    }
  );

  it.each(deterministicRoutes)(
    "registers %s in the selected Facility with its Desk back target",
    (toolId, _CommercialRoute, FacilityRoute) => {
      const screen = render(<FacilityRoute />);
      const tool = screen.getByTestId(`business-desk-tool-${toolId}`);

      expect(tool.props.workspaceType).toBe("facility");
      expect(tool.props.facilityId).toBe("facility-1");
      expect(tool.props.workspaceLabel).toBe("Facility");
      expect(tool.props.basePath).toBe("/home/facility/business-desk");
    }
  );

  it("keeps each hub rooted in the active workspace", () => {
    const commercial = render(<CommercialBusinessDeskRoute />);
    const commercialHub = commercial.getByTestId("business-desk-tool-hub");
    expect(commercialHub.props.workspaceLabel).toBe("Commercial");
    expect(commercialHub.props.basePath).toBe("/home/commercial/business-desk");
    commercial.unmount();

    const facility = render(<FacilityBusinessDeskRoute />);
    const facilityHub = facility.getByTestId("business-desk-tool-hub");
    expect(facilityHub.props.workspaceLabel).toBe("Facility");
    expect(facilityHub.props.basePath).toBe("/home/facility/business-desk");
  });

  it("keeps the manager cash route reachable while withholding owner-only current cash", () => {
    mockFacilityRole = "MANAGER";

    const screen = render(<FacilityCashFlowRoute />);
    const tool = screen.getByTestId("business-desk-tool-cash-flow");

    expect(tool.props.workspaceType).toBe("facility");
    expect(tool.props.basePath).toBe("/home/facility/business-desk");
    expect(tool.props.canViewCurrentCash).toBe(false);
  });

  it("passes exact job time-zone authority and Commercial self identity", () => {
    const commercial = render(<CommercialJobRoute />);
    const commercialJob = commercial.getByTestId("business-desk-tool-jobs");
    expect(commercialJob.props.canConfigureTimeZone).toBe(true);
    expect(commercialJob.props.currentUser).toEqual({
      userId: "commercial-owner-1",
      label: "Commercial Owner"
    });
    commercial.unmount();

    const owner = render(<FacilityJobRoute />);
    expect(owner.getByTestId("business-desk-tool-jobs").props.canConfigureTimeZone).toBe(
      true
    );
    owner.unmount();

    mockFacilityRole = "MANAGER";
    const manager = render(<FacilityJobRoute />);
    expect(
      manager.getByTestId("business-desk-tool-jobs").props.canConfigureTimeZone
    ).toBe(false);
  });
});
