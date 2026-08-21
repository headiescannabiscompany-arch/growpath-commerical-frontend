import {
  createStyles,
  fieldStudiesActionLabel,
  fieldStudiesDestination,
  plantIdentificationActionLabel,
  plantIdentificationDestination,
  publicObservationCoordinates,
  publicObservationDateLabel,
  publicObservationNotes
} from "@/app/field-observations";

describe("Public Field Observations route", () => {
  it("keeps Field Study creation inside the Personal workspace", () => {
    expect(fieldStudiesDestination("personal")).toBe("/home/personal/field-studies");
    expect(fieldStudiesActionLabel("personal")).toBe("Start a Field Study");
    expect(fieldStudiesDestination("facility")).toBe("/account/mode");
    expect(fieldStudiesActionLabel("facility")).toBe(
      "Switch to Personal for Field Studies"
    );
    expect(fieldStudiesDestination("commercial")).toBe("/account/mode");
    expect(plantIdentificationDestination("personal")).toBe(
      "/home/personal/tools/species-crop-id"
    );
    expect(plantIdentificationActionLabel("personal")).toBe("Identify a Plant");
    expect(plantIdentificationDestination("commercial")).toBe(
      "/home/commercial/tools/species-crop-id?workspace=commercial"
    );
    expect(plantIdentificationDestination("facility")).toBe(
      "/home/facility/tools/species-crop-id?workspace=facility"
    );
    expect(plantIdentificationActionLabel("commercial")).toBe("Identify a Plant");
    expect(plantIdentificationActionLabel("facility")).toBe("Identify a Plant");
    expect(plantIdentificationDestination("unknown")).toBe("/account/mode");
  });

  it("uses the active palette across search, filters, map, and result states", () => {
    const palette = {
      page: "#0E141B",
      surface: "#151D27",
      surfaceMuted: "#1A2330",
      border: "#283545",
      text: "#F4F7FB",
      textMuted: "#C9D4DF",
      heroText: "#FFFFFF",
      accent: "#78AAFF",
      accentSoft: "#16263A",
      accentText: "#FFFFFF",
      link: "#78AAFF",
      danger: "#FF7B89"
    } as any;

    const styles = createStyles(palette);

    expect(styles.screen.backgroundColor).toBe(palette.page);
    expect(styles.searchInput).toEqual(
      expect.objectContaining({
        backgroundColor: palette.surface,
        borderColor: palette.border,
        color: palette.text
      })
    );
    expect(styles.filterChip.backgroundColor).toBe(palette.surface);
    expect(styles.mapPanel.backgroundColor).toBe(palette.surfaceMuted);
    expect(styles.status.backgroundColor).toBe(palette.surfaceMuted);
    expect(styles.card.backgroundColor).toBe(palette.surface);
  });

  it("renders only the explicitly authored public note and never private notes", () => {
    expect(
      publicObservationNotes({
        publication: { publicNotes: "Observed beside the public trail." }
      })
    ).toBe("Observed beside the public trail.");
    expect(
      publicObservationNotes({
        publication: { publicNotes: "" },
        notes: "Private: this is behind my house."
      } as any)
    ).toBe("");
  });

  it("does not turn missing or invalid public coordinates into a map pin", () => {
    expect(publicObservationCoordinates({ location: {} })).toBeNull();
    expect(
      publicObservationCoordinates({
        location: { latitude: null, longitude: null }
      })
    ).toBeNull();
    expect(
      publicObservationCoordinates({
        location: { latitude: 91, longitude: -181 }
      })
    ).toBeNull();
    expect(
      publicObservationCoordinates({
        location: { latitude: 39.1023, longitude: -77.0123 }
      })
    ).toEqual({ latitude: 39.1023, longitude: -77.0123 });
  });

  it("shows the real observation calendar day without substituting publish time", () => {
    expect(
      publicObservationDateLabel({ observationDate: "2026-08-12T00:00:00.000Z" })
    ).toBe("Observed August 12, 2026");
    expect(publicObservationDateLabel({ observationDate: "2026-02-31" })).toBe(
      "Observation date unavailable"
    );
    expect(
      publicObservationDateLabel({
        observationDate: "",
        publishedAt: "2026-08-21T12:00:00.000Z"
      } as any)
    ).toBe("Observation date unavailable");
  });
});
