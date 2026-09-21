/** 移動グラフと到達可能駅の探索（仕様書 2.1 / 4.2）。 */

import { describe, expect, it } from 'vitest';
import { GAME_DATA, STATION_MAP } from '../data';
import type { GameData, Line, Station } from '../data/types';
import { availableTypes, buildGraph, buildGraphs, findReachable } from '../engine/graph';

/** テスト用の小さな路線網を組む。駅は経度方向に 0.1 度ずつ並べる。 */
function makeData(lines: Line[], stationIds: string[]): GameData {
  const stations: Record<string, Station> = {};
  stationIds.forEach((id, i) => {
    stations[id] = {
      id,
      name: id,
      kana: id,
      pref: 'テスト県',
      lat: 34,
      lon: 133 + i * 0.1,
      industries: [`${id}-ind`],
    };
  });
  return { stations, lines, industries: {}, fameCategories: [], startStationIds: [] };
}

const line = (
  id: string,
  stations: string[],
  express: string[] = [],
  ltd: string[] = [],
): Line => ({
  id,
  name: id,
  operator: 'test',
  color: '#000',
  stations,
  stops: { local: stations, express, ltd },
});

describe('findReachable', () => {
  const data = makeData([line('main', ['a', 'b', 'c', 'd'], ['a', 'c'])], ['a', 'b', 'c', 'd']);

  it('ちょうどN駅先の駅だけを返す', () => {
    const graph = buildGraph(data, 'local');
    const two = findReachable(graph, 'a', 2, 'local');
    expect(two.map((o) => o.stationId)).toEqual(['c']);
    expect(two[0]?.steps).toBe(2);
  });

  it('急行は通過駅を飛ばして数える', () => {
    const graph = buildGraph(data, 'express');
    const one = findReachable(graph, 'a', 1, 'express');
    expect(one.map((o) => o.stationId)).toEqual(['c']);
    // 通過した b が fullPath に含まれる（コマの移動アニメーション用）
    expect(one[0]?.fullPath).toEqual(['a', 'b', 'c']);
    expect(one[0]?.stopPath).toEqual(['a', 'c']);
  });

  it('行き止まりでは到達できる最遠の駅で止まる', () => {
    const graph = buildGraph(data, 'local');
    const five = findReachable(graph, 'a', 5, 'local');
    expect(five.map((o) => o.stationId)).toEqual(['d']);
    expect(five[0]?.steps).toBe(3);
  });

  it('1回の移動で同じ駅を二度通らない（逆走禁止）', () => {
    const graph = buildGraph(data, 'local');
    const two = findReachable(graph, 'b', 2, 'local');
    // b から2駅なら d のみ。a へ1駅進んで b へ戻る経路は禁止。
    expect(two.map((o) => o.stationId).sort()).toEqual(['d']);
  });

  it('分岐がある場合は複数の到達駅を返す', () => {
    const branched = makeData(
      [line('main', ['a', 'b', 'c']), line('branch', ['b', 'e', 'f'])],
      ['a', 'b', 'c', 'e', 'f'],
    );
    const graph = buildGraph(branched, 'local');
    const two = findReachable(graph, 'a', 2, 'local');
    expect(two.map((o) => o.stationId).sort()).toEqual(['c', 'e']);
  });

  it('路線をまたぐ移動に乗り換えの概念が要らない', () => {
    // a-b-c（main）と c-d-e（next）が c で接続する。
    const joined = makeData(
      [line('main', ['a', 'b', 'c']), line('next', ['c', 'd', 'e'])],
      ['a', 'b', 'c', 'd', 'e'],
    );
    const graph = buildGraph(joined, 'local');
    const four = findReachable(graph, 'a', 4, 'local');
    expect(four.map((o) => o.stationId)).toEqual(['e']);
  });

  it('交通費は距離×種別係数で、特急のほうが高い', () => {
    const localGraph = buildGraph(data, 'local');
    const ltdData = makeData([line('main', ['a', 'b', 'c', 'd'], [], ['a', 'c'])], [
      'a', 'b', 'c', 'd',
    ]);
    const ltdGraph = buildGraph(ltdData, 'ltd');

    const byLocal = findReachable(localGraph, 'a', 2, 'local')[0];
    const byLtd = findReachable(ltdGraph, 'a', 1, 'ltd')[0];
    expect(byLocal?.distanceKm).toBeCloseTo(byLtd?.distanceKm ?? 0, 5);
    expect(byLtd?.fare).toBeGreaterThan(byLocal?.fare ?? 0);
  });
});

describe('availableTypes', () => {
  it('その駅に停車する種別だけを返す', () => {
    const graphs = buildGraphs(GAME_DATA);
    // 高松は特急・快速・普通すべてが停まるターミナル。
    expect(availableTypes(graphs, 'takamatsu').sort()).toEqual(['express', 'local', 'ltd']);
    // 鬼無は普通しか停まらない。
    expect(availableTypes(graphs, 'kinashi')).toEqual(['local']);
    // 鳴門線には優等列車が走っていない。
    expect(availableTypes(graphs, 'naruto')).toEqual(['local']);
  });
});

describe('実データでの移動', () => {
  const graphs = buildGraphs(GAME_DATA);

  it('高松から普通で3駅進むと端岡か木太町', () => {
    const options = findReachable(graphs.local, 'takamatsu', 3, 'local');
    const names = options.map((o) => STATION_MAP[o.stationId]?.name).sort();
    // 予讃線（香西・鬼無・端岡）と高徳線（昭和町・栗林公園北口・栗林）の2方向へ分岐する。
    expect(names).toEqual(['栗林', '端岡']);
  });

  it('高松から特急で3駅進むと普通より遥かに遠くへ行ける', () => {
    const byLocal = findReachable(graphs.local, 'takamatsu', 3, 'local');
    const byLtd = findReachable(graphs.ltd, 'takamatsu', 3, 'ltd');
    const maxLocal = Math.max(...byLocal.map((o) => o.distanceKm));
    const maxLtd = Math.max(...byLtd.map((o) => o.distanceKm));
    expect(maxLtd).toBeGreaterThan(maxLocal * 3);
  });

  it('特急停車駅でない駅からは特急に乗れない', () => {
    expect(availableTypes(graphs, 'kozai')).not.toContain('ltd');
    expect(findReachable(graphs.ltd, 'kozai', 1, 'ltd')).toEqual([]);
  });
});
