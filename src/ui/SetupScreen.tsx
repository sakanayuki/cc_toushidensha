/** ゲーム開始前の設定画面。 */

import { useState } from 'react';
import { TURN_OPTIONS } from '../engine/state';
import { DIFFICULTY_LABEL } from '../engine/types';
import type { Difficulty, PlayerConfig } from '../engine/types';

export const PLAYER_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b'];

const DEFAULT_NAMES = ['あなた', 'CPU 1', 'CPU 2', 'CPU 3'];

function defaultPlayers(count: number): PlayerConfig[] {
  return Array.from({ length: count }, (_, i) => ({
    name: DEFAULT_NAMES[i] ?? `P${i + 1}`,
    isCPU: i !== 0,
    difficulty: 'normal' as Difficulty,
    color: PLAYER_COLORS[i] ?? '#94a3b8',
  }));
}

interface Props {
  onStart: (turns: number, players: PlayerConfig[]) => void;
  onResume?: (() => void) | undefined;
}

export function SetupScreen({ onStart, onResume }: Props) {
  const [turns, setTurns] = useState(5);
  const [players, setPlayers] = useState<PlayerConfig[]>(defaultPlayers(4));
  const [count, setCount] = useState(4);

  const setCountAndPlayers = (n: number) => {
    setCount(n);
    setPlayers((prev) => {
      const next = defaultPlayers(n);
      return next.map((p, i) => ({ ...p, ...(prev[i] ? { name: prev[i]?.name ?? p.name } : {}) }));
    });
  };

  const update = (index: number, patch: Partial<PlayerConfig>) => {
    setPlayers((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  };

  return (
    <div className="screen">
      <h1>投資伝車</h1>
      <p className="screen__lead">
        日本各地の鉄道を旅しながら各駅の産業に投資し、トロフィーの数を競うゲームです。
        フェーズ1として四国＋岡山の全118駅を収録しています。
      </p>

      {onResume && (
        <>
          <h2>前回の続き</h2>
          <button type="button" className="primary" onClick={onResume}>
            続きから再開する
          </button>
        </>
      )}

      <h2>ターン数</h2>
      <div className="seg">
        {TURN_OPTIONS.map((t) => (
          <button key={t} type="button" aria-pressed={turns === t} onClick={() => setTurns(t)}>
            {t}
          </button>
        ))}
      </div>
      <p className="note">1ターンにつき1駅ぶん投資できます。{turns} 回の投資で勝負が決まります。</p>

      <h2>人数</h2>
      <div className="seg">
        {[1, 2, 3, 4].map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={count === n}
            onClick={() => setCountAndPlayers(n)}
          >
            {n}人
          </button>
        ))}
      </div>

      <h2>プレイヤー</h2>
      {players.map((player, i) => (
        <div className="player-row" key={i}>
          <span className="dot" style={{ background: player.color }} />
          <input
            value={player.name}
            maxLength={8}
            onChange={(e) => update(i, { name: e.target.value })}
            aria-label={`プレイヤー${i + 1}の名前`}
          />
          <select
            value={player.isCPU ? 'cpu' : 'human'}
            onChange={(e) => update(i, { isCPU: e.target.value === 'cpu' })}
            aria-label={`プレイヤー${i + 1}の種別`}
          >
            <option value="human">人間</option>
            <option value="cpu">CPU</option>
          </select>
          <select
            value={player.difficulty}
            disabled={!player.isCPU}
            onChange={(e) => update(i, { difficulty: e.target.value as Difficulty })}
            aria-label={`プレイヤー${i + 1}の難易度`}
          >
            {(['easy', 'normal', 'hard'] as Difficulty[]).map((d) => (
              <option key={d} value={d}>
                {DIFFICULTY_LABEL[d]}
              </option>
            ))}
          </select>
        </div>
      ))}

      <h2>遊びかた</h2>
      <p className="note">
        1. サイコロを振る前に、普通・急行・特急のどれに乗るかを選びます。停車駅の数で進むので、
        普通で4駅先の駅が、急行なら1駅で着くこともあります。
        <br />
        2. サイコロを振ると、ちょうどその数だけ先の停車駅が地図上に光ります。そこから1つ選んで移動します。
        <br />
        3. 到着した駅の産業を1つ選んで投資します。同じ産業は他の人も取れますが、自分では重複して持てません。
        <br />
        4. 各ゲームでは9種類のトロフィーから5枚が抽選され、それぞれの1位が受賞。最多の人が優勝です。
        <br />
        5. 乗れるのはその駅に停車する種別だけ。普通しか停まらない小駅に降りると、次も普通しか選べません。
      </p>

      <div style={{ marginTop: 18 }}>
        <button type="button" className="primary" onClick={() => onStart(turns, players)}>
          ゲーム開始
        </button>
      </div>
    </div>
  );
}
