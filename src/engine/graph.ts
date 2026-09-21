/**
 * 移動グラフの構築と、到達可能駅の探索。
 *
 * 種別ごとに「駅ノード・停車駅間エッジ」のグラフを作る。
 * 複数の路線が同じ駅を通る場合、その駅は同一ノードなのでグラフは既に繋がっており、
 * 「乗り換え」という処理は一切要らない（仕様書 2.1 / 4.2）。
 */

import { FARE_COEFFICIENT, TRAIN_TYPES } from '../data/types';
import type { GameData, LineId, StationId, TrainType } from '../data/types';
import { approxRailDistanceKm } from './geo';
import type { MoveOption } from './types';

export interface GraphEdge {
  to: StationId;
  distanceKm: number;
  /** 通過駅（両端は含まない）。コマの移動アニメーションに使う。 */
  via: StationId[];
  lineId: LineId;
}

export type Graph = Map<StationId, GraphEdge[]>;

/** 種別ごとの移動グラフ一式。 */
export type Graphs = Record<TrainType, Graph>;

function addEdge(graph: Graph, from: StationId, edge: GraphEdge): void {
  const list = graph.get(from);
  if (list) list.push(edge);
  else graph.set(from, [edge]);
}

/**
 * 指定した種別の移動グラフを構築する。
 * エッジは「その種別の停車駅として連続する2駅」の間に張られる。
 */
export function buildGraph(data: GameData, type: TrainType): Graph {
  const graph: Graph = new Map();

  for (const line of data.lines) {
    const stops = line.stops[type];
    if (stops.length < 2) continue;

    // 路線上の駅の位置と、隣接区間の距離を先に求めておく。
    const indexOf = new Map<StationId, number>();
    line.stations.forEach((id, idx) => indexOf.set(id, idx));

    const segment: number[] = [];
    for (let k = 0; k + 1 < line.stations.length; k++) {
      const explicit = line.distancesKm?.[k];
      if (explicit !== undefined) {
        segment.push(explicit);
        continue;
      }
      const a = data.stations[line.stations[k] as StationId];
      const b = data.stations[line.stations[k + 1] as StationId];
      if (!a || !b) throw new Error(`unknown station in line ${line.id}`);
      segment.push(approxRailDistanceKm(a, b));
    }

    for (let k = 0; k + 1 < stops.length; k++) {
      const from = stops[k] as StationId;
      const to = stops[k + 1] as StationId;
      const fi = indexOf.get(from);
      const ti = indexOf.get(to);
      if (fi === undefined || ti === undefined) {
        throw new Error(`stop not on line ${line.id}: ${from} or ${to}`);
      }
      const lo = Math.min(fi, ti);
      const hi = Math.max(fi, ti);

      let distanceKm = 0;
      for (let s = lo; s < hi; s++) distanceKm += segment[s] as number;

      const between = line.stations.slice(lo + 1, hi);
      const via = fi < ti ? between : [...between].reverse();

      addEdge(graph, from, { to, distanceKm, via, lineId: line.id });
      addEdge(graph, to, {
        to: from,
        distanceKm,
        via: [...via].reverse(),
        lineId: line.id,
      });
    }
  }

  return graph;
}

export function buildGraphs(data: GameData): Graphs {
  return {
    local: buildGraph(data, 'local'),
    express: buildGraph(data, 'express'),
    ltd: buildGraph(data, 'ltd'),
    shinkansen: buildGraph(data, 'shinkansen'),
  };
}

/** その駅から発車できる種別（＝その駅に停車する種別）。 */
export function availableTypes(graphs: Graphs, from: StationId): TrainType[] {
  return TRAIN_TYPES.filter((t) => (graphs[t].get(from)?.length ?? 0) > 0);
}

interface Frontier {
  stationId: StationId;
  stopPath: StationId[];
  fullPath: StationId[];
  distanceKm: number;
}

/**
 * ちょうど steps 駅先に到達できる駅を列挙する。
 *
 * - 1回の移動の経路内で同じ駅を二度通ることはできない（逆走禁止）。
 *   この制約はターンをまたがない（仕様書 2.1）。
 * - ちょうど steps 駅先に到達できる駅が1つも無い場合は、
 *   到達できる最遠の駅を返す（行き止まり処理、仕様書 決定19）。
 * - 同じ駅へ複数の経路で到達できる場合は、交通費が最も安い経路を採用する。
 */
export function findReachable(
  graph: Graph,
  from: StationId,
  steps: number,
  type: TrainType,
): MoveOption[] {
  const coefficient = FARE_COEFFICIENT[type];

  /** 深さ -> 駅ID -> 最良の到達情報。 */
  const byDepth = new Map<number, Map<StationId, Frontier>>();

  const record = (depth: number, f: Frontier): void => {
    let level = byDepth.get(depth);
    if (!level) {
      level = new Map();
      byDepth.set(depth, level);
    }
    const prev = level.get(f.stationId);
    if (!prev || f.distanceKm < prev.distanceKm) level.set(f.stationId, f);
  };

  const visit = (current: Frontier, depth: number): void => {
    if (depth === steps) return;
    const edges = graph.get(current.stationId);
    if (!edges) return;

    for (const edge of edges) {
      // 逆走禁止: 経路内で駅を二度通らない。通過駅も含めて判定する。
      if (current.fullPath.includes(edge.to)) continue;
      if (edge.via.some((v) => current.fullPath.includes(v))) continue;

      const next: Frontier = {
        stationId: edge.to,
        stopPath: [...current.stopPath, edge.to],
        fullPath: [...current.fullPath, ...edge.via, edge.to],
        distanceKm: current.distanceKm + edge.distanceKm,
      };
      record(depth + 1, next);
      visit(next, depth + 1);
    }
  };

  const start: Frontier = {
    stationId: from,
    stopPath: [from],
    fullPath: [from],
    distanceKm: 0,
  };
  visit(start, 0);

  // ちょうど steps 駅先。無ければ到達できる最遠の深さ。
  let depth = steps;
  while (depth > 0 && (byDepth.get(depth)?.size ?? 0) === 0) depth--;
  const level = byDepth.get(depth);
  if (!level || level.size === 0) return [];

  return [...level.values()].map((f) => ({
    stationId: f.stationId,
    stopPath: f.stopPath,
    fullPath: f.fullPath,
    distanceKm: f.distanceKm,
    fare: f.distanceKm * coefficient,
    steps: depth,
  }));
}
