import { useLayoutEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  HistoryCsvImportError,
  readHistoryCsvOffset,
  runHistoryCsvImport
} from "./historyCsvImport";
import type { TelemetryPointLike } from "./engine";
import type { BulkIngestTelemetryPointsResult } from "@/types/telemetry";

type Phase = "loading" | "ready" | "running" | "paused" | "complete";
type Progress = { key: string; phase: Phase; nextRow: number; message: string };
type WriteBatch = (
  points: TelemetryPointLike[]
) => Promise<BulkIngestTelemetryPointsResult>;

export function useHistoryCsvUpload(
  key: string,
  points: TelemetryPointLike[],
  sessionToken: string | null
) {
  const [progress, setProgress] = useState<Progress | null>(null);
  const context = useRef<{ key: string; pause: boolean; busy: boolean } | null>(null);

  useLayoutEffect(() => {
    const scope = { key, pause: false, busy: false };
    context.current = scope;
    if (key) {
      setProgress({ key, phase: "loading", nextRow: 0, message: "" });
      AsyncStorage.getItem(key).then(
        (stored) => {
          if (context.current !== scope) return;
          const nextRow = readHistoryCsvOffset(stored, points.length);
          setProgress({ key, phase: nextRow ? "paused" : "ready", nextRow, message: "" });
        },
        () => {
          if (context.current === scope) {
            setProgress({
              key,
              phase: "ready",
              nextRow: 0,
              message:
                "Saved progress could not be read. Retrying from the start safely updates matching timestamps."
            });
          }
        }
      );
    } else {
      setProgress(null);
    }
    return () => {
      context.current = null;
    };
  }, [key, points.length, sessionToken]);

  async function start(writeBatch: WriteBatch) {
    const scope = context.current;
    if (
      !key ||
      !scope ||
      scope.key !== key ||
      scope.busy ||
      progress?.key !== key ||
      progress.phase === "loading"
    )
      return null;
    scope.busy = true;
    scope.pause = false;
    let nextRow = progress.phase === "complete" ? 0 : progress.nextRow;
    let storageMessage = "";
    const isCurrent = () => context.current === scope;
    const show = (phase: Phase, message = "") => {
      if (isCurrent())
        setProgress({
          key,
          phase,
          nextRow,
          message: [message, storageMessage].filter(Boolean).join(" ")
        });
    };
    show("running");
    try {
      const acknowledged = await runHistoryCsvImport({
        points,
        startAt: nextRow,
        writeBatch,
        shouldStop: () => !isCurrent() || scope.pause,
        onProgress: async (offset) => {
          nextRow = offset;
          // The server already confirmed this batch. Replaying it after a crash is safe.
          // A different signed-in account or a changed mapping has a different key.
          try {
            if (offset === points.length) await AsyncStorage.removeItem(key);
            else await AsyncStorage.setItem(key, String(offset));
          } catch {
            storageMessage =
              "This device could not save progress. After closing the app, reselect the file to replay safely.";
          }
          show("running");
        }
      });
      if (!isCurrent()) return null;
      if (acknowledged < points.length) {
        show("paused", "Import paused. Resume when ready.");
        return null;
      }
      show("complete");
      return isCurrent;
    } catch (error) {
      if (error instanceof HistoryCsvImportError) nextRow = error.nextRow;
      show(
        "paused",
        error instanceof Error
          ? error.message
          : "The request could not be confirmed. Retry the import."
      );
      return null;
    } finally {
      scope.busy = false;
    }
  }

  return {
    progress: progress?.key === key ? progress : null,
    start,
    pause: () => {
      if (context.current?.busy) {
        context.current.pause = true;
        setProgress((current) =>
          current?.key === key
            ? { ...current, message: "Pausing after the current batch." }
            : current
        );
      }
    }
  };
}
