export interface BraceExpansionOptions {
  expansionMax?: number;
  expansionMaxLength?: number;
}

declare function expand(
  input: string,
  options?: BraceExpansionOptions,
): string[];

export { expand };
export declare const EXPANSION_MAX: number;
export declare const EXPANSION_MAX_LENGTH: number;
export default expand;
