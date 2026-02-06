export type TempUnit = "C" | "F";

export function toCelsius(temp: number, unit: TempUnit) {
  return unit === "C" ? temp : (temp - 32) * (5 / 9);
}

// Tetens SVP (kPa) → VPD = SVP * (1 - RH)
export function calcVpdKpaFromC(tempC: number, rh: number) {
  const svp = 0.6108 * Math.exp((17.27 * tempC) / (tempC + 237.3));
  return svp * (1 - rh / 100);
}

export function calcVpdKpa(temp: number, unit: TempUnit, rh: number) {
  return calcVpdKpaFromC(toCelsius(temp, unit), rh);
}
