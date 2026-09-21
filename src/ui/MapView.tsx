/**
 * 日本地図の上に路線図を重ねた盤面（仕様書 6.1 / 決定13）。
 *
 * 投影は Web メルカトル。駅も海岸線も同じ関数で変換するので、
 * 路線と陸地が実際の位置関係どおりに重なる。
 * 駅の大きさは停車する最上位の種別を表し、「この駅は特急が停まるか」が
 * 到達駅を選ぶときの判断材料として一目で分かるようにしてある。
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  JAPAN_GEO_ATTRIBUTION,
  loadJapanGeo,
  ringsOf,
  type JapanGeo,
} from '../data/geo';
import type { GameData, StationId } from '../data/types';
import type { Player } from '../engine/types';

/**
 * Web メルカトル。経度1度がちょうど 1000 単位になるようスケールを取る。
 * 緯度が上がるほど縦に伸びるのが正しい姿で、これにより
 * 海岸線 GeoJSON と駅の座標がそのまま重なる。
 */
const DEGREE = 1000;
const R = DEGREE / (Math.PI / 180);

export function project(lat: number, lon: number): { x: number; y: number } {
  return {
    x: lon * DEGREE,
    y: -R * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)),
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
type Tier = 'local' | 'express' | 'ltd' | 'shinkansen';

const TIER_RANK: Record<Tier, number> = { local: 0, express: 1, ltd: 2, shinkansen: 3 };

function buildTiers(data: GameData): Map<StationId, Tier> {
  const tiers = new Map<StationId, Tier>();
  const raise = (id: StationId, tier: Tier) => {
    const current = tiers.get(id);
    if (!current || TIER_RANK[tier] > TIER_RANK[current]) tiers.set(id, tier);
  };
  for (const line of data.lines) {
    for (const id of line.stops.local) raise(id, 'local');
    for (const id of line.stops.express) raise(id, 'express');
    for (const id of line.stops.ltd) raise(id, 'ltd');
    for (const id of line.stops.shinkansen) raise(id, 'shinkansen');
  }
  return tiers;
}

/** 都道府県ポリゴンを SVG の path に変換する。ビューが変わっても作り直さない。 */
interface PrefShape {
  name: string;
  d: string;
  cx: number;
  cy: number;
}

function buildPrefShapes(geo: JapanGeo): PrefShape[] {
  return geo.features.map((feature) => {
    let d = '';
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const ring of ringsOf(feature)) {
      ring.forEach(([lon, lat], i) => {
        const p = project(lat, lon);
        d += `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      });
      d += 'Z';
    }

    return {
      name: feature.properties.name,
      d,
      cx: (minX + maxX) / 2,
      cy: (minY + maxY) / 2,
    };
  });
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
  /**
   * 全駅が入る範囲。駅名は点の右に描くので、端の駅のラベルがはみ出さないよう
   * 範囲に比例した余白を取る。
   */
  const fullBox = useMemo(() => {
    const all = [...points.values()];
    const bare = boxOf(all, 0);
    return boxOf(all, Math.max(40, Math.max(bare.w, bare.h) * 0.05));
  }, [points]);

  // 地図は無くてもゲームは成立するので、非同期に読み込んで届いたら描く。
  const [prefectures, setPrefectures] = useState<PrefShape[] | null>(null);
  useEffect(() => {
    let alive = true;
    loadJapanGeo()
      .then((geo) => {
        if (alive) setPrefectures(buildPrefShapes(geo));
      })
      .catch(() => {
        // 読み込めなくても路線図だけで遊べる。
      });
    return () => {
      alive = false;
    };
  }, []);

  const [view, setView] = useState<Box>(fullBox);
  const [followFocus, setFollowFocus] = useState(true);
  const svgRef = useRef<SVGSVGElement>(null);

  /**
   * 収めたい範囲を、画面と同じ縦横比の viewBox に広げる。
   * SVG は viewBox 全体が収まるように縮小するので、比率を合わせておかないと
   * 短い辺に合わせて縮み、長い辺の端が画面の外に出てしまう。
   */
  const fitToScreen = useCallback((box: Box, minSize: number): Box => {
    const rect = svgRef.current?.getBoundingClientRect();
    const aspect = rect && rect.height > 0 ? rect.width / rect.height : 1;
    let w = Math.max(box.w, minSize);
    let h = Math.max(box.h, minSize);
    if (w / h < aspect) w = h * aspect;
    else h = w / aspect;
    return { x: box.x + box.w / 2 - w / 2, y: box.y + box.h / 2 - h / 2, w, h };
  }, []);

  /** 現在地と到達可能駅がすべて収まるように寄せる。 */
  const focusView = useCallback(() => {
    const ids = [focusStationId, ...targets].filter((x): x is StationId => x !== null);
    const pts = ids.map((id) => points.get(id)).filter((p): p is { x: number; y: number } => !!p);
    if (pts.length === 0) return;
    const bare = boxOf(pts, 0);
    // 余白は対象範囲に比例させる。端の駅がラベルごと画面に入るだけの幅を取る。
    const pad = Math.max(60, Math.max(bare.w, bare.h) * 0.18);
    // 狭すぎると拡大しすぎて周辺の路線が見えなくなるので下限を設ける。
    // 経度1度が 1000 単位なので、300 単位で 30km 弱の視野になる。
    setView(fitToScreen(boxOf(pts, pad), 300));
  }, [focusStationId, targets, points, fitToScreen]);

  useEffect(() => {
    if (followFocus) focusView();
  }, [followFocus, focusView]);

  /**
   * 出目が確定して行き先の候補が出たら、手動でパン・ズームした後でも追従を再開する。
   * 候補がすべて画面に入っていないと、どこへ行けるのかを見て選べないため。
   * 配列は毎レンダー作り直されるので、中身を繋いだ文字列で変化を見る。
   */
  const targetsKey = targets.join(',');
  useEffect(() => {
    if (targetsKey.length > 0) setFollowFocus(true);
  }, [targetsKey]);

  // ── パンとピンチズーム ──
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ view: Box; dist: number } | null>(null);

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
        gesture.current = { view, dist: Math.hypot(a.x - b.x, a.y - b.y) };
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
      const w = Math.min(Math.max(base.w * ratio, 25), fullBox.w * 6);
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
      const w = Math.min(Math.max(v.w * ratio, 25), fullBox.w * 6);
      const h = (w / v.w) * v.h;
      return { x: v.x + (v.w - w) / 2, y: v.y + (v.h - h) / 2, w, h };
    });
  };

  // 表示スケールに応じた大きさ。ズームしても見た目が一定になる。
  const unit = view.w / 100;
  const fontSize = unit * 2.6;
  const targetSet = useMemo(() => new Set(targets), [targets]);

  /**
   * 表示する駅名を選ぶ。密集地帯でラベルが重なって読めなくなるので、
   * 優先度の高い駅から順に置いていき、既に置いたラベルと重なるものは省く。
   */
  const visibleLabels = useMemo(() => {
    const priority = (id: StationId, tier: Tier): number => {
      if (targetSet.has(id)) return 0;
      if (id === focusStationId) return 1;
      if (tier === 'shinkansen') return 2;
      if (tier === 'ltd') return 3;
      if (tier === 'express') return 4;
      return 5;
    };
    // ズームアウト時は下位の種別を出さない。
    const maxPriority =
      view.w > fullBox.w * 0.7 ? 3 : view.w > fullBox.w * 0.35 ? 4 : 5;

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
      // 右端に近い駅は、ラベルを点の左側に出して画面からはみ出さないようにする。
      const flip = p.x > view.x + view.w * 0.78;
      const width = station.name.length * size;
      const left = flip ? p.x - unit * 1.3 - width : p.x + unit * 1.3;
      const box = {
        x1: left,
        y1: p.y - unit * 1.1 - size,
        x2: left + width,
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
  }, [data, points, tiers, view, fullBox.w, fontSize, unit, focusStationId, targetSet]);

  // 県名は広域表示のときだけ。駅名と競合させない。
  const showPrefNames = view.w > fullBox.w * 0.8;

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
        {/* 陸地。路線より下に敷く。 */}
        {prefectures?.map((pref) => (
          <path
            key={pref.name}
            d={pref.d}
            fill="var(--map-land)"
            stroke="var(--map-border)"
            strokeWidth={unit * 0.12}
            strokeLinejoin="round"
          />
        ))}

        {/* 県名 */}
        {showPrefNames &&
          prefectures?.map((pref) => (
            <text
              key={`pn-${pref.name}`}
              className="pref-label"
              x={pref.cx}
              y={pref.cy}
              fontSize={fontSize * 1.4}
              textAnchor="middle"
            >
              {pref.name}
            </text>
          ))}

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
            strokeWidth={unit * 0.8}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}

        {/* 駅 */}
        {Object.values(data.stations).map((station) => {
          const p = points.get(station.id);
          if (!p) return null;
          const tier = tiers.get(station.id) ?? 'local';
          const r =
            tier === 'shinkansen'
              ? unit * 1.25
              : tier === 'ltd'
                ? unit * 0.95
                : tier === 'express'
                  ? unit * 0.7
                  : unit * 0.5;
          const fill =
            tier === 'shinkansen'
              ? 'var(--md-sys-color-tertiary)'
              : tier === 'ltd'
                ? 'var(--md-sys-color-on-surface)'
                : tier === 'express'
                  ? 'var(--md-sys-color-on-surface-variant)'
                  : 'var(--md-sys-color-outline)';
          return (
            <circle
              key={station.id}
              cx={p.x}
              cy={p.y}
              r={r}
              fill={fill}
              stroke="var(--map-land)"
              strokeWidth={tier === 'shinkansen' ? unit * 0.3 : unit * 0.18}
            />
          );
        })}

        {/* 到達可能駅のハイライトとタップ領域 */}
        {targets.map((id) => {
          const p = points.get(id);
          if (!p) return null;
          return (
            <g key={`t-${id}`} onClick={() => onSelect?.(id)} style={{ cursor: 'pointer' }}>
              {/* 外側は脈動させて目を引く。 */}
              <circle
                className="target-ring"
                cx={p.x}
                cy={p.y}
                r={unit * 2.4}
                fill="none"
                stroke="var(--md-sys-color-primary)"
                strokeWidth={unit * 0.5}
              />
              {/* 内側は常に不透明。脈動が薄くなる瞬間も位置を見失わせない。 */}
              <circle
                cx={p.x}
                cy={p.y}
                r={unit * 1.6}
                fill="none"
                stroke="var(--md-sys-color-primary)"
                strokeWidth={unit * 0.55}
              />
              <circle
                cx={p.x}
                cy={p.y}
                r={unit * 0.85}
                fill="var(--md-sys-color-primary)"
                stroke="var(--md-sys-color-on-primary)"
                strokeWidth={unit * 0.2}
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
          const flip = p.x > view.x + view.w * 0.78;
          return (
            <text
              key={`l-${station.id}`}
              className={target ? 'station-label station-label--target' : 'station-label'}
              x={flip ? p.x - unit * 1.3 : p.x + unit * 1.3}
              y={p.y - unit * 1.1}
              textAnchor={flip ? 'end' : 'start'}
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
              stroke="var(--md-sys-color-surface)"
              strokeWidth={unit * 0.4}
              style={{ transition: 'cx 0.14s linear, cy 0.14s linear' }}
            />
          );
        })}
      </svg>

      <div className="map__legend">
        <span className="map__legend-shinkansen">●&nbsp;新幹線</span>
        <span>●&nbsp;特急</span>
        <span>·&nbsp;普通のみ</span>
      </div>

      <div className="map__attribution">{JAPAN_GEO_ATTRIBUTION}</div>

      <div className="map__controls">
        <button
          type="button"
          className="md-icon-button md-ripple"
          onClick={() => {
            setFollowFocus(false);
            setView(fitToScreen(fullBox, 300));
          }}
          aria-label="全体を表示"
        >
          ⛶
        </button>
        <button
          type="button"
          className="md-icon-button md-ripple"
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
