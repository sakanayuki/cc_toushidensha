/**
 * 日本地図データと投影の検証。
 *
 * 地図と駅がずれていないことを CI で担保する。
 * 「駅の座標が、その駅の都道府県のポリゴン内にあるか」を見ているので、
 * 駅の緯度経度の打ち間違いもここで捕まる。
 */

import { describe, expect, it } from 'vitest';
import { LINES, STATIONS, STATION_MAP } from '../data';
import japan from '../data/geo/japan.json';
import type { JapanGeo, PrefectureFeature } from '../data/geo';
import { ringsOf } from '../data/geo';
import { project } from '../ui/MapView';

const geo = japan as unknown as JapanGeo;

function bboxOf(feature: PrefectureFeature) {
  let minLon = Infinity;
  let maxLon = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;
  for (const ring of ringsOf(feature)) {
    for (const [lon, lat] of ring) {
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
  }
  return { minLon, maxLon, minLat, maxLat };
}

describe('日本地図データ', () => {
  it('47都道府県ぶんある', () => {
    expect(geo.features).toHaveLength(47);
  });

  it('県名がすべて入っている', () => {
    const nameless = geo.features.filter((f) => !f.properties.name);
    expect(nameless).toEqual([]);
  });

  it('座標が日本の範囲に収まっている', () => {
    for (const feature of geo.features) {
      const b = bboxOf(feature);
      expect(b.minLon).toBeGreaterThan(122);
      expect(b.maxLon).toBeLessThan(154);
      expect(b.minLat).toBeGreaterThan(24);
      expect(b.maxLat).toBeLessThan(46);
    }
  });

  it('各リングが閉じている', () => {
    for (const feature of geo.features) {
      for (const ring of ringsOf(feature)) {
        expect(ring.length).toBeGreaterThanOrEqual(4);
        expect(ring[0]).toEqual(ring[ring.length - 1]);
      }
    }
  });
});

describe('駅と地図の整合', () => {
  it('すべての駅が、その駅の都道府県の範囲内にある', () => {
    const byName = new Map(geo.features.map((f) => [f.properties.name, bboxOf(f)]));
    // 簡略化で海岸線が内側に寄るぶんの余裕。
    const margin = 0.05;

    const outside = STATIONS.filter((station) => {
      const b = byName.get(station.pref);
      if (!b) return true;
      return (
        station.lon < b.minLon - margin ||
        station.lon > b.maxLon + margin ||
        station.lat < b.minLat - margin ||
        station.lat > b.maxLat + margin
      );
    });

    expect(outside.map((s) => `${s.name}(${s.pref})`)).toEqual([]);
  });

  it('収録した県がすべて地図に存在する', () => {
    const names = new Set(geo.features.map((f) => f.properties.name));
    const missing = [...new Set(STATIONS.map((s) => s.pref))].filter((p) => !names.has(p));
    expect(missing).toEqual([]);
  });
});

describe('投影', () => {
  it('経度1度がちょうど1000単位になる', () => {
    const a = project(34, 133);
    const b = project(34, 134);
    expect(b.x - a.x).toBeCloseTo(1000, 6);
  });

  it('東ほど右、北ほど上に来る', () => {
    expect(project(34, 134).x).toBeGreaterThan(project(34, 133).x);
    expect(project(35, 133).y).toBeLessThan(project(34, 133).y);
  });

  it('メルカトルなので高緯度ほど縦が引き伸ばされる', () => {
    const low = project(33, 133).y - project(34, 133).y;
    const high = project(43, 133).y - project(44, 133).y;
    expect(Math.abs(high)).toBeGreaterThan(Math.abs(low));
  });
});

describe('南海本線と阪和線の位置関係', () => {
  // 南海本線は海沿い、阪和線は内陸を走る。
  // 同じくらいの緯度で比べたとき、南海のほうが必ず西（経度が小さい）になる。
  const line = (id: string) => {
    const l = LINES.find((x) => x.id === id);
    if (!l) throw new Error(`line not found: ${id}`);
    return l.stations.map((sid) => STATION_MAP[sid]!).filter((s) => s.pref === '大阪府');
  };

  it('同緯度帯では南海本線がつねに阪和線より西にある', () => {
    const nankai = line('nankai');
    const hanwa = line('hanwa');
    // 両線が並走する区間（堺〜泉佐野あたり）だけを見る。
    const band = (s: { lat: number }) => s.lat >= 34.33 && s.lat <= 34.58;

    const inverted: string[] = [];
    for (const n of nankai.filter(band)) {
      // 緯度がいちばん近い阪和線の駅と比べる。
      const nearest = hanwa
        .filter(band)
        .reduce((a, b) => (Math.abs(b.lat - n.lat) < Math.abs(a.lat - n.lat) ? b : a));
      if (n.lon >= nearest.lon) {
        inverted.push(`${n.name}(${n.lon}) >= ${nearest.name}(${nearest.lon})`);
      }
    }

    expect(inverted).toEqual([]);
  });
});
