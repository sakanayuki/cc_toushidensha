/**
 * CPU の思考（仕様書 5）。
 *
 * 本作は産業が共有可で妨害要素が無いため、相手の手を読む必要がない。
 * したがって「自分の盤面を最適化する貪欲法」で十分に強く、探索は不要。
 * 難易度は単一の貪欲エンジンにランダム手の混入率を変えて作る。
 */

import type { GameData, IndustryId, StationId, TrainType } from '../data/types';
import { findReachable } from './graph';
import type { Graphs } from './graph';
import { nextRandom, pick } from './rng';
import { DICE_FACES, currentPlayer, investableIndustries } from './state';
import { TROPHY_DEFS, computeStanding } from './trophy';
import type { GameState, Player, TrophyId } from './types';
import { DIFFICULTY_NOISE } from './types';

/** 「ふつう」が意識するトロフィーの枚数。 */
const NORMAL_FOCUS = 2;

function focusedTrophies(state: GameState, player: Player): TrophyId[] {
  if (player.difficulty === 'normal') return state.trophies.slice(0, NORMAL_FOCUS);
  return state.trophies;
}

function withPlayer(players: Player[], index: number, patch: Partial<Player>): Player[] {
  return players.map((p) => (p.index === index ? { ...p, ...patch } : p));
}

/**
 * 仮想的な盤面で、そのプレイヤーが何枚のトロフィーを取れそうかを評価する。
 * 首位なら 1 点。届いていなくても、首位との近さに応じて部分点を与える。
 */
function evaluate(
  trophies: TrophyId[],
  players: Player[],
  index: number,
  data: GameData,
): number {
  let score = 0;
  for (const trophyId of trophies) {
    const standing = computeStanding(trophyId, players, data);
    if (standing.winnerIndex === index) {
      score += 1;
      continue;
    }
    const top = standing.ranking[0];
    const mine = standing.ranking.find((r) => r.playerIndex === index);
    if (!top || !mine) continue;
    if (!Number.isFinite(top.value) || !Number.isFinite(mine.value)) continue;

    const direction = TROPHY_DEFS[trophyId].direction;
    const ratio =
      direction === 'max'
        ? top.value > 0
          ? mine.value / top.value
          : 0
        : mine.value > 0
          ? top.value / mine.value
          : 1;
    score += 0.4 * Math.min(1, Math.max(0, ratio));
  }
  return score;
}

/** その駅に降りて最良の産業を取った場合の評価値。 */
function scoreStation(
  state: GameState,
  data: GameData,
  player: Player,
  stationId: StationId,
  fareDelta: number,
): number {
  const station = data.stations[stationId];
  const trophies = focusedTrophies(state, player);
  const candidates = (station?.industries ?? []).filter(
    (id) => !player.holdings.includes(id),
  );

  const base: Partial<Player> = {
    stationId,
    fareTotal: player.fareTotal + fareDelta,
  };

  if (candidates.length === 0) {
    return evaluate(trophies, withPlayer(state.players, player.index, base), player.index, data);
  }

  let best = -Infinity;
  for (const id of candidates) {
    const players = withPlayer(state.players, player.index, {
      ...base,
      holdings: [...player.holdings, id],
    });
    best = Math.max(best, evaluate(trophies, players, player.index, data));
  }
  return best;
}

/** 開始駅を選ぶ。抽選されたトロフィーを見てから選べる（仕様書 決定20）。 */
export function cpuChooseStart(
  state: GameState,
  data: GameData,
): { value: StationId; seed: number } {
  const player = currentPlayer(state);
  const noise = DIFFICULTY_NOISE[player.difficulty];
  const r = nextRandom(state.seed);
  if (r.value < noise) return pick(r.seed, data.startStationIds);

  let bestId = data.startStationIds[0] as StationId;
  let bestScore = -Infinity;
  for (const id of data.startStationIds) {
    // 開始時点ではまだ何も投資していないので、その駅で取れる産業の質で評価する。
    const score = scoreStation(state, data, { ...player, startStationId: id }, id, 0);
    if (score > bestScore) {
      bestScore = score;
      bestId = id;
    }
  }
  return { value: bestId, seed: r.seed };
}

/**
 * 種別を選ぶ。サイコロを振る前なので、出目 1〜6 それぞれで到達できる駅の
 * 最良評価値を平均し、期待値が最も高い種別を選ぶ。
 */
export function cpuChooseType(
  state: GameState,
  data: GameData,
  graphs: Graphs,
  types: TrainType[],
): { value: TrainType; seed: number } {
  const player = currentPlayer(state);
  const noise = DIFFICULTY_NOISE[player.difficulty];
  const r = nextRandom(state.seed);
  if (types.length === 0) throw new Error('no selectable train type');
  if (r.value < noise) return pick(r.seed, types);

  let bestType = types[0] as TrainType;
  let bestScore = -Infinity;

  for (const type of types) {
    let total = 0;
    for (let dice = 1; dice <= DICE_FACES; dice++) {
      const options = findReachable(graphs[type], player.stationId as StationId, dice, type);
      let best = -Infinity;
      for (const option of options) {
        best = Math.max(best, scoreStation(state, data, player, option.stationId, option.fare));
      }
      total += Number.isFinite(best) ? best : 0;
    }
    const expected = total / DICE_FACES;
    if (expected > bestScore) {
      bestScore = expected;
      bestType = type;
    }
  }

  return { value: bestType, seed: r.seed };
}

/** 到達駅を選ぶ。 */
export function cpuChooseDestination(
  state: GameState,
  data: GameData,
): { value: StationId; seed: number } {
  const player = currentPlayer(state);
  const options = state.options ?? [];
  if (options.length === 0) throw new Error('no reachable station');

  const noise = DIFFICULTY_NOISE[player.difficulty];
  const r = nextRandom(state.seed);
  if (r.value < noise) {
    const chosen = pick(r.seed, options);
    return { value: chosen.value.stationId, seed: chosen.seed };
  }

  let bestId = options[0]?.stationId as StationId;
  let bestScore = -Infinity;
  for (const option of options) {
    const score = scoreStation(state, data, player, option.stationId, option.fare);
    if (score > bestScore) {
      bestScore = score;
      bestId = option.stationId;
    }
  }
  return { value: bestId, seed: r.seed };
}

/** 産業を選ぶ。 */
export function cpuChooseIndustry(
  state: GameState,
  data: GameData,
): { value: IndustryId; seed: number } {
  const player = currentPlayer(state);
  const candidates = investableIndustries(state, data);
  if (candidates.length === 0) throw new Error('no investable industry');

  const noise = DIFFICULTY_NOISE[player.difficulty];
  const r = nextRandom(state.seed);
  if (r.value < noise) return pick(r.seed, candidates);

  const trophies = focusedTrophies(state, player);
  let bestId = candidates[0] as IndustryId;
  let bestScore = -Infinity;
  for (const id of candidates) {
    const players = withPlayer(state.players, player.index, {
      holdings: [...player.holdings, id],
    });
    const score = evaluate(trophies, players, player.index, data);
    if (score > bestScore) {
      bestScore = score;
      bestId = id;
    }
  }
  return { value: bestId, seed: r.seed };
}
