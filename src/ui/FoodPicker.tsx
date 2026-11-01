import { useEffect, useRef, useState } from 'react';
import type { FoodDefinition } from '../data/foods';

interface FoodPickerProps {
  foods: readonly FoodDefinition[];
  onStart: (food: FoodDefinition) => void;
}

function FoodCover({ food }: { food: FoodDefinition }) {
  const [failed, setFailed] = useState(false);
  return food.cover && !failed
    ? <img className="menu-food-cover" src={food.cover} alt="" onError={() => setFailed(true)} />
    : <span className="menu-cover-fallback" aria-hidden="true">食</span>;
}

export function FoodPicker({ foods, onStart }: FoodPickerProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuTitle = useRef<HTMLHeadingElement>(null);
  const enterButton = useRef<HTMLButtonElement>(null);
  const navigated = useRef(false);
  useEffect(() => {
    if (menuOpen) {
      navigated.current = true;
      menuTitle.current?.focus();
    } else if (navigated.current) enterButton.current?.focus();
  }, [menuOpen]);
  return <section className={`picker-screen${menuOpen ? ' menu-open' : ''}`} data-testid="food-picker">
    {!menuOpen ? <div className="shop-landing">
      <div className="shop-copy">
        <p className="shop-date">开门营业 · 千禧年</p>
        <h2>葡京奶茶<span>食刻小店</span></h2>
        <p className="shop-description">放学路过的小店，封口机还热着。<br />今天想吃点什么？</p>
        <button className="enter-menu" ref={enterButton} type="button" onClick={() => setMenuOpen(true)}>翻开菜单 <span aria-hidden="true">→</span></button>
        <p className="shop-aside">目前可试玩：经典汉堡</p>
      </div>
      <div className="machine-scene">
        <span className="machine-scene-caption">现做 · 现封 · 慢慢吃</span>
        <img src="/foods/sealing-machine.png" alt="复古奶茶杯封装机插画" />
      </div>
      <div className="shop-ticker" aria-hidden="true"><span>葡京奶茶</span><span>食刻小店</span><span>千禧年回忆</span></div>
    </div> : <div className="shop-menu">
      <div className="menu-toolbar"><button className="menu-return" type="button" onClick={() => setMenuOpen(false)}>← 返回店面</button><span>食刻小店 · 手写菜单</span></div>
      <div className="menu-heading"><p>今日菜单</p><h2 ref={menuTitle} tabIndex={-1}>选一份，开吃。</h2><span>目前 {foods.length} 款可玩</span></div>
      <div className="menu-list">
        {foods.map((food, index) => <article className="menu-item" key={food.id} data-food-id={food.id}>
          <div className="menu-item-image"><FoodCover food={food} /></div>
          <div className="menu-item-body">
            <span className="menu-item-number">{String(index + 1).padStart(2, '0')} / 今日现做</span>
            <h3>{food.name}</h3>
            <p>{food.description}</p>
            <span className="menu-item-bites">{food.stages.length} 阶段 · {food.stages.reduce((sum, stage) => sum + stage.bites, 0)} 口</span>
            <button className="menu-order" type="button" onClick={() => onStart(food)}>开始品尝 <span aria-hidden="true">→</span></button>
          </div>
        </article>)}
      </div>
      <p className="menu-footer">直接点食物吃一口，拖动食物换个角度。</p>
    </div>}
  </section>;
}
