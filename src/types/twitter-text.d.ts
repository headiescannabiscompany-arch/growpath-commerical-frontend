declare module "twitter-text/dist/parseTweet" {
  export default function parseTweet(text: string): {
    weightedLength: number;
    valid: boolean;
  };
}

declare module "twitter-text/dist/extractUrlsWithIndices" {
  export default function extractUrlsWithIndices(text: string): Array<{
    url: string;
    indices: [number, number];
  }>;
}
