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
import { scoreStartStations } from '../engine/recommend';
import { TROPHY_DEFS } from '../engine/trophy';
import type { Graphs } from '../engine/graph';
import { currentPlayer, investableIndustries, rollDice, sortedOptions } from '../engine/state';
import type { GameState, TrophyId } from '../engine/types';
import { DICE_ROLL_MS, Dice } from './Dice';
import { IndustryChoice, isBest3 } from './IndustryCard';

interface Props {
  state: GameState;
  data: GameData;
  graphs: Graphs;
  selectableTypes: TrainType[];
  busy: boolean;
  onChooseStart: (id: StationId) => void;
  onChooseType: (type: TrainType) => void;
  /** 転がし終えた時点で、確定済みの次の状態を渡す。 */
  onRoll: (next: GameState) => void;
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
  /** 転がっているサイコロの出目。止まっているあいだは null。 */
  const [rolling, setRolling] = useState<number | null>(null);

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
    case 'chooseStart': {
      // 今回の5枚に向いた駅を助言する。地理を知らなくても選べるように。
      const scores = new Map(
        scoreStartStations(data, graphs, state.trophies, state.turns).map((x) => [
          x.stationId,
          x,
        ]),
      );
      return (
        <div className="panel">
          <div className="panel__title">
            {player.name} の開始駅を選んでください（地図の光っている駅もタップできます）
          </div>
          <PanelList>
            {data.startStationIds.map((id) => {
              const station = data.stations[id];
              if (!station) return null;
              const list = industriesOf(data, id);
              const score = scores.get(id);
              return (
                <button
                  type="button"
                  key={id}
                  className={
                    score?.recommended
                      ? 'md-list-item md-list-item--recommended md-ripple'
                      : 'md-list-item md-ripple'
                  }
                  onClick={() => props.onChooseStart(id)}
                >
                  <div className="md-list-item__headline">
                    <span>{station.name}</span>
                    {score?.recommended && (
                      <span className="md-chip md-chip--small md-chip--recommended">
                        おすすめ · {TROPHY_DEFS[score.reason as TrophyId]?.shortName}
                      </span>
                    )}
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
    }

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
            aria-label="サイコロを振る"
            onClick={() => {
              /*
               * 出目をここで確定させてから転がす。
               * rollDice は純粋関数なので、先に呼んで出目を知り、
               * 転がり終わったあとに「まさにその結果」を反映すれば、
               * 乱数を二度引くことにはならない。
               * こうしないとサイコロが出目と無関係な面で止まってしまう。
               */
              const next = rollDice(state, graphs);
              setRolling(next.dice ?? 1);
              window.setTimeout(() => {
                setRolling(null);
                props.onRoll(next);
              }, DICE_ROLL_MS);
            }}
            disabled={rolling !== null}
          >
            <Dice value={rolling} />
          </button>
        </div>
      );

    case 'chooseDest': {
      const options = sortedOptions(state.options ?? []);
      const short = options[0]?.steps !== state.dice;
      return (
        <div className="panel">
          {/* 転がったサイコロの目をそのまま残す。結果と転がりが結びつくように。 */}
          <div className="panel__title panel__title--dice">
            <Dice value={state.dice ?? null} spin={false} small />
            <span>
              {state.dice} が出ました。
              {short
                ? `この先は行き止まりのため、${options[0]?.steps}駅先までです`
                : '降りる駅を選んでください（地図の光っている駅もタップできます）'}
            </span>
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
