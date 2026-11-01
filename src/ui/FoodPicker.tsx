import { useState } from 'react';
import type { FoodDefinition } from '../data/foods';

interface FoodPickerProps {
  foods: readonly FoodDefinition[];
  onStart: (food: FoodDefinition) => void;
}

function BurgerMark() {
  return <div className="food-card-art" aria-hidden="true">
    <span className="bun bun-top" />
    <span className="lettuce" />
    <span className="patty" />
    <span className="cheese" />
    <span className="bun bun-bottom" />
    <span className="food-card-shadow" />
  </div>;
}

function FoodCover({ food }: { food: FoodDefinition }) {
  const [failed, setFailed] = useState(false);
  return food.cover && !failed ? <img className="food-cover" src={food.cover} alt="" onError={() => setFailed(true)} /> : <BurgerMark />;
}

export function FoodPicker({ foods, onStart }: FoodPickerProps) {
  return <section className="picker-screen" data-testid="food-picker">
    <div className="picker-intro">
      <p className="eyebrow"><span className="eyebrow-dot" />慢慢吃，才知道好吃</p>
      <h2>今天，想吃哪一口？</h2>
      <p className="picker-lede">挑一份食物，转着看、点着吃。<br />每一口都留一点时间给自己。</p>
    </div>
    <div className="picker-section-heading">
      <span>食物柜</span>
      <span>{foods.length} 份可选</span>
    </div>
    <div className="food-grid">
      {foods.map(food => <article className="food-card" key={food.id} data-food-id={food.id}>
        <div className="food-card-topline"><span>{food.stages.length} 阶段</span><span>·</span><span>{food.stages.reduce((sum, stage) => sum + stage.bites, 0)} 口满足</span></div>
        <FoodCover food={food} />
        <div className="food-card-copy">
          <p className="food-card-kicker">今日主食</p>
          <h3>{food.name}</h3>
          <p>{food.description}</p>
        </div>
        <button className="card-start" type="button" onClick={() => onStart(food)}>
          <span>开始品尝</span><span className="card-start-arrow" aria-hidden="true">↗</span>
        </button>
      </article>)}
      <div className="catalog-note" aria-label="食物目录说明">
        <span className="catalog-note-mark">+</span>
        <p><strong>还会有更多</strong><br />新食物会在这里上桌</p>
      </div>
    </div>
    <p className="picker-footer-note">直接点食物吃一口 · 拖动食物换个角度</p>
  </section>;
}
