/** 進行中のゲームを localStorage に保存する。中断・リロードから復帰できるようにする。 */

import type { GameState } from '../engine/types';

const KEY = 'toushidensha:game:v1';

export function saveGame(state: GameState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // プライベートブラウズなどで失敗しても、ゲーム自体は続行できる。
  }
}

export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameState;
    if (!parsed.players || !Array.isArray(parsed.players) || parsed.players.length === 0) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearGame(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // 失敗しても実害はない。
  }
}
