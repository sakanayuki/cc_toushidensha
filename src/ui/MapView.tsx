/**
 * 実座標投影による路線図（仕様書 6.1 / 決定13）。
 *
 * 緯度経度をそのまま平面に投影するので、日本列島の形が出る。
 * 駅の大きさは停車する最上位の種別を表し、「この駅は特急が停まるか」が
 * 到達駅を選ぶときの判断材料として一目で分かるようにしてある。
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GameData, StationId } from '../data/types';
import type { Player } from '../engine/types';

/** 四国付近の緯度。経度方向の圧縮に使う。 */
const REF_LAT = 34;
const SCALE = 1000;

export function project(lat: number, lon: number): { x: number; y: number } {
  return {
    x: lon * Math.cos((REF_LAT * Math.PI) / 180) * SCALE,
    y: -lat * SCALE,
  };
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

function boxOf(points: { x: number; y: number }[], pad: number): Box {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    x: minX - pad,
    y: minY - pad,
    w: Math.max(maxX - minX + pad * 2, 1),
    h: Math.max(maxY - minY + pad * 2, 1),
  };
}

/** 駅に停車する最上位の種別。表示の大きさを決める。 */
type Tier = 'local' | 'express' | 'ltd';

function buildTiers(data: GameData): Map<StationId, Tier> {
  const tiers = new Map<StationId, Tier>();
  for (const line of data.lines) {
    for (const id of line.stops.local) if (!tiers.has(id)) tiers.set(id, 'local');
    for (const id of line.stops.express) {
      if (tiers.get(id) !== 'ltd') tiers.set(id, 'express');
    }
    for (const id of line.stops.ltd) tiers.set(id, 'ltd');
  }
  return tiers;
}

interface Props {
  data: GameData;
  players: Player[];
  /** 到達可能駅。ハイライトしてタップで選べるようにする。 */
  targets: StationId[];
  /** 手番プレイヤーの現在地。 */
  focusStationId: StationId | null;
  /** 移動アニメーション中のコマ位置。 */
  animating: { playerIndex: number; stationId: StationId } | null;
  onSelect?: ((stationId: StationId) => void) | undefined;
}

export function MapView({
  data,
  players,
  targets,
  focusStationId,
  animating,
  onSelect,
}: Props) {
  const points = useMemo(() => {
    const map = new Map<StationId, { x: number; y: number }>();
    for (const station of Object.values(data.stations)) {
      map.set(station.id, project(station.lat, station.lon));
    }
    return map;
  }, [data]);

  const tiers = useMemo(() => buildTiers(data), [data]);
  const fullBox = useMemo(() => boxOf([...points.values()], 12), [points]);

  const [view, setView] = useState<Box>(fullBox);
  const [followFocus, setFollowFocus] = useState(true);

  /** 現在地と到達可能駅がすべて収まるように寄せる。 */
  const focusView = useCallback(() => {
    const ids = [focusStationId, ...targets].filter((x): x is StationId => x !== null);
    const pts = ids.map((id) => points.get(id)).filter((p): p is { x: number; y: number } => !!p);
    if (pts.length === 0) return;
    const box = boxOf(pts, 25);
    // 狭すぎると拡大しすぎて周辺の路線が見えなくなるので下限を設ける。
    // 1 単位がおよそ 0.001 度なので、300 単位で 30km 四方ほどの視野になる。
    const w = Math.max(box.w, 300);
    const h = Math.max(box.h, 300);
    setView({
      x: box.x + box.w / 2 - w / 2,
      y: box.y + box.h / 2 - h / 2,
      w,
      h,
    });
  }, [focusStationId, targets, points]);

  useEffect(() => {
    if (followFocus) focusView();
  }, [followFocus, focusView]);

  // ── パンとピンチズーム ──
  const svgRef = useRef<SVGSVGElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ view: Box; dist: number; cx: number; cy: number } | null>(null);

  const toViewScale = () => {
    const rect = svgRef.current?.getBoundingClientRect();
    return rect ? view.w / rect.width : 1;
  };

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      if (a && b) {
        gesture.current = {
          view,
          dist: Math.hypot(a.x - b.x, a.y - b.y),
          cx: (a.x + b.x) / 2,
          cy: (a.y + b.y) / 2,
        };
      }
    }
  };

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const next = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, next);

    if (pointers.current.size === 1) {
      const k = toViewScale();
      setFollowFocus(false);
      setView((v) => ({ ...v, x: v.x - (next.x - prev.x) * k, y: v.y - (next.y - prev.y) * k }));
      return;
    }

    if (pointers.current.size === 2 && gesture.current) {
      const [a, b] = [...pointers.current.values()];
      if (!a || !b) return;
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const ratio = gesture.current.dist / Math.max(dist, 1);
      const base = gesture.current.view;
      const w = Math.min(Math.max(base.w * ratio, 25), fullBox.w * 1.5);
      const h = (w / base.w) * base.h;
      setFollowFocus(false);
      setView({
        x: base.x + (base.w - w) / 2,
        y: base.y + (base.h - h) / 2,
        w,
        h,
      });
    }
  };

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) gesture.current = null;
  };

  const onWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    const ratio = e.deltaY > 0 ? 1.15 : 1 / 1.15;
    setFollowFocus(false);
    setView((v) => {
      const w = Math.min(Math.max(v.w * ratio, 25), fullBox.w * 1.5);
      const h = (w / v.w) * v.h;
      return { x: v.x + (v.w - w) / 2, y: v.y + (v.h - h) / 2, w, h };
    });
  };

  // 表示スケールに応じた大きさ。ズームしても見た目が一定になる。
  const unit = view.w / 100;
  const fontSize = unit * 2.6;
  const targetSet = new Set(targets);

  /**
   * 表示する駅名を選ぶ。密集地帯でラベルが重なって読めなくなるので、
   * 優先度の高い駅から順に置いていき、既に置いたラベルと重なるものは省く。
   */
  const visibleLabels = useMemo(() => {
    const priority = (id: StationId, tier: Tier): number => {
      if (targetSet.has(id)) return 0;
      if (id === focusStationId) return 1;
      if (tier === 'ltd') return 2;
      if (tier === 'express') return 3;
      return 4;
    };
    // ズームアウト時は下位の種別を出さない。
    const maxPriority =
      view.w > fullBox.w * 0.7 ? 2 : view.w > fullBox.w * 0.35 ? 3 : 4;

    const candidates = Object.values(data.stations)
      .map((station) => ({ station, tier: tiers.get(station.id) ?? ('local' as Tier) }))
      .map((x) => ({ ...x, priority: priority(x.station.id, x.tier) }))
      .filter((x) => x.priority <= maxPriority)
      .sort((a, b) => a.priority - b.priority);

    const placed: { x1: number; y1: number; x2: number; y2: number }[] = [];
    const shown = new Set<StationId>();

    for (const { station, priority: pr } of candidates) {
      const p = points.get(station.id);
      if (!p) continue;
      // 画面外は判定も描画もしない。
      if (
        p.x < view.x - fontSize * 6 ||
        p.x > view.x + view.w + fontSize * 6 ||
        p.y < view.y - fontSize * 3 ||
        p.y > view.y + view.h + fontSize * 3
      ) {
        continue;
      }
      const size = pr === 0 ? fontSize * 1.15 : fontSize;
      const box = {
        x1: p.x + unit * 1.3,
        y1: p.y - unit * 1.1 - size,
        x2: p.x + unit * 1.3 + station.name.length * size,
        y2: p.y - unit * 1.1 + size * 0.25,
      };
      const overlaps = placed.some(
        (q) => box.x1 < q.x2 && box.x2 > q.x1 && box.y1 < q.y2 && box.y2 > q.y1,
      );
      if (overlaps) continue;
      placed.push(box);
      shown.add(station.id);
    }
    return shown;
  }, [data, points, tiers, view, fullBox.w, fontSize, unit, focusStationId, targets]);

  return (
    <div className="map">
      <svg
        ref={svgRef}
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        {/* 路線 */}
        {data.lines.map((line) => (
          <polyline
            key={line.id}
            points={line.stations
              .map((id) => points.get(id))
              .filter((p): p is { x: number; y: number } => !!p)
              .map((p) => `${p.x},${p.y}`)
              .join(' ')}
            fill="none"
            stroke={line.color}
            strokeWidth={unit * 0.75}
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity={0.85}
          />
        ))}

        {/* 駅 */}
        {Object.values(data.stations).map((station) => {
          const p = points.get(station.id);
          if (!p) return null;
          const tier = tiers.get(station.id) ?? 'local';
          const r = tier === 'ltd' ? unit * 0.95 : tier === 'express' ? unit * 0.7 : unit * 0.5;
          const fill = tier === 'ltd' ? '#e2e8f0' : tier === 'express' ? '#94a3b8' : '#64748b';
          return (
            <circle
              key={station.id}
              cx={p.x}
              cy={p.y}
              r={r}
              fill={fill}
              stroke="#0b1220"
              strokeWidth={unit * 0.18}
            />
          );
        })}

        {/* 到達可能駅のハイライトとタップ領域 */}
        {targets.map((id) => {
          const p = points.get(id);
          if (!p) return null;
          return (
            <g key={`t-${id}`} onClick={() => onSelect?.(id)} style={{ cursor: 'pointer' }}>
              <circle
                className="target-ring"
                cx={p.x}
                cy={p.y}
                r={unit * 2}
                fill="none"
                stroke="#38bdf8"
                strokeWidth={unit * 0.4}
              />
              <circle cx={p.x} cy={p.y} r={unit * 4} fill="transparent" />
            </g>
          );
        })}

        {/* 駅名 */}
        {Object.values(data.stations).map((station) => {
          const p = points.get(station.id);
          if (!p || !visibleLabels.has(station.id)) return null;
          const target = targetSet.has(station.id);
          return (
            <text
              key={`l-${station.id}`}
              className={target ? 'station-label station-label--target' : 'station-label'}
              x={p.x + unit * 1.3}
              y={p.y - unit * 1.1}
              fontSize={target ? fontSize * 1.15 : fontSize}
            >
              {station.name}
            </text>
          );
        })}

        {/* プレイヤーのコマ */}
        {players.map((player, i) => {
          const id =
            animating && animating.playerIndex === player.index
              ? animating.stationId
              : player.stationId;
          if (!id) return null;
          const p = points.get(id);
          if (!p) return null;
          // 同じ駅に複数いても重ならないよう少しずらす。
          const angle = (i / Math.max(players.length, 1)) * Math.PI * 2;
          const offset = players.length > 1 ? unit * 1.5 : 0;
          return (
            <circle
              key={`p-${player.index}`}
              cx={p.x + Math.cos(angle) * offset}
              cy={p.y + Math.sin(angle) * offset}
              r={unit * 1.5}
              fill={player.color}
              stroke="#fff"
              strokeWidth={unit * 0.35}
              style={{ transition: 'cx 0.14s linear, cy 0.14s linear' }}
            />
          );
        })}
      </svg>

      <div className="map__legend">● 特急停車駅　· 普通のみ</div>

      <div className="map__controls">
        <button
          type="button"
          className="map__btn"
          onClick={() => {
            setFollowFocus(false);
            setView(fullBox);
          }}
          aria-label="全体を表示"
        >
          ⛶
        </button>
        <button
          type="button"
          className="map__btn"
          onClick={() => {
            setFollowFocus(true);
            focusView();
          }}
          aria-label="現在地へ"
        >
          ◎
        </button>
      </div>
    </div>
  );
}
