/**
 * 路線・駅・産業のデータスキーマ。
 * 仕様書 docs/DESIGN.md 4.1 に対応する。
 */

export type StationId = string; // 例: "matsuyama"
export type LineId = string; // 例: "yosan"
export type IndustryId = string; // 例: "matsuyama-tourism"
export type CategoryId = string; // 例: "mikan"

/**
 * 列車種別。実際の列車名が「区間快速」「通勤特急」等でも急行・特急に統一する。
 * 新幹線だけは在来線と別の線路を走り飛距離が桁違いなので、独立した種別として扱う。
 */
export type TrainType = 'local' | 'express' | 'ltd' | 'shinkansen';

export const TRAIN_TYPES: readonly TrainType[] = [
  'local',
  'express',
  'ltd',
  'shinkansen',
] as const;

/** 在来線の種別。UI で常に並べるのはこの3つ。 */
export const CONVENTIONAL_TRAIN_TYPES: readonly TrainType[] = [
  'local',
  'express',
  'ltd',
] as const;

export const TRAIN_TYPE_LABEL: Record<TrainType, string> = {
  local: '普通',
  express: '急行',
  ltd: '特急',
  shinkansen: '新幹線',
};

/** 交通費の種別係数（仕様書 2.2）。 */
export const FARE_COEFFICIENT: Record<TrainType, number> = {
  local: 1.0,
  express: 1.3,
  ltd: 2.2,
  shinkansen: 3.0,
};

/** 産業の分類。1=第一次, 2=第二次, 3=第三次。 */
export type Sector = 1 | 2 | 3;

export const SECTOR_LABEL: Record<Sector, string> = {
  1: '第一次産業',
  2: '第二次産業',
  3: '第三次産業',
};

export interface Station {
  id: StationId;
  /** 表示名（例: "松山"）。 */
  name: string;
  /** 読み。同名駅の区別や検索に使う。 */
  kana: string;
  /** 都道府県（例: "愛媛県"）。 */
  pref: string;
  lat: number;
  lon: number;
  /** 1〜3個。最低1個は必須。 */
  industries: IndustryId[];
}

export interface Line {
  id: LineId;
  /** 例: "予讃線"。 */
  name: string;
  /** 例: "JR四国"。 */
  operator: string;
  /** 地図上の路線色。 */
  color: string;
  /** 起点→終点の順に並べた全収録駅。隣接関係の定義元。 */
  stations: StationId[];
  /**
   * 新幹線の路線か。新幹線には在来線の普通・急行・特急は走らないので、
   * 「普通列車は全駅に停車する」といった在来線の前提から外して扱う。
   */
  isShinkansen?: boolean;
  /**
   * 環状線か。true のとき、stations の末尾と先頭も隣接しているものとして繋ぐ。
   * 配列に同じ駅を二度書くと路線内の重複チェックに掛かるため、フラグで表す。
   */
  isLoop?: boolean;
  /**
   * 種別ごとの停車駅。stations の部分集合であり、同じ順序を保つ。
   * 同一路線に複数の優等列車が走る場合は「どれか1本でも停まる駅」の和集合とする。
   */
  stops: Record<TrainType, StationId[]>;
  /**
   * 隣接駅間の営業キロ。長さは stations.length - 1。
   * 省略時は緯度経度からの大円距離 × 1.15 で近似する。
   */
  distancesKm?: number[];
}

/** 全国的に有名な産業だけが持つ知名度情報。 */
export interface Fame {
  categoryId: CategoryId;
  /** カテゴリ内の全国順位。1〜3 が「全国ベスト3」の判定対象。 */
  rank: number;
  /** 知名度点。同点処理と優勝判定のタイブレークに使う。 */
  score: number;
}

export interface Industry {
  id: IndustryId;
  /** 例: "みかん"。 */
  name: string;
  sector: Sector;
  /** 産業規模。実態準拠で、利益率とは人為的な相関を付けない。 */
  scale: number;
  /** 利益率 %。実態準拠。 */
  profitRate: number;
  /** 全国区産業のみ設定。 */
  fame?: Fame;
}

/**
 * 全国区の産業カテゴリ。
 *
 * 「全国ベスト3」の判定は Industry.fame.rank <= 3 で行い、このカテゴリは
 * 名称とランキングの表示に使う。トップ3の産地は収録範囲外にあることも多いため
 * （例: MVP は四国のみなので、お茶の1〜3位はいずれも範囲外）、
 * 産業IDではなく表示用のラベルで保持する。
 */
export interface FameCategory {
  id: CategoryId;
  /** 例: "みかん"。 */
  name: string;
  /** 全国1〜3位の産地名。UI の豆知識表示に使う。 */
  top3Labels: [string, string, string];
}

/** ゲームが扱うデータセット一式。 */
export interface GameData {
  stations: Record<StationId, Station>;
  lines: Line[];
  industries: Record<IndustryId, Industry>;
  fameCategories: FameCategory[];
  /** 開始駅として選べる駅。 */
  startStationIds: StationId[];
}
