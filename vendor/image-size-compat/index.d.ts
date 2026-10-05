export type ImageType =
  | "bmp"
  | "cur"
  | "dds"
  | "gif"
  | "heif"
  | "icns"
  | "ico"
  | "j2c"
  | "jp2"
  | "jpg"
  | "jxl"
  | "jxl-stream"
  | "ktx"
  | "png"
  | "pnm"
  | "psd"
  | "svg"
  | "tga"
  | "tiff"
  | "webp";

export interface ImageSizeResult {
  width: number;
  height: number;
  orientation?: number;
  type?: string;
  images?: Array<{
    width: number;
    height: number;
    orientation?: number;
    type?: string;
  }>;
}

export type ImageSizeCallback = (error: Error | null, result?: ImageSizeResult) => void;

export default imageSize;
export declare function imageSize(input: Uint8Array | string): ImageSizeResult;
export declare function imageSize(input: string, callback: ImageSizeCallback): void;
export declare const disableFS: (value: boolean) => void;
export declare const disableTypes: (types: ImageType[]) => void;
export declare const setConcurrency: (value: number) => void;
export declare const types: ImageType[];
