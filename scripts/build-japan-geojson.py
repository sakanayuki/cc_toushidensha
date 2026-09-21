#!/usr/bin/env python3
"""
日本地図の GeoJSON を、ゲームの背景として使えるサイズまで簡略化する。

元データ: 地球地図日本（国土地理院）由来の都道府県ポリゴン
          https://github.com/dataofjapan/land の japan.geojson
出典表記が利用条件なので、README とアプリ内のクレジットに明記している。

    python3 scripts/build-japan-geojson.py <入力 japan.geojson> <出力 japan.json>

元データは 13MB / 8万点あり、そのままでは配信できない。
ここでは (1) 極小の島を落とす (2) Douglas-Peucker で頂点を間引く
(3) 座標を丸める、の3段階で 2%程度まで縮める。
ゲームの地図は全国表示でも画面幅 400px 程度なので、
数百メートル単位の海岸線の凹凸は描画しても見えない。
"""

import json
import math
import sys

# 頂点の間引き許容誤差（度）。約 300m。
EPSILON = 0.003
# これより小さいリングは落とす（平方度）。約 2km 四方。
MIN_AREA = 0.0004
# 座標の丸め桁数。4桁で約 10m 精度。
PRECISION = 4


def perpendicular_distance(p, a, b):
    (px, py), (ax, ay), (bx, by) = p, a, b
    dx, dy = bx - ax, by - ay
    if dx == 0 and dy == 0:
        return math.hypot(px - ax, py - ay)
    t = ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)
    t = max(0.0, min(1.0, t))
    return math.hypot(px - (ax + t * dx), py - (ay + t * dy))


def rdp(points, epsilon):
    """Douglas-Peucker。再帰ではなくスタックで回す（深い海岸線で落ちないように）。"""
    if len(points) < 3:
        return points
    keep = [False] * len(points)
    keep[0] = keep[-1] = True
    stack = [(0, len(points) - 1)]
    while stack:
        start, end = stack.pop()
        if end - start < 2:
            continue
        far_index, far_dist = -1, 0.0
        for i in range(start + 1, end):
            d = perpendicular_distance(points[i], points[start], points[end])
            if d > far_dist:
                far_index, far_dist = i, d
        if far_dist > epsilon:
            keep[far_index] = True
            stack.append((start, far_index))
            stack.append((far_index, end))
    return [p for p, k in zip(points, keep) if k]


def ring_area(ring):
    """符号なしの多角形面積（平方度）。小島の判定に使う。"""
    total = 0.0
    for i in range(len(ring) - 1):
        x1, y1 = ring[i]
        x2, y2 = ring[i + 1]
        total += x1 * y2 - x2 * y1
    return abs(total) / 2


def simplify_ring(ring):
    if ring_area(ring) < MIN_AREA:
        return None
    simplified = rdp(ring, EPSILON)
    # 閉じたリングとして成立しなくなったら捨てる。
    if len(simplified) < 4:
        return None
    if simplified[0] != simplified[-1]:
        simplified.append(simplified[0])
    return [[round(x, PRECISION), round(y, PRECISION)] for x, y in simplified]


def simplify_polygon(polygon):
    rings = [simplify_ring(r) for r in polygon]
    # 外周が消えたらそのポリゴンごと落とす。
    if not rings or rings[0] is None:
        return None
    return [r for r in rings if r is not None]


def simplify_geometry(geometry):
    kind = geometry["type"]
    if kind == "Polygon":
        polygon = simplify_polygon(geometry["coordinates"])
        return {"type": "Polygon", "coordinates": polygon} if polygon else None
    if kind == "MultiPolygon":
        polygons = [simplify_polygon(p) for p in geometry["coordinates"]]
        polygons = [p for p in polygons if p]
        return {"type": "MultiPolygon", "coordinates": polygons} if polygons else None
    return None


def count_points(geometry):
    kind, coords = geometry["type"], geometry["coordinates"]
    if kind == "Polygon":
        return sum(len(r) for r in coords)
    if kind == "MultiPolygon":
        return sum(len(r) for p in coords for r in p)
    return 0


def main():
    src, dest = sys.argv[1], sys.argv[2]
    data = json.load(open(src, encoding="utf-8"))

    features = []
    before = after = 0
    for feature in data["features"]:
        before += count_points(feature["geometry"])
        geometry = simplify_geometry(feature["geometry"])
        if not geometry:
            continue
        after += count_points(geometry)
        features.append(
            {
                "type": "Feature",
                # 県名だけ残す。地図上のラベルと、将来の地域判定に使う。
                "properties": {"name": feature["properties"]["nam_ja"]},
                "geometry": geometry,
            }
        )

    out = {"type": "FeatureCollection", "features": features}
    with open(dest, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))

    print(f"prefectures: {len(features)}")
    print(f"points: {before} -> {after} ({after / before:.1%})")


if __name__ == "__main__":
    main()
