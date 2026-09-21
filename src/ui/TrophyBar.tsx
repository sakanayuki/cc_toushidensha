/**
 * トロフィーの常時表示（仕様書 6.2 / 決定15）。
 *
 * 5枚それぞれの「いま獲得予定のプレイヤー」を常に出しておき、
 * タップで全員の順位・現在値・逆転に必要な差を展開する。
 */

import { useState } from 'react';
import { TROPHY_DEFS, isTiedAtTop } from '../engine/trophy';
import type { Player, TrophyStanding } from '../engine/types';

function diffLabel(standing: TrophyStanding, value: number): string {
  const top = standing.ranking[0];
  if (!top) return '';
  const def = TROPHY_DEFS[standing.trophyId];
  if (!Number.isFinite(value) || !Number.isFinite(top.value)) return '';
  const gap = def.direction === 'max' ? top.value - value : value - top.value;
  if (gap <= 0) return '';
  return def.id === 'max_profit_rate' ? `あと${gap.toFixed(1)}` : `あと${Math.round(gap)}`;
}

interface Props {
  standings: TrophyStanding[];
  players: Player[];
}

export function TrophyBar({ standings, players }: Props) {
  const [open, setOpen] = useState(false);
  const byIndex = new Map(players.map((p) => [p.index, p]));

  return (
    <div className="trophies">
      <div className="trophies__grid">
        {standings.map((standing) => {
          const def = TROPHY_DEFS[standing.trophyId];
          const leader = standing.winnerIndex !== null ? byIndex.get(standing.winnerIndex) : null;
          const top = standing.ranking[0];
          return (
            <button
              type="button"
              key={standing.trophyId}
              className="trophy-cell"
              onClick={() => setOpen((v) => !v)}
            >
              <div className="trophy-cell__name">{def.name}</div>
              <div className="trophy-cell__leader">
                {leader && <span className="dot" style={{ background: leader.color }} />}
                <span>{leader?.name ?? '—'}</span>
                <span className="trophy-cell__value">
                  {isTiedAtTop(standing) && <span className="tie">同点</span>}
                  {top?.display ?? '—'}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <button type="button" className="trophies__toggle" onClick={() => setOpen((v) => !v)}>
        {open ? '▲ 順位を閉じる' : '▼ 全員の順位を見る'}
      </button>

      {open && (
        <div className="trophies__detail">
          {standings.map((standing) => {
            const def = TROPHY_DEFS[standing.trophyId];
            return (
              <div className="standing" key={standing.trophyId}>
                <div className="standing__head">
                  <span className="standing__name">{def.name}</span>
                  <span className="standing__desc">
                    {isTiedAtTop(standing)
                      ? '同点のため、対象産業の規模→知名度点→手番の順で決着中'
                      : def.description}
                  </span>
                </div>
                {standing.ranking.map((row, i) => {
                  const player = byIndex.get(row.playerIndex);
                  const gap = i === 0 ? '' : diffLabel(standing, row.value);
                  return (
                    <div
                      key={row.playerIndex}
                      className={i === 0 ? 'standing__row standing__row--leader' : 'standing__row'}
                    >
                      <span>{i === 0 ? '🏆' : `${i + 1}.`}</span>
                      {player && <span className="dot" style={{ background: player.color }} />}
                      <span>{player?.name ?? '—'}</span>
                      <span className="standing__row-value">
                        {row.display}
                        {gap && <span style={{ opacity: 0.6 }}>（{gap}）</span>}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
