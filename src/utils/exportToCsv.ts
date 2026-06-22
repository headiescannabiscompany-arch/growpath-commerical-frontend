import { Platform, Share } from "react-native";
import * as Sharing from "expo-sharing";

declare const require: ((id: string) => any) | undefined;

type CsvColumn = { key: string; label: string };

export type CsvExportResult = {
  ok: boolean;
  filename: string;
  rowCount: number;
  method: "empty" | "web-download" | "native-share-file" | "native-share-text";
  uri?: string;
};

type CsvExportDeps = {
  platformOS?: string;
  document?: Document;
  url?: typeof URL;
  blob?: typeof Blob;
  sharing?: Pick<typeof Sharing, "isAvailableAsync" | "shareAsync">;
  share?: Pick<typeof Share, "share">;
  fileSystem?: {
    cacheDirectory?: string | null;
    EncodingType?: { UTF8?: string };
    writeAsStringAsync: (
      uri: string,
      contents: string,
      options?: { encoding?: string }
    ) => Promise<void>;
  } | null;
};

function optionalExpoFileSystem(): CsvExportDeps["fileSystem"] {
  try {
    // expo-file-system is available in native Expo apps but is optional for web/unit tests.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return typeof require === "function" ? require("expo-file-system") : null;
  } catch {
    return null;
  }
}

function sanitizeFilename(filename: string) {
  const raw = String(filename || "export").trim() || "export";
  return raw.replace(/\.csv$/i, "").replace(/[^a-zA-Z0-9._-]+/g, "-");
}

function csvEscape(value: unknown) {
  if (value === undefined || value === null) return '""';
  return `"${String(value).replace(/"/g, '""')}"`;
}

export function buildCsvContent(rows: any[], columns: CsvColumn[]) {
  const csvRows = [];
  csvRows.push(columns.map((col) => csvEscape(col.label)).join(","));
  for (const row of rows) {
    csvRows.push(columns.map((col) => csvEscape(row?.[col.key])).join(","));
  }
  return csvRows.join("\r\n");
}

async function shareNativeCsv(
  filename: string,
  csvContent: string,
  rowCount: number,
  deps: CsvExportDeps
): Promise<CsvExportResult> {
  const sharing = deps.sharing ?? Sharing;
  const share = deps.share ?? Share;
  const fileSystem = deps.fileSystem === undefined ? optionalExpoFileSystem() : deps.fileSystem;

  if (fileSystem?.cacheDirectory && (await sharing.isAvailableAsync())) {
    const uri = `${fileSystem.cacheDirectory}${filename}.csv`;
    await fileSystem.writeAsStringAsync(uri, csvContent, {
      encoding: fileSystem.EncodingType?.UTF8
    });
    await sharing.shareAsync(uri, {
      mimeType: "text/csv",
      dialogTitle: filename,
      UTI: "public.comma-separated-values-text"
    });
    return { ok: true, filename, rowCount, method: "native-share-file", uri };
  }

  await share.share({
    title: filename,
    message: csvContent
  });
  return { ok: true, filename, rowCount, method: "native-share-text" };
}

export async function exportToCsv(
  filename: string,
  rows: any[],
  columns: CsvColumn[],
  deps: CsvExportDeps = {}
): Promise<CsvExportResult> {
  const safeFilename = sanitizeFilename(filename);
  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return { ok: false, filename: safeFilename, rowCount: 0, method: "empty" };
  }

  const csvContent = buildCsvContent(rows, columns);
  const platformOS = deps.platformOS ?? Platform.OS;
  const documentRef = deps.document ?? (typeof document !== "undefined" ? document : undefined);
  const urlRef = deps.url ?? (typeof URL !== "undefined" ? URL : undefined);
  const blobRef = deps.blob ?? (typeof Blob !== "undefined" ? Blob : undefined);

  if (platformOS === "web" && documentRef && urlRef && blobRef) {
    const blob = new blobRef([csvContent], { type: "text/csv;charset=utf-8" });
    const url = urlRef.createObjectURL(blob);
    const a = documentRef.createElement("a");
    a.href = url;
    a.download = `${safeFilename}.csv`;
    documentRef.body?.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => urlRef.revokeObjectURL(url), 1000);
    return {
      ok: true,
      filename: safeFilename,
      rowCount: rows.length,
      method: "web-download"
    };
  }

  return shareNativeCsv(safeFilename, csvContent, rows.length, deps);
}
