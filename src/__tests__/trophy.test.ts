/** トロフィーの判定・同点処理・優勝判定（仕様書 3）。 */

import { describe, expect, it } from 'vitest';
import type { GameData, Industry, Sector, Station } from '../data/types';
import type { GameState, Player } from '../engine/types';
import { computeResult, computeStanding, trophyValue } from '../engine/trophy';

function ind(
  id: string,
  sector: Sector,
  scale: number,
  profitRate: number,
  fame?: { rank: number; score: number },
): Industry {
  return fame
    ? { id, name: id, sector, scale, profitRate, fame: { categoryId: 'c', ...fame } }
    : { id, name: id, sector, scale, profitRate };
}

const INDUSTRIES = [
  ind('big', 2, 100, 5),
  ind('small', 1, 3, 40),
  ind('mid', 3, 20, 15),
  ind('famous', 2, 20, 15, { rank: 1, score: 80 }),
  ind('known', 2, 20, 15, { rank: 5, score: 30 }),
  ind('plain', 2, 20, 15),
  ind('plain2', 2, 20, 15),
];

const station = (id: string, lat: number, lon: number): Station => ({
  id,
  name: id,
  kana: id,
  pref: 'テスト県',
  lat,
  lon,
  industries: [],
});

const data: GameData = {
  stations: {
    home: station('home', 34, 133),
    far: station('far', 34, 134), // 約92km 東
  },
  industries: Object.fromEntries(INDUSTRIES.map((x) => [x.id, x])),
  lines: [],
  fameCategories: [],
  startStationIds: [],
};

function player(index: number, holdings: string[], patch: Partial<Player> = {}): Player {
  return {
    index,
    name: `P${index}`,
    isCPU: false,
    difficulty: 'normal',
    color: '#000',
    startStationId: 'home',
    stationId: 'home',
    holdings,
    fareTotal: 0,
    ...patch,
  };
}

describe('trophyValue', () => {
  it('規模の合計', () => {
    expect(trophyValue('scale_total', player(0, ['big', 'small']), data)).toBe(103);
  });

  it('最大利益率は最大値を取る', () => {
    expect(trophyValue('max_profit_rate', player(0, ['big', 'small']), data)).toBe(40);
  });

  it('全国ベスト3は rank<=3 のみ数える', () => {
    expect(trophyValue('best3_count', player(0, ['famous', 'known', 'plain']), data)).toBe(1);
  });

  it('分類ごとの個数', () => {
    const p = player(0, ['big', 'small', 'mid']);
    expect(trophyValue('sector1_count', p, data)).toBe(1);
    expect(trophyValue('sector2_count', p, data)).toBe(1);
    expect(trophyValue('sector3_count', p, data)).toBe(1);
  });

  it('地方創生は保有産業の最小規模', () => {
    expect(trophyValue('rural', player(0, ['big', 'small']), data)).toBe(3);
  });

  it('保有が無いとき地方創生は最も不利な値になる', () => {
    expect(trophyValue('rural', player(0, []), data)).toBe(Number.POSITIVE_INFINITY);
  });

  it('距離は開始駅と現在地の直線距離', () => {
    const p = player(0, [], { stationId: 'far' });
    expect(trophyValue('distance', p, data)).toBeGreaterThan(80);
    expect(trophyValue('distance', player(0, []), data)).toBe(0);
  });

  it('節約王は交通費の合計', () => {
    expect(trophyValue('fare_min', player(0, [], { fareTotal: 123 }), data)).toBe(123);
  });
});

describe('同点処理', () => {
  it('第1段階: 同点対象の産業規模合計が大きい方', () => {
    // どちらも第二次産業1個だが、規模が違う。
    const standing = computeStanding(
      'sector2_count',
      [player(0, ['big']), player(1, ['plain'])],
      data,
    );
    expect(standing.winnerIndex).toBe(0);
  });

  it('第2段階: 規模も同じなら知名度点が高い方', () => {
    // famous と plain はどちらも sector2 / scale 20。知名度点だけが違う。
    const standing = computeStanding(
      'sector2_count',
      [player(0, ['plain']), player(1, ['famous'])],
      data,
    );
    expect(standing.winnerIndex).toBe(1);
  });

  it('第3段階: すべて同値なら手番が後のプレイヤー', () => {
    const standing = computeStanding(
      'sector2_count',
      [player(0, ['plain']), player(1, ['plain2'])],
      data,
    );
    expect(standing.winnerIndex).toBe(1);
  });

  it('必ず1人だけが受賞する', () => {
    const standing = computeStanding(
      'sector2_count',
      [player(0, ['plain']), player(1, ['plain2']), player(2, ['plain'])],
      data,
    );
    expect(standing.ranking).toHaveLength(3);
    expect(standing.winnerIndex).not.toBeNull();
  });

  it('最小を競うトロフィーでは小さい方が勝つ', () => {
    const standing = computeStanding(
      'fare_min',
      [player(0, [], { fareTotal: 500 }), player(1, [], { fareTotal: 200 })],
      data,
    );
    expect(standing.winnerIndex).toBe(1);
  });
});

describe('優勝判定', () => {
  function state(players: Player[], trophies: GameState['trophies']): GameState {
    return {
      turns: 5,
      trophies,
      players,
      turn: 6,
      current: 0,
      phase: 'finished',
      selectedType: null,
      dice: null,
      options: null,
      lastMove: null,
      seed: 1,
      log: [],
    };
  }

  it('トロフィー枚数が最多の人が優勝', () => {
    const players = [player(0, ['big']), player(1, ['small'])];
    // 規模合計とベスト3は big 持ちの P0、地方創生は small 持ちの P1。
    const result = computeResult(state(players, ['scale_total', 'rural', 'max_profit_rate']), data);
    expect(result.trophyCounts[0]).toBe(1); // scale_total
    expect(result.trophyCounts[1]).toBe(2); // rural, max_profit_rate
    expect(result.winners).toEqual([1]);
  });

  it('5枚のトロフィーが必ず全員に配分される', () => {
    const players = [player(0, ['big']), player(1, ['small']), player(2, ['mid'])];
    const result = computeResult(
      state(players, ['scale_total', 'rural', 'max_profit_rate', 'best3_count', 'sector3_count']),
      data,
    );
    const total = result.trophyCounts.reduce((a, b) => a + b, 0);
    expect(total).toBe(5);
  });
});
