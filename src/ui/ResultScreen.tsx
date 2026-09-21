/** 最終結果。トロフィーを1枚ずつ順に開示する。 */

import { useEffect, useState } from 'react';
import type { GameData, Industry } from '../data/types';
import { TROPHY_DEFS, computeResult, isTiedAtTop } from '../engine/trophy';
import type { GameState } from '../engine/types';

interface Props {
  state: GameState;
  data: GameData;
  onRestart: () => void;
}

export function ResultScreen({ state, data, onRestart }: Props) {
  const result = computeResult(state, data);
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    if (revealed >= result.standings.length) return;
    const timer = window.setTimeout(() => setRevealed((v) => v + 1), 700);
    return () => window.clearTimeout(timer);
  }, [revealed, result.standings.length]);

  const allRevealed = revealed >= result.standings.length;
  const byIndex = new Map(state.players.map((p) => [p.index, p]));

  return (
    <div className="screen">
      <h1>結果発表</h1>

      <h2>トロフィー</h2>
      {result.standings.slice(0, revealed).map((standing) => {
        const def = TROPHY_DEFS[standing.trophyId];
        const winner = standing.winnerIndex !== null ? byIndex.get(standing.winnerIndex) : null;
        const top = standing.ranking[0];
        return (
          <div className="trophy-award" key={standing.trophyId}>
            <span>🏆</span>
            <span style={{ fontWeight: 700 }}>{def.name}</span>
            {winner && <span className="dot" style={{ background: winner.color }} />}
            <span>{winner?.name}</span>
            <span style={{ marginLeft: 'auto', color: 'var(--muted)' }}>
              {isTiedAtTop(standing) && <span className="tie">同点勝ち</span>}
              {top?.display}
            </span>
          </div>
        );
      })}

      {allRevealed && (
        <>
          <h2>順位</h2>
          {[...state.players]
            .sort(
              (a, b) => (result.trophyCounts[b.index] ?? 0) - (result.trophyCounts[a.index] ?? 0),
            )
            .map((player) => {
              const isWinner = result.winners.includes(player.index);
              const owned = player.holdings
                .map((id) => data.industries[id])
                .filter((x): x is Industry => x !== undefined);
              return (
                <div
                  key={player.index}
                  className={isWinner ? 'result-row result-row--winner' : 'result-row'}
                >
                  <span className="dot" style={{ background: player.color }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700 }}>
                      {player.name}
                      {isWinner && ' 👑'}
                    </div>
                    <div className="holdings">
                      {owned.map((x) => (
                        <span className="chip" key={x.id}>
                          {x.name}
                        </span>
                      ))}
                    </div>
                    <div className="note">
                      交通費 {Math.round(player.fareTotal)} ／ 最終地点{' '}
                      {player.stationId ? data.stations[player.stationId]?.name : '—'}
                    </div>
                  </div>
                  <span className="result-row__count">{result.trophyCounts[player.index] ?? 0}</span>
                </div>
              );
            })}

          <div style={{ marginTop: 18 }}>
            <button type="button" className="primary" onClick={onRestart}>
              もう一度遊ぶ
            </button>
          </div>
        </>
      )}
    </div>
  );
}
