/**
 * 手番の操作パネル。フェーズごとに内容が入れ替わる。
 *
 * 種別を選ぶ段階で「その種別だと次の停車駅はどこか」を出しているのは、
 * 普通で4駅／急行で1駅という本作のコアな判断を、振る前に下せるようにするため。
 */

import { useState } from 'react';
import { FARE_COEFFICIENT, TRAIN_TYPE_LABEL } from '../data/types';
import type { GameData, Industry, StationId, TrainType } from '../data/types';
import { findReachable } from '../engine/graph';
import type { Graphs } from '../engine/graph';
import { currentPlayer, investableIndustries, sortedOptions } from '../engine/state';
import type { GameState } from '../engine/types';
import { IndustryChoice, isBest3 } from './IndustryCard';

interface Props {
  state: GameState;
  data: GameData;
  graphs: Graphs;
  selectableTypes: TrainType[];
  busy: boolean;
  onChooseStart: (id: StationId) => void;
  onChooseType: (type: TrainType) => void;
  onRoll: () => void;
  onChooseDest: (id: StationId) => void;
  onChooseIndustry: (id: string) => void;
}

/** 特急停車駅かどうか。到達駅を選ぶときの重要な判断材料。 */
function isLtdStop(data: GameData, id: StationId): boolean {
  return data.lines.some((line) => line.stops.ltd.includes(id));
}

function industriesOf(data: GameData, id: StationId): Industry[] {
  return (data.stations[id]?.industries ?? [])
    .map((x) => data.industries[x])
    .filter((x): x is Industry => x !== undefined);
}

export function ControlPanel(props: Props) {
  const { state, data, graphs, selectableTypes, busy } = props;
  const player = currentPlayer(state);
  const [rolling, setRolling] = useState(false);

  if (busy) {
    return (
      <div className="panel">
        <div className="waiting">移動中…</div>
      </div>
    );
  }

  if (player.isCPU) {
    return (
      <div className="panel">
        <div className="waiting">
          <span className="dot" style={{ background: player.color, display: 'inline-block' }} />{' '}
          {player.name} が考えています…
        </div>
      </div>
    );
  }

  switch (state.phase) {
    case 'chooseStart':
      return (
        <div className="panel">
          <div className="panel__title">
            {player.name} の開始駅を選んでください（他の人と同じ駅でも構いません）
          </div>
          <div className="choices">
            {data.startStationIds.map((id) => {
              const station = data.stations[id];
              if (!station) return null;
              const list = industriesOf(data, id);
              return (
                <button
                  type="button"
                  key={id}
                  className="choice"
                  onClick={() => props.onChooseStart(id)}
                >
                  <div className="choice__head">
                    <span className="choice__name">{station.name}</span>
                    <span className="choice__meta">{station.pref}</span>
                  </div>
                  <div className="choice__sub">{list.map((x) => x.name).join('・')}</div>
                </button>
              );
            })}
          </div>
        </div>
      );

    case 'chooseType': {
      const from = player.stationId as StationId;
      return (
        <div className="panel">
          <div className="panel__title">乗る列車を選んでください（サイコロはこの後）</div>
          <div className="choices">
            {(['local', 'express', 'ltd'] as TrainType[]).map((type) => {
              const usable = selectableTypes.includes(type);
              const next = usable ? findReachable(graphs[type], from, 1, type) : [];
              const names = next
                .map((o) => data.stations[o.stationId]?.name)
                .filter(Boolean)
                .join('・');
              return (
                <button
                  type="button"
                  key={type}
                  className={usable ? 'choice' : 'choice choice--disabled'}
                  disabled={!usable}
                  onClick={() => props.onChooseType(type)}
                >
                  <div className="choice__head">
                    <span className="choice__name">{TRAIN_TYPE_LABEL[type]}</span>
                    <span className="choice__meta">運賃 ×{FARE_COEFFICIENT[type]}</span>
                  </div>
                  <div className="choice__sub">
                    {usable ? `次の停車駅: ${names}` : 'この駅には停車しません'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    case 'roll':
      return (
        <div className="panel">
          <div className="panel__title">
            {TRAIN_TYPE_LABEL[state.selectedType ?? 'local']}に乗車。サイコロを振ってください
          </div>
          <button
            type="button"
            className="primary"
            onClick={() => {
              setRolling(true);
              window.setTimeout(() => {
                setRolling(false);
                props.onRoll();
              }, 450);
            }}
            disabled={rolling}
          >
            <span className={rolling ? 'dice dice--rolling' : 'dice'}>🎲</span>
          </button>
        </div>
      );

    case 'chooseDest': {
      const options = sortedOptions(state.options ?? []);
      const short = options[0]?.steps !== state.dice;
      return (
        <div className="panel">
          <div className="panel__title">
            {state.dice} が出ました。
            {short
              ? `この先は行き止まりのため、${options[0]?.steps}駅先までです`
              : '降りる駅を選んでください（地図の光っている駅もタップできます）'}
          </div>
          <div className="choices">
            {options.map((option) => {
              const station = data.stations[option.stationId];
              if (!station) return null;
              const list = industriesOf(data, option.stationId);
              return (
                <button
                  type="button"
                  key={option.stationId}
                  className="choice"
                  onClick={() => props.onChooseDest(option.stationId)}
                >
                  <div className="choice__head">
                    <span className="choice__name">{station.name}</span>
                    {isLtdStop(data, option.stationId) && <span className="badge">特急停車</span>}
                    <span className="choice__meta">
                      {Math.round(option.distanceKm)}km / 運賃 {Math.round(option.fare)}
                    </span>
                  </div>
                  <div className="choice__sub">
                    {list
                      .map((x) => `${x.name}${isBest3(x) ? '★' : ''}（規模${x.scale}）`)
                      .join('・')}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    case 'chooseIndustry': {
      const candidates = investableIndustries(state, data)
        .map((id) => data.industries[id])
        .filter((x): x is Industry => x !== undefined);
      const station = player.stationId ? data.stations[player.stationId] : undefined;
      return (
        <div className="panel">
          <div className="panel__title">
            {station?.name} に到着。投資する産業を1つ選んでください
          </div>
          <div className="choices">
            {candidates.map((industry) => (
              <IndustryChoice
                key={industry.id}
                industry={industry}
                onClick={() => props.onChooseIndustry(industry.id)}
              />
            ))}
          </div>
        </div>
      );
    }

    default:
      return <div className="panel" />;
  }
}
