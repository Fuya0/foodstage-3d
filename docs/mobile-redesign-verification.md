# 移动端改版验证记录

2026-10-30 使用 Chrome 156.0.8078.74、Playwright 1.64.1、SwiftShader 软件渲染完成验证。

- `pnpm test`：4 个文件、25 项通过。
- `pnpm typecheck`：通过。
- `pnpm build`：通过；Vite 提示 minified JS chunk 约 1.19 MB。
- `pnpm test:browser`：6 条浏览器流程通过，27.3 秒。
- `git diff --check`：通过。
- 重玩和 WebGL context-loss 流程通过；context watcher 在 R3F context 卸载时解除监听。
- 运行中的 Vite 页面和优化模型 HTTP 200，首阶段模型响应体 2,646,604 bytes。
- 桌面截图 1440x1000，移动截图 390x844。像素采样发现移动画面数千种颜色；空盘截图包含预期盘面颜色。当前模型不支持图像输入，像素采样不是人工审美验收。

## 模型优化

原始 `public/models/burger-*.glb` 与已批准 SHA256 摘要逐一相同，总计 75,363,324 bytes。`public/models-mobile/` 运行资产总计 10,395,080 bytes，减少 86.2%。

可复现命令：`pnpm optimize:sample` 与 `pnpm optimize:models`。脚本 `scripts/optimize-models.mjs` 调用固定版本 glTF-Transform CLI 4.5.1，只写移动端目录。包含 meshopt 压缩、几何简化/量化、贴图缩为 1024 并转换 WebP。所有产物已 `gltf-transform inspect`，扩展为 `EXT_meshopt_compression`、`KHR_mesh_quantization`、`EXT_texture_webp`；Three.js `GLTFLoader` 配置内置 `MeshoptDecoder`。各阶段体积和顶点测量见 `docs/model-optimization.md`。

四个压缩模型依次为 2,646,604、2,014,756、2,716,684、3,017,036 bytes，并在软件 WebGL 浏览器测试中实际加载。视觉保真与性能仍需人工查看和代表性手机测试。

## 交互与限制

每阶段八次有效点击。点击时左右晃动，第八口加强并短暂晃动后直接切换模型，不做升降、缩放或淡出。run/transition token 会拒绝过期完成事件。下一模型未就绪时保留当前模型与进度；加载失败可重试。最终空盘提供重玩操作。

- 当前模型无法人工检查截图；截图保存在 `docs/screenshots/`。
- 自动化移动 viewport 不代表 iOS Safari / Android Chrome 真机验证，未运行真实网络或 FPS 基准。
- GLB 已大幅压缩，但 Three/R3F 应用代码仍约 1.19 MB minified，可另行分包。
- 原始模型的材质/几何缺陷仍保留，原始文件未修改。
