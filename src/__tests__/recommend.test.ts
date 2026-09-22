/** 開始駅のおすすめ判定。 */

import { describe, expect, it } from 'vitest';
import { GAME_DATA } from '../data';
import { buildGraphs } from '../engine/graph';
import { scoreStartStations } from '../engine/recommend';
import type { TrophyId } from '../engine/types';

const graphs = buildGraphs(GAME_DATA);
const score = (trophies: TrophyId[], turns = 5) =>
  scoreStartStations(GAME_DATA, graphs, trophies, turns);
const nameOf = (id: string) => GAME_DATA.stations[id]!.name;

describe('開始駅のおすすめ', () => {
  it('すべての開始駅に点が付く', () => {
    const result = score(['scale_total', 'best3_count', 'distance', 'rural', 'fare_min']);
    expect(result).toHaveLength(GAME_DATA.startStationIds.length);
    for (const x of result) {
      expect(x.score).toBeGreaterThanOrEqual(0);
      expect(x.score).toBeLessThanOrEqual(1);
    }
  });

  it('おすすめは1駅以上3駅以下', () => {
    const combos: TrophyId[][] = [
      ['scale_total', 'max_profit_rate', 'best3_count', 'sector1_count', 'distance'],
      ['sector1_count', 'sector2_count', 'sector3_count', 'rural', 'fare_min'],
      ['distance', 'distance', 'distance', 'distance', 'distance'],
    ];
    for (const trophies of combos) {
      const picked = score(trophies).filter((x) => x.recommended);
      expect(picked.length).toBeGreaterThanOrEqual(1);
      expect(picked.length).toBeLessThanOrEqual(3);
    }
  });

  it('引かれたトロフィーによっておすすめが変わる', () => {
    // 同じ駅ばかり出てくるなら、助言として何も言っていないのと同じ。
    const a = score(['sector3_count', 'scale_total', 'best3_count', 'max_profit_rate', 'distance'])
      .filter((x) => x.recommended)
      .map((x) => x.stationId);
    const b = score(['sector1_count', 'rural', 'fare_min', 'sector1_count', 'rural'])
      .filter((x) => x.recommended)
      .map((x) => x.stationId);
    expect(a.sort()).not.toEqual(b.sort());
  });

  it('第三次産業が並ぶと大都市が、第一次産業が並ぶと地方が上位に来る', () => {
    const top = (trophies: TrophyId[]) =>
      [...score(trophies)].sort((x, y) => y.score - x.score)[0]!.stationId;

    const urban = top(['sector3_count', 'sector3_count', 'scale_total', 'scale_total', 'best3_count']);
    const rural = top(['sector1_count', 'sector1_count', 'rural', 'rural', 'fare_min']);

    expect(['osaka', 'sannomiya', 'okayama', 'hiroshima']).toContain(urban);
    expect(['osaka', 'sannomiya']).not.toContain(rural);
    expect(nameOf(urban)).toBeTruthy();
  });

  it('理由として挙げるトロフィーは、引かれた5枚の中から選ばれる', () => {
    const trophies: TrophyId[] = [
      'sector2_count',
      'distance',
      'rural',
      'best3_count',
      'fare_min',
    ];
    for (const x of score(trophies)) {
      expect(trophies).toContain(x.reason);
    }
  });
});
