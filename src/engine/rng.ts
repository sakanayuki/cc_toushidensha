/**
 * 決定論的な擬似乱数（mulberry32）。
 *
 * 乱数の状態を GameState.seed として持ち回ることで、
 * ゲーム状態をそのまま localStorage へ保存・復元できるようにする。
 */

/** seed から次の [0,1) の値と、次の seed を返す。 */
export function nextRandom(seed: number): { value: number; seed: number } {
  let t = (seed + 0x6d2b79f5) | 0;
  const next = t;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { value, seed: next };
}

/** 0 以上 max 未満の整数。 */
export function nextInt(seed: number, max: number): { value: number; seed: number } {
  const r = nextRandom(seed);
  return { value: Math.floor(r.value * max), seed: r.seed };
}

/** 配列から要素を1つ選ぶ。 */
export function pick<T>(seed: number, items: readonly T[]): { value: T; seed: number } {
  if (items.length === 0) throw new Error('pick: empty array');
  const r = nextInt(seed, items.length);
  return { value: items[r.value] as T, seed: r.seed };
}

/** Fisher-Yates シャッフル。元の配列は変更しない。 */
export function shuffle<T>(seed: number, items: readonly T[]): { value: T[]; seed: number } {
  const out = [...items];
  let s = seed;
  for (let i = out.length - 1; i > 0; i--) {
    const r = nextInt(s, i + 1);
    s = r.seed;
    const j = r.value;
    const a = out[i] as T;
    const b = out[j] as T;
    out[i] = b;
    out[j] = a;
  }
  return { value: out, seed: s };
}
