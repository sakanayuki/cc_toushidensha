/**
 * ゲーム状態と、その遷移（仕様書 2）。
 * すべての関数は新しい状態を返す純粋関数で、UI に依存しない。
 */

import type { GameData, IndustryId, StationId, TrainType } from '../data/types';
import { TRAIN_TYPE_LABEL } from '../data/types';
import { availableTypes, findReachable } from './graph';
import type { Graphs } from './graph';
import { nextInt, pick, shuffle } from './rng';
import type {
  GameState,
  LogEntry,
  MoveOption,
  Player,
  PlayerConfig,
  TrophyId,
} from './types';
import { NON_SECTOR_TROPHIES, SECTOR_TROPHIES, TROPHY_DRAW_COUNT } from './types';

export const DICE_FACES = 6;

export const TURN_OPTIONS = [3, 5, 8, 10] as const;
export const DEFAULT_TURNS = 5;

export interface GameConfig {
  turns: number;
  players: PlayerConfig[];
  seed?: number;
}

/**
 * トロフィーの抽選（仕様書 3.2）。
 * 分類系3枚は排他なので、まず1枚だけ選び、非分類系6枚と合わせた7枚から5枚を引く。
 */
export function drawTrophies(seed: number): { value: TrophyId[]; seed: number } {
  const sector = pick(seed, SECTOR_TROPHIES);
  const pool = [...NON_SECTOR_TROPHIES, sector.value];
  const shuffled = shuffle(sector.seed, pool);
  return { value: shuffled.value.slice(0, TROPHY_DRAW_COUNT), seed: shuffled.seed };
}

export function currentPlayer(state: GameState): Player {
  const p = state.players[state.current];
  if (!p) throw new Error(`no player at index ${state.current}`);
  return p;
}

function log(state: GameState, text: string): LogEntry[] {
  return [...state.log, { turn: state.turn, playerIndex: state.current, text }];
}

function replacePlayer(state: GameState, index: number, patch: Partial<Player>): Player[] {
  return state.players.map((p) => (p.index === index ? { ...p, ...patch } : p));
}

/** 新しいゲームを作る。ターン順はここでランダムに決まり、以降固定される。 */
export function createGame(config: GameConfig): GameState {
  const seed0 = config.seed ?? Math.floor(Math.random() * 2 ** 31);
  const ordered = shuffle(seed0, config.players);
  const drawn = drawTrophies(ordered.seed);

  const players: Player[] = ordered.value.map((p, index) => ({
    ...p,
    index,
    startStationId: null,
    stationId: null,
    holdings: [],
    fareTotal: 0,
  }));

  return {
    turns: config.turns,
    trophies: drawn.value,
    players,
    turn: 1,
    current: 0,
    phase: 'chooseStart',
    selectedType: null,
    dice: null,
    options: null,
    lastMove: null,
    seed: drawn.seed,
    log: [],
  };
}

/** 開始駅を決める。全員が決め終えたら1ターン目に進む。 */
export function chooseStart(state: GameState, stationId: StationId): GameState {
  if (state.phase !== 'chooseStart') throw new Error('not in chooseStart phase');
  const players = replacePlayer(state, state.current, {
    startStationId: stationId,
    stationId,
  });
  const nextIndex = state.current + 1;
  const done = nextIndex >= players.length;
  return {
    ...state,
    players,
    current: done ? 0 : nextIndex,
    phase: done ? 'chooseType' : 'chooseStart',
  };
}

/** 現在地から乗れる種別。その駅に停車する種別だけが返る（仕様書 決定12）。 */
export function selectableTypes(state: GameState, graphs: Graphs): TrainType[] {
  const player = currentPlayer(state);
  if (!player.stationId) return [];
  return availableTypes(graphs, player.stationId);
}

/** 種別を選ぶ。サイコロを振る前に確定させる。 */
export function chooseType(state: GameState, type: TrainType): GameState {
  if (state.phase !== 'chooseType') throw new Error('not in chooseType phase');
  return { ...state, selectedType: type, phase: 'roll' };
}

/** サイコロを振り、到達可能駅を求める。 */
export function rollDice(state: GameState, graphs: Graphs): GameState {
  if (state.phase !== 'roll') throw new Error('not in roll phase');
  const type = state.selectedType;
  const player = currentPlayer(state);
  if (!type || !player.stationId) throw new Error('type or station not set');

  const r = nextInt(state.seed, DICE_FACES);
  const dice = r.value + 1;
  const options = findReachable(graphs[type], player.stationId, dice, type);

  return {
    ...state,
    seed: r.seed,
    dice,
    options,
    phase: 'chooseDest',
    log: log(state, `${TRAIN_TYPE_LABEL[type]}に乗り、${dice} が出た`),
  };
}

/** 到着駅で投資できる産業。すでに同じ産業を持っている場合は選べない。 */
export function investableIndustries(state: GameState, data: GameData): IndustryId[] {
  const player = currentPlayer(state);
  if (!player.stationId) return [];
  const station = data.stations[player.stationId];
  if (!station) return [];
  return station.industries.filter((id) => !player.holdings.includes(id));
}

function advanceTurn(state: GameState): GameState {
  const nextIndex = state.current + 1;
  const wrapped = nextIndex >= state.players.length;
  const turn = wrapped ? state.turn + 1 : state.turn;
  const finished = turn > state.turns;

  return {
    ...state,
    current: wrapped ? 0 : nextIndex,
    turn,
    phase: finished ? 'finished' : 'chooseType',
    selectedType: null,
    dice: null,
    options: null,
  };
}

/**
 * 到達駅を決めて移動する。
 * 到着駅に投資できる産業が無ければ、そのままターンを終える。
 */
export function chooseDestination(
  state: GameState,
  stationId: StationId,
  data: GameData,
): GameState {
  if (state.phase !== 'chooseDest') throw new Error('not in chooseDest phase');
  const option = state.options?.find((o) => o.stationId === stationId);
  if (!option) throw new Error(`station ${stationId} is not reachable`);

  const player = currentPlayer(state);
  const moved: GameState = {
    ...state,
    players: replacePlayer(state, state.current, {
      stationId,
      fareTotal: player.fareTotal + option.fare,
    }),
    lastMove: option,
    phase: 'chooseIndustry',
    log: log(state, `${data.stations[stationId]?.name ?? stationId} に到着`),
  };

  return investableIndustries(moved, data).length === 0 ? advanceTurn(moved) : moved;
}

/** 産業を1つ取得してターンを終える。 */
export function chooseIndustry(
  state: GameState,
  industryId: IndustryId,
  data: GameData,
): GameState {
  if (state.phase !== 'chooseIndustry') throw new Error('not in chooseIndustry phase');
  const player = currentPlayer(state);
  if (player.holdings.includes(industryId)) {
    throw new Error(`already holding ${industryId}`);
  }
  const invested: GameState = {
    ...state,
    players: replacePlayer(state, state.current, {
      holdings: [...player.holdings, industryId],
    }),
    log: log(state, `${data.industries[industryId]?.name ?? industryId} に投資`),
  };
  return advanceTurn(invested);
}

/** 到達駅の一覧を距離の近い順に並べたもの。UI の一覧表示に使う。 */
export function sortedOptions(options: MoveOption[]): MoveOption[] {
  return [...options].sort((a, b) => a.distanceKm - b.distanceKm);
}
