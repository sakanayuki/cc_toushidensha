/**
 * 3Dのサイコロ。
 *
 * 出目は振る前に確定させておき、転がり終わったときにその面が正面を向く。
 * 適当に回して止めてから別の数字を出すと、見ている側が「今の回転は何だったのか」と
 * 思うので、転がりと結果を一致させている。
 */

import { useEffect, useState } from 'react';

/** 各面のピップ位置。3×3 のマス目で、1が左上。 */
const PIPS: Record<number, number[]> = {
  1: [5],
  2: [1, 9],
  3: [1, 5, 9],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9],
};

/**
 * 立方体を回して、その面を正面に持ってくる角度。
 * 面の配置は実物のサイコロと同じく、向かい合う面の和が7になるようにしている
 * （前1・後6／右3・左4／上5・下2）。
 */
const FACE_ANGLE: Record<number, { x: number; y: number }> = {
  1: { x: 0, y: 0 },
  2: { x: 90, y: 0 },
  3: { x: 0, y: -90 },
  4: { x: 0, y: 90 },
  5: { x: -90, y: 0 },
  6: { x: 0, y: 180 },
};

/** 面を立方体の各方向に貼り付ける角度。FACE_ANGLE と表裏の関係にある。 */
const FACE_PLACEMENT: Record<number, string> = {
  1: 'rotateY(0deg)',
  6: 'rotateY(180deg)',
  3: 'rotateY(90deg)',
  4: 'rotateY(-90deg)',
  5: 'rotateX(90deg)',
  2: 'rotateX(-90deg)',
};

/** 止まっているときの傾き。真正面より少し振っておくと立体に見える。 */
const REST = { x: -18, y: 22 };

/** 出目を見せて止まっているときの傾き。正対させると平面に見えるので少し振る。 */
const SETTLED = { x: -14, y: 16 };

export const DICE_ROLL_MS = 1100;

interface Props {
  /** 出目。null のあいだは止まったまま。 */
  value: number | null;
  /**
   * 転がすかどうか。false なら出目の面を向けて静止する。
   * 振り終わったあとの結果表示で使う。
   */
  spin?: boolean;
  /** 小さく出す（結果表示など本題でないとき）。 */
  small?: boolean;
}

function settledAngle(value: number) {
  const face = FACE_ANGLE[value] ?? FACE_ANGLE[1]!;
  return { x: face.x + SETTLED.x, y: face.y + SETTLED.y };
}

export function Dice({ value, spin = true, small = false }: Props) {
  const [angle, setAngle] = useState(() =>
    value !== null && !spin ? settledAngle(value) : REST,
  );

  useEffect(() => {
    if (value === null) {
      setAngle(REST);
      return;
    }
    if (!spin) {
      setAngle(settledAngle(value));
      return;
    }
    const face = FACE_ANGLE[value] ?? FACE_ANGLE[1]!;
    // 何周か余分に回してから目的の面で止める。
    // 角度を足す向きに回すので、転がりが途中で逆走しない。
    setAngle({ x: face.x + 360 * 2, y: face.y + 360 * 3 });
  }, [value, spin]);

  const classes = ['dice'];
  if (small) classes.push('dice--small');
  if (value !== null && spin) classes.push('dice--tossing');

  return (
    <div className={classes.join(' ')}>
      <div
        className="dice__cube"
        style={{
          transform: `rotateX(${angle.x}deg) rotateY(${angle.y}deg)`,
          transitionDuration: spin ? `${DICE_ROLL_MS}ms` : '0ms',
        }}
      >
        {Object.entries(FACE_PLACEMENT).map(([face, placement]) => (
          <div
            key={face}
            className="dice__face"
            style={{ transform: `${placement} translateZ(var(--dice-half))` }}
          >
            {Array.from({ length: 9 }, (_, i) => (
              <span
                key={i}
                className={PIPS[Number(face)]?.includes(i + 1) ? 'dice__pip' : 'dice__pip--empty'}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
