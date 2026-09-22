/**
 * 日本地図（都道府県ポリゴン）の読み込み。
 *
 * 元データは地球地図日本（国土地理院）。利用条件が出典の明記なので、
 * README と地図上のクレジットに出している。
 * scripts/build-japan-geojson.py で 13MB から 435KB まで簡略化したものを同梱する。
 *
 * `?url` で読み込むことで JS バンドルには入らず、別ファイルとして配信される。
 * 地図が無くてもゲームは成立するので、取得は非同期にして起動を妨げない。
 */

import japanUrl from './japan.json?url';
import lineShapes from './lineShapes.json';

/**
 * 路線の実際の線形。[緯度, 経度] の並びで、路線IDから引く。
 * 停車駅を直線で結ぶと、駅間の長い新幹線が瀬戸内海を横切ってしまうため、
 * 描画にはこちらを使う（scripts/build-line-shapes.py が生成）。
 * 全14路線で 24KB と小さいので、地図本体と違ってバンドルに同梱する。
 */
export const LINE_SHAPES = lineShapes as unknown as Record<string, [number, number][]>;

/** 出典表記。利用条件として明記が必要。 */
export const JAPAN_GEO_ATTRIBUTION = '地図: 地球地図日本（国土地理院）';

export interface GeoPolygon {
  type: 'Polygon';
  coordinates: [number, number][][];
}

export interface GeoMultiPolygon {
  type: 'MultiPolygon';
  coordinates: [number, number][][][];
}

export interface PrefectureFeature {
  type: 'Feature';
  properties: { name: string };
  geometry: GeoPolygon | GeoMultiPolygon;
}

export interface JapanGeo {
  type: 'FeatureCollection';
  features: PrefectureFeature[];
}

/** ポリゴンの外周・内周をまとめて、描画しやすいリングの配列にする。 */
export function ringsOf(feature: PrefectureFeature): [number, number][][] {
  const { geometry } = feature;
  return geometry.type === 'Polygon' ? geometry.coordinates : geometry.coordinates.flat();
}

let cache: Promise<JapanGeo> | null = null;

export function loadJapanGeo(): Promise<JapanGeo> {
  cache ??= fetch(japanUrl).then((res) => {
    if (!res.ok) throw new Error(`failed to load japan.json: ${res.status}`);
    return res.json() as Promise<JapanGeo>;
  });
  return cache;
}
