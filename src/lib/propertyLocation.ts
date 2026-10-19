export type LocationVisibility = "exact" | "approximate" | "hidden";
export function publicMapLocation(lat: number | null | undefined, lng: number | null | undefined, visibility: LocationVisibility = "approximate") {
  if (visibility === "hidden" || lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return visibility === "exact" ? { lat, lng, exact: true } : { lat: Math.round(lat * 100) / 100, lng: Math.round(lng * 100) / 100, exact: false };
}
