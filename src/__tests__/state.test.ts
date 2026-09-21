/** ゲーム状態の遷移と、通しプレイ（仕様書 2〜3）。 */

import { describe, expect, it } from 'vitest';
import { GAME_DATA } from '../data';
import { cpuStep, isCpuTurn } from '../engine/autoplay';
import { buildGraphs } from '../engine/graph';
import {
  TURN_OPTIONS,
  createGame,
  currentPlayer,
  drawTrophies,
  investableIndustries,
} from '../engine/state';
import { computeResult } from '../engine/trophy';
import type { Difficulty, GameState, PlayerConfig, TrophyId } from '../engine/types';
import { SECTOR_TROPHIES, TROPHY_DRAW_COUNT } from '../engine/types';

const graphs = buildGraphs(GAME_DATA);

const cpu = (name: string, difficulty: Difficulty): PlayerConfig => ({
  name,
  isCPU: true,
  difficulty,
  color: '#000',
});

function playOut(state: GameState): GameState {
  let s = state;
  // 4人 × 10ターン × 5フェーズ + 開始駅選択 に十分な上限。
  for (let guard = 0; guard < 2000 && s.phase !== 'finished'; guard++) {
    if (!isCpuTurn(s)) throw new Error(`human turn is not expected: ${s.phase}`);
    s = cpuStep(s, GAME_DATA, graphs);
  }
  return s;
}

describe('drawTrophies', () => {
  it('必ず5枚引く', () => {
    for (let seed = 0; seed < 50; seed++) {
      expect(drawTrophies(seed).value).toHaveLength(TROPHY_DRAW_COUNT);
    }
  });

  it('分類系トロフィーは最大1枚しか出ない', () => {
    for (let seed = 0; seed < 200; seed++) {
      const drawn = drawTrophies(seed).value;
      const sectors = drawn.filter((t) => SECTOR_TROPHIES.includes(t));
      expect(sectors.length).toBeLessThanOrEqual(1);
    }
  });

  it('同じ種類が重複しない', () => {
    for (let seed = 0; seed < 50; seed++) {
      const drawn = drawTrophies(seed).value;
      expect(new Set(drawn).size).toBe(drawn.length);
    }
  });

  it('十分な回数を引けば分類系も非分類系も出現する', () => {
    const seen = new Set<TrophyId>();
    for (let seed = 0; seed < 300; seed++) {
      for (const t of drawTrophies(seed).value) seen.add(t);
    }
    // 9種すべてが出現しうる
    expect(seen.size).toBe(9);
  });
});

describe('createGame', () => {
  it('同じ seed なら同じ盤面になる', () => {
    const config = { turns: 5, players: [cpu('A', 'hard'), cpu('B', 'hard')], seed: 42 };
    const a = createGame(config);
    const b = createGame(config);
    expect(a.trophies).toEqual(b.trophies);
    expect(a.players.map((p) => p.name)).toEqual(b.players.map((p) => p.name));
  });

  it('開始駅の選択から始まる', () => {
    const s = createGame({ turns: 5, players: [cpu('A', 'hard')], seed: 1 });
    expect(s.phase).toBe('chooseStart');
    expect(s.turn).toBe(1);
    expect(currentPlayer(s).stationId).toBeNull();
  });
});

describe('通しプレイ', () => {
  it('CPU 4人で最後まで進み、結果が確定する', () => {
    const state = createGame({
      turns: 5,
      players: [cpu('A', 'hard'), cpu('B', 'normal'), cpu('C', 'easy'), cpu('D', 'hard')],
      seed: 7,
    });
    const done = playOut(state);

    expect(done.phase).toBe('finished');
    expect(done.turn).toBe(6);

    // 5ターンなので投資は最大5件。同じ産業は重複保有しない。
    for (const p of done.players) {
      expect(p.holdings.length).toBeLessThanOrEqual(5);
      expect(new Set(p.holdings).size).toBe(p.holdings.length);
      expect(p.stationId).not.toBeNull();
      expect(p.fareTotal).toBeGreaterThan(0);
    }

    const result = computeResult(done, GAME_DATA);
    expect(result.trophyCounts.reduce((a, b) => a + b, 0)).toBe(TROPHY_DRAW_COUNT);
    expect(result.winners.length).toBeGreaterThan(0);
  });

  it('さまざまな seed とターン数で例外なく完走する', () => {
    for (const turns of TURN_OPTIONS) {
      for (let seed = 0; seed < 12; seed++) {
        const state = createGame({
          turns,
          players: [cpu('A', 'hard'), cpu('B', 'normal'), cpu('C', 'easy')],
          seed,
        });
        const done = playOut(state);
        expect(done.phase).toBe('finished');
        for (const p of done.players) {
          expect(p.holdings.length).toBeLessThanOrEqual(turns);
        }
      }
    }
  });

  it('1人プレイでも成立する', () => {
    const done = playOut(createGame({ turns: 3, players: [cpu('A', 'hard')], seed: 3 }));
    expect(done.phase).toBe('finished');
    const result = computeResult(done, GAME_DATA);
    // 1人なら全トロフィーを独占する。
    expect(result.trophyCounts[0]).toBe(TROPHY_DRAW_COUNT);
  });

  it('すでに保有している産業は投資候補に出ない', () => {
    let s = createGame({ turns: 5, players: [cpu('A', 'hard')], seed: 11 });
    while (s.phase === 'chooseStart') s = cpuStep(s, GAME_DATA, graphs);

    // 手動で保有済みにしてみる
    const station = GAME_DATA.stations[currentPlayer(s).stationId as string];
    const first = station?.industries[0] as string;
    const tweaked: GameState = {
      ...s,
      players: s.players.map((p) => ({ ...p, holdings: [first] })),
    };
    expect(investableIndustries(tweaked, GAME_DATA)).not.toContain(first);
  });
});

describe('つよい CPU はやさしい CPU より強い', () => {
  it('多数回の対戦で勝ち越す', () => {
    let hardWins = 0;
    let easyWins = 0;
    for (let seed = 0; seed < 40; seed++) {
      const done = playOut(
        createGame({ turns: 5, players: [cpu('HARD', 'hard'), cpu('EASY', 'easy')], seed }),
      );
      const result = computeResult(done, GAME_DATA);
      const hard = done.players.find((p) => p.name === 'HARD');
      const easy = done.players.find((p) => p.name === 'EASY');
      const hardCount = result.trophyCounts[hard?.index ?? 0] ?? 0;
      const easyCount = result.trophyCounts[easy?.index ?? 1] ?? 0;
      if (hardCount > easyCount) hardWins++;
      else if (easyCount > hardCount) easyWins++;
    }
    expect(hardWins).toBeGreaterThan(easyWins);
  });
});
