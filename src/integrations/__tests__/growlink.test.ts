import {
  GROWLINK_PROVIDER_CONTRACT,
  buildGrowlinkAuthRequest,
  buildGrowlinkAuthUrl,
  buildGrowlinkControllersUrl,
  buildGrowlinkCurrentReadingsUrl,
  buildGrowlinkEntityTypeUrl,
  buildGrowlinkReadOnlyHeaders,
  normalizeGrowlinkControllers,
  normalizeGrowlinkCurrentReadings
} from "../growlink";

describe("Growlink integration contract", () => {
  test("builds auth request and endpoint from Growlink credentials", () => {
    expect(buildGrowlinkAuthUrl()).toBe(
      "https://api.developer.growlink.com/V1/api/auth/token"
    );
    expect(
      buildGrowlinkAuthRequest({
        userName: "grower@example.com",
        password: "secret"
      })
    ).toEqual({
      userName: "grower@example.com",
      password: "secret"
    });
  });

  test("builds read-only data endpoints", () => {
    expect(buildGrowlinkControllersUrl()).toBe(
      "https://api.developer.growlink.com/hardware/v1/api/controllers"
    );
    expect(buildGrowlinkCurrentReadingsUrl("controller 1")).toBe(
      "https://api.developer.growlink.com/v1/v1/api/equipment/interaction/data/device/controller%201"
    );
    expect(buildGrowlinkEntityTypeUrl()).toBe(
      "https://api.developer.growlink.com/reporting/v1/api/reporting/enum/EntityType"
    );
  });

  test("builds bearer and unit headers without write-control headers", () => {
    expect(
      buildGrowlinkReadOnlyHeaders(
        { accessToken: "token_1", tokenType: "bearer" },
        { temp: "fahrenheit", tds: "ec", light: "ppfd", vpd: "kpa" }
      )
    ).toEqual({
      Authorization: "bearer token_1",
      "UOM-Temp": "1",
      "UOM-TDS": "6",
      "UOM-Light": "16",
      "UOM-VPD": "8"
    });
  });

  test("normalizes controllers, modules, sensors, and devices", () => {
    expect(
      normalizeGrowlinkControllers([
        {
          id: "controller-1",
          name: "Flower A",
          serialNumber: "serial-1",
          firmwareVersion: 12,
          timeZoneId: "America/Denver",
          modules: [
            {
              id: "module-1",
              name: "Climate",
              sensors: [
                {
                  id: "sensor-1",
                  name: "Air Temp",
                  metricName: "Temperature",
                  readingSuffix: "F",
                  unitOfMeasure: 1
                }
              ],
              devices: [{ id: "device-1", name: "Exhaust", deviceType: 4 }]
            }
          ]
        }
      ])
    ).toEqual([
      expect.objectContaining({
        id: "controller-1",
        name: "Flower A",
        modules: [
          expect.objectContaining({
            id: "module-1",
            sensors: [
              expect.objectContaining({
                id: "sensor-1",
                metricName: "Temperature",
                unitOfMeasure: 1
              })
            ],
            devices: [expect.objectContaining({ id: "device-1", deviceType: 4 })]
          })
        ]
      })
    ]);
  });

  test("normalizes current readings from common sensor/device response shapes", () => {
    expect(
      normalizeGrowlinkCurrentReadings("controller-1", {
        modules: [
          {
            sensors: [
              {
                id: "sensor-1",
                name: "VPD",
                metricName: "VPD",
                value: "1.18",
                unitOfMeasure: 8,
                updateTimestamp: "2026-06-22T13:00:00Z"
              }
            ],
            devices: [
              {
                id: "device-1",
                name: "Pump",
                isOn: true,
                updateTimestamp: "2026-06-22T13:00:05Z"
              }
            ]
          }
        ]
      })
    ).toEqual([
      {
        controllerId: "controller-1",
        entityId: "sensor-1",
        entityType: "sensor",
        name: "VPD",
        metricName: "VPD",
        ts: "2026-06-22T13:00:00Z",
        value: 1.18,
        unit: "kPa",
        raw: expect.any(Object)
      },
      {
        controllerId: "controller-1",
        entityId: "device-1",
        entityType: "device",
        name: "Pump",
        metricName: undefined,
        ts: "2026-06-22T13:00:05Z",
        value: true,
        unit: undefined,
        raw: expect.any(Object)
      }
    ]);
  });

  test("provider contract is read-only and excludes control surfaces", () => {
    expect(GROWLINK_PROVIDER_CONTRACT).toMatchObject({
      id: "growlink",
      readOnly: true,
      capabilities: [
        "auth_token",
        "controller_discovery",
        "current_device_readings",
        "historical_reporting"
      ],
      excludedControlSurfaces: ["rules", "setpoints", "device_control"],
      implemented: false
    });
  });
});
