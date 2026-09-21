/**
 * トロフィーの定義・判定・同点処理・優勝判定（仕様書 3）。
 */

import type { GameData, Industry } from '../data/types';
import { stationDistanceKm } from './geo';
import type { GameState, Player, TrophyDef, TrophyId, TrophyStanding } from './types';

const round = (v: number): string => `${Math.round(v)}`;

export const TROPHY_DEFS: Record<TrophyId, TrophyDef> = {
  scale_total: {
    id: 'scale_total',
    name: '産業規模の合計',
    shortName: '規模合計',
    description: '投資した産業の規模の総和が最大',
    direction: 'max',
    format: round,
  },
  max_profit_rate: {
    id: 'max_profit_rate',
    name: '最大利益率',
    shortName: '利益率',
    description: '保有する産業の利益率の最大値が最も高い',
    direction: 'max',
    format: (v) => `${v.toFixed(1)}%`,
  },
  best3_count: {
    id: 'best3_count',
    name: '全国ベスト3',
    shortName: 'ベスト3',
    description: '全国区カテゴリでトップ3の産業を最も多く保有',
    direction: 'max',
    format: (v) => `${v}個`,
  },
  sector1_count: {
    id: 'sector1_count',
    name: '第一次産業',
    shortName: '一次産業',
    description: '第一次産業を最も多く保有',
    direction: 'max',
    format: (v) => `${v}個`,
  },
  sector2_count: {
    id: 'sector2_count',
    name: '第二次産業',
    shortName: '二次産業',
    description: '第二次産業を最も多く保有',
    direction: 'max',
    format: (v) => `${v}個`,
  },
  sector3_count: {
    id: 'sector3_count',
    name: '第三次産業',
    shortName: '三次産業',
    description: '第三次産業を最も多く保有',
    direction: 'max',
    format: (v) => `${v}個`,
  },
  distance: {
    id: 'distance',
    name: '旅の距離',
    shortName: '距離',
    description: '開始駅と最終地点の直線距離が最長',
    direction: 'max',
    format: (v) => `${Math.round(v)}km`,
  },
  fare_min: {
    id: 'fare_min',
    name: '交通費節約王',
    shortName: '交通費節約',
    description: '交通費の合計が最少',
    direction: 'min',
    format: round,
  },
  rural: {
    id: 'rural',
    name: '地方創生',
    shortName: '地方創生',
    description: '最も産業規模の小さい産業に投資した',
    direction: 'min',
    format: (v) => (Number.isFinite(v) ? round(v) : '—'),
  },
};

function holdings(player: Player, data: GameData): Industry[] {
  return player.holdings
    .map((id) => data.industries[id])
    .filter((x): x is Industry => x !== undefined);
}

/** 全国ベスト3に入る産業か。 */
export function isBest3(industry: Industry): boolean {
  return industry.fame !== undefined && industry.fame.rank <= 3;
}

/** そのトロフィーについての現在値。 */
export function trophyValue(
  trophyId: TrophyId,
  player: Player,
  data: GameData,
): number {
  const owned = holdings(player, data);
  switch (trophyId) {
    case 'scale_total':
      return owned.reduce((sum, x) => sum + x.scale, 0);
    case 'max_profit_rate':
      return owned.reduce((max, x) => Math.max(max, x.profitRate), 0);
    case 'best3_count':
      return owned.filter(isBest3).length;
    case 'sector1_count':
      return owned.filter((x) => x.sector === 1).length;
    case 'sector2_count':
      return owned.filter((x) => x.sector === 2).length;
    case 'sector3_count':
      return owned.filter((x) => x.sector === 3).length;
    case 'distance': {
      const start = player.startStationId ? data.stations[player.startStationId] : undefined;
      const now = player.stationId ? data.stations[player.stationId] : undefined;
      if (!start || !now) return 0;
      return stationDistanceKm(start, now);
    }
    case 'fare_min':
      return player.fareTotal;
    case 'rural':
      // 保有が無い間は「最小規模」が存在しないので、最小を競うこのトロフィーでは最も不利にする。
      return owned.length === 0
        ? Number.POSITIVE_INFINITY
        : owned.reduce((min, x) => Math.min(min, x.scale), Number.POSITIVE_INFINITY);
  }
}

/**
 * 同点決着の第1段階。「同点対象の産業規模合計」（仕様書 3.3）。
 * 対象を特定できるトロフィーはその産業だけを、それ以外は全保有を対象にする。
 */
function tiebreakScale(trophyId: TrophyId, player: Player, data: GameData): number {
  const owned = holdings(player, data);
  const sum = (list: Industry[]) => list.reduce((s, x) => s + x.scale, 0);
  switch (trophyId) {
    case 'best3_count':
      return sum(owned.filter(isBest3));
    case 'sector1_count':
      return sum(owned.filter((x) => x.sector === 1));
    case 'sector2_count':
      return sum(owned.filter((x) => x.sector === 2));
    case 'sector3_count':
      return sum(owned.filter((x) => x.sector === 3));
    default:
      return sum(owned);
  }
}

/** 同点決着の第2段階、および優勝判定の第2段階で使う知名度点の合計。 */
export function fameTotal(player: Player, data: GameData): number {
  return holdings(player, data).reduce((s, x) => s + (x.fame?.score ?? 0), 0);
}

/** 保有産業の規模合計。優勝判定の第3段階で使う。 */
export function scaleTotal(player: Player, data: GameData): number {
  return holdings(player, data).reduce((s, x) => s + x.scale, 0);
}

/**
 * あるトロフィーの現在の順位表。必ず1人だけが受賞するよう決着させる。
 *
 * 同点の決着順（仕様書 3.3）:
 *   1. 同点対象の産業規模合計が大きい方
 *   2. 知名度点の合計が高い方
 *   3. 手番が後のプレイヤー（先手が負う情報面の不利の補償）
 */
export function computeStanding(
  trophyId: TrophyId,
  players: Player[],
  data: GameData,
): TrophyStanding {
  const def = TROPHY_DEFS[trophyId];
  const rows = players.map((p) => ({
    playerIndex: p.index,
    value: trophyValue(trophyId, p, data),
    tieScale: tiebreakScale(trophyId, p, data),
    fame: fameTotal(p, data),
  }));

  rows.sort((a, b) => {
    if (a.value !== b.value) {
      return def.direction === 'max' ? b.value - a.value : a.value - b.value;
    }
    if (a.tieScale !== b.tieScale) return b.tieScale - a.tieScale;
    if (a.fame !== b.fame) return b.fame - a.fame;
    return b.playerIndex - a.playerIndex;
  });

  return {
    trophyId,
    ranking: rows.map((r) => ({
      playerIndex: r.playerIndex,
      value: r.value,
      display: def.format(r.value),
    })),
    winnerIndex: rows[0]?.playerIndex ?? null,
  };
}

/** この回に抽選された5枚すべての順位表。 */
export function computeStandings(state: GameState, data: GameData): TrophyStanding[] {
  return state.trophies.map((id) => computeStanding(id, state.players, data));
}

/**
 * 首位が単独ではなく、タイブレークで決着しているか。
 * ゲーム開始直後は全員が同値になるため、UI でその旨を示すのに使う。
 */
export function isTiedAtTop(standing: TrophyStanding): boolean {
  const first = standing.ranking[0];
  const second = standing.ranking[1];
  return first !== undefined && second !== undefined && first.value === second.value;
}

export interface FinalResult {
  standings: TrophyStanding[];
  /** プレイヤーごとの獲得トロフィー数。index は players と同じ。 */
  trophyCounts: number[];
  /** 優勝者。4段階すべてが同値の場合のみ複数になる。 */
  winners: number[];
}

/**
 * 優勝判定（仕様書 3.4）。
 *   1. 獲得トロフィー枚数 → 2. 知名度点の合計 → 3. 産業規模の合計 → 4. 同率優勝
 */
export function computeResult(state: GameState, data: GameData): FinalResult {
  const standings = computeStandings(state, data);
  const trophyCounts = state.players.map(
    (p) => standings.filter((s) => s.winnerIndex === p.index).length,
  );

  const score = state.players.map((p) => ({
    index: p.index,
    count: trophyCounts[p.index] ?? 0,
    fame: fameTotal(p, data),
    scale: scaleTotal(p, data),
  }));

  const best = [...score].sort(
    (a, b) => b.count - a.count || b.fame - a.fame || b.scale - a.scale,
  )[0];

  const winners = best
    ? score
        .filter(
          (s) => s.count === best.count && s.fame === best.fame && s.scale === best.scale,
        )
        .map((s) => s.index)
    : [];

  return { standings, trophyCounts, winners };
}
