# 食刻（FoodStage 3D）

[项目仓库](https://github.com/Fuya0/foodstage-3d)

餐厅扫码点单演示，结合分类菜单、菜品详情、规格选择、购物车、本地订单回执和可旋转、可点击的 3D 虚拟试吃。订单只保存在当前浏览器，不接支付、后厨或库存。

## 本地开发

需要 Node.js 22.12+；项目使用 pnpm 10.19.0 和 pnpm-lock.yaml。

```sh
pnpm install
pnpm dev
```

打开终端地址并加上 `/?table=A01` 模拟扫描 A01 桌二维码。无桌号时可以浏览菜单，确认订单前选择演示桌号。手机与电脑在同一网络时，可使用 `pnpm dev --host 0.0.0.0` 并访问电脑的局域网地址。

安装依赖后，可直接使用仓库内的 CLI；本工作区没有全局 pnpm 时也适用：

```sh
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5174 --strictPort
node node_modules/typescript/bin/tsc --noEmit
node node_modules/vitest/vitest.mjs run
node node_modules/@playwright/test/cli.js test --workers=1 --output=.codex/test-results/browser
python tools/assets.py verify --runtime-only
node node_modules/vite/bin/vite.js build --outDir .codex/build
```

`pnpm test`、`pnpm typecheck`、`pnpm build`、`pnpm preview` 和 `pnpm test:browser` 也提供相应入口。标准 build 默认输出到 dist；本地检查、截图、报告及 AI 过程产物统一放在 .codex。部署时保持最终构建目录结构完整。

## 使用方式

- 菜单按分类展示菜品，详情支持规格、数量和备注，再加入点单。价格以整数分计算；购物车和最近订单通过 localStorage 恢复。
- 菜单静态封面、轮播和 3D 预览按当前页面需要加载；菜单预览使用 models-runtime 的第 0 阶段。普通饮品使用图片，售罄薯条不提供其他菜品的试吃。
- 虚拟试吃按当前食物的阶段数组加载，首阶段就绪后顺序预取后续阶段。菜单预览与手机、桌面试吃均使用同一套 models-runtime 模型，不按视口选择资源。
- 直接轻点食物进食，拖拽旋转，松手保留惯性；阶段口数、姿态和校准按食物独立配置。失败可重试，退出会取消该次试吃仍在进行的下载和后续预取。
- 音效按食物及阶段配置，饮品使用吸饮声。静音、退出和重玩取消待播音效；设置保存声音、触感、动态效果和拖动灵敏度偏好。
- 试吃和详情各自保留已验收的旋转、回正及减少动态行为；资产发布流程不会更改这些交互。

## 最终模型与发布资源

Git 保留最终运行 GLB、正式图片/音频及来源许可、catalog/manifest、源码、测试、配置与锁文件。原始 source、processed 副本、legacy public/models、public/models-mobile、public/models-desktop、artifacts 和历史过程记录继续保存在本机，默认不跟踪，也不随生产包发布。干净克隆不需要这些本地 archive。

唯一正式运行模型目录为 public/models-runtime。当前共 32 个 GLB：catalog 中 6 种食物各 4 阶段，加 chocolate 与 canned 各 4 个兼容模型。assets/manifest.json 的 runtimeRoots 必须恰好为 {"unified":"public/models-runtime"}。assets/catalog.json 提供食物阶段、前缀和校准；assets/manifest.json 的 runtimeFiles 登记全部最终及兼容模型的路径、SHA-256、字节数和网格局部尺寸。不要因为某个资源目前没有菜单入口就删除兼容模型。

替换或新增最终模型后，从项目根目录执行：

```sh
python tools/assets.py inventory --runtime-only
python tools/assets.py verify --runtime-only
```

它们分别对应 `pnpm assets:inventory` 和 `pnpm assets:verify`。运行版 inventory 只读取统一目录的最终 GLB，更新 runtimeFiles、移除旧 runtimeRoots 键并保留 manifest 的原来源字段；verify 校验最终目录、覆盖、哈希、字节数、尺寸和内嵌资源，不读取 source/processed。

生产 build 关闭整个 public 目录的自动复制：只按 runtimeFiles 复制 public/models-runtime 模型，并带上 public/foods、public/audio。legacy 模型、调试 HTML 和其他候选目录即使保留本机，也不会进入生产包。开发服务器仍保留原有 public 路径行为。

## 添加食物与本地高级加工

素材要求和接入步骤见 [新增食物素材规范](docs/adding-food.md)，资产目录与高级加工说明见 [资产维护说明](assets/README.md)。每种食物需要自己的阶段数组，阶段数量与口数由 catalog 配置；名称、封面、声音和菜单关联仍在源码中登记。

旧 `scripts/optimize-models.mjs`、build-desktop-models.py 以及不带 --runtime-only 的 Python inventory/verify/sync 属于可选本地加工流程，依赖本机原始或 processed 目录。这些旧流程只维护本机旧双端目录，不会向 models-runtime 发布；archive inventory 保留现有 runtimeFiles。历史 simplify=0.35、降分辨率及 WebP 配方包含有损步骤，不能代替本轮在视觉复核下采用的精度压缩；不要直接重跑覆盖已经验收的最终模型。候选、参数、前后对比和验证记录放 .codex，验收后再更新最终 GLB 和 runtimeFiles。

本轮统一模型保留三角面数量，采用顶点去重及精度压缩。贴图多数限制为 1024，汉堡等少数基础色保留 1536；位置/UV 以 16 位为目标，超出适用范围的 UV 保留原精度，法线按视觉复核选 8 或 12 位。原有 foodMaterialsBaked 材质处理保持，不重复调色。

浏览器真机兼容与性能需在目标设备验收。Three.js 依赖可能触发 Vite 的大 chunk 提示；音频来源和使用许可见 public/audio 中保留的说明。
