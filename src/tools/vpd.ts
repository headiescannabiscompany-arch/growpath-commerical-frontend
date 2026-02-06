export type TempUnit = "C" | "F";

export function toCelsius(value: number, unit: TempUnit): number {
  return unit === "F" ? ((value - 32) * 5) / 9 : value;
}

// Tetens (good enough for v1)
export function calcVpdKpa(tempC: number, rh: number): number {
  const svp = 0.6108 * Math.exp((17.27 * tempC) / (tempC + 237.3)); // kPa
  return svp * (1 - rh / 100);
}

export function calcVpdFromTemp(
  temp: number,
  unit: TempUnit,
  rh: number
): { tempC: number; vpdKpa: number } {
  const tempC = toCelsius(temp, unit);
  const vpdKpa = calcVpdKpa(tempC, rh);
  return { tempC, vpdKpa };
}
