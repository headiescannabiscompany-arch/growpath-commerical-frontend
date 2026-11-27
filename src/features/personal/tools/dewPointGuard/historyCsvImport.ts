import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex } from "@noble/hashes/utils";
import type { TelemetryPointLike } from "./engine";

export const HISTORY_CSV_BATCH_SIZE = 500;

const optionalMeasurements = [
  "vpdKpa",
  "co2Ppm",
  "lightLux",
  "ppfd",
  "dliMolM2Day"
] as const;

export function prepareHistoryCsvImport(
  mappedPoints: TelemetryPointLike[],
  inputRowCount: number
) {
  if (!Number.isSafeInteger(inputRowCount) || inputRowCount < mappedPoints.length) {
    throw new RangeError("The CSV row count must include every mapped reading.");
  }
  const readings = new Map<number, TelemetryPointLike>();
  let validRows = 0;
  for (const point of mappedPoints) {
    const time = Date.parse(point.ts);
    if (
      !Number.isFinite(time) ||
      !Number.isFinite(point.airTempC) ||
      !Number.isFinite(point.rh) ||
      point.rh < 0 ||
      point.rh > 100
    )
      continue;

    validRows++;
    const previous = readings.get(time);
    const next = { ...point, ts: new Date(time).toISOString() };
    if (previous) {
      // At an identical timestamp the last supplied measurement wins. An empty
      // optional column must not erase a measurement supplied in an earlier row.
      for (const key of optionalMeasurements) {
        if (next[key] == null) next[key] = previous[key];
      }
      if (next.lightValue == null) {
        next.lightValue = previous.lightValue;
        next.lightUnit = previous.lightUnit;
      }
    }
    readings.set(time, next);
  }
  const points = Array.from(readings.keys())
    .sort((a, b) => a - b)
    .map((time) => readings.get(time)!);
  return {
    points,
    totalRows: inputRowCount,
    validRows,
    rejectedRows: inputRowCount - validRows,
    duplicateRows: validRows - points.length
  };
}

// Hash length-framed UTF-16LE code units, including unpaired surrogates, without
// allocating another copy of the CSV. The caller scopes reviewIdentity to the
// authenticated account, workspace, grow, source, mapping, units and timezone.
export function historyCsvCheckpointKey(
  rawCsvText: string,
  reviewIdentity: string
): string {
  const hash = sha256.create();
  const buffer = new Uint8Array(16384);
  const view = new DataView(buffer.buffer);
  for (const field of [reviewIdentity, rawCsvText]) {
    view.setUint32(0, field.length, true);
    hash.update(buffer.subarray(0, 4));
    for (let start = 0; start < field.length; start += buffer.length / 2) {
      const chars = Math.min(buffer.length / 2, field.length - start);
      for (let i = 0; i < chars; i++) {
        view.setUint16(i * 2, field.charCodeAt(start + i), true);
      }
      hash.update(buffer.subarray(0, chars * 2));
    }
  }
  return `gp:history-csv:v1:${bytesToHex(hash.digest())}`;
}

function isResumeOffset(offset: number, total: number) {
  return (
    Number.isSafeInteger(offset) &&
    offset >= 0 &&
    offset <= total &&
    (offset === total || offset % HISTORY_CSV_BATCH_SIZE === 0)
  );
}

export function readHistoryCsvOffset(
  storedValue: string | null,
  totalPoints: number
): number {
  if (!storedValue || !/^(0|[1-9]\d*)$/.test(storedValue)) return 0;
  const offset = Number(storedValue);
  return isResumeOffset(offset, totalPoints) ? offset : 0;
}

type HistoryCsvErrorCode =
  | "BATCH_FAILED"
  | "ROWS_SKIPPED"
  | "BATCH_UNCONFIRMED"
  | "CHECKPOINT_FAILED";

export class HistoryCsvImportError extends Error {
  readonly code: HistoryCsvErrorCode;
  readonly nextRow: number;
  readonly skipped: number;
  readonly cause?: unknown;

  constructor(
    code: HistoryCsvErrorCode,
    message: string,
    nextRow: number,
    skipped = 0,
    cause?: unknown
  ) {
    super(message);
    this.name = "HistoryCsvImportError";
    this.code = code;
    this.nextRow = nextRow;
    this.skipped = skipped;
    this.cause = cause;
  }
}

type BatchReceipt = {
  acknowledged?: number;
  ingested: number;
  updated: number;
  skipped: number;
};

type HistoryCsvRun = {
  points: TelemetryPointLike[];
  startAt?: number;
  writeBatch: (points: TelemetryPointLike[]) => Promise<BatchReceipt>;
  onProgress?: (nextRow: number) => Promise<void> | void;
  shouldStop?: () => boolean;
};

export async function runHistoryCsvImport({
  points,
  startAt = 0,
  writeBatch,
  onProgress,
  shouldStop
}: HistoryCsvRun): Promise<number> {
  if (!isResumeOffset(startAt, points.length)) {
    throw new RangeError("CSV resume position must be a confirmed batch boundary.");
  }

  let nextRow = startAt;
  while (nextRow < points.length && !shouldStop?.()) {
    const batch = points.slice(nextRow, nextRow + HISTORY_CSV_BATCH_SIZE);
    let receipt: BatchReceipt;
    try {
      receipt = await writeBatch(batch);
    } catch (cause) {
      throw new HistoryCsvImportError(
        "BATCH_FAILED",
        "The server could not confirm this batch. Retry from the last confirmed reading.",
        nextRow,
        0,
        cause
      );
    }
    if (Number.isSafeInteger(receipt?.skipped) && receipt.skipped > 0) {
      throw new HistoryCsvImportError(
        "ROWS_SKIPPED",
        `The server skipped ${receipt.skipped} readings in this batch. Review the data before retrying.`,
        nextRow,
        receipt.skipped
      );
    }
    if (
      receipt?.acknowledged !== batch.length ||
      receipt.skipped !== 0 ||
      !Number.isSafeInteger(receipt.ingested) ||
      !Number.isSafeInteger(receipt.updated) ||
      receipt.ingested < 0 ||
      receipt.updated < 0 ||
      receipt.ingested + receipt.updated > batch.length
    ) {
      throw new HistoryCsvImportError(
        "BATCH_UNCONFIRMED",
        "The server did not confirm every reading in this batch. Retry from the last confirmed reading.",
        nextRow
      );
    }
    nextRow += batch.length;
    try {
      await onProgress?.(nextRow);
    } catch (cause) {
      throw new HistoryCsvImportError(
        "CHECKPOINT_FAILED",
        "The server confirmed this batch, but saving progress on this device failed. You can safely retry.",
        nextRow,
        0,
        cause
      );
    }
  }
  return nextRow;
}
