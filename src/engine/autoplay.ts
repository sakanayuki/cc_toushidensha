/**
 * CPU のターンを1手ずつ進める。
 * UI はこれを一定間隔で呼ぶことで、CPU の思考を演出付きで見せられる。
 */

import type { GameData } from '../data/types';
import {
  cpuChooseDestination,
  cpuChooseIndustry,
  cpuChooseStart,
  cpuChooseType,
} from './cpu';
import type { Graphs } from './graph';
import {
  chooseDestination,
  chooseIndustry,
  chooseStart,
  chooseType,
  currentPlayer,
  rollDice,
  selectableTypes,
} from './state';
import type { GameState } from './types';

/** 現在の手番が CPU で、まだ操作待ちなら true。 */
export function isCpuTurn(state: GameState): boolean {
  if (state.phase === 'setup' || state.phase === 'finished') return false;
  return currentPlayer(state).isCPU;
}

/** CPU の手を1つだけ進める。 */
export function cpuStep(state: GameState, data: GameData, graphs: Graphs): GameState {
  if (!isCpuTurn(state)) return state;

  switch (state.phase) {
    case 'chooseStart': {
      const r = cpuChooseStart(state, data);
      return chooseStart({ ...state, seed: r.seed }, r.value);
    }
    case 'chooseType': {
      const types = selectableTypes(state, graphs);
      const r = cpuChooseType(state, data, graphs, types);
      return chooseType({ ...state, seed: r.seed }, r.value);
    }
    case 'roll':
      return rollDice(state, graphs);
    case 'chooseDest': {
      const r = cpuChooseDestination(state, data);
      return chooseDestination({ ...state, seed: r.seed }, r.value, data);
    }
    case 'chooseIndustry': {
      const r = cpuChooseIndustry(state, data);
      return chooseIndustry({ ...state, seed: r.seed }, r.value, data);
    }
    default:
      return state;
  }
}
