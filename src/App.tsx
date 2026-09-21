/**
 * ゲーム全体の統括。
 *
 * ルールエンジンは純粋関数なので、ここでは「状態の持ち回り」「CPU の自動進行」
 * 「コマの移動アニメーション」「保存と復帰」だけを担当する。
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GAME_DATA } from './data';
import type { StationId, TrainType } from './data/types';
import { cpuStep, isCpuTurn } from './engine/autoplay';
import { buildGraphs } from './engine/graph';
import {
  chooseDestination,
  chooseIndustry,
  chooseStart,
  chooseType,
  createGame,
  currentPlayer,
  rollDice,
  selectableTypes as selectableTypesOf,
} from './engine/state';
import { computeStandings } from './engine/trophy';
import type { GameState, PlayerConfig } from './engine/types';
import { ControlPanel } from './ui/ControlPanel';
import { MapView } from './ui/MapView';
import { ResultScreen } from './ui/ResultScreen';
import { SetupScreen } from './ui/SetupScreen';
import { TrophyBar } from './ui/TrophyBar';
import { clearGame, loadGame, saveGame } from './ui/storage';

/** 通過駅を流す速さと、停車駅で止まる長さ。 */
const PASS_MS = 90;
const STOP_MS = 210;
/** CPU の思考を見せるための間。 */
const CPU_THINK_MS = 650;

interface Animation {
  playerIndex: number;
  path: StationId[];
  stops: Set<StationId>;
  step: number;
}

export function App() {
  const data = GAME_DATA;
  const graphs = useMemo(() => buildGraphs(data), [data]);

  const [game, setGame] = useState<GameState | null>(null);
  const [saved, setSaved] = useState<GameState | null>(null);
  const [anim, setAnim] = useState<Animation | null>(null);
  const lastMoveRef = useRef<GameState['lastMove']>(null);

  useEffect(() => {
    setSaved(loadGame());
  }, []);

  useEffect(() => {
    if (game) saveGame(game);
  }, [game]);

  /** 移動が確定したらコマのアニメーションを開始する。 */
  const applyState = useCallback((next: GameState) => {
    const move = next.lastMove;
    if (move && move !== lastMoveRef.current && move.fullPath.length > 1) {
      lastMoveRef.current = move;
      setAnim({
        playerIndex: next.players[next.current]?.index ?? 0,
        path: move.fullPath,
        stops: new Set(move.stopPath),
        step: 0,
      });
    }
    setGame(next);
  }, []);

  // コマを1駅ずつ進める。通過駅は速く流し、停車駅では少し長く止まる。
  useEffect(() => {
    if (!anim) return;
    if (anim.step >= anim.path.length - 1) {
      const timer = window.setTimeout(() => setAnim(null), STOP_MS);
      return () => window.clearTimeout(timer);
    }
    const nextId = anim.path[anim.step + 1] as StationId;
    const wait = anim.stops.has(nextId) ? STOP_MS : PASS_MS;
    const timer = window.setTimeout(
      () => setAnim((a) => (a ? { ...a, step: a.step + 1 } : null)),
      wait,
    );
    return () => window.clearTimeout(timer);
  }, [anim]);

  // CPU の手番を自動で進める。
  useEffect(() => {
    if (!game || anim) return;
    if (game.phase === 'finished' || !isCpuTurn(game)) return;
    const timer = window.setTimeout(() => {
      applyState(cpuStep(game, data, graphs));
    }, CPU_THINK_MS);
    return () => window.clearTimeout(timer);
  }, [game, anim, data, graphs, applyState]);

  const start = (turns: number, players: PlayerConfig[]) => {
    lastMoveRef.current = null;
    setAnim(null);
    setGame(createGame({ turns, players }));
  };

  const restart = () => {
    clearGame();
    lastMoveRef.current = null;
    setAnim(null);
    setGame(null);
    setSaved(null);
  };

  if (!game) {
    return (
      <SetupScreen
        onStart={start}
        onResume={
          saved
            ? () => {
                lastMoveRef.current = saved.lastMove;
                setGame(saved);
              }
            : undefined
        }
      />
    );
  }

  if (game.phase === 'finished') {
    return <ResultScreen state={game} data={data} onRestart={restart} />;
  }

  const player = currentPlayer(game);
  const standings = computeStandings(game, data);
  const types = selectableTypesOf(game, graphs);
  const busy = anim !== null;
  const targets =
    !busy && game.phase === 'chooseDest' && !player.isCPU
      ? (game.options ?? []).map((o) => o.stationId)
      : [];

  return (
    <div className="app">
      <header className="header">
        <span className="header__turn">
          {game.turn} / {game.turns} ターン
        </span>
        <span className="header__player">
          <span className="dot" style={{ background: player.color }} />
          <span className="header__player-name">{player.name}</span>
        </span>
        <span className="header__spacer" />
        <button
          type="button"
          className="header__menu"
          onClick={() => {
            if (window.confirm('ゲームを中断して最初の画面に戻りますか？')) restart();
          }}
        >
          中断
        </button>
      </header>

      <TrophyBar standings={standings} players={game.players} />

      <MapView
        data={data}
        players={game.players}
        targets={targets}
        focusStationId={player.stationId}
        animating={
          anim ? { playerIndex: anim.playerIndex, stationId: anim.path[anim.step] as StationId } : null
        }
        onSelect={
          targets.length > 0 ? (id) => applyState(chooseDestination(game, id, data)) : undefined
        }
      />

      <ControlPanel
        state={game}
        data={data}
        graphs={graphs}
        selectableTypes={types}
        busy={busy}
        onChooseStart={(id: StationId) => applyState(chooseStart(game, id))}
        onChooseType={(type: TrainType) => applyState(chooseType(game, type))}
        onRoll={() => applyState(rollDice(game, graphs))}
        onChooseDest={(id: StationId) => applyState(chooseDestination(game, id, data))}
        onChooseIndustry={(id: string) => applyState(chooseIndustry(game, id, data))}
      />
    </div>
  );
}
