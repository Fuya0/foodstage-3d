# 食物资产维护说明

Git 中的最终模型位于 public/models-runtime，配套配置位于本目录的 catalog.json 和 manifest.json。复制 assets 目录本身不包含运行 GLB；完整运行资源还需统一模型包、public/foods 与 public/audio。

## 运行配置与最终文件

- catalog.json 是食物 ID、运行文件前缀、阶段数、口数、缩放、位置、方向及呈现策略的配置入口，应用直接读取。
- manifest.json 的 runtimeFiles 列出全部最终及兼容 GLB 的路径、SHA-256、字节数和 dimensionsMm；其中保留来源与旧加工记录，供本地追溯。
- dimensionsMm 是网格局部 POSITION bounds 的并集，不含节点变换，不能当作最终场景尺寸。
- 菜单轮播/详情预览和各视口试吃共享同一模型文件，预览使用第 0 阶段。runtimeRoots 必须恰好为 {"unified":"public/models-runtime"}；当前 32 个模型含 catalog 的 24 个阶段以及 chocolate/canned 各 4 个兼容文件。
- 原始 source、processed 副本、reference、provenance/reports、legacy public/models、public/models-mobile、public/models-desktop 和 artifacts 继续在本机保留，默认不由 Git 跟踪。源码、测试、锁文件、维护指南和音频许可保持跟踪。

## 无 archive 的常规维护

安装前端依赖后，干净克隆可直接开发和构建；无需取回本机原始目录。需要 Python 3 来生成或校验运行清单：

```powershell
python tools/assets.py inventory --runtime-only
python tools/assets.py verify --runtime-only
```

package 的 assets:inventory 和 assets:verify 已分别使用这两个命令。运行版 inventory 枚举唯一 public/models-runtime 目录的 GLB，更新 runtimeFiles 和统一 runtimeRoots，将顶层 foods 同步为当前 catalog 配置，保留 files/source/provenance 等来源字段，并在写入前检查 catalog 覆盖。运行版 verify 不读取 archive，检查目录覆盖、重复/非法路径、文件哈希、字节数、局部尺寸及 GLB 自包含性。

正式替换最终模型后应重新 inventory，再 verify、类型检查、单测、生产构建和浏览器外观/交互验收。当前无入口的兼容 GLB 仍要登记；不要仅从 catalog 推断整个发布清单。

生产 Vite 插件只打包 runtimeFiles 登记的 public/models-runtime 模型及 public/foods、public/audio；旧 public/models、models-mobile、models-desktop 与本机调试/候选资源不自动复制。开发服务器的 public 行为保持。

## 可选本地高级加工

tools 是实际 Python 执行入口。未带 --runtime-only 的 inventory()、verify()、sync() 及对应 CLI 用于旧双端 archive，依赖本机 source/processed 文件，用于 archive 一致性校验和同步。assets/pipeline 保留历史工具源码副本，部分已与 tools 漂移，不是当前 CLI 的替代入口；各食物 pipeline 也可能要求特定本地输入。

例如有完整 archive 时可执行：

```powershell
python tools/new_asset.py --food-id dessert --stage-count 1 --stage 0 --mobile C:\models\dessert.glb --desktop C:\models\dessert.glb
python tools/assets.py inventory
python tools/assets.py verify --canonical-only
python tools/assets.py sync
python tools/assets.py verify
```

新资产导入登记 catalog，默认拒绝覆盖已有 processed，替换需显式 --force；所有声明阶段齐备后才运行严格 inventory。严格 sync 只把 processed 复制到旧 public/models-mobile、public/models-desktop，报告写入 .codex/assets/last-sync.json；它不会写入 models-runtime。严格 inventory 仅刷新 archive 记录，保留现有 runtimeRoots/runtimeFiles 和来源信息。正式发布需另行从验收候选更新统一 models-runtime，再执行运行版 inventory/verify，不能把旧双端同步当作发布。

菜单接入还需在 src/data/foods.ts 登记名称、封面、声音及 assetStages，并关联菜单项。候选、备份、脚本输出、参数和验证结果统一放仓库 .codex，不删除原始文件或本地历史材料。

## 外观与优化边界

GLB 携带几何、UV、内嵌贴图和 PBR 材质；foodMaterialsBaked 标记控制应用是否跳过重复食品调色。相机、灯光、色调映射和交互属于应用；校准与呈现策略仍由 catalog 和源码控制。部分资产需要 EXT_meshopt_compression / EXT_texture_webp 支持。

历史 glTF-Transform simplify=0.35、缩图和 WebP 配方包含有损处理，不是本轮经视觉复核的精度压缩方案，也不代表全部现有模型的来源。不要按旧报告数字推断当前体积；以当前最终 GLB 与 runtimeFiles 为准。新的优化先输出 .codex 候选并比较外观、几何和实际性能，验收后再替换正式文件。
