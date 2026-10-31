import { useRef } from 'react';

export function HelpSheet() {
  const dialog = useRef<HTMLDialogElement>(null);
  return <>
    <button className="icon-button help-trigger" aria-label="使用说明" onClick={() => dialog.current?.showModal()}>
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><path d="M9.8 9a2.3 2.3 0 0 1 4.5.7c0 1.8-2.3 1.9-2.3 3.5M12 16.5h.01" /></svg>
    </button>
    <dialog ref={dialog} className="help-sheet" aria-labelledby="help-title" onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div className="sheet-content">
        <div className="sheet-heading"><h2 id="help-title">怎么吃</h2><button className="icon-button" aria-label="关闭说明" onClick={() => dialog.current?.close()}><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17" /></svg></button></div>
        <p>直接轻点汉堡，就能品尝一口。</p>
        <p>拖动可以转着看，吃完可以再来一个。</p>
        <button className="primary-button" onClick={() => dialog.current?.close()}>知道了</button>
      </div>
    </dialog>
  </>;
}
