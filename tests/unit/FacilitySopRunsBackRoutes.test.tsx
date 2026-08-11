import React from "react";
import * as DocumentPicker from "expo-document-picker";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

import FacilitySopRunDetailRoute, {
  createFacilitySopRunDetailStyles
} from "@/app/home/facility/sop-runs/[id]";
import FacilitySopRunsIndexRoute from "@/features/facility/routes/FacilitySopRunsIndexRoute";
import FacilitySopRunsCompareRoute, {
  createFacilitySopCompareStyles
} from "@/app/home/facility/sop-runs/compare";
import FacilitySopRunsCompareResultRoute, {
  createFacilitySopCompareResultStyles
} from "@/app/home/facility/sop-runs/compare-result";
import FacilitySopRunsPresetsRoute, {
  createFacilitySopLibraryStyles
} from "@/app/home/facility/sop-runs/presets";
import FacilitySopRunsStartRoute, {
  createFacilitySopStartStyles
} from "@/app/home/facility/sop-runs/start";
import { getThemePalette } from "@/theme/appTheme";

const mockApiRequest = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockCreateTemplate = jest.fn();
const mockUpdateTemplate = jest.fn();
const mockDeleteTemplate = jest.fn();
const mockUploadSopDocument = jest.fn();
const mockRefetchTemplates = jest.fn();
let mockParams: Record<string, string> = {};
let mockCanWriteSopRuns = true;

jest.mock("expo-document-picker", () => ({
  getDocumentAsync: jest.fn()
}));

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace
  }),
  Link: ({ children }: any) => children
}));

jest.mock("@/components/ScreenBoundary", () => {
  const React = require("react");
  const { Text, View } = require("react-native");
  return {
    ScreenBoundary: ({ children, showBack, backFallbackHref, title }: any) =>
      React.createElement(
        View,
        { accessibilityLabel: `screen-${title}` },
        showBack
          ? React.createElement(Text, null, `Shared Back ${backFallbackHref}`)
          : null,
        children
      )
  };
});

jest.mock("@/state/useFacility", () => ({
  useFacility: () => ({ selectedId: "facility-1" })
}));

jest.mock("@/entitlements", () => ({
  CAPABILITY_KEYS: { SOP_RUNS_WRITE: "facility.sop_runs.write" },
  useEntitlements: () => ({ can: () => mockCanWriteSopRuns })
}));

jest.mock("@/api/apiRequest", () => ({
  apiRequest: (...args: any[]) => mockApiRequest(...args)
}));

jest.mock("@/api/endpoints", () => ({
  endpoints: {
    sopRuns: (facilityId: string) => `/api/facilities/${facilityId}/sop-runs`,
    sopRun: (facilityId: string, runId: string) =>
      `/api/facilities/${facilityId}/sop-runs/${runId}`,
    sopRunComplete: (facilityId: string, runId: string) =>
      `/api/facilities/${facilityId}/sop-runs/${runId}/complete`,
    sopRunStep: (facilityId: string, runId: string, stepId: string) =>
      `/api/facilities/${facilityId}/sop-runs/${runId}/steps/${stepId}`
  }
}));

jest.mock("@/api/uploads", () => ({
  uploadSopDocument: (...args: any[]) => mockUploadSopDocument(...args)
}));

jest.mock("@/hooks/useSopTemplates", () => ({
  useSopTemplates: () => ({
    templates: [
      { id: "template-1", title: "Daily room check", content: "Inspect room." }
    ],
    isLoading: false,
    createTemplate: (...args: any[]) => mockCreateTemplate(...args),
    updateTemplate: (...args: any[]) => mockUpdateTemplate(...args),
    deleteTemplate: (...args: any[]) => mockDeleteTemplate(...args),
    creating: false,
    updating: false,
    deleting: false,
    refetch: (...args: any[]) => mockRefetchTemplates(...args)
  })
}));

describe("facility SOP run nested back behavior", () => {
  beforeEach(() => {
    mockParams = {};
    mockCanWriteSopRuns = true;
    mockApiRequest.mockReset();
    mockPush.mockReset();
    mockReplace.mockReset();
    mockCreateTemplate.mockReset();
    mockUpdateTemplate.mockReset();
    mockDeleteTemplate.mockReset();
    mockUploadSopDocument.mockReset();
    mockRefetchTemplates.mockReset();
    jest.mocked(DocumentPicker.getDocumentAsync).mockReset();
    mockCreateTemplate.mockResolvedValue({ id: "template-created" });
    mockUpdateTemplate.mockResolvedValue({ id: "template-revised" });
    mockDeleteTemplate.mockResolvedValue({ retired: { isActive: false } });
    mockUploadSopDocument.mockResolvedValue({
      assetId: "asset-1",
      url: "/uploads/room-opening.pdf",
      filename: "room-opening.pdf",
      mimeType: "application/pdf",
      bytes: 1024
    });
    mockRefetchTemplates.mockResolvedValue(undefined);
    mockApiRequest.mockImplementation((path: string) => {
      if (path.endsWith("/sop-runs/run-1")) {
        return Promise.resolve({
          run: {
            title: "Daily room check",
            status: "active",
            completedAt: null,
            steps: [
              { stepId: "step-1", title: "Inspect room", status: "done" },
              { stepId: "step-2", title: "Record environment", status: "pending" }
            ]
          }
        });
      }
      if (path.endsWith("/sop-runs/run-2")) {
        return Promise.resolve({
          run: {
            title: "Night room check",
            status: "completed",
            completedAt: "2026-07-22T18:00:00.000Z",
            steps: [
              { stepId: "step-1", title: "Inspect room", status: "done" },
              { stepId: "step-2", title: "Record environment", status: "done" },
              { stepId: "step-3", title: "Lock doors", status: "skipped" }
            ]
          }
        });
      }
      return Promise.resolve({
        runs: [
          { id: "run-1", title: "Daily room check", status: "completed" },
          { id: "run-2", title: "Night room check", status: "completed" }
        ]
      });
    });
  });

  it("uses shared back behavior on SOP run detail", async () => {
    mockParams = { id: "run-1" };

    const screen = render(<FacilitySopRunDetailRoute />);

    await waitFor(() =>
      expect(screen.getByText("Shared Back /home/facility/sop-runs")).toBeTruthy()
    );
    expect(screen.getByText("Daily room check")).toBeTruthy();
  });

  it("keeps the SOP Runs index read-only for viewers", async () => {
    mockCanWriteSopRuns = false;

    const screen = render(<FacilitySopRunsIndexRoute />);

    expect(screen.getAllByText("Shared Back /home/facility/dashboard")).toHaveLength(1);
    await waitFor(() => expect(screen.getByText("Daily room check")).toBeTruthy());
    expect(screen.queryByText("Start Run")).toBeNull();
    expect(
      screen.getByText("SOP runs are read-only for this facility role.")
    ).toBeTruthy();
    expect(
      screen.getByRole("header", { name: "SOP Library & Runs" }).props["aria-level"]
    ).toBe(1);
    expect(screen.getByText("Shared Back /home/facility/dashboard")).toBeTruthy();
    expect(
      screen.getByRole("header", { name: "Run evidence summary" }).props["aria-level"]
    ).toBe(2);
    expect(screen.getByRole("header", { name: "Run history" }).props["aria-level"]).toBe(
      2
    );
  });

  it("keeps the SOP Library start action read-only for viewers", () => {
    mockCanWriteSopRuns = false;

    const screen = render(<FacilitySopRunsPresetsRoute />);

    expect(screen.getByText("Read-only SOP access")).toBeTruthy();
    expect(
      screen.getByText(
        "Facility owners and managers create procedures and start runs. You can review active procedure summaries and completed evidence from SOP Runs."
      )
    ).toBeTruthy();
    expect(screen.queryByText("Start run")).toBeNull();
  });

  it("blocks the direct SOP start route for viewers", () => {
    mockCanWriteSopRuns = false;

    const screen = render(<FacilitySopRunsStartRoute />);

    expect(screen.getByText("SOP runs are read-only")).toBeTruthy();
    expect(
      screen.getByText("Only facility owners and managers can start SOP runs.")
    ).toBeTruthy();
    expect(screen.queryByLabelText("SOP run title")).toBeNull();
    expect(screen.queryByLabelText("Start SOP run")).toBeNull();
    expect(screen.getByLabelText("Return to facility SOP runs")).toBeTruthy();
  });

  it("shows active SOP evidence without mutation controls for viewers", async () => {
    mockCanWriteSopRuns = false;
    mockParams = { id: "run-1" };

    const screen = render(<FacilitySopRunDetailRoute />);

    await waitFor(() => expect(screen.getByText("Daily room check")).toBeTruthy());
    expect(
      screen.getByRole("header", { name: "Daily room check" }).props["aria-level"]
    ).toBe(1);
    expect(
      screen.getByRole("header", { name: "Checklist evidence" }).props["aria-level"]
    ).toBe(2);
    expect(
      screen.getByText("SOP run evidence is read-only for this facility role.")
    ).toBeTruthy();
    expect(screen.queryByLabelText("Mark SOP step Inspect room done")).toBeNull();
    expect(screen.queryByLabelText("Add SOP evidence step")).toBeNull();
    expect(screen.queryByLabelText("Mark SOP run complete")).toBeNull();
  });

  it("shows readable SOP evidence and blocks completion while a step is pending", async () => {
    mockParams = { id: "run-1" };
    const screen = render(<FacilitySopRunDetailRoute />);

    await waitFor(() => expect(screen.getByText("Daily room check")).toBeTruthy());

    expect(screen.queryByText(/runId:/i)).toBeNull();
    expect(screen.queryByText("Raw audit envelope")).toBeNull();
    expect(screen.getByText("1/2")).toBeTruthy();
    expect(
      screen.getByLabelText("Mark SOP run complete").props.accessibilityState
    ).toEqual({ disabled: true });
    expect(
      screen.getByText(
        "Review every checklist step as Done or Skipped before completing this run."
      )
    ).toBeTruthy();
  });

  it("locks completed SOP evidence against checklist changes", async () => {
    mockParams = { id: "run-2" };
    const screen = render(<FacilitySopRunDetailRoute />);

    await waitFor(() => expect(screen.getByText("Night room check")).toBeTruthy());

    expect(screen.queryByText("Add evidence step")).toBeNull();
    expect(screen.getByText("Run Completed")).toBeTruthy();
    expect(
      screen.getByLabelText("Mark SOP run complete").props.accessibilityState
    ).toEqual({ disabled: true });
    expect(
      screen.getByLabelText("Mark SOP step Inspect room done").props.accessibilityState
    ).toEqual({ disabled: true });
    expect(
      screen.getByText(
        "This completed run is locked so its checklist remains reliable evidence."
      )
    ).toBeTruthy();
  });

  it("uses shared back behavior on SOP run start and presets", () => {
    const start = render(<FacilitySopRunsStartRoute />);
    expect(start.getByText("Shared Back /home/facility/sop-runs")).toBeTruthy();
    expect(start.getByText("Start SOP Run")).toBeTruthy();

    const presets = render(<FacilitySopRunsPresetsRoute />);
    expect(presets.getByText("Shared Back /home/facility/sop-runs")).toBeTruthy();
    expect(presets.getByText("SOP Library")).toBeTruthy();
    expect(presets.getByText("SOP Library").props["aria-level"]).toBe(1);
    expect(presets.getByText("Standard starter templates").props["aria-level"]).toBe(2);
    expect(presets.getByText("Active facility SOPs").props["aria-level"]).toBe(2);
  });

  it("uses the active Night palette for the SOP library and editor surfaces", () => {
    const palette = getThemePalette("night", "dark");
    const styles = createFacilitySopLibraryStyles(palette);

    expect(styles.h1.color).toBe(palette.text);
    expect(styles.starterCard.backgroundColor).toBe(palette.card);
    expect(styles.readOnlyCard.backgroundColor).toBe(palette.surfaceMuted);
    expect(styles.savedCard.backgroundColor).toBe(palette.card);
    expect(styles.editorCard.backgroundColor).toBe(palette.surfaceMuted);
    expect(styles.input.backgroundColor).toBe(palette.surface);
  });

  it("uses the active Night palette for the SOP start form", () => {
    const palette = getThemePalette("night", "dark");
    const styles = createFacilitySopStartStyles(palette);

    expect(styles.h1.color).toBe(palette.text);
    expect(styles.input.backgroundColor).toBe(palette.surface);
    expect(styles.input.color).toBe(palette.text);
    expect(styles.templatePanel.backgroundColor).toBe(palette.surfaceMuted);
    expect(styles.templateCard.backgroundColor).toBe(palette.card);
    expect(styles.btn.backgroundColor).toBe(palette.accent);
  });

  it("uses the active Night palette for SOP run detail evidence", () => {
    const palette = getThemePalette("night", "dark");
    const styles = createFacilitySopRunDetailStyles(palette);

    expect(styles.h1.color).toBe(palette.text);
    expect(styles.metaCard.backgroundColor).toBe(palette.surface);
    expect(styles.progressCard.backgroundColor).toBe(palette.surfaceMuted);
    expect(styles.card.backgroundColor).toBe(palette.surface);
    expect(styles.stepCard.backgroundColor).toBe(palette.surfaceMuted);
    expect(styles.input.backgroundColor).toBe(palette.surface);
    expect(styles.doneBtn.backgroundColor).toBe(palette.success);
    expect(styles.pendingBtn.backgroundColor).toBe(palette.warning);
    expect(styles.skipBtn.backgroundColor).toBe(palette.textMuted);
    expect(styles.stepBtnText.color).toBe(palette.page);
    expect(styles.addBtn.backgroundColor).toBe(palette.accent);
  });

  it("uses the active Day palette for SOP run detail actions", () => {
    const palette = getThemePalette("day", "light");
    const styles = createFacilitySopRunDetailStyles(palette);

    expect(styles.doneBtn.backgroundColor).toBe(palette.success);
    expect(styles.pendingBtn.backgroundColor).toBe(palette.warning);
    expect(styles.skipBtn.backgroundColor).toBe(palette.textMuted);
    expect(styles.stepBtnText.color).toBe(palette.page);
    expect(styles.addBtn.backgroundColor).toBe(palette.accent);
  });

  it("uses the active Night palette for the SOP comparison chooser", () => {
    const palette = getThemePalette("night", "dark");
    const styles = createFacilitySopCompareStyles(palette);

    expect(styles.h1.color).toBe(palette.text);
    expect(styles.selectionCard.backgroundColor).toBe(palette.surfaceMuted);
    expect(styles.selectionValue.color).toBe(palette.text);
    expect(styles.card.backgroundColor).toBe(palette.card);
    expect(styles.empty.color).toBe(palette.textMuted);
    expect(styles.btn.backgroundColor).toBe(palette.accent);
  });

  it("uses the active Night palette for complete SOP comparison evidence", () => {
    const palette = getThemePalette("night", "dark");
    const styles = createFacilitySopCompareResultStyles(palette);

    expect(styles.h1.color).toBe(palette.text);
    expect(styles.summaryCard.backgroundColor).toBe(palette.accentSoft);
    expect(styles.runCard.backgroundColor).toBe(palette.card);
    expect(styles.card.backgroundColor).toBe(palette.card);
    expect(styles.stepTitle.color).toBe(palette.text);
    expect(styles.changedRow.borderColor).toBe(palette.warning);
  });

  it("uses shared back behavior on SOP compare routes", async () => {
    const compare = render(<FacilitySopRunsCompareRoute />);
    expect(compare.getByText("Shared Back /home/facility/sop-runs")).toBeTruthy();
    expect(compare.getByText("Compare SOP Runs")).toBeTruthy();

    mockParams = { leftId: "run-1", rightId: "run-2" };
    const result = render(<FacilitySopRunsCompareResultRoute />);
    await waitFor(() =>
      expect(result.getByText("Shared Back /home/facility/sop-runs/compare")).toBeTruthy()
    );
    expect(result.getByText("SOP Compare Result")).toBeTruthy();
    expect(result.getAllByRole("header").length).toBeGreaterThan(0);
  });

  it("compares SOP outcomes with readable summaries instead of ids or JSON", async () => {
    mockParams = { leftId: "run-1", rightId: "run-2" };
    const screen = render(<FacilitySopRunsCompareResultRoute />);

    await waitFor(() => expect(screen.getByText("Night room check")).toBeTruthy());

    expect(screen.getByText("Reference run")).toBeTruthy();
    expect(screen.getByText("Comparison run")).toBeTruthy();
    expect(
      screen.getByText("The comparison run has 1 more completed step.")
    ).toBeTruthy();
    expect(screen.getAllByText("Record environment").length).toBeGreaterThan(0);
    expect(screen.getByText("Reference: Pending")).toBeTruthy();
    expect(screen.getAllByText("Comparison: Done").length).toBeGreaterThan(0);
    expect(screen.queryByText(/left: run-1/i)).toBeNull();
    expect(screen.queryByText(/right: run-2/i)).toBeNull();
    expect(JSON.stringify(screen.toJSON())).not.toContain('"stepId"');
  });

  it("does not present empty comparison evidence when run selection is missing", async () => {
    mockParams = {};
    const screen = render(<FacilitySopRunsCompareResultRoute />);

    await waitFor(() =>
      expect(
        screen.getByText("Select two saved runs before comparing them.")
      ).toBeTruthy()
    );

    expect(screen.queryByText("Outcome summary")).toBeNull();
    expect(screen.queryByText("Reference SOP run")).toBeNull();
    expect(screen.queryByText("Checklist differences")).toBeNull();
  });

  it("selects two saved SOP runs without exposing internal id inputs", async () => {
    const screen = render(<FacilitySopRunsCompareRoute />);

    await waitFor(() => expect(screen.getByText("Night room check")).toBeTruthy());
    expect(screen.queryByPlaceholderText("Left run ID")).toBeNull();
    expect(screen.queryByPlaceholderText("Right run ID")).toBeNull();
    expect(
      screen.getByLabelText("Compare selected SOP runs").props.accessibilityState
    ).toEqual({ disabled: true });

    fireEvent.press(screen.getByLabelText("Select Daily room check as reference run"));
    fireEvent.press(screen.getByLabelText("Select Night room check as comparison run"));
    fireEvent.press(screen.getByLabelText("Compare selected SOP runs"));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/home/facility/sop-runs/compare-result",
      params: { leftId: "run-1", rightId: "run-2" }
    });
  });

  it("requires procedure content and explicit review before creating an SOP", async () => {
    const screen = render(<FacilitySopRunsPresetsRoute />);
    const createButton = screen.getByLabelText("Save facility SOP");

    expect(createButton.props.accessibilityState).toEqual({ disabled: true });
    fireEvent.changeText(screen.getByLabelText("SOP title"), "Room opening");
    expect(createButton.props.accessibilityState).toEqual({ disabled: true });
    fireEvent.changeText(
      screen.getByLabelText("SOP checklist steps"),
      "Inspect room\nRecord temperature"
    );
    expect(createButton.props.accessibilityState).toEqual({ disabled: true });
    fireEvent.press(screen.getByLabelText("Confirm SOP facility review"));
    fireEvent.press(createButton);

    await waitFor(() =>
      expect(mockCreateTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Room opening",
          content: "Inspect room\nRecord temperature",
          checklist: [
            { step: "Inspect room", required: true, requiresPhoto: false },
            { step: "Record temperature", required: true, requiresPhoto: false }
          ],
          reviewConfirmed: true,
          attachments: []
        })
      )
    );
  });

  it("loads a standard SOP for review instead of silently installing it", () => {
    const screen = render(<FacilitySopRunsPresetsRoute />);

    fireEvent.press(screen.getByLabelText("Use Daily Room Opening Check starter"));

    expect(screen.getByDisplayValue("Daily Room Opening Check")).toBeTruthy();
    expect(screen.getByLabelText("SOP checklist steps").props.value).toContain(
      "Compare recorded conditions with the reviewed limits"
    );
    expect(
      screen.getByLabelText("Confirm SOP facility review").props.accessibilityState
    ).toMatchObject({ checked: false, disabled: false });
    expect(
      screen.getByText(/Starter loaded. Review every step, adjust it for this facility/i)
    ).toBeTruthy();
  });

  it("uploads a selected SOP document before saving the reviewed template", async () => {
    jest.mocked(DocumentPicker.getDocumentAsync).mockResolvedValue({
      canceled: false,
      assets: [
        {
          uri: "file:///tmp/room-opening.pdf",
          name: "room-opening.pdf",
          mimeType: "application/pdf",
          size: 1024,
          lastModified: 0
        }
      ]
    });
    const screen = render(<FacilitySopRunsPresetsRoute />);

    fireEvent.changeText(screen.getByLabelText("SOP title"), "Uploaded room SOP");
    fireEvent.changeText(
      screen.getByLabelText("SOP checklist steps"),
      "Review attached SOP\nRecord completion"
    );
    fireEvent.press(screen.getByLabelText("Choose SOP document"));
    await waitFor(() =>
      expect(screen.getByText(/room-opening.pdf · ready to upload/i)).toBeTruthy()
    );
    fireEvent.press(screen.getByLabelText("Confirm SOP facility review"));
    fireEvent.press(screen.getByLabelText("Save facility SOP"));

    await waitFor(() =>
      expect(mockUploadSopDocument).toHaveBeenCalledWith("facility-1", {
        uri: "file:///tmp/room-opening.pdf",
        name: "room-opening.pdf",
        mimeType: "application/pdf",
        size: 1024
      })
    );
    expect(mockCreateTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        attachments: [
          expect.objectContaining({
            assetId: "asset-1",
            filename: "room-opening.pdf"
          })
        ]
      })
    );
  });

  it("requires explicit confirmation before retiring an SOP without deleting history", async () => {
    const screen = render(<FacilitySopRunsPresetsRoute />);

    fireEvent.press(screen.getByLabelText("Retire SOP Daily room check"));

    expect(screen.getByText("Retire Daily room check?")).toBeTruthy();
    expect(
      screen.getByText(
        "This removes the SOP from new runs. Historical versions, completed runs, attachments, and audit evidence are preserved."
      )
    ).toBeTruthy();
    expect(mockDeleteTemplate).not.toHaveBeenCalled();

    fireEvent.press(screen.getByLabelText("Cancel retirement Daily room check"));
    expect(screen.queryByText("Retire Daily room check?")).toBeNull();

    fireEvent.press(screen.getByLabelText("Retire SOP Daily room check"));
    fireEvent.press(screen.getByLabelText("Confirm retire SOP Daily room check"));

    await waitFor(() => expect(mockDeleteTemplate).toHaveBeenCalledWith("template-1"));
    expect(mockRefetchTemplates).toHaveBeenCalled();
    expect(
      screen.getByText(
        'Retired "Daily room check". Historical versions and completed runs remain available as evidence.'
      )
    ).toBeTruthy();
  });

  it("creates a one-off SOP run only after checklist steps are entered", async () => {
    const screen = render(<FacilitySopRunsStartRoute />);
    const startButton = screen.getByLabelText("Start SOP run");

    expect(startButton.props.accessibilityState).toEqual({ disabled: true });
    fireEvent.changeText(screen.getByLabelText("SOP run title"), "One-off room check");
    fireEvent.changeText(
      screen.getByLabelText("One-off SOP checklist steps"),
      "1. Inspect canopy\n2. Record environment"
    );
    fireEvent.press(startButton);

    await waitFor(() =>
      expect(mockApiRequest).toHaveBeenCalledWith(
        "/api/facilities/facility-1/sop-runs",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({
            title: "One-off room check",
            templateId: undefined,
            steps: [{ title: "Inspect canopy" }, { title: "Record environment" }]
          })
        })
      )
    );
  });

  it("starts a one-off SOP run only once when the action is pressed twice", async () => {
    let resolveCreate: ((value: unknown) => void) | undefined;
    mockApiRequest.mockImplementation(
      () => new Promise((resolve) => (resolveCreate = resolve))
    );
    const screen = render(<FacilitySopRunsStartRoute />);

    fireEvent.changeText(screen.getByLabelText("SOP run title"), "Opening check");
    fireEvent.changeText(
      screen.getByLabelText("One-off SOP checklist steps"),
      "Inspect room"
    );
    const start = screen.getByLabelText("Start SOP run");
    fireEvent.press(start);
    fireEvent.press(start);

    expect(mockApiRequest).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Starting this SOP run...")).toBeTruthy();
    resolveCreate?.({ created: { id: "run-created" } });
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith({
        pathname: "/home/facility/sop-runs/[id]",
        params: { id: "run-created" }
      })
    );
  });

  it("saves one reviewed SOP version when the action is pressed twice", async () => {
    let resolveCreate: ((value: unknown) => void) | undefined;
    mockCreateTemplate.mockImplementation(
      () => new Promise((resolve) => (resolveCreate = resolve))
    );
    const screen = render(<FacilitySopRunsPresetsRoute />);

    fireEvent.changeText(screen.getByLabelText("SOP title"), "Room opening");
    fireEvent.changeText(screen.getByLabelText("SOP checklist steps"), "Inspect room");
    fireEvent.press(screen.getByLabelText("Confirm SOP facility review"));
    const save = screen.getByLabelText("Save facility SOP");
    fireEvent.press(save);
    fireEvent.press(save);

    expect(mockCreateTemplate).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Saving this reviewed SOP...")).toBeTruthy();
    resolveCreate?.({ id: "template-created" });
    await waitFor(() => expect(mockRefetchTemplates).toHaveBeenCalledTimes(1));
  });

  it("keeps a new checklist step available for correction when saving fails", async () => {
    mockParams = { id: "run-1" };
    mockApiRequest.mockImplementation((path: string, options?: { method?: string }) => {
      if (options?.method === "PATCH") {
        return Promise.reject(new Error("Step evidence could not be saved."));
      }
      if (path.endsWith("/sop-runs/run-1")) {
        return Promise.resolve({
          run: {
            title: "Daily room check",
            status: "active",
            steps: [{ stepId: "step-1", title: "Inspect room", status: "done" }]
          }
        });
      }
      return Promise.resolve({ runs: [] });
    });
    const screen = render(<FacilitySopRunDetailRoute />);

    await waitFor(() => expect(screen.getByText("Daily room check")).toBeTruthy());
    fireEvent.changeText(screen.getByLabelText("SOP step title"), "Record humidity");
    fireEvent.changeText(screen.getByLabelText("SOP step note"), "Meter unavailable");
    fireEvent.press(screen.getByLabelText("Add SOP evidence step"));

    await waitFor(() =>
      expect(screen.getByText("Step evidence could not be saved.")).toBeTruthy()
    );
    expect(screen.getByLabelText("SOP step title").props.value).toBe("Record humidity");
    expect(screen.getByLabelText("SOP step note").props.value).toBe("Meter unavailable");
  });
});
