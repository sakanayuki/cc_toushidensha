/**
 * 開始駅の「おすすめ」判定。
 *
 * その回に抽選された5枚のトロフィーを見て、周辺の産業がそれらに向いている駅を選ぶ。
 * 地理も路線も知らない人がいきなり7つの駅から選ばされても、
 * 何を基準に選べばいいのか分からないため。
 *
 * ここは助言であって強制ではない。おすすめ以外を選んでも不利になるとは限らない。
 */

import { isBest3 } from './trophy';
import type { GameData, Industry, StationId } from '../data/types';
import { TRAIN_TYPES } from '../data/types';
import { stationDistanceKm } from './geo';
import type { Graphs } from './graph';
import type { TrophyId } from './types';

/** 周辺とみなす範囲。1〜2手で行ける駅。 */
const NEIGHBOR_STEPS = 2;

export interface StartScore {
  stationId: StationId;
  /** 0〜1 に正規化した総合点。 */
  score: number;
  /** おすすめとして強調するか。 */
  recommended: boolean;
  /** 強調する理由。いちばん効いているトロフィー名。 */
  reason: string;
}

/** その駅から NEIGHBOR_STEPS 手で行ける駅（種別を問わない）。 */
function neighborhood(graphs: Graphs, from: StationId): Set<StationId> {
  let frontier = new Set<StationId>([from]);
  const seen = new Set<StationId>([from]);

  for (let step = 0; step < NEIGHBOR_STEPS; step++) {
    const next = new Set<StationId>();
    for (const id of frontier) {
      for (const type of TRAIN_TYPES) {
        for (const edge of graphs[type].get(id) ?? []) {
          if (seen.has(edge.to)) continue;
          seen.add(edge.to);
          next.add(edge.to);
        }
      }
    }
    frontier = next;
  }
  return seen;
}

function industriesOf(data: GameData, ids: Set<StationId>): Industry[] {
  const out: Industry[] = [];
  for (const id of ids) {
    for (const industryId of data.stations[id]?.industries ?? []) {
      const industry = data.industries[industryId];
      if (industry) out.push(industry);
    }
  }
  return out;
}

/**
 * トロフィー1枚ぶんの素点。大きいほど有利。
 *
 * 数を数えるトロフィーはターン数で頭打ちにする。
 * そうしないと、単に周りの駅数が多い大都市がどのトロフィーでも勝ってしまい、
 * 「今回の5枚に向いた駅」という情報にならない。
 */
function rawScore(
  trophyId: TrophyId,
  industries: Industry[],
  neighbors: Set<StationId>,
  from: StationId,
  data: GameData,
  turns: number,
): number {
  const countUpTo = (ok: (x: Industry) => boolean) =>
    Math.min(industries.filter(ok).length, turns);

  switch (trophyId) {
    case 'scale_total':
      return industries
        .map((x) => x.scale)
        .sort((a, b) => b - a)
        .slice(0, turns)
        .reduce((sum, x) => sum + x, 0);
    case 'max_profit_rate':
      return industries.reduce((max, x) => Math.max(max, x.profitRate), 0);
    case 'best3_count':
      return countUpTo(isBest3);
    case 'sector1_count':
      return countUpTo((x) => x.sector === 1);
    case 'sector2_count':
      return countUpTo((x) => x.sector === 2);
    case 'sector3_count':
      return countUpTo((x) => x.sector === 3);
    case 'distance': {
      // 遠くへ跳べる駅ほど有利。優等列車が停まる駅が効いてくる。
      const start = data.stations[from];
      if (!start) return 0;
      let far = 0;
      for (const id of neighbors) {
        const station = data.stations[id];
        if (station) far = Math.max(far, stationDistanceKm(start, station));
      }
      return far;
    }
    case 'fare_min': {
      // 近くに駅が詰まっているほど、短い移動を選べて交通費を抑えられる。
      const start = data.stations[from];
      if (!start || neighbors.size <= 1) return 0;
      let total = 0;
      for (const id of neighbors) {
        const station = data.stations[id];
        if (station) total += stationDistanceKm(start, station);
      }
      return -(total / (neighbors.size - 1));
    }
    case 'rural':
      // 規模の小さい産業があるほど有利なので、符号を反転する。
      return industries.length === 0
        ? 0
        : -Math.min(...industries.map((x) => x.scale));
    default:
      return 0;
  }
}

/** 0〜1 に正規化する。全部同じ値なら区別できないので 0 を返す。 */
function normalize(values: number[]): number[] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max - min < 1e-9) return values.map(() => 0);
  return values.map((v) => (v - min) / (max - min));
}

/**
 * 開始駅それぞれの、今回のトロフィーに対する向き不向き。
 * 総合点が最大値の85%以上の駅をおすすめとする（最大3駅）。
 */
export function scoreStartStations(
  data: GameData,
  graphs: Graphs,
  trophies: TrophyId[],
  turns: number,
): StartScore[] {
  const starts = data.startStationIds;
  const neighbors = starts.map((id) => neighborhood(graphs, id));
  const industries = neighbors.map((set) => industriesOf(data, set));

  // トロフィーごとに、開始駅の素点を正規化してから足す。
  // 単位も桁も違う指標（規模・km・個数）を素のまま足すと意味を成さない。
  const totals = starts.map(() => 0);
  const bestOf = starts.map(() => ({ trophyId: trophies[0], value: -Infinity }));

  for (const trophyId of trophies) {
    const raw = starts.map((id, i) =>
      rawScore(trophyId, industries[i]!, neighbors[i]!, id, data, turns),
    );
    normalize(raw).forEach((value, i) => {
      totals[i] = (totals[i] ?? 0) + value;
      const best = bestOf[i]!;
      if (value > best.value) {
        best.value = value;
        best.trophyId = trophyId;
      }
    });
  }

  const max = Math.max(...totals);
  const ranked = [...totals.keys()].sort((a, b) => (totals[b] ?? 0) - (totals[a] ?? 0));
  const recommended = new Set(
    ranked.filter((i) => (totals[i] ?? 0) >= max * 0.85).slice(0, 3),
  );

  return starts.map((stationId, i) => ({
    stationId,
    score: max > 0 ? (totals[i] ?? 0) / max : 0,
    recommended: recommended.has(i),
    reason: bestOf[i]!.trophyId ?? 'scale_total',
  }));
}
