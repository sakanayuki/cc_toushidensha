/**
 * ゲームデータの組み立て。
 *
 * フェーズ1（四国〜阪神）では開始駅を松山・高松・徳島・岡山・広島・三宮・大阪の7つとする。
 * 仕様上の6つ（札幌・東京・名古屋・大阪・松山・博多）のうち、
 * 収録範囲に入るのは松山だけなので、範囲内の主要ターミナルで代替している。
 * フェーズ2の全国拡張で本来の6駅に差し替える。
 */

import { FAME_CATEGORIES, FAME_CATEGORY_MAP } from './fameCategories';
import { INDUSTRIES, INDUSTRY_MAP } from './industries';
import { LINES } from './lines';
import { STATIONS, STATION_MAP } from './stations';
import type { GameData } from './types';

export const START_STATION_IDS = [
  'matsuyama',
  'takamatsu',
  'tokushima',
  'okayama',
  'hiroshima',
  'sannomiya',
  'osaka',
];

export const GAME_DATA: GameData = {
  stations: STATION_MAP,
  lines: LINES,
  industries: INDUSTRY_MAP,
  fameCategories: FAME_CATEGORIES,
  startStationIds: START_STATION_IDS,
};

export {
  FAME_CATEGORIES,
  FAME_CATEGORY_MAP,
  INDUSTRIES,
  INDUSTRY_MAP,
  LINES,
  STATIONS,
  STATION_MAP,
};
export * from './types';
