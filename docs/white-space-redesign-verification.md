# 白色留白改版验证

日期：2026-10-30。环境：Chrome 156.0.8078.74、Playwright 1.64.1、SwiftShader 软件渲染。

- `pnpm test`：5 个文件，28 项通过。
- `pnpm typecheck`：通过。
- `pnpm build`：通过；Vite chunk 提示 minified JS 约 1.19 MB。
- `pnpm test:browser`：6 条通过，27.6 秒，覆盖 32 口和重玩、阶段加载失败保留与重试、移动布局、解析失败重试、手势取消、渲染错误重试、WebGL context loss。
- `git diff --check`：通过。
- Playwright 截图 1440x1000 桌面、390x844 移动。8px 采样下近白像素比例：桌面初始 80.9%，桌面交互 80.1%，移动 86.4%，空盘 99.9%；未检测到绿色背景采样。此为颜色统计，不等于人工视觉验收。
- 常态 UI 移除阶段数、口数进度、快捷提示、盘面外框；重玩为透明底文字操作。
- 统一显示大小通过 `presentationScale` 对每阶段最大边进行归一；stage 改变时清空旋转与惯性。
- 点击轻微水平颤动，循环粒子缓冲区产生少量烘烤色碎屑；无新增贴图资产。
- 原始模型 SHA256 保持原值；四个压缩模型总计 10,395,080 bytes，对比原始 75,363,324 bytes 减少 86.2%。优化细节见 `docs/model-optimization.md`。

## 写实化建议的输入观察

`gltf-transform inspect public/models/burger-0.glb` 显示：单一 `Designer_Logic_PBR` 材质；baseColor PNG 2048x2048、5.85 MB；metallicRoughness PNG 2048x2048、1.07 MB；无动画。两张纹理的 GPU 估算各为 22.37 MB。当前无法从纹理文件作人工图像观察，因此不能断言其内容或已达到何种写实程度。

## 验收限制

未在人类可视模型环境中逐张检查截图；没有真实 iOS/Android 真机 FPS/网络数据。程序化缩放让包围盒最大边一致，不会修改资产顶点，但非等比形状/盘底厚度是否主观完全一致仍需人眼检查。