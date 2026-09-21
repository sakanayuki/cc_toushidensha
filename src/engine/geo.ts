/** 地理計算。距離トロフィーと交通費の両方で使う。 */

import type { Station } from '../data/types';

const EARTH_RADIUS_KM = 6371;

/** 2地点間の大円距離 km。 */
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** 駅間の直線距離 km。距離トロフィーの判定に使う。 */
export function stationDistanceKm(a: Station, b: Station): number {
  return haversineKm(a.lat, a.lon, b.lat, b.lon);
}

/**
 * 線路が直線でない分の補正係数。
 * 営業キロ（Line.distancesKm）が未設定の区間で、大円距離からの近似に使う。
 */
export const RAIL_DETOUR_FACTOR = 1.15;

/** 隣接駅間の線路上の距離 km の近似。 */
export function approxRailDistanceKm(a: Station, b: Station): number {
  return stationDistanceKm(a, b) * RAIL_DETOUR_FACTOR;
}
