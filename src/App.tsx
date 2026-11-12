import { useEffect, useMemo, useRef, useState } from "react";
import SketchDish from "./components/SketchDish";
import MenuRibbon from "./components/MenuRibbon";
import Tasting from "./components/Tasting";
import { ArrowDoodle, ChiliDoodle, LeafDoodle, LotusMark } from "./components/Doodles";
import { categories, dishes, getDish, money } from "./data";
import { addLine, cartTotal, changeQuantity, choiceLabels, defaultChoices, lineKey, lineTotal, makeReceipt, readSession, SESSION_KEY, SETTINGS_KEY, unitPrice } from "./lib/order";
import type { CartLine, Session, Settings } from "./types";
import { playTick } from "./lib/sound";

type Screen = "welcome" | "menu" | "detail" | "tasting" | "cart" | "checkout" | "receipt";

const defaultSettings: Settings = { sound: true, reducedMotion: false, autoRotate: true };

function loadSettings(): Settings {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null");
    return {
      sound: typeof saved?.sound === "boolean" ? saved.sound : true,
      reducedMotion: typeof saved?.reducedMotion === "boolean" ? saved.reducedMotion : matchMedia("(prefers-reduced-motion: reduce)").matches,
      autoRotate: typeof saved?.autoRotate === "boolean" ? saved.autoRotate : true,
    };
  } catch { return defaultSettings; }
}

function Brand({ onClick }: { onClick?: () => void }) {
  return (
    <button className="brand" type="button" onClick={onClick} aria-label="暹罗食刻菜单首页">
      <LotusMark />
      <span><strong>暹罗食刻</strong><small>SIAM SHIKE · 手绘菜单</small></span>
    </button>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return <button className={`sketch-switch ${checked ? "is-on" : ""}`} type="button" role="switch" aria-checked={checked} aria-label={label} onClick={onChange}><i /></button>;
}

function SettingsDialog({ open, settings, onChange, onClose, onReset }: {
  open: boolean;
  settings: Settings;
  onChange: (settings: Settings) => void;
  onClose: () => void;
  onReset: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open && !ref.current?.open) ref.current?.showModal();
    if (!open && ref.current?.open) ref.current.close();
  }, [open]);
  return (
    <dialog ref={ref} className="settings-dialog" onCancel={onClose} onClose={onClose}>
      <div className="dialog-tape" aria-hidden="true" />
      <div className="dialog-heading"><div><p className="eyebrow">菜单边角</p><h2>翻页设置</h2></div><button className="round-close" type="button" onClick={onClose} aria-label="关闭设置">×</button></div>
      <div className="setting-row"><span><strong>轻点声音</strong><small>火花、试吃与完成提示</small></span><Toggle label="轻点声音" checked={settings.sound} onChange={() => onChange({ ...settings, sound: !settings.sound })} /></div>
      <div className="setting-row"><span><strong>自动转台</strong><small>停下操作后慢慢转动菜品</small></span><Toggle label="自动转台" checked={settings.autoRotate} onChange={() => onChange({ ...settings, autoRotate: !settings.autoRotate })} /></div>
      <div className="setting-row"><span><strong>减少动态</strong><small>关闭自动旋转、悬浮和纸屑</small></span><Toggle label="减少动态" checked={settings.reducedMotion} onChange={() => onChange({ ...settings, reducedMotion: !settings.reducedMotion })} /></div>
      <button className="text-button reset-link" type="button" onClick={onReset}>清空小票并回到封面</button>
      <p className="dialog-note">订单只保存在当前浏览器，不会发送到餐厅。</p>
    </dialog>
  );
}

function Header({ session, screen, onHome, onCart, onSettings }: {
  session: Session;
  screen: Screen;
  onHome: () => void;
  onCart: () => void;
  onSettings: () => void;
}) {
  const count = session.lines.reduce((sum, line) => sum + line.quantity, 0);
  return (
    <header className="app-header">
      <Brand onClick={onHome} />
      <div className="table-scribble"><span>{session.mode === "dine-in" ? `${session.table || "未填"} 桌` : "打包自取"}</span><i /><small>{session.mode === "dine-in" ? `${session.guests} 位用餐` : "按自己的时间取餐"}</small></div>
      <div className="header-actions">
        <button className="icon-button" type="button" onClick={onSettings} aria-label="打开设置"><span>⚙</span><small>设置</small></button>
        {screen !== "cart" && <button className="ticket-button" type="button" onClick={onCart}><span>小票</span><b>{count}</b></button>}
      </div>
    </header>
  );
}

function EmptyTicket({ onMenu }: { onMenu: () => void }) {
  return (
    <div className="empty-ticket">
      <svg viewBox="0 0 120 100" aria-hidden="true"><path d="M22 10c24 4 48-4 74 1l-3 75c-22-5-44 4-70 0L22 10Z" fill="#FFF9EC" stroke="currentColor" strokeWidth="2" /><path d="M36 31c13 2 29-2 45 0M35 45c16-2 29 2 43 0M34 59c12 2 21-1 32 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M73 65c8-2 13 1 15 7-5 5-11 6-17 3" stroke="#C9573B" strokeWidth="2" fill="none" /></svg>
      <strong>小票还空着</strong>
      <p>先去翻翻菜单，看到喜欢的就夹进来。</p>
      <button className="text-button" type="button" onClick={onMenu}>去挑一道菜 →</button>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState<Session>(readSession);
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [screen, setScreen] = useState<Screen>(session.receipt ? "receipt" : "welcome");
  const [selectedId, setSelectedId] = useState("tom-yum");
  const [choices, setChoices] = useState<Record<string, string>>(() => defaultChoices("tom-yum"));
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [category, setCategory] = useState<(typeof categories)[number]>("招牌");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toast, setToast] = useState("");
  const dish = getDish(selectedId);
  const total = cartTotal(session.lines);
  const count = session.lines.reduce((sum, line) => sum + line.quantity, 0);

  useEffect(() => {
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch { /* Keep the live session usable. */ }
  }, [session]);

  useEffect(() => {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* Settings still apply for this visit. */ }
    document.documentElement.dataset.reduced = settings.reducedMotion ? "true" : "false";
  }, [settings]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function navigate(next: Screen) {
    setScreen(next);
    window.scrollTo({ top: 0, behavior: settings.reducedMotion ? "auto" : "smooth" });
  }

  function selectDish(id: string) {
    setSelectedId(id);
    setChoices(defaultChoices(id));
    setQuantity(1);
    setNote("");
    playTick(settings.sound);
    navigate("detail");
  }

  function startTasting(id: string) {
    setSelectedId(id);
    setChoices(defaultChoices(id));
    setQuantity(1);
    setNote("");
    playTick(settings.sound);
    navigate("tasting");
  }

  const previewLine = useMemo<CartLine>(() => ({
    key: lineKey(selectedId, choices, note),
    dishId: selectedId,
    choices,
    note,
    quantity,
  }), [selectedId, choices, note, quantity]);

  function addToTicket() {
    if (!dish.available) return;
    setSession((current) => ({ ...current, receipt: null, lines: addLine(current.lines, previewLine) }));
    setToast(`${dish.name} × ${quantity}，已经夹进小票`);
    playTick(settings.sound, true);
  }

  function submitOrder() {
    try {
      const receipt = makeReceipt(session);
      setSession((current) => ({ ...current, lines: [], receipt }));
      playTick(settings.sound, true);
      navigate("receipt");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "还差一点信息");
    }
  }

  const header = <Header session={session} screen={screen} onHome={() => navigate("menu")} onCart={() => navigate("cart")} onSettings={() => setSettingsOpen(true)} />;
  const visibleDishes = category === "招牌" ? dishes.filter((item) => item.featured) : dishes.filter((item) => item.category === category);

  return (
    <div className={`app app--${screen}`}>
      {screen === "welcome" && (
        <main className="welcome-page" data-screen="welcome">
          <div className="welcome-top"><Brand /><span className="edition">东南亚风味</span></div>
          <section className="welcome-layout">
            <div className="welcome-copy">
              <p className="eyebrow">一本可以点的手绘菜单</p>
              <h1>先翻一翻，<br />再决定<span>吃什么。</span></h1>
              <p className="welcome-lead">6 道东南亚菜，把食材、份量和辣度都画清楚。拖动菜品看看，再把喜欢的夹进小票。</p>
              <div className="service-choice" aria-label="就餐方式">
                <button type="button" className={session.mode === "dine-in" ? "selected" : ""} onClick={() => setSession({ ...session, mode: "dine-in" })}><span>堂食</span><small>选人数与桌号</small></button>
                <button type="button" className={session.mode === "takeaway" ? "selected" : ""} onClick={() => setSession({ ...session, mode: "takeaway" })}><span>打包</span><small>选好直接下单</small></button>
              </div>
              {session.mode === "dine-in" && <div className="guest-stepper"><span>这一桌几位？</span><div><button type="button" onClick={() => setSession({ ...session, guests: Math.max(1, session.guests - 1) })}>−</button><strong>{session.guests} 位</strong><button type="button" onClick={() => setSession({ ...session, guests: Math.min(12, session.guests + 1) })}>＋</button></div></div>}
              <button className="sketch-button primary welcome-cta" type="button" onClick={() => navigate(session.lines.length ? "menu" : "menu")}>翻开菜单 <ArrowDoodle /></button>
              {session.lines.length > 0 && <p className="saved-note">上次的小票还在：{count} 份菜，{money(total)}</p>}
            </div>
            <div className="welcome-visual">
              <span className="paper-tape tape-one" aria-hidden="true" />
              <LeafDoodle className="welcome-leaf" />
              <ChiliDoodle className="welcome-chili" />
              <SketchDish dish={dishes[0]} settings={settings} />
            </div>
          </section>
          <footer className="welcome-footer"><span>拖一拖菜品</span><i>✦</i><span>点一下有火花</span><i>✦</i><span>试吃留下纸面咬痕</span></footer>
        </main>
      )}

      {screen === "menu" && (
        <main className="menu-page page-shell" data-screen="menu">
          {header}
          <section className="menu-heading"><div><p className="eyebrow">从招牌开始翻</p><h1>今天想吃什么？</h1></div><p>菜品是手绘平面插画，<br />点进去就能拖动观察与选配。</p></section>
          <MenuRibbon settings={settings} onSelect={selectDish} />
          <div className="menu-workspace">
            <section className="dish-catalog">
              <nav className="category-tabs" aria-label="菜品分类">{categories.map((item) => <button key={item} type="button" className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}<span>{item === "招牌" ? dishes.filter((d) => d.featured).length : dishes.filter((d) => d.category === item).length}</span></button>)}</nav>
              <div className="dish-grid">
                {visibleDishes.map((item, index) => (
                  <article className={`dish-card card-angle-${index % 3}`} key={item.id} data-dish={item.id}>
                    <span className="card-tape" aria-hidden="true" />
                    <button className="dish-card-open" type="button" onClick={() => selectDish(item.id)} aria-label={`查看${item.name}详情`}>
                      <span className="dish-image-wrap"><img src={item.image} alt={item.name} loading="lazy" />{!item.available && <b className="soldout-stamp">今日售罄</b>}</span>
                      <span className="dish-card-copy"><small>{item.thai}</small><strong>{item.name}</strong><span>{item.description}</span></span>
                      <span className="dish-card-bottom"><b>{money(item.price)}</b><small>/ {item.unit}</small><i>翻开 →</i></span>
                    </button>
                    {item.available && item.tasting && <button className="card-tasting" type="button" onClick={() => startTasting(item.id)} aria-label={`虚拟试吃${item.name}`}><span>✦</span> 虚拟试吃 <strong>咬一口 →</strong></button>}
                  </article>
                ))}
              </div>
            </section>
            <aside className="ticket-rail">
              <div className="rail-heading"><span>这一桌的小票</span><b>{count} 份</b></div>
              {session.lines.length ? <>
                <div className="rail-lines">{session.lines.slice(0, 4).map((line) => <div key={line.key}><span>{getDish(line.dishId).name} × {line.quantity}</span><b>{money(lineTotal(line))}</b></div>)}</div>
                <div className="rail-total"><span>合计</span><strong>{money(total)}</strong></div>
                <button className="sketch-button primary" type="button" onClick={() => navigate("cart")}>打开小票 <ArrowDoodle /></button>
              </> : <EmptyTicket onMenu={() => document.querySelector(".dish-card")?.scrollIntoView({ behavior: settings.reducedMotion ? "auto" : "smooth" })} />}
              <p className="rail-foot">价格均为演示定价</p>
            </aside>
          </div>
          {count > 0 && <button className="mobile-ticket-bar" type="button" onClick={() => navigate("cart")}><span>小票里有 {count} 份菜</span><strong>{money(total)} · 打开</strong></button>}
        </main>
      )}

      {screen === "detail" && (
        <main className="detail-page page-shell" data-screen="detail" data-dish={dish.id}>
          {header}
          <button className="text-button back-link" type="button" onClick={() => navigate("menu")}>← 继续翻菜单</button>
          <section className="detail-layout">
            <div className="detail-visual"><SketchDish key={dish.id} dish={dish} settings={settings} /><p className="visual-disclaimer">平面手绘模拟观察视角，并非真实 3D 几何模型。</p></div>
            <div className="detail-copy">
              <div className="detail-title"><p className="thai-name">{dish.thai}</p><h1>{dish.name}</h1><p>{dish.description}</p><span className="ingredient-line">{dish.ingredients}</span></div>
              <fieldset className="option-fieldset" disabled={!dish.available}>
                {dish.options.map((group) => <div className="option-group" key={group.id}><legend>{group.label}</legend><div className="option-choices">{group.choices.map((choice) => <button key={choice.id} type="button" className={choices[group.id] === choice.id ? "selected" : ""} onClick={() => setChoices({ ...choices, [group.id]: choice.id })}><span>{choice.label}</span>{choice.delta !== 0 && <small>{choice.delta > 0 ? "+" : "−"}{money(Math.abs(choice.delta))}</small>}</button>)}</div></div>)}
              </fieldset>
              {!dish.available && <p className="soldout-note">今天这道已经画完售空了，先看看其他菜。</p>}
              <label className="note-field"><span>给厨房留一句话</span><input value={note} maxLength={60} onChange={(event) => setNote(event.target.value)} placeholder="比如：青柠另外放" disabled={!dish.available} /></label>
              <div className="detail-order-row">
                <div className="quantity-control"><button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={!dish.available}>−</button><strong>{quantity}</strong><button type="button" onClick={() => setQuantity(Math.min(20, quantity + 1))} disabled={!dish.available}>＋</button></div>
                <button className="sketch-button primary add-button" type="button" onClick={addToTicket} disabled={!dish.available}>夹进小票 · {money(lineTotal(previewLine))}</button>
              </div>
              {dish.available && dish.tasting && <button className="tasting-link" type="button" onClick={() => navigate("tasting")}><span>✦</span><span><small>招牌互动</small> 在菜单里咬上一口</span><strong>开始虚拟试吃 →</strong></button>}
            </div>
          </section>
        </main>
      )}

      {screen === "tasting" && <Tasting dish={dish} settings={settings} onExit={() => navigate("detail")} />}

      {screen === "cart" && (
        <main className="cart-page page-shell narrow-shell" data-screen="cart">
          {header}
          <button className="text-button back-link" type="button" onClick={() => navigate("menu")}>← 再翻几道</button>
          <section className="paper-sheet">
            <div className="sheet-heading"><p className="eyebrow">先核对，再下单</p><h1>这一桌的小票</h1><span>{session.mode === "dine-in" ? `${session.table} 桌 · ${session.guests} 位` : "打包自取"}</span></div>
            {session.lines.length ? <div className="cart-lines">{session.lines.map((line) => {
              const item = getDish(line.dishId);
              return <article className="cart-line" key={line.key} data-line={item.id}><img src={item.image} alt="" /><div className="cart-line-copy"><h2>{item.name}</h2><p>{choiceLabels(line).join(" · ")}</p>{line.note && <small>备注：{line.note}</small>}<button className="remove-line" type="button" onClick={() => setSession({ ...session, lines: session.lines.filter((current) => current.key !== line.key) })}>撕掉这一行</button></div><div className="cart-line-end"><strong>{money(lineTotal(line))}</strong><div className="quantity-control"><button type="button" onClick={() => setSession({ ...session, lines: changeQuantity(session.lines, line.key, -1) })}>−</button><span>{line.quantity}</span><button type="button" onClick={() => setSession({ ...session, lines: changeQuantity(session.lines, line.key, 1) })}>＋</button></div></div></article>;
            })}</div> : <EmptyTicket onMenu={() => navigate("menu")} />}
            {session.lines.length > 0 && <><div className="sheet-total"><span>共 {count} 份菜</span><div><small>合计</small><strong>{money(total)}</strong></div></div><button className="sketch-button primary full-button" type="button" onClick={() => navigate("checkout")}>核对这桌菜 <ArrowDoodle /></button></>}
          </section>
        </main>
      )}

      {screen === "checkout" && (
        <main className="checkout-page page-shell narrow-shell" data-screen="checkout">
          {header}
          <button className="text-button back-link" type="button" onClick={() => navigate("cart")}>← 返回小票</button>
          <section className="checkout-layout">
            <div className="checkout-form paper-sheet">
              <p className="eyebrow">最后一眼</p><h1>确认这一桌</h1>
              <div className="checkout-fact"><span>就餐方式</span><strong>{session.mode === "dine-in" ? "堂食" : "打包自取"}</strong></div>
              {session.mode === "dine-in" && <><div className="checkout-fact"><span>用餐人数</span><strong>{session.guests} 位</strong></div><label className="table-input"><span>桌号</span><input value={session.table} maxLength={8} onChange={(event) => setSession({ ...session, table: event.target.value })} aria-label="桌号" /></label></>}
              <div className="checkout-fact"><span>菜品数量</span><strong>{count} 份</strong></div>
              <div className="checkout-fact total-fact"><span>订单合计</span><strong>{money(total)}</strong></div>
              <button className="sketch-button primary full-button" type="button" onClick={submitOrder}>提交演示订单 <ArrowDoodle /></button>
              <p className="local-note">这是点单演示：订单只保存到这台设备，不接支付、后厨或库存。</p>
            </div>
            <aside className="checkout-doodle"><LotusMark size={82} /><h2>菜单会合上，<br />味道才开始。</h2><p>{session.lines.map((line) => `${getDish(line.dishId).name} × ${line.quantity}`).join(" · ")}</p><LeafDoodle /></aside>
          </section>
        </main>
      )}

      {screen === "receipt" && session.receipt && (
        <main className="receipt-page page-shell narrow-shell" data-screen="receipt">
          <div className="receipt-top"><Brand onClick={() => navigate("menu")} /><button className="icon-button" type="button" onClick={() => setSettingsOpen(true)} aria-label="打开设置"><span>⚙</span><small>设置</small></button></div>
          <section className="receipt-sheet">
            <div className="receipt-stamp">已收到<span>演示订单</span></div>
            <p className="eyebrow">这一桌已经记下</p><h1>谢谢，慢慢等菜。</h1><p className="receipt-id">{session.receipt.id}</p>
            <div className="receipt-meta"><span>{session.receipt.mode === "dine-in" ? `${session.receipt.table} 桌 · ${session.receipt.guests} 位` : "打包自取"}</span><time>{new Date(session.receipt.createdAt).toLocaleString("zh-CN", { hour12: false })}</time></div>
            <div className="receipt-lines">{session.receipt.lines.map((line) => <div key={line.key}><span>{getDish(line.dishId).name} × {line.quantity}</span><strong>{money(lineTotal(line))}</strong></div>)}</div>
            <div className="receipt-total"><span>合计</span><strong>{money(session.receipt.total)}</strong></div>
            <svg className="receipt-scribble" viewBox="0 0 300 45" aria-hidden="true"><path d="M5 26c47-18 87 13 133-3 47-17 83-10 157 4" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" /></svg>
            <p className="local-note">回执已保存在当前浏览器，刷新后仍能查看。</p>
            <button className="sketch-button primary full-button" type="button" onClick={() => { setSession({ ...session, receipt: null, lines: [] }); navigate("menu"); }}>再点一桌 <ArrowDoodle /></button>
          </section>
        </main>
      )}

      {settingsOpen && <SettingsDialog open={settingsOpen} settings={settings} onChange={setSettings} onClose={() => setSettingsOpen(false)} onReset={() => { setSession({ ...session, lines: [], receipt: null }); setSettingsOpen(false); navigate("welcome"); }} />}
      {toast && <div className="toast" role="status"><span>✓</span>{toast}</div>}
    </div>
  );
}
