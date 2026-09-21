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
  stops: { local: stations, express, ltd, shinkansen: [] },
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

  it('新幹線に乗れる駅はごく限られる', () => {
    const all = Object.values(GAME_DATA.stations);
    const withShinkansen = all.filter((s) => availableTypes(graphs, s.id).includes('shinkansen'));
    // 収録した全駅のうち、新幹線が停まるのは一握りだけ。
    expect(withShinkansen.length).toBeGreaterThan(1);
    expect(withShinkansen.length).toBeLessThan(all.length * 0.1);
    expect(availableTypes(graphs, 'okayama')).toContain('shinkansen');
    expect(availableTypes(graphs, 'kurashiki')).not.toContain('shinkansen');
  });

  it('岡山から新幹線1駅は、普通列車1駅より遥かに遠い', () => {
    const byShinkansen = findReachable(graphs.shinkansen, 'okayama', 1, 'shinkansen');
    const byLocal = findReachable(graphs.local, 'okayama', 1, 'local');
    const maxShinkansen = Math.max(...byShinkansen.map((o) => o.distanceKm));
    const maxLocal = Math.max(...byLocal.map((o) => o.distanceKm));
    expect(maxShinkansen).toBeGreaterThan(maxLocal * 5);
  });

  it('大阪駅は JR・阪急・阪神が集まる一つの駅として繋がっている', () => {
    // 西梅田・東梅田・阪急大阪梅田・阪神大阪梅田・北新地をまとめて「大阪」1駅として扱う。
    const lines = GAME_DATA.lines.filter((l) => l.stations.includes('osaka'));
    expect(lines.map((l) => l.id).sort()).toEqual([
      'hankyu-kobe',
      'hanshin',
      'osaka-loop',
      'tokaido',
    ]);
    // 普通列車のグラフでも、その4方向すべてに出られる。
    const edges = graphs.local.get('osaka') ?? [];
    expect(new Set(edges.map((e) => e.lineId)).size).toBe(4);
  });

  it('大阪から三宮へ JR・阪急・阪神の3経路で行ける', () => {
    const viaLines = new Set<string>();
    // 各社の普通列車で、大阪から三宮方向に出る最初の一歩を見る。
    for (const edge of graphs.local.get('osaka') ?? []) viaLines.add(edge.lineId);
    expect(viaLines.has('tokaido')).toBe(true);
    expect(viaLines.has('hankyu-kobe')).toBe(true);
    expect(viaLines.has('hanshin')).toBe(true);

    // JR の特急なら大阪から三宮まで 1 駅。阪急・阪神の特急は途中にもっと停まる。
    expect(findReachable(graphs.ltd, 'osaka', 1, 'ltd').map((o) => o.stationId)).toContain(
      'sannomiya',
    );
    const byLtd3 = findReachable(graphs.ltd, 'osaka', 3, 'ltd').map((o) => o.stationId);
    expect(byLtd3).toContain('hq-shukugawa');
    expect(byLtd3).toContain('hs-nishinomiya');
  });

  it('大阪環状線が一周して閉じている', () => {
    // 末尾の福島と先頭の大阪が隣り合っていること。
    const fromFukushima = graphs.local.get('fukushima') ?? [];
    expect(fromFukushima.some((e) => e.to === 'osaka')).toBe(true);
    // 環状なので、大阪から19駅進むと大阪に戻る……ことはない（同じ駅を二度通れない）。
    // かわりに、どちら回りでも天王寺に行けることを確かめる。
    const around = findReachable(graphs.local, 'osaka', 10, 'local');
    expect(around.map((o) => o.stationId)).toContain('tennoji');
  });

  it('阪和線と南海本線が既存の路線と繋がっている', () => {
    // 阪和線は天王寺で、南海本線は新今宮で、それぞれ大阪環状線と同じ駅を共有する。
    const fromTennoji = (graphs.local.get('tennoji') ?? []).map((e) => e.lineId);
    expect(fromTennoji).toContain('hanwa');
    expect(fromTennoji).toContain('osaka-loop');
    const fromShinimamiya = (graphs.local.get('shinimamiya') ?? []).map((e) => e.lineId);
    expect(fromShinimamiya).toContain('nankai');
    expect(fromShinimamiya).toContain('osaka-loop');
  });

  it('大阪から和歌山へ、JR と南海の2経路で行ける', () => {
    // どちらも特急が走っている。JR はくろしお、南海はサザン。
    expect(availableTypes(graphs, 'wakayama')).toContain('ltd');
    expect(availableTypes(graphs, 'nankai-wakayamashi')).toContain('ltd');
    // 普通列車のグラフ上で、大阪から和歌山・和歌山市の双方に到達できる。
    const seen = new Set<string>(['osaka']);
    const queue = ['osaka'];
    while (queue.length > 0) {
      const id = queue.shift() as string;
      for (const edge of graphs.local.get(id) ?? []) {
        if (seen.has(edge.to)) continue;
        seen.add(edge.to);
        queue.push(edge.to);
      }
    }
    expect(seen.has('wakayama')).toBe(true);
    expect(seen.has('nankai-wakayamashi')).toBe(true);
  });

  it('新大阪まで新幹線が通っている', () => {
    expect(availableTypes(graphs, 'shinosaka')).toContain('shinkansen');
    // 岡山から東へ 相生・姫路・西明石 と進み、4駅目が新大阪。
    const reach = findReachable(graphs.shinkansen, 'okayama', 4, 'shinkansen');
    expect(reach.map((o) => o.stationId)).toContain('shinosaka');
  });

  it('岡山〜広島は在来線特急では移動できず、新幹線なら数駅で着く', () => {
    // 山陽本線に定期特急が走っていないことがグラフに出ている。
    expect(availableTypes(graphs, 'hiroshima')).not.toContain('ltd');
    const reach = findReachable(graphs.shinkansen, 'okayama', 4, 'shinkansen');
    expect(reach.map((o) => o.stationId)).toContain('hiroshima');
  });
});
