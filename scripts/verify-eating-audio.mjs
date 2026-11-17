// Run after starting Vite for foodstage on :4181 and xlsk on :4182.
import { chromium } from '@playwright/test';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const browser = await chromium.launch({ executablePath: existsSync(chrome) ? chrome : existsSync(edge) ? edge : undefined,
  args: ['--autoplay-policy=no-user-gesture-required'] });
try {
  for (const [folder, port] of [['foodstage-3d', 4181], ['xlsk', 4182]]) {
    const manifest = JSON.parse(readFileSync(resolve('..', folder, 'src/data/eating-audio.json'), 'utf8'));
    const urls = Object.values(manifest).flatMap(stages => stages.flatMap(stage => Object.values(stage)));
    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${port}`);
    const result = await page.evaluate(async urls => {
      const context = new AudioContext();
      const failures = [];
      for (const url of urls) {
        try {
          const response = await fetch(url);
          if (!response.ok) throw Error(`HTTP ${response.status}`);
          const buffer = await context.decodeAudioData(await response.arrayBuffer());
          if (buffer.numberOfChannels !== 1 || buffer.duration < .5) throw Error('invalid decoded audio');
        } catch (error) { failures.push({ url, error: String(error) }); }
      }
      await context.close();
      return { decoded: urls.length - failures.length, failures };
    }, urls);
    if (result.failures.length) throw Error(JSON.stringify(result));
    if (folder === 'xlsk') {
      const playback = await page.evaluate(async () => {
        const starts = [], stops = [];
        const originalStart = AudioBufferSourceNode.prototype.start;
        const originalStop = AudioBufferSourceNode.prototype.stop;
        AudioBufferSourceNode.prototype.start = function (...args) { starts.push(this.buffer?.duration); return originalStart.apply(this, args); };
        AudioBufferSourceNode.prototype.stop = function (...args) { stops.push(true); return originalStop.apply(this, args); };
        const sound = await import('/src/lib/sound.ts');
        sound.primeBiteAudio('satay');
        await new Promise(resolve => setTimeout(resolve, 500));
        sound.playBiteAudio(true, 'satay', 1);
        await new Promise(resolve => setTimeout(resolve, 120));
        const valid = starts.length;
        sound.playBiteAudio(false, 'satay', 2);
        sound.playBiteAudio(true, 'unknown', 1);
        await new Promise(resolve => setTimeout(resolve, 120));
        const afterMuted = starts.length;
        sound.stopBiteAudio();
        sound.playBiteAudio(true, 'satay', 4);
        sound.stopBiteAudio(); // Invalidate work awaiting resume/decode.
        await new Promise(resolve => setTimeout(resolve, 120));
        return { valid, afterMuted, final: starts.length, stopped: stops.length };
      });
      if (playback.valid !== 1 || playback.afterMuted !== 1 || playback.final !== 1 || !playback.stopped) throw Error(JSON.stringify(playback));
      console.log(folder, 'playback/mute/cancellation:', playback);
    }
    console.log(folder, JSON.stringify(result));
    await page.close();
  }
} finally { await browser.close(); }
