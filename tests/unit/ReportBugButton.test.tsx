import React from "react";
import { fireEvent, render } from "@testing-library/react-native";

import ReportBugButton from "@/components/ReportBugButton";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/home/facility/tasks"
}));

jest.mock("@/auth/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      email: "grower@example.com",
      name: "Grower"
    }
  })
}));

jest.mock("@/entitlements", () => ({
  useEntitlements: () => ({
    mode: "facility",
    plan: "facility",
    facilityId: "facility-1",
    facilityRole: "MANAGER"
  })
}));

describe("ReportBugButton", () => {
  beforeEach(() => jest.clearAllMocks());

  it("uses the current pathname instead of sending an undefined bug location", () => {
    const screen = render(<ReportBugButton workspace="facility" />);

    fireEvent.press(screen.getByLabelText("Report bug"));

    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        pathname: "/support",
        params: expect.objectContaining({
          workspace: "facility",
          page: "/home/facility/tasks",
          subject: "Bug report - facility - /home/facility/tasks",
          message: expect.stringContaining("- Page or feature: /home/facility/tasks")
        })
      })
    );
  });
});
