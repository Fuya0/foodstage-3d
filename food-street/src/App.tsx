import { useEffect, useRef, useState } from "react";
import { stores, type Store } from "./config";
import { StoreArt } from "./components/Storefront";

type Screen = "welcome" | "shops";

function screenFromLocation(): Screen {
  return window.location.hash === "#shops" ? "shops" : "welcome";
}

function Arrow({ direction = "right" }: { direction?: "left" | "right" }) {
  return (
    <svg className={`arrow arrow--${direction}`} viewBox="0 0 42 20" aria-hidden="true">
      <path d={direction === "right" ? "M2 10h35M29 3l8 7-8 7" : "M40 10H5M13 3l-8 7 8 7"} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 52 52" aria-hidden="true">
      <path d="M8 8c11-4 25-3 36 1l1 34c-12 3-25 3-37-1Z" fill="#c9573b" stroke="#3b3128" strokeWidth="2" strokeLinejoin="round" />
      <path d="M15 28h23c-2 9-6 13-12 13s-10-4-11-13Z" fill="#fff8e9" stroke="#3b3128" strokeWidth="2" strokeLinejoin="round" />
      <path d="M13 28h26M20 22c-5-5 4-7 0-12M29 22c-5-5 4-7 0-12" fill="none" stroke="#fff8e9" strokeWidth="2.5" strokeLinecap="round" />
      <path d="m34 16 7-8M37 19l7-8" fill="none" stroke="#3b3128" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function Brand({ onClick }: { onClick?: () => void }) {
  const content = <><BrandMark /><span className="brand-copy"><strong>食刻美食街</strong><small>SHIKE FOOD STREET</small></span></>;
  return onClick
    ? <button className="brand" type="button" onClick={onClick} aria-label="返回食刻美食街开始页">{content}</button>
    : <div className="brand">{content}</div>;
}

function OpenStatus() {
  return <span className="open-status"><i aria-hidden="true" />2 家小店今日营业</span>;
}

function Festoon() {
  return (
    <svg className="festoon" viewBox="0 0 900 100" preserveAspectRatio="none" aria-hidden="true">
      <path d="M-10 14Q220 94 450 31T910 14" fill="none" stroke="#3b3128" strokeWidth="2" />
      {([
        [67, 43, "#efb735"], [157, 59, "#c9573b"], [248, 61, "#73bec9"], [339, 48, "#e3ac3c"],
        [450, 31, "#c9573b"], [561, 38, "#7c9a72"], [652, 54, "#efb735"], [743, 58, "#c9573b"], [834, 41, "#73bec9"],
      ] as const).map(([x, y, color]) => <g key={x}><path d={`M${x} ${y}v12`} stroke="#3b3128" strokeWidth="2" /><circle cx={x} cy={y + 17} r="7" fill={color} stroke="#3b3128" strokeWidth="2" /></g>)}
    </svg>
  );
}

function StreetPreview() {
  return (
    <div className="street-preview" aria-label="手作汉堡、暹罗食刻与一家装修店组成的手绘街景" role="img">
      <Festoon />
      <div className="preview-cloud preview-cloud--one" aria-hidden="true" />
      <div className="preview-cloud preview-cloud--two" aria-hidden="true" />
      <div className="street-arch" aria-hidden="true"><span>食刻美食街</span><small>好吃的小店，都在这里</small></div>
      <div className="preview-stores" aria-hidden="true">
        <div className="preview-store preview-store--burger"><StoreArt kind="burger" /></div>
        <div className="preview-store preview-store--siam"><StoreArt kind="siam" /></div>
        <div className="preview-store preview-store--closed"><StoreArt kind="dessert" /><span>装修中</span></div>
      </div>
      <div className="preview-road" aria-hidden="true"><i /><i /><i /></div>
      <svg className="preview-spark preview-spark--one" viewBox="0 0 50 50" aria-hidden="true"><path d="m25 2 5 16 16-6-12 13 12 13-16-6-5 16-5-16-16 6 12-13L4 12l16 6Z" fill="#efb735" stroke="#3b3128" strokeWidth="2" /></svg>
      <svg className="preview-spark preview-spark--two" viewBox="0 0 50 50" aria-hidden="true"><path d="m25 2 5 16 16-6-12 13 12 13-16-6-5 16-5-16-16 6 12-13L4 12l16 6Z" fill="#73bec9" stroke="#3b3128" strokeWidth="2" /></svg>
    </div>
  );
}

function Welcome({ onEnter }: { onEnter: () => void }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { headingRef.current?.focus({ preventScroll: true }); }, []);
  return (
    <main className="welcome-screen">
      <header className="site-header page-wrap"><Brand /><OpenStatus /></header>
      <section className="welcome-hero page-wrap">
        <div className="welcome-copy">
          <p className="eyebrow"><span aria-hidden="true">✦</span> 两份菜单，一条小街</p>
          <h1 ref={headingRef} tabIndex={-1}>食刻<br /><span>美食街</span></h1>
          <p className="welcome-lead">从手作汉堡到东南亚小菜，挑一家喜欢的小店，转着看、点着吃。</p>
          <button className="primary-action" type="button" onClick={onEnter}>开街逛逛 <Arrow /></button>
          <p className="welcome-fact"><strong>2</strong> 家餐厅可进店点单<span aria-hidden="true">·</span><strong>3</strong> 家小店装修待开</p>
        </div>
        <StreetPreview />
      </section>
      <footer className="welcome-footer page-wrap"><span>虚拟试吃 · 3D 菜单 · 轻松点单</span><span>今天，想逛哪一家？</span></footer>
    </main>
  );
}

function Construction() {
  return (
    <div className="construction" aria-hidden="true">
      <div className="construction-tape"><strong>正在装修</strong><small>COMING SOON</small></div>
      <div className="construction-plank construction-plank--one" />
      <div className="construction-plank construction-plank--two" />
      <div className="construction-cone"><i /></div>
    </div>
  );
}

function ShopCard({ store }: { store: Store }) {
  const art = <div className={`shop-art shop-art--${store.id}`}><StoreArt kind={store.id} />{store.status === "renovating" && <Construction />}</div>;
  const body = (
    <div className="shop-body">
      <div className="shop-status-row">
        <span className={`shop-status shop-status--${store.status}`}><i aria-hidden="true" />{store.status === "open" ? "营业中" : "正在装修"}</span>
        <span className="shop-number" aria-hidden="true">0{stores.indexOf(store) + 1}</span>
      </div>
      <h2>{store.name}</h2>
      <p className="shop-category">{store.category}</p>
      <div className="shop-action-row">
        <span>{store.status === "open" ? "进店点单" : "敬请期待"}</span>
        {store.status === "open" ? <Arrow /> : <svg className="tools-icon" viewBox="0 0 28 28" aria-hidden="true"><path d="m5 23 12-12M14 5l3-3 9 9-3 3M3 25l5-1-4-4Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
      </div>
    </div>
  );
  if (store.status === "open" && store.href) {
    return <a className={`shop-card shop-card--open shop-card--${store.id}`} href={store.href} data-store={store.id} data-status="open" aria-label={`进入${store.name}点单`}>{art}{body}</a>;
  }
  return <article className={`shop-card shop-card--closed shop-card--${store.id}`} data-store={store.id} data-status="renovating" aria-label={`${store.name}，正在装修`}>{art}{body}</article>;
}

function ShopDirectory({ onBack }: { onBack: () => void }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { headingRef.current?.focus({ preventScroll: true }); }, []);
  return (
    <main className="directory-screen">
      <header className="site-header page-wrap"><Brand onClick={onBack} /><OpenStatus /></header>
      <section className="directory-content page-wrap">
        <div className="directory-heading">
          <div><p className="eyebrow"><span aria-hidden="true">✦</span> 食刻美食街 · 店铺导览</p><h1 ref={headingRef} tabIndex={-1}>挑一家，进店点单</h1></div>
          <button className="back-action" type="button" onClick={onBack}><Arrow direction="left" />返回街口</button>
        </div>
        <p className="directory-lead">两家小店已开档。点击营业店铺进入对应菜单，装修店铺暂时不开放。</p>
        <div className="street-scene">
          <Festoon />
          <div className="shops-grid">{stores.map((store) => <ShopCard key={store.id} store={store} />)}</div>
          <div className="street-pavement" aria-hidden="true"><span /><span /><span /><span /><span /><span /></div>
        </div>
        <div className="directory-footnote"><span><i className="legend-dot legend-dot--open" />营业店铺可进入</span><span><i className="legend-dot legend-dot--closed" />装修店铺暂不可进入</span><span className="footnote-tip">每家店都有可旋转的 3D 菜品</span></div>
      </section>
    </main>
  );
}

export default function App() {
  const [screen, setScreen] = useState<Screen>(screenFromLocation);

  useEffect(() => {
    const sync = () => setScreen(screenFromLocation());
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, []);

  useEffect(() => {
    document.title = screen === "shops" ? "食刻美食街 · 选择餐厅" : "食刻美食街 · 开街";
    window.scrollTo(0, 0);
  }, [screen]);

  const enterShops = () => {
    if (window.location.hash !== "#shops") window.location.hash = "shops";
    setScreen("shops");
  };
  const backToWelcome = () => {
    window.history.pushState(null, "", `${window.location.pathname}${window.location.search}`);
    setScreen("welcome");
  };

  return screen === "shops" ? <ShopDirectory onBack={backToWelcome} /> : <Welcome onEnter={enterShops} />;
}
