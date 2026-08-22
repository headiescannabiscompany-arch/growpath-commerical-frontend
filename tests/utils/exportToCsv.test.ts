import { describe, expect, it, jest } from "@jest/globals";
import {
  buildCsvContent,
  exportCsvContent,
  exportToCsv
} from "../../src/utils/exportToCsv";

describe("exportToCsv", () => {
  const columns = [
    { key: "name", label: "Name" },
    { key: "notes", label: "Notes" }
  ];

  it("builds deterministic escaped CSV content", () => {
    expect(
      buildCsvContent(
        [
          { name: "Blue Dream", notes: 'Needs "gentle" feed' },
          { name: "Empty", notes: null }
        ],
        columns
      )
    ).toBe('"Name","Notes"\r\n"Blue Dream","Needs ""gentle"" feed"\r\n"Empty",""');
  });

  it("neutralizes formula-like strings without changing typed numbers", () => {
    expect(
      buildCsvContent(
        [
          { name: "=HYPERLINK(\"https://bad.test\")", notes: "+SUM(A1:A2)" },
          { name: "  @command", notes: 12 }
        ],
        columns
      )
    ).toBe(
      '"Name","Notes"\r\n"\'=HYPERLINK(""https://bad.test"")","\'+SUM(A1:A2)"\r\n"\'  @command","12"'
    );
  });

  it("returns an empty result when there are no rows", async () => {
    await expect(exportToCsv("growpath-export", [], columns)).resolves.toEqual({
      ok: false,
      filename: "growpath-export",
      rowCount: 0,
      method: "empty"
    });
  });

  it("uses native file sharing when FileSystem and Sharing are available", async () => {
    const writeAsStringAsync = jest
      .fn<
        (uri: string, contents: string, options?: { encoding?: string }) => Promise<void>
      >()
      .mockResolvedValue(undefined);
    const shareAsync = jest
      .fn<(url: string, options?: Record<string, unknown>) => Promise<void>>()
      .mockResolvedValue(undefined);
    const isAvailableAsync = jest.fn<() => Promise<boolean>>().mockResolvedValue(true);

    await expect(
      exportToCsv("Grow Path Export", [{ name: "A", notes: "B" }], columns, {
        platformOS: "ios",
        fileSystem: {
          cacheDirectory: "file:///cache/",
          EncodingType: { UTF8: "utf8" },
          writeAsStringAsync
        },
        sharing: {
          isAvailableAsync,
          shareAsync
        }
      })
    ).resolves.toMatchObject({
      ok: true,
      filename: "Grow-Path-Export",
      rowCount: 1,
      method: "native-share-file",
      uri: "file:///cache/Grow-Path-Export.csv"
    });

    expect(writeAsStringAsync).toHaveBeenCalledWith(
      "file:///cache/Grow-Path-Export.csv",
      '"Name","Notes"\r\n"A","B"',
      { encoding: "utf8" }
    );
    expect(shareAsync).toHaveBeenCalledWith(
      "file:///cache/Grow-Path-Export.csv",
      expect.objectContaining({ mimeType: "text/csv" })
    );
  });

  it("falls back to native text share when file sharing is unavailable", async () => {
    const share = jest
      .fn<
        (
          content: Record<string, unknown>,
          options?: Record<string, unknown>
        ) => Promise<any>
      >()
      .mockResolvedValue({ action: "sharedAction" });
    const isAvailableAsync = jest.fn<() => Promise<boolean>>().mockResolvedValue(false);
    const shareAsync = jest
      .fn<(url: string, options?: Record<string, unknown>) => Promise<void>>()
      .mockResolvedValue(undefined);

    await expect(
      exportToCsv("growpath-export.csv", [{ name: "A", notes: "B" }], columns, {
        platformOS: "android",
        fileSystem: null,
        sharing: {
          isAvailableAsync,
          shareAsync
        },
        share: { share }
      })
    ).resolves.toEqual({
      ok: true,
      filename: "growpath-export",
      rowCount: 1,
      method: "native-share-text"
    });

    expect(share).toHaveBeenCalledWith({
      title: "growpath-export",
      message: '"Name","Notes"\r\n"A","B"'
    });
  });

  it("does not put an unbounded CSV into the native message-share fallback", async () => {
    const share = jest
      .fn<
        (
          content: Record<string, unknown>,
          options?: Record<string, unknown>
        ) => Promise<any>
      >()
      .mockResolvedValue({ action: "sharedAction" });
    const isAvailableAsync = jest.fn<() => Promise<boolean>>().mockResolvedValue(false);
    const shareAsync = jest
      .fn<(url: string, options?: Record<string, unknown>) => Promise<void>>()
      .mockResolvedValue(undefined);

    await expect(
      exportCsvContent("large-audit", "x".repeat(70 * 1024), {
        platformOS: "ios",
        fileSystem: null,
        sharing: {
          isAvailableAsync,
          shareAsync
        },
        share: { share }
      })
    ).rejects.toThrow("too large to share safely as message text");

    expect(share).not.toHaveBeenCalled();
  });

  it("downloads an authenticated raw audit CSV unchanged on web", async () => {
    jest.useFakeTimers();
    const click = jest.fn();
    const remove = jest.fn();
    const anchor = { href: "", download: "", click, remove };
    const appendChild = jest.fn();
    const createObjectURL = jest.fn(() => "blob:audit");
    const revokeObjectURL = jest.fn();
    const raw = '"recordType","reason"\r\n"movement","=reviewed"';

    await expect(
      exportCsvContent("growpath inventory audit.csv", raw, {
        platformOS: "web",
        document: {
          createElement: jest.fn(() => anchor),
          body: { appendChild }
        } as any,
        url: { createObjectURL, revokeObjectURL } as any,
        blob: jest.fn((parts, options) => ({ parts, options })) as any
      })
    ).resolves.toEqual({
      ok: true,
      filename: "growpath-inventory-audit",
      rowCount: 0,
      method: "web-download"
    });

    expect(createObjectURL).toHaveBeenCalledWith(
      expect.objectContaining({
        parts: [raw],
        options: { type: "text/csv;charset=utf-8" }
      })
    );
    expect(anchor.download).toBe("growpath-inventory-audit.csv");
    expect(click).toHaveBeenCalledTimes(1);
    expect(remove).toHaveBeenCalledTimes(1);
    jest.runAllTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:audit");
    jest.useRealTimers();
  });
});
