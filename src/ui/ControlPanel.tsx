/**
 * 手番の操作パネル。フェーズごとに内容が入れ替わる。
 *
 * 種別を選ぶ段階で「その種別だと次の停車駅はどこか」を出しているのは、
 * 普通で4駅／急行で1駅という本作のコアな判断を、振る前に下せるようにするため。
 */

import { Children, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  CONVENTIONAL_TRAIN_TYPES,
  FARE_COEFFICIENT,
  TRAIN_TYPE_LABEL,
} from '../data/types';
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

/** 横長2カラムに切り替える条件。app.css のメディアクエリと対応している。 */
const LANDSCAPE_QUERY = '(min-width: 720px) and (min-aspect-ratio: 1 / 1)';

type Density = 'normal' | 'dense' | 'tight';

/**
 * 選択肢の一覧。数が多いときは1行の高さを詰めて、スクロールせずに全部見えるようにする。
 *
 * 詰めるのは横長のときだけ。縦長ではパネルが内容に合わせて伸びるので、
 * 高さを測っても「空いている高さ」が出ず、詰めるべきかどうかを判断できない。
 * 横長ではパネルが右カラムの固定枠なので、1行あたりの高さがそのまま出る。
 */
function PanelList({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [density, setDensity] = useState<Density>('normal');
  const count = Children.count(children);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const media = window.matchMedia(LANDSCAPE_QUERY);

    const measure = () => {
      if (!media.matches || count === 0) {
        setDensity('normal');
        return;
      }
      const perRow = el.clientHeight / count;
      // 1行に畳んでも 20px は要る（余白2+2 と 12px の文字）。
      // それを切ったら文字が上下で切れるので、諦めてスクロールさせる。
      // 読めない行が並ぶより、スクロールしてでも読めるほうがまし。
      if (perRow < 20) setDensity('normal');
      else setDensity(perRow >= 62 ? 'normal' : perRow >= 44 ? 'dense' : 'tight');
    };

    measure();
    // 詰め具合を変えても枠の高さは変わらないので、測り直しても振動しない。
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    media.addEventListener('change', measure);
    return () => {
      observer.disconnect();
      media.removeEventListener('change', measure);
    };
  }, [count]);

  return (
    <div ref={ref} className={`panel__list panel__list--${density}`}>
      {children}
    </div>
  );
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
        <div className="panel__waiting">移動中…</div>
      </div>
    );
  }

  if (player.isCPU) {
    return (
      <div className="panel">
        <div className="panel__waiting">
          <span
            className="player-dot thinking-dot"
            style={{ background: player.color }}
          />
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
          <PanelList>
            {data.startStationIds.map((id) => {
              const station = data.stations[id];
              if (!station) return null;
              const list = industriesOf(data, id);
              return (
                <button
                  type="button"
                  key={id}
                  className="md-list-item md-ripple"
                  onClick={() => props.onChooseStart(id)}
                >
                  <div className="md-list-item__headline">
                    <span>{station.name}</span>
                    <span className="md-list-item__trailing">{station.pref}</span>
                  </div>
                  <div className="md-list-item__supporting">
                    {list.map((x) => x.name).join('・')}
                  </div>
                </button>
              );
            })}
          </PanelList>
        </div>
      );

    case 'chooseType': {
      const from = player.stationId as StationId;

      const typeButton = (type: TrainType, usable: boolean) => {
        const next = usable ? findReachable(graphs[type], from, 1, type) : [];
        const names = next
          .map((o) => data.stations[o.stationId]?.name)
          .filter(Boolean)
          .join('・');
        return (
          <button
            type="button"
            key={type}
            className={
              type === 'shinkansen'
                ? 'md-list-item md-list-item--shinkansen md-ripple'
                : 'md-list-item md-ripple'
            }
            disabled={!usable}
            onClick={() => props.onChooseType(type)}
          >
            <div className="md-list-item__headline">
              <span>{TRAIN_TYPE_LABEL[type]}</span>
              <span className="md-list-item__trailing">運賃 ×{FARE_COEFFICIENT[type]}</span>
            </div>
            <div className="md-list-item__supporting">
              {usable ? `次の停車駅: ${names}` : 'この駅には停車しません'}
            </div>
          </button>
        );
      };

      // 新幹線が停まる駅はごく限られるので、乗れるときだけ4つ目として下に出す。
      // 在来線の3種別はいつもどおり並べ、停車しないものは押せない状態で見せる。
      const canShinkansen = selectableTypes.includes('shinkansen');

      return (
        <div className="panel">
          <div className="panel__title">乗る列車を選んでください（サイコロはこの後）</div>
          <PanelList>
            {CONVENTIONAL_TRAIN_TYPES.map((type) =>
              typeButton(type, selectableTypes.includes(type)),
            )}
            {canShinkansen && typeButton('shinkansen', true)}
          </PanelList>
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
            className="md-fab md-ripple"
            style={{ width: '100%' }}
            onClick={() => {
              setRolling(true);
              window.setTimeout(() => {
                setRolling(false);
                props.onRoll();
              }, 450);
            }}
            disabled={rolling}
          >
            <span className={rolling ? 'dice-face dice-face--rolling' : 'dice-face'}>🎲</span>
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
          <PanelList>
            {options.map((option) => {
              const station = data.stations[option.stationId];
              if (!station) return null;
              const list = industriesOf(data, option.stationId);
              return (
                <button
                  type="button"
                  key={option.stationId}
                  className="md-list-item md-ripple"
                  onClick={() => props.onChooseDest(option.stationId)}
                >
                  <div className="md-list-item__headline">
                    <span>{station.name}</span>
                    {isLtdStop(data, option.stationId) && (
                      <span className="md-chip md-chip--small md-chip--secondary">特急停車</span>
                    )}
                    <span className="md-list-item__trailing">
                      {Math.round(option.distanceKm)}km / 運賃 {Math.round(option.fare)}
                    </span>
                  </div>
                  <div className="md-list-item__supporting">
                    {list
                      .map((x) => `${x.name}${isBest3(x) ? '★' : ''}（規模${x.scale}）`)
                      .join('・')}
                  </div>
                </button>
              );
            })}
          </PanelList>
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
          <PanelList>
            {candidates.map((industry) => (
              <IndustryChoice
                key={industry.id}
                industry={industry}
                onClick={() => props.onChooseIndustry(industry.id)}
              />
            ))}
          </PanelList>
        </div>
      );
    }

    default:
      return <div className="panel" />;
  }
}
