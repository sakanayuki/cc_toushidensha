/**
 * ゲーム状態とトロフィーの型。
 * 仕様書 docs/DESIGN.md 2〜3 に対応する。
 */

import type { IndustryId, StationId, TrainType } from '../data/types';

export type TrophyId =
  | 'scale_total'
  | 'max_profit_rate'
  | 'best3_count'
  | 'sector1_count'
  | 'sector2_count'
  | 'sector3_count'
  | 'distance'
  | 'fare_min'
  | 'rural';

/** 分類系トロフィー。この3枚は排他で、毎ゲーム最大1枚しか抽選されない。 */
export const SECTOR_TROPHIES: readonly TrophyId[] = [
  'sector1_count',
  'sector2_count',
  'sector3_count',
] as const;

/** 分類系以外のトロフィー。 */
export const NON_SECTOR_TROPHIES: readonly TrophyId[] = [
  'scale_total',
  'max_profit_rate',
  'best3_count',
  'distance',
  'fare_min',
  'rural',
] as const;

/** 1ゲームで抽選されるトロフィーの枚数。 */
export const TROPHY_DRAW_COUNT = 5;

export interface TrophyDef {
  id: TrophyId;
  name: string;
  /** 一覧に出す短い説明。 */
  description: string;
  /** 'max' = 値が大きい人が受賞、'min' = 小さい人が受賞。 */
  direction: 'max' | 'min';
  /** 値の表示形式。 */
  format: (value: number) => string;
}

export type Difficulty = 'easy' | 'normal' | 'hard';

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'やさしい',
  normal: 'ふつう',
  hard: 'つよい',
};

/** 難易度ごとのランダム手の混入率（仕様書 5）。 */
export const DIFFICULTY_NOISE: Record<Difficulty, number> = {
  easy: 0.6,
  normal: 0.25,
  hard: 0,
};

export interface PlayerConfig {
  name: string;
  isCPU: boolean;
  difficulty: Difficulty;
  color: string;
}

export interface Player extends PlayerConfig {
  /** players 配列上の位置。ターン順でもある（先頭が先手）。 */
  index: number;
  startStationId: StationId | null;
  stationId: StationId | null;
  holdings: IndustryId[];
  /** 交通費の累計。 */
  fareTotal: number;
}

/**
 * ある出目で到達できる駅と、そこへ至る経路。
 */
export interface MoveOption {
  stationId: StationId;
  /** 経由した停車駅（出発駅を含む）。 */
  stopPath: StationId[];
  /** 通過駅を含む全通過駅（出発駅を含む）。コマの移動アニメーションに使う。 */
  fullPath: StationId[];
  /** 経路の総距離 km。 */
  distanceKm: number;
  /** この移動で発生する交通費。 */
  fare: number;
  /** 出目より手前で停車した場合（行き止まり）は実際に進んだ駅数が入る。 */
  steps: number;
}

export type Phase =
  /** 人数・ターン数の設定中。 */
  | 'setup'
  /** 開始駅の選択中。 */
  | 'chooseStart'
  /** 種別の選択中。 */
  | 'chooseType'
  /** サイコロを振る待ち。 */
  | 'roll'
  /** 到達駅の選択中。 */
  | 'chooseDest'
  /** 産業の選択中。 */
  | 'chooseIndustry'
  /** 全ターン終了、結果表示。 */
  | 'finished';

export interface LogEntry {
  turn: number;
  playerIndex: number;
  text: string;
}

export interface GameState {
  /** 総ターン数（3/5/8/10）。 */
  turns: number;
  /** この回に抽選された5枚。 */
  trophies: TrophyId[];
  players: Player[];
  /** 現在のターン。1-based。 */
  turn: number;
  /** 手番のプレイヤーの index。 */
  current: number;
  phase: Phase;
  /** 選択中の種別。 */
  selectedType: TrainType | null;
  /** 出目。 */
  dice: number | null;
  /** 現在の出目で到達できる駅の一覧。 */
  options: MoveOption[] | null;
  /** 直前に確定した移動。アニメーションに使う。 */
  lastMove: MoveOption | null;
  /** 決定論的な乱数の状態。 */
  seed: number;
  log: LogEntry[];
}

/** あるトロフィーについての現在の順位表。 */
export interface TrophyStanding {
  trophyId: TrophyId;
  /** 受賞順に並べたプレイヤー。先頭が現在の受賞者。 */
  ranking: {
    playerIndex: number;
    value: number;
    display: string;
  }[];
  /** 現在の受賞者。プレイヤーが居ない場合のみ null。 */
  winnerIndex: number | null;
}
