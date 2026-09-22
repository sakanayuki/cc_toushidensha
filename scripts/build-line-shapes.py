#!/usr/bin/env python3
"""
路線の実際の線形（ポリライン）を、描画用のデータに落とす。

元データ: 駅データベース https://github.com/Seo-4d696b75/station_database
          （CC BY 4.0 / 出典: 駅データ.jp・国土数値情報）

    python3 scripts/build-line-shapes.py src/data/geo/lineShapes.json

停車駅を直線で結ぶだけだと、駅間が長い路線が実際の経路から大きく外れる。
とくに山陽新幹線は相生〜岡山・三原〜広島が数十キロ空いているので、
直線で結ぶと瀬戸内海を横切ってしまう。

収録しているのは路線の一部だけなので、
「本作の駅に最も近いポリラインの頂点」を拾い、その区間だけを切り出す。
"""

import json
import math
import re
import sys
import urllib.request

RAW = 'https://raw.githubusercontent.com/Seo-4d696b75/station_database/main/out/main'

# 本作の路線 → 駅データベース側の路線コード。line.json の名前で引く。
LINE_MATCH = {
    'setoohashi': ['JR宇野線', 'JR本四備讃線(瀬戸大橋線)'],
    'yosan': ['JR予讃線', 'JR予讃・内子線'],
    'dosan': ['JR土讃線'],
    'kotoku': ['JR高徳線'],
    'naruto': ['JR鳴門線'],
    'sanyo': ['JR山陽本線(岡山～三原)', 'JR山陽本線(三原～岩国)'],
    'sanyo-east': ['JR山陽本線(神戸線)(神戸～姫路)', 'JR山陽本線(姫路～岡山)'],
    'tokaido': ['JR東海道本線(神戸線)(大阪～神戸)', 'JR東海道本線(京都線)(京都～大阪)'],
    'osaka-loop': ['JR大阪環状線'],
    'hankyu-kobe': ['阪急神戸本線'],
    'hanshin': ['阪神本線'],
    'hanwa': ['JR阪和線(天王寺～和歌山)'],
    'nankai': ['南海本線'],
    'sanyo-shinkansen': ['山陽新幹線'],
    'midosuji': ['OsakaMetro御堂筋線'],
    'hankyu-kyoto': ['阪急京都本線'],
    'hankyu-senri': ['阪急京都本線', '阪急千里線'],
    'kinokuni': ['JR紀勢本線(きのくに線)(新宮～和歌山)', 'JR紀勢本線(和歌山～和歌山市)'],
}


def fetch(url):
    with urllib.request.urlopen(url, timeout=60) as res:
        return json.load(res)


def parse_stations(path):
    """stations.ts から id と緯度経度を読む。TS を実行せずに済ませる。"""
    text = open(path, encoding='utf-8').read()
    pattern = re.compile(
        r"st\('([a-z0-9-]+)',\s*'[^']*',\s*'[^']*',\s*'[^']*',\s*(-?\d+\.\d+),\s*(-?\d+\.\d+)"
    )
    return {m[1]: (float(m[2]), float(m[3])) for m in pattern.finditer(text)}


def parse_line_stations(path):
    """lines.ts から路線ごとの stations 配列を読む。"""
    text = open(path, encoding='utf-8').read()
    out = {}
    for block in re.finditer(r"id: '([a-z0-9-]+)',(.*?)\n  \},\n", text, re.S):
        line_id, body = block.group(1), block.group(2)
        m = re.search(r"\n    stations: \[(.*?)\],\n", body, re.S)
        if m:
            out[line_id] = re.findall(r"'([a-z0-9-]+)'", m.group(1))
    return out


def chains_of(geo):
    """FeatureCollection から LineString の座標列を取り出す。"""
    out = []
    for feature in geo['features']:
        geometry = feature['geometry']
        if geometry['type'] == 'LineString':
            out.append([(lat, lon) for lon, lat in geometry['coordinates']])
        elif geometry['type'] == 'MultiLineString':
            for part in geometry['coordinates']:
                out.append([(lat, lon) for lon, lat in part])
    return out


def nearest(chains, point):
    """点にいちばん近い頂点を (チェーン番号, 頂点番号, 距離) で返す。"""
    lat, lon = point
    best = (None, None, float('inf'))
    for ci, chain in enumerate(chains):
        for vi, (vlat, vlon) in enumerate(chain):
            d = (vlat - lat) ** 2 + ((vlon - lon) * 0.82) ** 2
            if d < best[2]:
                best = (ci, vi, d)
    return best


def perpendicular_distance(p, a, b):
    (py, px), (ay, ax), (by, bx) = p, a, b
    dy, dx = by - ay, bx - ax
    if dy == 0 and dx == 0:
        return math.hypot(py - ay, px - ax)
    t = max(0.0, min(1.0, ((py - ay) * dy + (px - ax) * dx) / (dy * dy + dx * dx)))
    return math.hypot(py - (ay + t * dy), px - (ax + t * dx))


def simplify(points, tolerance):
    """Douglas-Peucker。頂点を間引いても見た目が変わらない範囲に落とす。"""
    if len(points) < 3:
        return list(points)
    worst, index = 0.0, 0
    for i in range(1, len(points) - 1):
        d = perpendicular_distance(points[i], points[0], points[-1])
        if d > worst:
            worst, index = d, i
    if worst <= tolerance:
        return [points[0], points[-1]]
    left = simplify(points[: index + 1], tolerance)
    right = simplify(points[index:], tolerance)
    return left[:-1] + right


def build(line_id, line_geo, station_ids, stations, tolerance, loop=False):
    chains = chains_of(line_geo)
    anchors = []
    for sid in station_ids:
        if sid not in stations:
            continue
        ci, vi, d2 = nearest(chains, stations[sid])
        anchors.append((sid, ci, vi, math.sqrt(d2) * 111))

    # 環状線は末尾から先頭に戻る区間も描く。
    pairs = list(zip(anchors, anchors[1:]))
    if loop and len(anchors) >= 3:
        pairs.append((anchors[-1], anchors[0]))

    shape, straight = [], []
    for (sid_a, ca, va, _), (sid_b, cb, vb, _) in pairs:
        if ca == cb and va != vb:
            lo, hi = min(va, vb), max(va, vb)
            segment = chains[ca][lo : hi + 1]
            if vb < va:
                segment = segment[::-1]
        else:
            # チェーンが繋がっていない区間は直線で結ぶしかない。
            segment = [stations[sid_a], stations[sid_b]]
            straight.append(f'{sid_a}→{sid_b}')
        if shape and segment and shape[-1] == segment[0]:
            segment = segment[1:]
        shape.extend(segment)

    simplified = simplify(shape, tolerance)
    far = max(anchors, key=lambda a: a[3], default=(None, 0, 0, 0))
    print(
        f'  {line_id:18} {len(shape):6} → {len(simplified):5} 点'
        f'  駅とのずれ最大 {far[3]:.2f}km ({far[0]})'
        + (f'  直線補間 {len(straight)}区間: {" ".join(straight)}' if straight else '')
    )
    return [[round(lat, 5), round(lon, 5)] for lat, lon in simplified]


def main():
    out_path = sys.argv[1] if len(sys.argv) > 1 else 'src/data/geo/lineShapes.json'
    tolerance = 0.0004  # 度。約45m。市街地の縮尺でも直線に見えない程度。

    print('路線一覧を取得…')
    ref_lines = fetch(f'{RAW}/line.json')
    stations = parse_stations('src/data/stations.ts')
    line_stations = parse_line_stations('src/data/lines.ts')

    shapes = {}
    for line_id, names in LINE_MATCH.items():
        codes = [l['code'] for l in ref_lines if l['name'] in names]
        if len(codes) != len(names):
            raise SystemExit(f'路線名が引けない: {line_id} {names}')
        merged = {'features': []}
        for code in codes:
            merged['features'].extend(fetch(f'{RAW}/polyline/{code}.json')['features'])
        shapes[line_id] = build(
            line_id,
            merged,
            line_stations[line_id],
            stations,
            tolerance,
            loop=line_id == 'osaka-loop',
        )

    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(shapes, f, separators=(',', ':'), ensure_ascii=False)
    size = sum(len(v) for v in shapes.values())
    print(f'\n{out_path}: {len(shapes)}路線 / {size}点 / {len(json.dumps(shapes)) // 1024}KB')


if __name__ == '__main__':
    main()
