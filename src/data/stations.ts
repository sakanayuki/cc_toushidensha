/**
 * 駅マスタ（フェーズ1: 四国＋岡山）。
 *
 * 収録範囲は予讃線（高松〜伊予市）・土讃線（多度津〜阿波池田）・
 * 高徳線（高松〜徳島）・鳴門線（池谷〜鳴門）・瀬戸大橋線（岡山〜宇多津）。
 * 収録した路線については駅を間引かず全駅を収録する。
 * 駅を間引くと「普通で4駅／急行で1駅」という本作のコアな対比が歪むため。
 *
 * 緯度経度は地図描画と直線距離の算出に使う概算値。
 */

import type { Station } from './types';

const st = (
  id: string,
  name: string,
  kana: string,
  pref: string,
  lat: number,
  lon: number,
  ...industries: string[]
): Station => ({ id, name, kana, pref, lat, lon, industries });

export const STATIONS: Station[] = [
  // ── 瀬戸大橋線（宇野線＋本四備讃線） 岡山 → 宇多津 ──
  st('okayama', '岡山', 'おかやま', '岡山県', 34.6664, 133.9181, 'okayama-muscat', 'okayama-peach', 'okayama-retail'),
  st('omoto', '大元', 'おおもと', '岡山県', 34.6489, 133.9128, 'omoto-machinery'),
  st('bizennishiichi', '備前西市', 'びぜんにしいち', '岡山県', 34.6367, 133.9028, 'nishiichi-vegetables'),
  st('senoo', '妹尾', 'せのお', '岡山県', 34.6136, 133.8794, 'senoo-rice'),
  st('bicchumishima', '備中箕島', 'びっちゅうみしま', '岡山県', 34.605, 133.8656, 'mishima-greenhouse'),
  st('hayashima', '早島', 'はやしま', '岡山県', 34.5933, 133.8425, 'hayashima-igusa'),
  st('kugubara', '久々原', 'くぐはら', '岡山県', 34.5814, 133.8389, 'kugubara-rice'),
  st('chayamachi', '茶屋町', 'ちゃやまち', '岡山県', 34.5678, 133.8464, 'chayamachi-logistics'),
  st('uematsu', '植松', 'うえまつ', '岡山県', 34.5486, 133.8353, 'uematsu-vegetables'),
  st('kimi', '木見', 'きみ', '岡山県', 34.5175, 133.8231, 'kimi-fruit'),
  st('kaminocho', '上の町', 'かみのちょう', '岡山県', 34.4906, 133.8136, 'kaminocho-rice'),
  st('kojima', '児島', 'こじま', '岡山県', 34.4692, 133.8064, 'kojima-denim', 'kojima-uniform'),

  // ── 予讃線 高松 → 伊予市 ──
  st('takamatsu', '高松', 'たかまつ', '香川県', 34.3506, 134.0466, 'takamatsu-udon', 'takamatsu-port', 'takamatsu-retail'),
  st('kozai', '香西', 'こうざい', '香川県', 34.3383, 134.0117, 'kozai-fishery'),
  st('kinashi', '鬼無', 'きなし', '香川県', 34.3275, 133.9964, 'kinashi-bonsai'),
  st('hashioka', '端岡', 'はしおか', '香川県', 34.3197, 133.9689, 'hashioka-rice'),
  st('kokubu', '国分', 'こくぶ', '香川県', 34.3133, 133.95, 'kokubu-heritage'),
  st('sanukifuchu', '讃岐府中', 'さぬきふちゅう', '香川県', 34.3122, 133.9203, 'fuchu-rice'),
  st('kamogawa', '鴨川', 'かもがわ', '香川県', 34.3133, 133.9022, 'kamogawa-vegetables'),
  st('yasoba', '八十場', 'やそば', '香川県', 34.3139, 133.8794, 'yasoba-tokoroten'),
  st('sakaide', '坂出', 'さかいで', '香川県', 34.3139, 133.8597, 'sakaide-salt', 'sakaide-petrochem'),
  st('utazu', '宇多津', 'うたづ', '香川県', 34.3058, 133.825, 'utazu-tower'),
  st('marugame', '丸亀', 'まるがめ', '香川県', 34.2903, 133.7972, 'marugame-uchiwa', 'marugame-castle'),
  st('sanukishioya', '讃岐塩屋', 'さぬきしおや', '香川県', 34.2856, 133.7794, 'shioya-rice'),
  st('tadotsu', '多度津', 'たどつ', '香川県', 34.2728, 133.7556, 'tadotsu-railway', 'tadotsu-shipbuilding'),
  st('kaiganji', '海岸寺', 'かいがんじ', '香川県', 34.2653, 133.7189, 'kaiganji-temple'),
  st('takuma', '詫間', 'たくま', '香川県', 34.2464, 133.6764, 'takuma-nori'),
  st('mino', 'みの', 'みの', '香川県', 34.2278, 133.6533, 'mino-lotus'),
  st('takase', '高瀬', 'たかせ', '香川県', 34.2078, 133.6469, 'takase-tea'),
  st('hijidai', '比地大', 'ひじだい', '香川県', 34.1928, 133.6497, 'hijidai-rice'),
  st('motoyama', '本山', 'もとやま', '香川県', 34.1694, 133.6478, 'motoyama-strawberry'),
  st('kanonji', '観音寺', 'かんおんじ', '香川県', 34.1319, 133.6611, 'kanonji-zenigata', 'kanonji-paper'),
  st('toyohama', '豊浜', 'とよはま', '香川県', 34.0797, 133.6942, 'toyohama-chrysanthemum'),
  st('minoura', '箕浦', 'みのうら', '香川県', 34.05, 133.7028, 'minoura-fishery'),
  st('kawanoe', '川之江', 'かわのえ', '愛媛県', 33.9878, 133.5711, 'kawanoe-paper'),
  st('iyomishima', '伊予三島', 'いよみしま', '愛媛県', 33.9781, 133.5425, 'mishima-householdpaper'),
  st('iyosangawa', '伊予寒川', 'いよさんがわ', '愛媛県', 33.9683, 133.5153, 'sangawa-rice'),
  st('akaboshi', '赤星', 'あかぼし', '愛媛県', 33.9642, 133.4922, 'akaboshi-vegetables'),
  st('iyodoi', '伊予土居', 'いよどい', '愛媛県', 33.9503, 133.4708, 'doi-taro'),
  st('sekigawa', '関川', 'せきがわ', '愛媛県', 33.9433, 133.4394, 'sekigawa-rice'),
  st('takihama', '多喜浜', 'たきはま', '愛媛県', 33.9428, 133.3472, 'takihama-chemical'),
  st('niihama', '新居浜', 'にいはま', '愛媛県', 33.9603, 133.2833, 'niihama-nonferrous', 'niihama-machinery'),
  st('nakahagi', '中萩', 'なかはぎ', '愛媛県', 33.9394, 133.2483, 'nakahagi-rice'),
  st('iyosaijo', '伊予西条', 'いよさいじょう', '愛媛県', 33.9189, 133.1833, 'saijo-water', 'saijo-semiconductor'),
  st('ishizuchisan', '石鎚山', 'いしづちさん', '愛媛県', 33.9075, 133.1519, 'ishizuchi-tourism'),
  st('iyohimi', '伊予氷見', 'いよひみ', '愛媛県', 33.9033, 133.1289, 'himi-rice'),
  st('iyokomatsu', '伊予小松', 'いよこまつ', '愛媛県', 33.8958, 133.1058, 'komatsu-persimmon'),
  st('tamanoe', '玉之江', 'たまのえ', '愛媛県', 33.8861, 133.0797, 'tamanoe-vegetables'),
  st('nyugawa', '壬生川', 'にゅうがわ', '愛媛県', 33.8764, 133.045, 'nyugawa-shipbuilding'),
  st('iyomiyoshi', '伊予三芳', 'いよみよし', '愛媛県', 33.9297, 132.9847, 'miyoshi-rice'),
  st('iyotomita', '伊予富田', 'いよとみた', '愛媛県', 33.9689, 132.9933, 'tomita-rice'),
  st('iyosakurai', '伊予桜井', 'いよさくらい', '愛媛県', 34.0031, 132.9958, 'sakurai-lacquerware'),
  st('imabari', '今治', 'いまばり', '愛媛県', 34.0631, 132.9975, 'imabari-towel', 'imabari-shipbuilding', 'imabari-yakitori'),
  st('hashihama', '波止浜', 'はしはま', '愛媛県', 34.085, 132.9689, 'hashihama-shipyard'),
  st('namikata', '波方', 'なみかた', '愛媛県', 34.0917, 132.9375, 'namikata-shipowner'),
  st('onishi', '大西', 'おおにし', '愛媛県', 34.0733, 132.9036, 'onishi-stone'),
  st('iyokameoka', '伊予亀岡', 'いよかめおか', '愛媛県', 34.0458, 132.8697, 'kameoka-rice'),
  st('kikuma', '菊間', 'きくま', '愛媛県', 34.0264, 132.8378, 'kikuma-tile', 'kikuma-refinery'),
  st('asanami', '浅海', 'あさなみ', '愛媛県', 33.9931, 132.8244, 'asanami-mandarin'),
  st('oura', '大浦', 'おおうら', '愛媛県', 33.9819, 132.8175, 'oura-fishery'),
  st('awai', '粟井', 'あわい', '愛媛県', 33.9744, 132.7997, 'awai-mandarin'),
  st('koyodai', '光洋台', 'こうようだい', '愛媛県', 33.9639, 132.7936, 'koyodai-beach'),
  st('iyohojo', '伊予北条', 'いよほうじょう', '愛媛県', 33.9564, 132.7722, 'hojo-kashima', 'hojo-rice'),
  st('yanagihara', '柳原', 'やなぎはら', '愛媛県', 33.9339, 132.7692, 'yanagihara-fishery'),
  st('horie', '堀江', 'ほりえ', '愛媛県', 33.9139, 132.7411, 'horie-port'),
  st('iyowake', '伊予和気', 'いよわけ', '愛媛県', 33.8958, 132.735, 'wake-mandarin'),
  st('mitsuhama', '三津浜', 'みつはま', '愛媛県', 33.8683, 132.7233, 'mitsuhama-fishmarket', 'mitsuhama-yaki'),
  st('matsuyama', '松山', 'まつやま', '愛媛県', 33.8392, 132.7517, 'matsuyama-dogo', 'matsuyama-mandarin', 'matsuyama-retail'),
  st('ichitsubo', '市坪', 'いちつぼ', '愛媛県', 33.8203, 132.7622, 'ichitsubo-stadium'),
  st('kitaiyo', '北伊予', 'きたいよ', '愛媛県', 33.8022, 132.7519, 'kitaiyo-rice'),
  st('minamiiyo', '南伊予', 'みなみいよ', '愛媛県', 33.7897, 132.7472, 'minamiiyo-logistics'),
  st('iyoyokota', '伊予横田', 'いよよこた', '愛媛県', 33.7803, 132.7383, 'yokota-vegetables'),
  st('torinoki', '鳥ノ木', 'とりのき', '愛媛県', 33.7725, 132.7192, 'torinoki-rice'),
  st('iyoshi', '伊予市', 'いよし', '愛媛県', 33.7583, 132.705, 'iyoshi-katsuobushi', 'iyoshi-kamaboko'),

  // ── 土讃線 多度津 → 阿波池田 ──
  st('kanzoji', '金蔵寺', 'こんぞうじ', '香川県', 34.2536, 133.7828, 'kanzoji-rice'),
  st('zentsuji', '善通寺', 'ぜんつうじ', '香川県', 34.2261, 133.7856, 'zentsuji-temple', 'zentsuji-vegetables'),
  st('kotohira', '琴平', 'ことひら', '香川県', 34.1867, 133.8147, 'kotohira-konpira', 'kotohira-sake'),
  st('shioiri', '塩入', 'しおいり', '香川県', 34.14, 133.8017, 'shioiri-forestry'),
  st('kurokawa', '黒川', 'くろかわ', '香川県', 34.1114, 133.8014, 'kurokawa-forestry'),
  st('sanukisaida', '讃岐財田', 'さぬきさいだ', '香川県', 34.1, 133.8339, 'saida-shiitake'),
  st('tsubojiri', '坪尻', 'つぼじり', '徳島県', 34.0592, 133.8258, 'tsubojiri-switchback'),
  st('hashikura', '箸蔵', 'はしくら', '徳島県', 34.0325, 133.8167, 'hashikura-temple'),
  st('tsukuda', '佃', 'つくだ', '徳島県', 34.0311, 133.8256, 'tsukuda-rice'),
  st('awaikeda', '阿波池田', 'あわいけだ', '徳島県', 34.0233, 133.8022, 'ikeda-tobacco', 'ikeda-iya'),

  // ── 高徳線 高松 → 徳島 ──
  st('showacho', '昭和町', 'しょうわちょう', '香川県', 34.355, 134.0392, 'showacho-print'),
  st('ritsuringokenkitaguchi', '栗林公園北口', 'りつりんこうえんきたぐち', '香川県', 34.3406, 134.0397, 'kitaguchi-crafts'),
  st('ritsurin', '栗林', 'りつりん', '香川県', 34.3306, 134.045, 'ritsurin-garden'),
  st('kitacho', '木太町', 'きたちょう', '香川県', 34.3319, 134.0722, 'kitacho-vegetables'),
  st('yashima', '屋島', 'やしま', '香川県', 34.3419, 134.0944, 'yashima-tourism'),
  st('furutakamatsuminami', '古高松南', 'ふるたかまつみなみ', '香川県', 34.3392, 134.1058, 'furutakamatsu-rice'),
  st('yakuriguchi', '八栗口', 'やくりぐち', '香川県', 34.3419, 134.1264, 'yakuri-temple'),
  st('sanukimure', '讃岐牟礼', 'さぬきむれ', '香川県', 34.3492, 134.1394, 'mure-stone'),
  st('shido', '志度', 'しど', '香川県', 34.3239, 134.1739, 'shido-lacquer', 'shido-fishery'),
  st('orangetown', 'オレンジタウン', 'おれんじたうん', '香川県', 34.3053, 134.1908, 'orangetown-housing'),
  st('zoda', '造田', 'ぞうだ', '香川県', 34.2892, 134.1997, 'zoda-rice'),
  st('kanzaki', '神前', 'かんざき', '香川県', 34.2769, 134.2144, 'kanzaki-vegetables'),
  st('sanukitsuda', '讃岐津田', 'さぬきつだ', '香川県', 34.2825, 134.2536, 'tsuda-pine'),
  st('tsuruwa', '鶴羽', 'つるわ', '香川県', 34.2708, 134.2814, 'tsuruwa-fishery'),
  st('nibu', '丹生', 'にぶ', '香川県', 34.2622, 134.3078, 'nibu-mandarin'),
  st('sanbonmatsu', '三本松', 'さんぼんまつ', '香川県', 34.2506, 134.34, 'sanbonmatsu-wasanbon'),
  st('sanukishiroto', '讃岐白鳥', 'さぬきしろとり', '香川県', 34.2392, 134.3728, 'shiroto-glove'),
  st('hiketa', '引田', 'ひけた', '香川県', 34.2208, 134.4128, 'hiketa-hamachi', 'hiketa-soy'),
  st('sanukiaioi', '讃岐相生', 'さぬきあいおい', '香川県', 34.205, 134.4317, 'aioi-rice'),
  st('awaomiya', '阿波大宮', 'あわおおみや', '徳島県', 34.1817, 134.465, 'omiya-forestry'),
  st('itano', '板野', 'いたの', '徳島県', 34.14, 134.4553, 'itano-lotus'),
  st('awakawabata', '阿波川端', 'あわかわばた', '徳島県', 34.1425, 134.4831, 'kawabata-vegetables'),
  st('bando', '板東', 'ばんどう', '徳島県', 34.1631, 134.4939, 'bando-beethoven'),
  st('iketani', '池谷', 'いけのたに', '徳島県', 34.1594, 134.535, 'iketani-sweetpotato'),
  st('shozui', '勝瑞', 'しょうずい', '徳島県', 34.1339, 134.5375, 'shozui-greenonion'),
  st('yoshinari', '吉成', 'よしなり', '徳島県', 34.1164, 134.5364, 'yoshinari-rice'),
  st('sako', '佐古', 'さこ', '徳島県', 34.0761, 134.5378, 'sako-sake'),
  st('tokushima', '徳島', 'とくしま', '徳島県', 34.0747, 134.5508, 'tokushima-sudachi', 'tokushima-led', 'tokushima-awaodori'),

  // ── 鳴門線 池谷 → 鳴門 ──
  st('awaotani', '阿波大谷', 'あわおおたに', '徳島県', 34.1697, 134.5539, 'otani-pottery'),
  st('tatemichi', '立道', 'たてみち', '徳島県', 34.1767, 134.5717, 'tatemichi-rice'),
  st('kyokaimae', '教会前', 'きょうかいまえ', '徳島県', 34.1789, 134.5928, 'kyokaimae-vegetables'),
  st('konpiramae', '金比羅前', 'こんぴらまえ', '徳島県', 34.1786, 134.6053, 'konpiramae-rice'),
  st('muya', '撫養', 'むや', '徳島県', 34.1725, 134.6086, 'muya-salt'),
  st('naruto', '鳴門', 'なると', '徳島県', 34.1764, 134.6106, 'naruto-wakame', 'naruto-whirlpool'),
];

export const STATION_MAP: Record<string, Station> = Object.fromEntries(
  STATIONS.map((s) => [s.id, s]),
);
