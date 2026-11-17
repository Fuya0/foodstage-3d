# 新增食物：交付素材与接入规范

## 你需要提供什么

推荐交一个文件夹，包含以下内容：

```text
strawberry-cake/
  stage-0.glb       # 完整食物
  stage-1.glb       # 吃掉约 1/4
  stage-2.glb       # 吃掉约 1/2～2/3
  stage-3.glb       # 最后一小块，仍能看出是什么食物
  cover.webp       # 食物柜封面，可选；建议透明背景、正方形 800～1200 px
  info.txt         # 中文名称、一句描述、阶段顺序、来源与使用授权
```

当前汉堡使用 4 阶段。程序支持每种食物自己的阶段数组和每阶段口数，但当前屏幕尺寸校准以 4 阶段为基础；更多或更少阶段可以接入，需要同时调视觉比例。只有完整模型也能提供用于评估或制作单阶段原型；程序不会凭空生成真实的咬痕、内部切面和余下阶段。

## 模型与贴图要求

- 首选 **GLB / glTF 2.0**，颜色贴图、法线、粗糙度等尽量内嵌。独立 `.gltf` 也可以，但必须连同 `.bin` 和全部贴图一起提供。
- 四个模型使用相同单位、朝向、原点和基础尺寸；建议米为单位、Y 轴朝上。未被吃掉的部位应在各阶段尽量对齐，避免切换时移动或旋转。
- 每阶段是独立、完整的可显示网格；咬痕内侧有真实几何、材质和纹理，不要只把外壳透明裁掉。尽量闭合切面，避免漏光、黑洞或背面缺失。
- 使用标准 PBR 材质：Base Color（sRGB）、Roughness / Metallic、Normal（可选）、AO（可选）。食品通常金属度为 0；粗糙度要体现面包、果皮、肉、奶油等差别。避免把高光和强阴影烘进颜色图，避免依赖 Blender 专用节点。
- 推荐每阶段约 2～8 万三角面、1～4 个材质、颜色贴图 1K～2K；统一发布图通常从 1K 候选开始，并在手机与桌面实际画面复核；可见损失时保留更高精度。不是强制导入上限，重点是让四阶段加载与转动流畅。细小形状优先烘焙到法线图。
- 尽量让一个食物四阶段发布后的总资源落在约 10～15 MB 内。原始高质量文件也可以交，我会保留原件并生成优化副本。
- 不要包含桌子、盘子、背景、灯光或相机；需要盘子时单独说明，它不应该随食物被吃掉。
- 如果提供 OBJ / FBX / Blender 文件，需要全部纹理和明确的导出说明；接入前会转换成 GLB。GLB 最直接。

## 可选参考素材

提供 2～3 张真实食物照片（正面、侧面、咬开后的内部）会帮助核对颜色、油润度和切面。封面或参考照片可以后补。每种食物需要自己的咀嚼录音：可提供无背景音乐、无明显环境噪声的短 WAV / OGG（最好是一段连续吃该食物的 5～15 秒录音，从中能切出咬断、常态咀嚼、收尾三种片段），并说明使用授权；切片、响度对齐和命名由我处理，规则见 [音频素材规范](../public/audio/README.md)。

## 接入时我会处理的内容

1. 检查四个阶段是否完整、有贴图、尺寸和朝向一致。
2. 原始文件和加工过程保留在本机，候选、备份及验证记录放仓库 .codex。验收后只将统一最终模型放入 public/models-runtime，并在 assets/catalog.json 登记阶段、运行前缀和校准；Git 只跟踪最终运行资产及源码，不要求克隆本机 source/processed/history。
3. 在 `src/data/foods.ts` 注册名称、描述、封面、assetStages 及该食物的 `sound`（指向 `public/audio/<id>/` 的声音），再关联菜单条目。阶段路径、口数和校准从 catalog 读取。`sound.chews` 为必填，饮品可使用空数组并配置 sips。
4. 调整每阶段屏幕尺寸与过渡；为食物检查灯光和材质。当前运行时会对标准 PBR 食品材质温和校色并限制过低的粗糙度，新资产会按实际效果复核。
5. 运行 `python tools/assets.py inventory --runtime-only` 和 `python tools/assets.py verify --runtime-only`，登记并检查全部最终/兼容 GLB；这两个入口不依赖本地 archive。再检查类型、单测、生产构建、手机布局、直接点击、拖动旋转、完整吃完、重玩与失败重试。

你不需要自己写配置或代码。最有用的第一份交付就是：**一种食物、4 个带贴图的 GLB、名称、阶段顺序**。


## 发布与可选高级流程

菜单预览固定使用统一模型的第 0 阶段；手机和桌面试吃均加载同一 public/models-runtime 文件。runtimeRoots 必须恰好为 {"unified":"public/models-runtime"}；同一候选需在两类视口检查。当前统一包包含 24 个 catalog 阶段及 chocolate/canned 各 4 个兼容文件。生产包仅包含 manifest.runtimeFiles 列出的模型与正式 public/foods、public/audio 目录；原始 source/processed、legacy 模型和历史候选仍留本机，不随包发布。

旧 scripts/optimize-models.mjs、build-desktop-models.py 及不带 --runtime-only 的 Python inventory/verify/sync 是依赖本地 archive 的高级加工工具。旧 simplify=0.35、降分辨率/WebP 配方包含有损步骤，不是本轮经过视觉复核的精度压缩配方；使用前应先做候选和外观比较。旧 inventory 保留统一发布清单，旧 sync 仅写旧 public/models-mobile、public/models-desktop，不向 models-runtime 发布。将已验收候选单独替换到统一目录后，再生成运行版 inventory 和 verify；它们保留原来源信息并移除旧 runtimeRoots 键。旧目录继续留本机且不进入生产包。详细规则见 [资产维护说明](../assets/README.md)。
