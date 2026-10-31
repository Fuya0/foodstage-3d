import { useId, useRef } from 'react';
import type { Settings } from '../core/settings';

export interface SettingsSheetProps {
  settings: Settings;
  onChange: (settings: Settings) => void;
}

export function SettingsSheet({ settings, onChange }: SettingsSheetProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    onChange({ ...settings, [key]: value });
  };

  return <>
    <button className="icon-button settings-trigger" aria-label="设置" onClick={() => dialog.current?.showModal()}>
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 8.4a3.6 3.6 0 1 0 0 7.2 3.6 3.6 0 0 0 0-7.2Z" /><path d="m19.2 13.5 1.3 1-.9 1.6-1.6-.5a7.8 7.8 0 0 1-1.8 1.1l-.3 1.7h-1.9l-.5-1.6a7.6 7.6 0 0 1-2-.1l-1 1.3-1.7-1 .5-1.7a7.5 7.5 0 0 1-1.3-1.5l-1.7.1-.5-1.8 1.4-.9a7.5 7.5 0 0 1 0-2l-1.4-1 .9-1.6 1.6.5a7.8 7.8 0 0 1 1.8-1.1l.3-1.7h1.9l.5 1.6a7.6 7.6 0 0 1 2 .1l1-1.3 1.7 1-.5 1.7a7.5 7.5 0 0 1 1.3 1.5l1.7-.1.5 1.8-1.4.9a7.5 7.5 0 0 1 0 2Z" /></svg>
    </button>
    <dialog ref={dialog} className="settings-sheet" aria-labelledby={titleId} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div className="sheet-content">
        <div className="sheet-heading">
          <h2 id={titleId}>玩得顺手</h2>
          <button className="icon-button" type="button" aria-label="关闭设置" onClick={() => dialog.current?.close()}>
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17" /></svg>
          </button>
        </div>
        <div className="settings-fields">
          <label className="setting-switch"><span>声音</span><input type="checkbox" checked={settings.sound} onChange={event => update('sound', event.currentTarget.checked)} /></label>
          <label className="setting-switch"><span>触感</span><input type="checkbox" checked={settings.haptics} onChange={event => update('haptics', event.currentTarget.checked)} /></label>
          <label className="setting-control"><span>动态效果</span><select value={settings.motion} onChange={event => update('motion', event.currentTarget.value as Settings['motion'])}><option value="system">跟随系统</option><option value="reduced">减少动态</option><option value="full">完整动态</option></select></label>
          <label className="setting-control"><span>灵敏度 <output>{settings.sensitivity.toFixed(2)}</output></span><input type="range" min="0.5" max="1.5" step="0.05" value={settings.sensitivity} onChange={event => update('sensitivity', Number(event.currentTarget.value))} /></label>
        </div>
        <button className="primary-button" type="button" onClick={() => dialog.current?.close()}>完成</button>
      </div>
    </dialog>
  </>;
}
