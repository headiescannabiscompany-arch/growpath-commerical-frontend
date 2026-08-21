import AsyncStorage from "@react-native-async-storage/async-storage";
import React from "react";
import { Pressable, Text } from "react-native";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import { resetWorkspaceSessionState } from "@/auth/workspaceSessionReset";
import { setPreferredMode } from "@/auth/modeStore";
import { useAccountMode } from "@/state/useAccountMode";
import { useFacility } from "@/state/useFacility";

function WorkspaceStateProbe() {
  const account = useAccountMode();
  const facility = useFacility();
  return (
    <>
      <Text testID="workspace-state">
        {JSON.stringify({
          mode: account.mode,
          selectedId: facility.selectedId,
          facilities: facility.facilities.map((item) => item.id)
        })}
      </Text>
      <Pressable
        accessibilityLabel="Select first account workspace"
        onPress={() => {
          account.setMode("facility");
          facility.setFacilities([{ id: "facility-a", name: "Facility A" }]);
          facility.selectFacility({ id: "facility-a", name: "Facility A" });
        }}
      >
        <Text>Select first account workspace</Text>
      </Pressable>
    </>
  );
}

describe("resetWorkspaceSessionState", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await resetWorkspaceSessionState();
    jest.clearAllMocks();
  });

  it("clears preferred, legacy, account-mode, and facility state together", async () => {
    const screen = render(<WorkspaceStateProbe />);
    fireEvent.press(screen.getByLabelText("Select first account workspace"));
    await setPreferredMode("facility");
    await AsyncStorage.multiSet([
      ["gp.session.mode", "facility"],
      ["gp.session.facilityId", "facility-a"],
      ["gp.session.facilityRole", "OWNER"],
      ["gp.session.facilityFeaturesEnabled", "true"]
    ]);

    await waitFor(() =>
      expect(JSON.parse(screen.getByTestId("workspace-state").props.children)).toEqual({
        mode: "facility",
        selectedId: "facility-a",
        facilities: ["facility-a"]
      })
    );

    await act(async () => {
      await resetWorkspaceSessionState();
    });

    expect(JSON.parse(screen.getByTestId("workspace-state").props.children)).toEqual({
      mode: "personal",
      selectedId: null,
      facilities: []
    });
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("preferred_mode_v1");
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("gp.session.mode");
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("gp.session.facilityId");
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("gp.session.facilityRole");
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
      "gp.session.facilityFeaturesEnabled"
    );
  });
});
