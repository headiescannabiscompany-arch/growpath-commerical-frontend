import fs from "fs";
import path from "path";

function loadCatalog() {
  return JSON.parse(
    fs.readFileSync(
      path.join(process.cwd(), "tests", "fixtures", "facility-simulator-qa-catalog.json"),
      "utf8"
    )
  );
}

describe("Facility simulator QA catalog", () => {
  it("defines the complete synthetic facility record graph", () => {
    const { recordGraph } = loadCatalog();

    expect(recordGraph.zones).toHaveLength(5);
    expect(recordGraph.rooms).toHaveLength(10);
    expect(recordGraph.grows).toHaveLength(5);
    expect(recordGraph.plants).toHaveLength(12);
    expect(recordGraph.equipment).toHaveLength(8);
    expect(recordGraph.inventory).toHaveLength(6);
    expect(recordGraph.sops).toHaveLength(6);
    expect(recordGraph.tasks).toHaveLength(10);
    expect(recordGraph.rooms.map((room: any) => room.purpose)).toEqual([
      "mother",
      "clone_propagation",
      "seedling",
      "vegetative",
      "flower",
      "dry",
      "cure",
      "tissue_culture",
      "cold_storage",
      "general_storage"
    ]);
  });

  it("uses canonical roles while modeling grower and scout as staff personas", () => {
    const { rolePolicy } = loadCatalog();

    expect(rolePolicy.canonicalRoles).toEqual(["OWNER", "MANAGER", "STAFF", "VIEWER"]);
    expect(
      Object.fromEntries(
        rolePolicy.personaAssignments.map((persona: any) => [
          persona.persona,
          persona.role
        ])
      )
    ).toEqual({
      owner: "OWNER",
      manager: "MANAGER",
      grower: "STAFF",
      scout: "STAFF",
      restricted_employee: "VIEWER"
    });
    expect(rolePolicy.legacyOrPersonaNamesMayBecomeRoles).toBe(false);
  });

  it("matches the Facility permission boundary", () => {
    const permissions = loadCatalog().rolePolicy.permissionExpectations;

    expect(permissions.OWNER.allowedWriteDomains).toEqual([
      "team",
      "tasks",
      "grows",
      "plants",
      "grow_logs",
      "inventory",
      "compliance",
      "sop_runs",
      "facility_settings"
    ]);
    expect(permissions.MANAGER.deniedWriteDomains).toEqual(["team", "facility_settings"]);
    expect(permissions.STAFF.allowedWriteDomains).toEqual(["tasks", "grow_logs"]);
    expect(permissions.VIEWER.allowedWriteDomains).toEqual([]);
  });

  it("keeps integrations read-only, reviewable, and idempotent", () => {
    const { integrationPolicy } = loadCatalog();

    expect(integrationPolicy).toMatchObject({
      readOnlyByDefault: true,
      credentialsMustBeEncrypted: true,
      plaintextCredentialsAllowed: false,
      providerMetricKeyMustBePreserved: true,
      unknownMetricsRemainUnmapped: true,
      unitsMayBeInvented: false,
      roomMappingsRequireReview: true,
      mappingConfirmationRoles: ["OWNER", "MANAGER"],
      autoBuildRequiresSeparateConfirmation: true,
      autoBuildMustBeIdempotent: true,
      controllerWritesAllowed: false
    });
  });

  it("defines governed metrics and deterministic synthetic telemetry", () => {
    const { telemetryContract } = loadCatalog();

    expect(telemetryContract.targetMinimumTelemetryPoints).toBe(240);
    expect(telemetryContract.telemetryRecords).toHaveLength(252);
    expect(telemetryContract.generator).toMatchObject({
      deterministic: true,
      recordsPerScenario: 18,
      observedProductionData: false,
      operationalSetpoints: false
    });
    expect(
      new Set(telemetryContract.telemetryRecords.map((record: any) => record.recordedAt))
        .size
    ).toBe(252);
    expect(
      telemetryContract.telemetryRecords.every(
        (record: any) =>
          record.synthetic === true &&
          record.providerMetricKey.startsWith("qa.synthetic.")
      )
    ).toBe(true);
    expect(
      Object.fromEntries(
        telemetryContract.canonicalMetrics.map((metric: any) => [
          metric.metric,
          metric.unit
        ])
      )
    ).toEqual({
      air_temperature: "C",
      relative_humidity: "percent",
      vpd: "kPa",
      dew_point: "C",
      co2: "ppm",
      ppfd: "umol/m2/s",
      dli: "mol/m2/day",
      substrate_moisture: "percent",
      substrate_ec: "mS/cm",
      substrate_ph: "pH",
      irrigation_event: "event",
      light_state: "state",
      alarm: "event",
      device_offline: "event",
      device_fault: "event"
    });
    expect(
      telemetryContract.canonicalMetrics.every(
        (metric: any) => metric.consumers.length > 0
      )
    ).toBe(true);
  });

  it("covers normal operation and every requested incident", () => {
    const catalog = loadCatalog();

    expect(
      catalog.scenarioDefinitions.map((scenario: any) => scenario.scenarioId)
    ).toEqual([
      "normal_operations",
      "two_hour_humidity_spike_after_lights_off",
      "dew_point_condensation_risk",
      "sensor_offline_and_stale_data",
      "high_substrate_ec",
      "irrigation_failure",
      "unexpected_high_co2",
      "light_or_exhaust_failure",
      "room_excursion_acknowledgement_and_escalation",
      "pest_found_and_plant_quarantined",
      "inventory_shortage",
      "missed_task_and_overdue_sop",
      "conflicting_permissions",
      "csv_api_duplicates_gaps_bad_timestamps_bad_units"
    ]);
    expect(
      new Set(
        catalog.telemetryContract.telemetryRecords.map((record: any) => record.scenarioId)
      )
    ).toEqual(
      new Set(catalog.scenarioDefinitions.map((scenario: any) => scenario.scenarioId))
    );
    expect(catalog.scenarioRuns).toEqual([]);
  });

  it("keeps cannabis examples private, synthetic, and free of invented identifiers", () => {
    const catalog = loadCatalog();
    const { facilityTemplate, recordGraph } = catalog;

    expect(catalog.dataClassification).toMatchObject({
      classification: "synthetic_test_only",
      observedProductionData: false,
      maySupportProductClaims: false,
      mayBePublished: false
    });
    expect(facilityTemplate).toMatchObject({
      accountPurpose: "cannabis_hemp_facility_qa",
      cannabisVisibilityEligible: true,
      publicVisibility: false,
      ownerApproved: true,
      address: null,
      licenseNumber: null,
      metrcLicenseNumber: null
    });
    expect(catalog.seedInputApproval).toMatchObject({
      status: "approved",
      scope: "private synthetic QA fixtures for test and staging only"
    });
    expect(catalog.seedInputApproval.excludes).toEqual(
      expect.arrayContaining([
        "production records or identifiers",
        "operational cultivation setpoints",
        "external media or source-rights approval"
      ])
    );
    expect(
      [...recordGraph.grows, ...recordGraph.plants].every(
        (record: any) => record.synthetic === true && record.cultivar === null
      )
    ).toBe(true);
  });

  it("is seed-input-ready without claiming post-seed acceptance", () => {
    const catalog = loadCatalog();

    expect(catalog.status).toBe("seed_ready");
    expect(catalog.acceptanceLifecycle).toEqual({
      seedReadinessRequiresScenarioRuns: false,
      seedReadinessRequiresBrowserEvidence: false,
      postSeedAcceptanceRequiresScenarioRuns: true,
      postSeedAcceptanceRequiresBrowserEvidence: true,
      evidenceMayBeRecordedBeforeExecution: false
    });
    expect(
      catalog.rolePolicy.personaAssignments.every((persona: any) =>
        ["seed_on_execution", "bound_verified"].includes(persona.accountBindingStatus)
      )
    ).toBe(true);
    expect(
      catalog.recordGraph.rooms.every(
        (room: any) =>
          room.baselineStatus === "reviewed_configured" &&
          Object.keys(room.baselines).length > 0
      )
    ).toBe(true);
    expect(
      catalog.recordGraph.sops.every(
        (sop: any) =>
          sop.status === "approved" &&
          sop.ownerApproved === true &&
          sop.checklist.length > 0
      )
    ).toBe(true);
    expect(catalog.scenarioRuns).toEqual([]);
    expect(catalog.acceptanceEvidence).toEqual([]);
  });

  it("defines confirmation-gated write-backs and the acceptance matrix", () => {
    const catalog = loadCatalog();

    expect(catalog.writeBackContract).toMatchObject({
      facilityScopeRequired: true,
      userConfirmationRequired: true,
      crossFacilityWritesAllowed: false,
      targets: ["Plant", "Grow", "Log", "ToolRun", "Task", "room", "Facility"],
      alertsAndTasksStartAsDrafts: true,
      budRotScreeningMayBePresentedAsDiagnosis: false
    });
    expect(catalog.acceptanceChecks).toEqual([
      "entitlement_loading",
      "ai_credit_charge_and_refund",
      "facility_owner_access",
      "manager_mapping_confirmation",
      "staff_task_and_log_write_limits",
      "viewer_read_only_access",
      "task_assignment",
      "rights_reviewed_uploads",
      "ask_ai_provider_and_fallback_labels",
      "alerts_and_acknowledgements",
      "persistence_and_reload",
      "tool_write_back_scope",
      "cross_role_shared_record"
    ]);
    expect(catalog.acceptanceEvidence).toEqual([]);
  });
});
