/**
 * 路線データ（フェーズ1: 四国＋岡山）。
 *
 * stops は種別ごとの停車駅。同一路線に複数の優等列車が走る場合は
 * 「どれか1本でも停まる駅」の和集合として1つのパターンに集約する
 * （仕様書 4.1、ご指示の「区間快速→急行」「通勤特急→特急」の名称統一の延長）。
 *
 * 距離は緯度経度からの大円距離 × 1.15 で近似する（distancesKm は未設定）。
 * 路線色は JR 四国のラインカラーに準じる。
 *
 * 山陽本線（岡山〜広島）には定期の在来線特急が走っていない。
 * この区間を速く移動する手段は新幹線だけで、新幹線が停まる駅も限られる。
 * 「乗れる駅は少ないが、乗れたら一気に飛べる」という関係がそのまま盤面に出る。
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
      shinkansen: [],
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
      shinkansen: [],
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
      shinkansen: [],
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
      shinkansen: [],
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
      shinkansen: [],
    },
  },
  {
    id: 'sanyo',
    name: '山陽本線',
    operator: 'JR西日本',
    color: '#0ea5e9',
    stations: [
      'okayama', 'kitanagase', 'niwase', 'nakasho', 'kurashiki', 'nishiachi', 'shinkurashiki',
      'konko', 'kamogata', 'satosho', 'kasaoka', 'daimon', 'higashifukuyama', 'fukuyama',
      'bingoakasaka', 'matsunaga', 'higashionomichi', 'onomichi', 'itozaki', 'mihara', 'hongo',
      'kochi', 'nyuno', 'shiraichi', 'nishitakaya', 'saijo', 'jike', 'hachihonmatsu', 'seno',
      'nakanohigashi', 'akinakano', 'kaitaichi', 'mukainada', 'tenjingawa', 'hiroshima',
    ],
    stops: {
      local: [
        'okayama', 'kitanagase', 'niwase', 'nakasho', 'kurashiki', 'nishiachi', 'shinkurashiki',
        'konko', 'kamogata', 'satosho', 'kasaoka', 'daimon', 'higashifukuyama', 'fukuyama',
        'bingoakasaka', 'matsunaga', 'higashionomichi', 'onomichi', 'itozaki', 'mihara', 'hongo',
        'kochi', 'nyuno', 'shiraichi', 'nishitakaya', 'saijo', 'jike', 'hachihonmatsu', 'seno',
        'nakanohigashi', 'akinakano', 'kaitaichi', 'mukainada', 'tenjingawa', 'hiroshima',
      ],
      // 快速サンライナー（岡山〜福山）と、広島地区の快速シティライナー（白市〜広島）。
      // 福山〜白市には定期の快速が走らないため、急行のグラフはそこで途切れる。
      // その区間を速く移動したければ新幹線に乗るしかない。
      express: [
        'okayama', 'niwase', 'kurashiki', 'shinkurashiki', 'konko', 'kamogata', 'kasaoka',
        'daimon', 'higashifukuyama', 'fukuyama',
        'shiraichi', 'nishitakaya', 'saijo', 'hachihonmatsu', 'seno', 'kaitaichi', 'hiroshima',
      ],
      // 岡山〜広島に定期の在来線特急は走っていない。
      ltd: [],
      shinkansen: [],
    },
  },
  {
    id: 'sanyo-shinkansen',
    name: '山陽新幹線',
    operator: 'JR西日本',
    color: '#1d4ed8',
    isShinkansen: true,
    // 新尾道・東広島・新神戸は在来線と接続しない新幹線単独駅なので、今回は収録していない。
    stations: [
      'shinosaka', 'nishiakashi', 'himeji', 'aioi', 'okayama', 'shinkurashiki',
      'fukuyama', 'mihara', 'hiroshima',
    ],
    stops: {
      local: [],
      express: [],
      ltd: [],
      // のぞみ・ひかり・こだまの停車駅の和集合。
      shinkansen: [
        'shinosaka', 'nishiakashi', 'himeji', 'aioi', 'okayama', 'shinkurashiki',
        'fukuyama', 'mihara', 'hiroshima',
      ],
    },
  },
  {
    id: 'sanyo-east',
    name: '山陽本線',
    operator: 'JR西日本',
    color: '#0ea5e9',
    // 岡山から東は同じ山陽本線だが、停車パターンが西側と大きく違うので別の路線として持つ。
    // 岡山で接続するのでグラフ上は一本に繋がる。
    stations: [
      'okayama', 'nishigawara', 'higashiokayama', 'jodo', 'seto', 'mandomi', 'kumayama',
      'wake', 'yoshinaga', 'mitsuishi', 'kamigori', 'une', 'aioi', 'tatsuno', 'aboshi',
      'harimakatsuhara', 'agaho', 'himeji', 'gochaku', 'himejibessho', 'sone', 'hoden',
      'kakogawa', 'higashikakogawa', 'tsuchiyama', 'uozumi', 'okubo', 'nishiakashi',
      'akashi', 'asagiri', 'maiko', 'tarumi', 'shioya', 'suma', 'sumakaihinkoen',
      'takatori', 'shinnagata', 'hyogo', 'kobe',
    ],
    stops: {
      local: [
        'okayama', 'nishigawara', 'higashiokayama', 'jodo', 'seto', 'mandomi', 'kumayama',
        'wake', 'yoshinaga', 'mitsuishi', 'kamigori', 'une', 'aioi', 'tatsuno', 'aboshi',
        'harimakatsuhara', 'agaho', 'himeji', 'gochaku', 'himejibessho', 'sone', 'hoden',
        'kakogawa', 'higashikakogawa', 'tsuchiyama', 'uozumi', 'okubo', 'nishiakashi',
        'akashi', 'asagiri', 'maiko', 'tarumi', 'shioya', 'suma', 'sumakaihinkoen',
        'takatori', 'shinnagata', 'hyogo', 'kobe',
      ],
      // 新快速と快速。岡山〜相生に定期の快速は走らないので、急行は相生から東だけ繋がる。
      express: [
        'aioi', 'himeji', 'kakogawa', 'higashikakogawa', 'tsuchiyama', 'nishiakashi',
        'akashi', 'tarumi', 'suma', 'shinnagata', 'hyogo', 'kobe',
      ],
      // スーパーはくと（上郡で智頭急行へ入る）。岡山〜姫路の山陽本線に他の定期特急はない。
      ltd: ['kamigori', 'himeji', 'kobe'],
      shinkansen: [],
    },
  },
  {
    id: 'tokaido',
    name: '東海道本線',
    operator: 'JR西日本',
    color: '#2563eb',
    stations: [
      'kobe', 'motomachi', 'sannomiya', 'nada', 'maya', 'rokkomichi', 'sumiyoshi',
      'settsumotoyama', 'konanyamate', 'ashiya', 'sakurashukugawa', 'nishinomiya',
      'koshienguchi', 'tachibana', 'amagasaki', 'tsukamoto', 'osaka', 'shinosaka',
    ],
    stops: {
      local: [
        'kobe', 'motomachi', 'sannomiya', 'nada', 'maya', 'rokkomichi', 'sumiyoshi',
        'settsumotoyama', 'konanyamate', 'ashiya', 'sakurashukugawa', 'nishinomiya',
        'koshienguchi', 'tachibana', 'amagasaki', 'tsukamoto', 'osaka', 'shinosaka',
      ],
      // 新快速と快速の和集合。
      express: [
        'kobe', 'motomachi', 'sannomiya', 'rokkomichi', 'sumiyoshi', 'ashiya',
        'nishinomiya', 'koshienguchi', 'amagasaki', 'tsukamoto', 'osaka', 'shinosaka',
      ],
      // スーパーはくと・こうのとり・はまかぜなどの特急。
      ltd: ['kobe', 'sannomiya', 'osaka', 'shinosaka'],
      shinkansen: [],
    },
  },
  {
    id: 'osaka-loop',
    name: '大阪環状線',
    operator: 'JR西日本',
    color: '#dc2626',
    isLoop: true,
    // 外回りの順。末尾の福島から先頭の大阪へ戻って一周する。
    stations: [
      'osaka', 'temma', 'sakuranomiya', 'kyobashi', 'osakajokoen', 'morinomiya',
      'tamatsukuri', 'tsuruhashi', 'momodani', 'teradacho', 'tennoji', 'shinimamiya',
      'imamiya', 'ashiharabashi', 'taisho', 'bentencho', 'nishikujo', 'noda', 'fukushima',
    ],
    stops: {
      local: [
        'osaka', 'temma', 'sakuranomiya', 'kyobashi', 'osakajokoen', 'morinomiya',
        'tamatsukuri', 'tsuruhashi', 'momodani', 'teradacho', 'tennoji', 'shinimamiya',
        'imamiya', 'ashiharabashi', 'taisho', 'bentencho', 'nishikujo', 'noda', 'fukushima',
      ],
      // 紀州路快速・関空快速・大和路快速は環状線内では各駅に停まるが、
      // 本ゲームでは「急行は主要駅のみ」という抽象化に揃え、
      // 環状線を横断する乗客から見た主要停車駅だけを拾う。
      express: [
        'osaka', 'kyobashi', 'tsuruhashi', 'tennoji', 'shinimamiya', 'bentencho',
        'nishikujo', 'fukushima',
      ],
      // くろしお・はるか。梅田貨物線経由でうめきた地下ホーム（大阪）に停まり、
      // 環状線内は通過して天王寺へ抜ける。ここが阪和線・南海方面への特急の入口になる。
      ltd: ['osaka', 'tennoji'],
      shinkansen: [],
    },
  },
  {
    id: 'hankyu-kobe',
    name: '阪急神戸本線',
    operator: '阪急電鉄',
    color: '#7c3aed',
    // 起終点の大阪梅田・神戸三宮は、JR の大阪・三宮と同じ駅として扱う。
    stations: [
      'osaka', 'hq-nakatsu', 'hq-juso', 'hq-kanzakigawa', 'hq-sonoda', 'hq-tsukaguchi',
      'hq-mukonoso', 'hq-nishinomiyakitaguchi', 'hq-shukugawa', 'hq-ashiyagawa',
      'hq-okamoto', 'hq-mikage', 'hq-rokko', 'hq-ojikoen', 'hq-kasuganomichi', 'sannomiya',
    ],
    stops: {
      local: [
        'osaka', 'hq-nakatsu', 'hq-juso', 'hq-kanzakigawa', 'hq-sonoda', 'hq-tsukaguchi',
        'hq-mukonoso', 'hq-nishinomiyakitaguchi', 'hq-shukugawa', 'hq-ashiyagawa',
        'hq-okamoto', 'hq-mikage', 'hq-rokko', 'hq-ojikoen', 'hq-kasuganomichi', 'sannomiya',
      ],
      // 急行・通勤急行。
      express: [
        'osaka', 'hq-juso', 'hq-tsukaguchi', 'hq-nishinomiyakitaguchi', 'hq-shukugawa',
        'hq-ashiyagawa', 'hq-okamoto', 'hq-rokko', 'sannomiya',
      ],
      // 阪急の「特急」はそのまま特急として扱う。
      ltd: ['osaka', 'hq-juso', 'hq-nishinomiyakitaguchi', 'hq-shukugawa', 'hq-okamoto', 'sannomiya'],
      shinkansen: [],
    },
  },
  {
    id: 'hanshin',
    name: '阪神本線',
    operator: '阪神電気鉄道',
    color: '#f59e0b',
    stations: [
      'osaka', 'hs-fukushima', 'hs-noda', 'hs-yodogawa', 'hs-himejima', 'hs-chibune',
      'hs-kuise', 'hs-daimotsu', 'hs-amagasaki', 'hs-deyashiki', 'hs-centerpool',
      'hs-mukogawa', 'hs-naruo', 'hs-koshien', 'hs-kusugawa', 'hs-imazu', 'hs-nishinomiya',
      'hs-korien', 'hs-uchide', 'hs-ashiya', 'hs-fukae', 'hs-aoki', 'hs-uozaki',
      'hs-sumiyoshi', 'hs-mikage', 'hs-ishiyagawa', 'hs-shinzaike', 'hs-oishi',
      'hs-nishinada', 'hs-iwaya', 'hs-kasuganomichi', 'sannomiya',
    ],
    stops: {
      local: [
        'osaka', 'hs-fukushima', 'hs-noda', 'hs-yodogawa', 'hs-himejima', 'hs-chibune',
        'hs-kuise', 'hs-daimotsu', 'hs-amagasaki', 'hs-deyashiki', 'hs-centerpool',
        'hs-mukogawa', 'hs-naruo', 'hs-koshien', 'hs-kusugawa', 'hs-imazu', 'hs-nishinomiya',
        'hs-korien', 'hs-uchide', 'hs-ashiya', 'hs-fukae', 'hs-aoki', 'hs-uozaki',
        'hs-sumiyoshi', 'hs-mikage', 'hs-ishiyagawa', 'hs-shinzaike', 'hs-oishi',
        'hs-nishinada', 'hs-iwaya', 'hs-kasuganomichi', 'sannomiya',
      ],
      // 急行・快速急行の和集合。
      express: [
        'osaka', 'hs-noda', 'hs-chibune', 'hs-amagasaki', 'hs-koshien', 'hs-imazu',
        'hs-nishinomiya', 'hs-ashiya', 'hs-fukae', 'hs-aoki', 'hs-uozaki', 'hs-mikage',
        'sannomiya',
      ],
      // 直通特急。
      ltd: [
        'osaka', 'hs-amagasaki', 'hs-koshien', 'hs-nishinomiya', 'hs-ashiya', 'hs-uozaki',
        'sannomiya',
      ],
      shinkansen: [],
    },
  },
  {
    id: 'hanwa',
    name: '阪和線',
    operator: 'JR西日本',
    color: '#ea580c',
    stations: [
      'tennoji', 'bishoen', 'minamitanabe', 'tsurugaoka', 'nagai', 'abikocho',
      'sugimotocho', 'asaka', 'sakaishi', 'mikunigaoka', 'mozu', 'uenoshiba', 'tsukuno',
      'otori', 'tonoki', 'kitashinoda', 'shinodayama', 'izumifuchu', 'kumeda', 'shimomatsu',
      'higashikishiwada', 'higashikaizuka', 'izumihashimoto', 'higashisano', 'kumatori',
      'hineno', 'nagataki', 'shinge', 'izumisunagawa', 'izumitottori', 'yamanakadani',
      'kii', 'musota', 'kiinakanoshima', 'wakayama',
    ],
    stops: {
      local: [
        'tennoji', 'bishoen', 'minamitanabe', 'tsurugaoka', 'nagai', 'abikocho',
        'sugimotocho', 'asaka', 'sakaishi', 'mikunigaoka', 'mozu', 'uenoshiba', 'tsukuno',
        'otori', 'tonoki', 'kitashinoda', 'shinodayama', 'izumifuchu', 'kumeda', 'shimomatsu',
        'higashikishiwada', 'higashikaizuka', 'izumihashimoto', 'higashisano', 'kumatori',
        'hineno', 'nagataki', 'shinge', 'izumisunagawa', 'izumitottori', 'yamanakadani',
        'kii', 'musota', 'kiinakanoshima', 'wakayama',
      ],
      // 紀州路快速・関空快速・区間快速の和集合。
      express: [
        'tennoji', 'sakaishi', 'mikunigaoka', 'otori', 'izumifuchu', 'higashikishiwada',
        'kumatori', 'hineno', 'izumisunagawa', 'yamanakadani', 'kii', 'musota', 'wakayama',
      ],
      // くろしお。
      ltd: ['tennoji', 'hineno', 'wakayama'],
      shinkansen: [],
    },
  },
  {
    id: 'nankai',
    name: '南海本線',
    operator: '南海電気鉄道',
    color: '#0d9488',
    // 新今宮で JR の環状線と同じ駅を共有する。難波は南海側の終点。
    stations: [
      'nankai-namba', 'nankai-imamiyaebisu', 'shinimamiya', 'nankai-haginochaya',
      'nankai-tengachaya', 'nankai-kishinosatotamade', 'nankai-kohama',
      'nankai-sumiyoshitaisha', 'nankai-suminoe', 'nankai-shichido', 'nankai-sakai',
      'nankai-minato', 'nankai-ishizugawa', 'nankai-suwanomori', 'nankai-hamaderakoen',
      'nankai-hagoromo', 'nankai-takaishi', 'nankai-kitasukematsu', 'nankai-matsunohama',
      'nankai-izumiotsu', 'nankai-tadaoka', 'nankai-haruki', 'nankai-izumiomiya',
      'nankai-kishiwada', 'nankai-takojizo', 'nankai-kaizuka', 'nankai-nishikinohama',
      'nankai-tsurubara', 'nankai-ihara', 'nankai-izumisano', 'nankai-hagurazaki',
      'nankai-yoshiminosato', 'nankai-okadaura', 'nankai-tarui', 'nankai-ozaki',
      'nankai-tottorinosho', 'nankai-hakotsukuri', 'nankai-tannowa', 'nankai-misakikoen',
      'nankai-kyoshi', 'nankai-wakayamashi',
    ],
    stops: {
      local: [
        'nankai-namba', 'nankai-imamiyaebisu', 'shinimamiya', 'nankai-haginochaya',
        'nankai-tengachaya', 'nankai-kishinosatotamade', 'nankai-kohama',
        'nankai-sumiyoshitaisha', 'nankai-suminoe', 'nankai-shichido', 'nankai-sakai',
        'nankai-minato', 'nankai-ishizugawa', 'nankai-suwanomori', 'nankai-hamaderakoen',
        'nankai-hagoromo', 'nankai-takaishi', 'nankai-kitasukematsu', 'nankai-matsunohama',
        'nankai-izumiotsu', 'nankai-tadaoka', 'nankai-haruki', 'nankai-izumiomiya',
        'nankai-kishiwada', 'nankai-takojizo', 'nankai-kaizuka', 'nankai-nishikinohama',
        'nankai-tsurubara', 'nankai-ihara', 'nankai-izumisano', 'nankai-hagurazaki',
        'nankai-yoshiminosato', 'nankai-okadaura', 'nankai-tarui', 'nankai-ozaki',
        'nankai-tottorinosho', 'nankai-hakotsukuri', 'nankai-tannowa', 'nankai-misakikoen',
        'nankai-kyoshi', 'nankai-wakayamashi',
      ],
      // 急行・空港急行・区間急行の和集合。
      express: [
        'nankai-namba', 'shinimamiya', 'nankai-tengachaya', 'nankai-sakai',
        'nankai-hagoromo', 'nankai-takaishi', 'nankai-izumiotsu', 'nankai-haruki',
        'nankai-kishiwada', 'nankai-kaizuka', 'nankai-izumisano', 'nankai-ozaki',
        'nankai-misakikoen', 'nankai-wakayamashi',
      ],
      // 特急サザン。
      ltd: [
        'nankai-namba', 'shinimamiya', 'nankai-tengachaya', 'nankai-sakai',
        'nankai-kishiwada', 'nankai-izumisano', 'nankai-wakayamashi',
      ],
      shinkansen: [],
    },
  },
];
