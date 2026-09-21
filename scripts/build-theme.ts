/**
 * Material 3 Expressive のカラートークンを生成して src/ui/theme.css を書き出す。
 *
 *     npx vite-node scripts/build-theme.ts
 *
 * 色は Material 公式の material-color-utilities で、ソースカラーから
 * HCT 色空間を通して生成する。手で選んだ色を並べるのではなく
 * アルゴリズムに任せることで、コントラスト比と色相の調和が M3 の仕様どおりになる。
 * スキームは Expressive バリアント（SchemeExpressive）を使う。
 * これは彩度が高く、secondary / tertiary が primary から大きく離れた色相になるもので、
 * M3 Expressive の「感情に訴える大胆な配色」の土台になる。
 */

import {
  Hct,
  MaterialDynamicColors,
  SchemeExpressive,
  argbFromHex,
  hexFromArgb,
} from '@material/material-color-utilities';
import { writeFileSync } from 'node:fs';

/**
 * ソースカラー。
 *
 * Expressive スキームはソースから色相を大きく回して展開するため、
 * ソースの色がそのまま primary になるわけではない。この青緑からは
 * primary に金（トロフィーを競うゲームの主題に合う）、
 * surface に彩度の低い青灰（路線図の色と競合せず地図が映える）が出る。
 */
const SOURCE = '#0F5C6E';

/** 出力する色ロール。M3 の仕様名をそのまま CSS 変数名にする。 */
const ROLES = [
  'primary', 'onPrimary', 'primaryContainer', 'onPrimaryContainer',
  'secondary', 'onSecondary', 'secondaryContainer', 'onSecondaryContainer',
  'tertiary', 'onTertiary', 'tertiaryContainer', 'onTertiaryContainer',
  'error', 'onError', 'errorContainer', 'onErrorContainer',
  'background', 'onBackground',
  'surface', 'onSurface', 'surfaceVariant', 'onSurfaceVariant',
  'surfaceDim', 'surfaceBright',
  'surfaceContainerLowest', 'surfaceContainerLow', 'surfaceContainer',
  'surfaceContainerHigh', 'surfaceContainerHighest',
  'inverseSurface', 'inverseOnSurface', 'inversePrimary',
  'outline', 'outlineVariant', 'scrim', 'shadow',
] as const;

/** camelCase を CSS 変数用の kebab-case にする。 */
const kebab = (name: string) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

function scheme(dark: boolean): string {
  const s = new SchemeExpressive(Hct.fromInt(argbFromHex(SOURCE)), dark, 0);
  return ROLES.map((role) => {
    const color = MaterialDynamicColors[role];
    return `  --md-sys-color-${kebab(role)}: ${hexFromArgb(color.getArgb(s))};`;
  }).join('\n');
}

const css = `/*
 * Material 3 Expressive のカラートークン。
 *
 * このファイルは scripts/build-theme.ts が生成する。直接編集しないこと。
 * 色を変えるときはスクリプト側の SOURCE を変えて再生成する。
 *
 *     npx vite-node scripts/build-theme.ts
 *
 * ソースカラー: ${SOURCE}
 * スキーム: SchemeExpressive
 *
 * ライトを既定とし、端末が prefers-color-scheme: dark でもライトのまま表示する。
 * 地図と路線を見るゲームなので、明るい地の上のほうが線と駅を追いやすいため。
 * ダークにするときは <html data-theme="dark"> を明示する。
 */

:root {
  color-scheme: light;
${scheme(false)}
}

:root[data-theme='dark'] {
  color-scheme: dark;
${scheme(true)}
}
`;

writeFileSync('src/ui/theme.css', css);
console.log(`wrote src/ui/theme.css (source ${SOURCE}, ${ROLES.length} roles × 2 schemes)`);
