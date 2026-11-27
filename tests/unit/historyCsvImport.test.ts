import { createHash } from "node:crypto";
import type { TelemetryPointLike } from "../../src/features/personal/tools/dewPointGuard/engine";
import {
  historyCsvCheckpointKey,
  prepareHistoryCsvImport,
  readHistoryCsvOffset,
  runHistoryCsvImport
} from "../../src/features/personal/tools/dewPointGuard/historyCsvImport";

function reading(
  index: number,
  extra: Partial<TelemetryPointLike> = {}
): TelemetryPointLike {
  return {
    ts: new Date(Date.UTC(2026, 1, 1) + index * 300_000).toISOString(),
    airTempC: 24,
    rh: 65,
    ...extra
  };
}
function accepted(points: TelemetryPointLike[]) {
  return {
    ingested: points.length,
    updated: 0,
    skipped: 0,
    acknowledged: points.length
  };
}

describe("environmental history imports", () => {
  test("sorts the entire file, reports rejected and repeated rows, and merges sparse duplicate measurements", () => {
    const old = reading(0, {
      co2Ppm: 800,
      vpdKpa: 1.1,
      lightValue: 900,
      lightUnit: "lux"
    });
    const later = reading(1);
    const correction = reading(0, {
      airTempC: 0,
      rh: 0,
      co2Ppm: null,
      vpdKpa: 0,
      lightValue: null,
      lightUnit: "unknown"
    });
    const plan = prepareHistoryCsvImport(
      [later, old, correction, reading(3, { ts: "invalid" })],
      6
    );
    expect(plan).toMatchObject({
      totalRows: 6,
      validRows: 3,
      rejectedRows: 3,
      duplicateRows: 1
    });
    expect(plan.points).toHaveLength(2);
    expect(plan.points[0]).toMatchObject({
      ts: old.ts,
      airTempC: 0,
      rh: 0,
      co2Ppm: 800,
      vpdKpa: 0,
      lightValue: 900,
      lightUnit: "lux"
    });
    expect(plan.points[1]).toEqual(later);
    expect(old.airTempC).toBe(24);
    expect(correction.co2Ppm).toBeNull();
  });

  test("treats timestamp offsets representing the same instant as duplicates and changes the light unit with the value", () => {
    const old = reading(0, {
      ts: "2026-11-26T12:00:00-05:00",
      lightValue: 400,
      lightUnit: "lux"
    });
    const now = reading(1, {
      ts: "2026-11-26T17:00:00Z",
      lightValue: 0,
      lightUnit: null
    });
    const plan = prepareHistoryCsvImport([old, now], 2);
    expect(plan.duplicateRows).toBe(1);
    expect(plan.points).toHaveLength(1);
    expect(plan.points[0]).toMatchObject({
      ts: "2026-11-26T17:00:00.000Z",
      lightValue: 0,
      lightUnit: null
    });
  });

  test("counts parser-dropped rows, rejects impossible counts, and supports empty files", () => {
    expect(prepareHistoryCsvImport([], 4)).toMatchObject({
      points: [],
      rejectedRows: 4,
      validRows: 0
    });
    expect(() => prepareHistoryCsvImport([reading(0)], 0)).toThrow(RangeError);
  });

  test.each([
    "",
    "0",
    "-500",
    "1",
    "501",
    "0499",
    " 500",
    "Infinity",
    "1e3",
    "9007199254740995",
    "1003"
  ])("discards a corrupt/nonboundary checkpoint %j", (stored) => {
    expect(readHistoryCsvOffset(stored, 1002)).toBe(0);
  });
  test("restores acknowledged full and terminal checkpoints only", () => {
    expect(readHistoryCsvOffset("500", 1002)).toBe(500);
    expect(readHistoryCsvOffset("1002", 1002)).toBe(1002);
    expect(readHistoryCsvOffset(null, 1002)).toBe(0);
  });

  test("binds a checkpoint to all file content including long inputs, workspace, mapping, units and timezone", () => {
    const csv = "time,tempC,rh\n" + "a".repeat(8191) + "🌱\n" + "b".repeat(9000);
    const review = [
      "owner",
      "personal",
      "workspace",
      "grow",
      "source",
      "America/New_York",
      "tempC",
      "C"
    ];
    const identity = JSON.stringify(review);
    const key = historyCsvCheckpointKey(csv, identity);
    const reference = createHash("sha256");
    for (const field of [identity, csv]) {
      const length = Buffer.alloc(4);
      length.writeUInt32LE(field.length);
      reference.update(length).update(Buffer.from(field, "utf16le"));
    }
    expect(key).toBe("gp:history-csv:v1:" + reference.digest("hex"));
    expect(key).not.toContain(review[0]);
    expect(historyCsvCheckpointKey(csv.replace("🌱", "🌳"), identity)).not.toBe(key);
    for (const [i, value] of review.entries()) {
      const different = [...review];
      different[i] = value + "X";
      expect(historyCsvCheckpointKey(csv, JSON.stringify(different))).not.toBe(key);
    }
    expect(historyCsvCheckpointKey("AB", "C")).not.toBe(
      historyCsvCheckpointKey("B", "CA")
    );
  });

  test("resumes a 12,005-reading upload after an ambiguous write without losing or duplicating rows", async () => {
    const original = Array.from({ length: 12005 }, (_, i) => reading(i));
    const plan = prepareHistoryCsvImport([...original].reverse(), original.length);
    const stored = new Map<string, TelemetryPointLike>();
    let saved = "0";
    let interrupted = false;
    let inflight = 0;
    const batches: number[] = [];
    const writeBatch = async (batch: TelemetryPointLike[]) => {
      expect(++inflight).toBe(1);
      batches.push(batch.length);
      await Promise.resolve();
      const existing = batch.filter((p) => stored.has(p.ts)).length;
      for (const p of batch) stored.set(p.ts, p);
      inflight--;
      if (!interrupted && batch[0].ts === original[6500].ts) {
        interrupted = true;
        throw new Error("The response was lost after commit.");
      }
      return {
        acknowledged: batch.length,
        ingested: batch.length - existing,
        updated: 0,
        skipped: 0
      };
    };
    const onProgress = async (offset: number) => {
      await Promise.resolve();
      saved = String(offset);
    };
    await expect(
      runHistoryCsvImport({ points: plan.points, writeBatch, onProgress })
    ).rejects.toMatchObject({ code: "BATCH_FAILED", nextRow: 6500 });
    expect(stored.size).toBe(7000);
    expect(saved).toBe("6500");
    const result = await runHistoryCsvImport({
      points: plan.points,
      startAt: readHistoryCsvOffset(saved, plan.points.length),
      writeBatch,
      onProgress
    });
    expect(result).toBe(12005);
    expect(stored.size).toBe(12005);
    expect([...stored.values()]).toEqual(original);
    expect(batches[batches.length - 1]).toBe(5);
    expect(Math.max(...batches)).toBe(500);
    expect(saved).toBe("12005");
  });

  test.each([
    [{ ingested: 0, updated: 0, skipped: 0 }, "BATCH_UNCONFIRMED", 0],
    [{ ingested: 1, updated: 0, skipped: 0, acknowledged: 2 }, "BATCH_UNCONFIRMED", 0],
    [{ ingested: -1, updated: 0, skipped: 0, acknowledged: 1 }, "BATCH_UNCONFIRMED", 0],
    [{ ingested: 1, updated: 1, skipped: 0, acknowledged: 1 }, "BATCH_UNCONFIRMED", 0],
    [{ ingested: 0, updated: 0, skipped: 1, acknowledged: 0 }, "ROWS_SKIPPED", 1]
  ] as const)(
    "never advances on an ambiguous receipt or skipped rows",
    async (receipt, code, skipped) => {
      const onProgress = jest.fn();
      await expect(
        runHistoryCsvImport({
          points: [reading(0)],
          writeBatch: async () => receipt,
          onProgress
        })
      ).rejects.toMatchObject({ code, nextRow: 0, skipped });
      expect(onProgress).not.toHaveBeenCalled();
    }
  );

  test("an acknowledged no-op advances, while persisting progress is awaited before the next write", async () => {
    const events: string[] = [];
    const points = Array.from({ length: 501 }, (_, i) => reading(i));
    await runHistoryCsvImport({
      points,
      writeBatch: async (batch) => {
        events.push("write " + batch.length);
        return {
          acknowledged: batch.length,
          ingested: 0,
          updated: 0,
          skipped: 0
        };
      },
      onProgress: async (n) => {
        await Promise.resolve();
        events.push("saved " + n);
      }
    });
    expect(events).toEqual(["write 500", "saved 500", "write 1", "saved 501"]);
  });

  test("pauses between batches and stops when confirmed progress cannot be saved", async () => {
    const points = Array.from({ length: 501 }, (_, i) => reading(i));
    const writeBatch = jest.fn(async (p: TelemetryPointLike[]) => accepted(p));
    let paused = false;
    expect(
      await runHistoryCsvImport({
        points,
        writeBatch,
        onProgress: () => {
          paused = true;
        },
        shouldStop: () => paused
      })
    ).toBe(500);
    expect(writeBatch).toHaveBeenCalledTimes(1);
    await expect(
      runHistoryCsvImport({
        points,
        writeBatch,
        onProgress: () => {
          throw new Error("device full");
        }
      })
    ).rejects.toMatchObject({ code: "CHECKPOINT_FAILED", nextRow: 500 });
    expect(writeBatch).toHaveBeenCalledTimes(2);
    await expect(runHistoryCsvImport({ points, writeBatch, startAt: 3 })).rejects.toThrow(
      RangeError
    );
    expect(writeBatch).toHaveBeenCalledTimes(2);
  });
});
