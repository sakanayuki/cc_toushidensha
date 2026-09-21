/**
 * 路線データ（フェーズ1: 四国＋岡山）。
 *
 * stops は種別ごとの停車駅。同一路線に複数の優等列車が走る場合は
 * 「どれか1本でも停まる駅」の和集合として1つのパターンに集約する
 * （仕様書 4.1、ご指示の「区間快速→急行」「通勤特急→特急」の名称統一の延長）。
 *
 * 距離は緯度経度からの大円距離 × 1.15 で近似する（distancesKm は未設定）。
 * 路線色は JR 四国のラインカラーに準じる。
 */

import type { Line } from './types';

export const LINES: Line[] = [
  {
    id: 'setoohashi',
    name: '瀬戸大橋線',
    operator: 'JR西日本 / JR四国',
    color: '#0891b2',
    stations: [
      'okayama', 'omoto', 'bizennishiichi', 'senoo', 'bicchumishima', 'hayashima',
      'kugubara', 'chayamachi', 'uematsu', 'kimi', 'kaminocho', 'kojima', 'utazu',
    ],
    stops: {
      local: [
        'okayama', 'omoto', 'bizennishiichi', 'senoo', 'bicchumishima', 'hayashima',
        'kugubara', 'chayamachi', 'uematsu', 'kimi', 'kaminocho', 'kojima', 'utazu',
      ],
      // 快速マリンライナー。実際は宇多津を短絡線で通過して坂出へ向かうが、
      // 本データでは路線の接続を保つため宇多津を停車駅として扱う。
      express: ['okayama', 'senoo', 'hayashima', 'chayamachi', 'kojima', 'utazu'],
      // しおかぜ・南風・うずしお（岡山編成）
      ltd: ['okayama', 'kojima', 'utazu'],
    },
  },
  {
    id: 'yosan',
    name: '予讃線',
    operator: 'JR四国',
    color: '#f59e0b',
    stations: [
      'takamatsu', 'kozai', 'kinashi', 'hashioka', 'kokubu', 'sanukifuchu', 'kamogawa',
      'yasoba', 'sakaide', 'utazu', 'marugame', 'sanukishioya', 'tadotsu', 'kaiganji',
      'takuma', 'mino', 'takase', 'hijidai', 'motoyama', 'kanonji', 'toyohama', 'minoura',
      'kawanoe', 'iyomishima', 'iyosangawa', 'akaboshi', 'iyodoi', 'sekigawa', 'takihama',
      'niihama', 'nakahagi', 'iyosaijo', 'ishizuchisan', 'iyohimi', 'iyokomatsu', 'tamanoe',
      'nyugawa', 'iyomiyoshi', 'iyotomita', 'iyosakurai', 'imabari', 'hashihama', 'namikata',
      'onishi', 'iyokameoka', 'kikuma', 'asanami', 'oura', 'awai', 'koyodai', 'iyohojo',
      'yanagihara', 'horie', 'iyowake', 'mitsuhama', 'matsuyama', 'ichitsubo', 'kitaiyo',
      'minamiiyo', 'iyoyokota', 'torinoki', 'iyoshi',
    ],
    stops: {
      local: [
        'takamatsu', 'kozai', 'kinashi', 'hashioka', 'kokubu', 'sanukifuchu', 'kamogawa',
        'yasoba', 'sakaide', 'utazu', 'marugame', 'sanukishioya', 'tadotsu', 'kaiganji',
        'takuma', 'mino', 'takase', 'hijidai', 'motoyama', 'kanonji', 'toyohama', 'minoura',
        'kawanoe', 'iyomishima', 'iyosangawa', 'akaboshi', 'iyodoi', 'sekigawa', 'takihama',
        'niihama', 'nakahagi', 'iyosaijo', 'ishizuchisan', 'iyohimi', 'iyokomatsu', 'tamanoe',
        'nyugawa', 'iyomiyoshi', 'iyotomita', 'iyosakurai', 'imabari', 'hashihama', 'namikata',
        'onishi', 'iyokameoka', 'kikuma', 'asanami', 'oura', 'awai', 'koyodai', 'iyohojo',
        'yanagihara', 'horie', 'iyowake', 'mitsuhama', 'matsuyama', 'ichitsubo', 'kitaiyo',
        'minamiiyo', 'iyoyokota', 'torinoki', 'iyoshi',
      ],
      // 快速マリンライナー（高松〜坂出はノンストップ）＋ 快速サンポート（高松〜観音寺）。
      // 観音寺以西に定期の快速は走っていないため、そこで途切れる。
      express: [
        'takamatsu', 'hashioka', 'kokubu', 'kamogawa', 'sakaide', 'utazu', 'marugame',
        'tadotsu', 'takuma', 'takase', 'kanonji',
      ],
      // しおかぜ・いしづち（松山以南は宇和海が伊予市に停車）
      ltd: [
        'takamatsu', 'sakaide', 'utazu', 'tadotsu', 'takuma', 'kanonji', 'kawanoe',
        'iyomishima', 'niihama', 'iyosaijo', 'nyugawa', 'imabari', 'matsuyama', 'iyoshi',
      ],
    },
  },
  {
    id: 'dosan',
    name: '土讃線',
    operator: 'JR四国',
    color: '#84cc16',
    stations: [
      'tadotsu', 'kanzoji', 'zentsuji', 'kotohira', 'shioiri', 'kurokawa', 'sanukisaida',
      'tsubojiri', 'hashikura', 'tsukuda', 'awaikeda',
    ],
    stops: {
      local: [
        'tadotsu', 'kanzoji', 'zentsuji', 'kotohira', 'shioiri', 'kurokawa', 'sanukisaida',
        'tsubojiri', 'hashikura', 'tsukuda', 'awaikeda',
      ],
      // 快速サンポート（琴平行き）。琴平以南に定期の快速は走っていない。
      express: ['tadotsu', 'kanzoji', 'zentsuji', 'kotohira'],
      // 南風・しまんと
      ltd: ['tadotsu', 'zentsuji', 'kotohira', 'awaikeda'],
    },
  },
  {
    id: 'kotoku',
    name: '高徳線',
    operator: 'JR四国',
    color: '#2563eb',
    stations: [
      'takamatsu', 'showacho', 'ritsuringokenkitaguchi', 'ritsurin', 'kitacho', 'yashima',
      'furutakamatsuminami', 'yakuriguchi', 'sanukimure', 'shido', 'orangetown', 'zoda',
      'kanzaki', 'sanukitsuda', 'tsuruwa', 'nibu', 'sanbonmatsu', 'sanukishiroto', 'hiketa',
      'sanukiaioi', 'awaomiya', 'itano', 'awakawabata', 'bando', 'iketani', 'shozui',
      'yoshinari', 'sako', 'tokushima',
    ],
    stops: {
      local: [
        'takamatsu', 'showacho', 'ritsuringokenkitaguchi', 'ritsurin', 'kitacho', 'yashima',
        'furutakamatsuminami', 'yakuriguchi', 'sanukimure', 'shido', 'orangetown', 'zoda',
        'kanzaki', 'sanukitsuda', 'tsuruwa', 'nibu', 'sanbonmatsu', 'sanukishiroto', 'hiketa',
        'sanukiaioi', 'awaomiya', 'itano', 'awakawabata', 'bando', 'iketani', 'shozui',
        'yoshinari', 'sako', 'tokushima',
      ],
      // 快速（高松〜徳島）
      express: [
        'takamatsu', 'ritsurin', 'yashima', 'shido', 'sanukitsuda', 'sanbonmatsu',
        'sanukishiroto', 'hiketa', 'itano', 'iketani', 'shozui', 'sako', 'tokushima',
      ],
      // うずしお
      ltd: [
        'takamatsu', 'ritsurin', 'shido', 'orangetown', 'sanbonmatsu', 'sanukishiroto',
        'hiketa', 'itano', 'iketani', 'shozui', 'sako', 'tokushima',
      ],
    },
  },
  {
    id: 'naruto',
    name: '鳴門線',
    operator: 'JR四国',
    color: '#9333ea',
    stations: ['iketani', 'awaotani', 'tatemichi', 'kyokaimae', 'konpiramae', 'muya', 'naruto'],
    stops: {
      local: ['iketani', 'awaotani', 'tatemichi', 'kyokaimae', 'konpiramae', 'muya', 'naruto'],
      // 優等列車は走っていない。普通列車でしか入れない行き止まり路線。
      express: [],
      ltd: [],
    },
  },
];
