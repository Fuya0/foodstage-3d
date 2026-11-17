# 独立仓库音效交付

所有运行时食物录音都在本项目 `public/audio/`；阶段映射在本项目 `src/data/eating-audio.json`，饮料与界面音效由本项目源码配置。没有运行时代码从 xlsk 或工作区“音效库”读取文件。

提交时保留 `public/audio/` 内 MP3、WAV、OGG 和来源署名说明。`npm run build` 会将它们复制至本项目 `dist/audio/`，部署整个 dist 即可播放。

仅在本项目目录执行：

```powershell
npm ci
npm run verify:audio
npm run build
npm run verify:audio -- --dist
```

校验工具仅使用 Node 内置模块，检查全部阶段映射的本地路径、来源记录和 SHA-256；`--dist` 额外核对全部已打包音频与 public 文件一致。独立运行与部署无需另一个仓库、Python、ffmpeg 或原始素材库。

`tools/build_eating_audio.py` 等 Python 工具是双项目工作区的本地素材制作工具，重制时才读取工作区音效库；不是构建或运行依赖。“音效库”在工作区以及两个项目的忽略规则中排除，不随项目推送。
