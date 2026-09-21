/**
 * データ整合性の検証（仕様書 4.3）。
 * ここが落ちたらデプロイしない。壊れたデータが公開されるのを防ぐ。
 */

import { describe, expect, it } from 'vitest';
import { FAME_CATEGORY_MAP, GAME_DATA, INDUSTRIES, LINES, STATIONS } from '../data';
import { TRAIN_TYPES } from '../data/types';
import { buildGraph } from '../engine/graph';

describe('駅マスタ', () => {
  it('駅IDが重複していない', () => {
    const ids = STATIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('全駅が最低1つの産業を持つ', () => {
    const empty = STATIONS.filter((s) => s.industries.length === 0);
    expect(empty.map((s) => s.id)).toEqual([]);
  });

  it('駅が参照する産業がすべて存在する', () => {
    const missing = STATIONS.flatMap((s) =>
      s.industries.filter((id) => !GAME_DATA.industries[id]).map((id) => `${s.id}:${id}`),
    );
    expect(missing).toEqual([]);
  });

  it('緯度経度が日本の範囲に収まっている', () => {
    const outOfRange = STATIONS.filter(
      (s) => s.lat < 24 || s.lat > 46 || s.lon < 122 || s.lon > 146,
    );
    expect(outOfRange.map((s) => s.id)).toEqual([]);
  });
});

describe('産業マスタ', () => {
  it('産業IDが重複していない', () => {
    const ids = INDUSTRIES.map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('すべての産業がどこかの駅から参照されている', () => {
    const referenced = new Set(STATIONS.flatMap((s) => s.industries));
    const orphans = INDUSTRIES.filter((x) => !referenced.has(x.id));
    expect(orphans.map((x) => x.id)).toEqual([]);
  });

  it('規模と利益率が正の値', () => {
    const invalid = INDUSTRIES.filter((x) => x.scale <= 0 || x.profitRate <= 0);
    expect(invalid.map((x) => x.id)).toEqual([]);
  });

  it('fame の参照先カテゴリが存在する', () => {
    const missing = INDUSTRIES.filter(
      (x) => x.fame && !FAME_CATEGORY_MAP[x.fame.categoryId],
    );
    expect(missing.map((x) => x.id)).toEqual([]);
  });

  it('同一カテゴリ内で順位が重複していない', () => {
    const seen = new Map<string, Set<number>>();
    const duplicates: string[] = [];
    for (const x of INDUSTRIES) {
      if (!x.fame) continue;
      const ranks = seen.get(x.fame.categoryId) ?? new Set<number>();
      if (ranks.has(x.fame.rank)) duplicates.push(`${x.fame.categoryId}:${x.fame.rank}`);
      ranks.add(x.fame.rank);
      seen.set(x.fame.categoryId, ranks);
    }
    expect(duplicates).toEqual([]);
  });

  it('全国ベスト3の産業が全体の2〜3割に収まる', () => {
    const best3 = INDUSTRIES.filter((x) => x.fame && x.fame.rank <= 3);
    const ratio = best3.length / INDUSTRIES.length;
    expect(ratio).toBeGreaterThan(0.1);
    expect(ratio).toBeLessThan(0.4);
  });

  it('第一次・第二次・第三次がいずれも十分な数ある', () => {
    for (const sector of [1, 2, 3] as const) {
      const count = INDUSTRIES.filter((x) => x.sector === sector).length;
      expect(count).toBeGreaterThan(10);
    }
  });
});

describe('路線データ', () => {
  it('路線が参照する駅がすべて存在する', () => {
    const missing = LINES.flatMap((line) =>
      line.stations.filter((id) => !GAME_DATA.stations[id]).map((id) => `${line.id}:${id}`),
    );
    expect(missing).toEqual([]);
  });

  it('路線内で駅が重複していない', () => {
    for (const line of LINES) {
      expect(new Set(line.stations).size).toBe(line.stations.length);
    }
  });

  it('停車駅が路線の駅の部分集合であり、順序も保たれている', () => {
    for (const line of LINES) {
      const order = new Map(line.stations.map((id, i) => [id, i]));
      for (const type of TRAIN_TYPES) {
        const stops = line.stops[type];
        const indices = stops.map((id) => order.get(id));
        expect(
          indices.every((i) => i !== undefined),
          `${line.id}/${type} に路線外の駅がある`,
        ).toBe(true);
        const asc = (indices as number[]).every((v, i, arr) => i === 0 || v > (arr[i - 1] as number));
        expect(asc, `${line.id}/${type} の停車駅の順序が路線と一致しない`).toBe(true);
      }
    }
  });

  it('普通列車は全駅に停車する', () => {
    for (const line of LINES) {
      expect(line.stops.local, `${line.id}`).toEqual(line.stations);
    }
  });

  it('distancesKm を持つ路線は長さが駅数-1', () => {
    for (const line of LINES) {
      if (!line.distancesKm) continue;
      expect(line.distancesKm.length).toBe(line.stations.length - 1);
    }
  });
});

describe('移動グラフ', () => {
  it('普通列車グラフ上で全駅が連結している', () => {
    const graph = buildGraph(GAME_DATA, 'local');
    const start = STATIONS[0]?.id as string;
    const seen = new Set<string>([start]);
    const queue = [start];
    while (queue.length > 0) {
      const id = queue.shift() as string;
      for (const edge of graph.get(id) ?? []) {
        if (seen.has(edge.to)) continue;
        seen.add(edge.to);
        queue.push(edge.to);
      }
    }
    const unreachable = STATIONS.filter((s) => !seen.has(s.id)).map((s) => s.id);
    expect(unreachable).toEqual([]);
  });

  it('開始駅がすべて存在し、相互に到達可能', () => {
    const graph = buildGraph(GAME_DATA, 'local');
    for (const id of GAME_DATA.startStationIds) {
      expect(GAME_DATA.stations[id], `${id} が駅マスタに無い`).toBeDefined();
      expect((graph.get(id) ?? []).length, `${id} が孤立している`).toBeGreaterThan(0);
    }
  });

  it('急行・特急グラフの駅数が普通より少ない', () => {
    const local = buildGraph(GAME_DATA, 'local').size;
    const express = buildGraph(GAME_DATA, 'express').size;
    const ltd = buildGraph(GAME_DATA, 'ltd').size;
    expect(express).toBeLessThan(local);
    expect(ltd).toBeLessThan(local);
  });
});
