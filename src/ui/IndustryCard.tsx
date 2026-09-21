/** 産業の1件表示。投資先の選択と保有一覧で共用する。 */

import { FAME_CATEGORY_MAP } from '../data';
import { SECTOR_LABEL } from '../data/types';
import type { Industry } from '../data/types';

const SECTOR_SHORT: Record<1 | 2 | 3, string> = { 1: '一次', 2: '二次', 3: '三次' };

export function isBest3(industry: Industry): boolean {
  return industry.fame !== undefined && industry.fame.rank <= 3;
}

export function IndustryChoice({
  industry,
  onClick,
}: {
  industry: Industry;
  onClick?: (() => void) | undefined;
}) {
  const category = industry.fame ? FAME_CATEGORY_MAP[industry.fame.categoryId] : undefined;
  return (
    <button
      type="button"
      className="md-list-item md-ripple"
      onClick={onClick}
      disabled={!onClick}
    >
      <div className="md-list-item__headline">
        <span>{industry.name}</span>
        <span className="md-chip md-chip--small md-chip--tertiary">
          {SECTOR_SHORT[industry.sector]}
        </span>
        {isBest3(industry) && (
          <span className="md-chip md-chip--small md-chip--primary">
            全国{industry.fame?.rank}位
          </span>
        )}
        <span className="md-list-item__trailing">
          規模 {industry.scale} / 利益率 {industry.profitRate}%
        </span>
      </div>
      <div className="md-list-item__supporting">
        {SECTOR_LABEL[industry.sector]}
        {category && industry.fame && (
          <>
            　{category.name}の全国ベスト3: {category.top3Labels.join('・')}
          </>
        )}
      </div>
    </button>
  );
}
