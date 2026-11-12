# 食物音效

每种食物一套自己的口腔声，放在 `public/audio/<food-id>/` 下，与 `src/data/foods.ts` 里的 `FoodDefinition.id` 同名。软汉堡、脆薯条、韧披萨、绵蛋糕、气泡饮不能共用同一批素材——质地不同，声音就必须不同。

## 目录约定

```
public/audio/
  README.md
  classic-burger/          # food id = classic-burger
    bite-1.mp3             # 阶段第 1 口：咬断
    chew-1.mp3             # 阶段中间几口（可多段，随机播）
    chew-2.mp3
    finish-1.mp3           # 阶段最后 1 口：更重、更长
    SOURCE.md              # 素材来源与授权
  lemon-soda/              # 饮料：喝，不嚼
    sip-1.mp3              # 阶段第 1 口：首吸
    sip-2.mp3
    sip-3.mp3
    sip-finish.mp3         # 阶段最后 1 口：带尾音
    SOURCE.md
```

文件名即用途，代码按用途取素材，所以同一段录音可以切出不同角色的片断：

| 文件 | 播放时机 | 听感要求 |
| --- | --- | --- |
| `bite-*.mp3` | 每阶段的第 1 口 | 清晰的咬断/咬入，起音快，最能体现食物外壳 |
| `chew-*.mp3` | 阶段中间的口 | 稳定咀嚼，按食物质地定（软/脆/韧），可多段轮换 |
| `finish-*.mp3` | 阶段最后 1 口 | 更重更长，带收尾尾音 |
| `sip-*.mp3` | **仅饮料**的每一口 | 吸管啜饮、液体与冰块；饮料绝不播放咀嚼音 |

缺少或加载失败的 `bite` / `finish` 会回退到 `chews`；素材未能在本口开始后的 35 ms 内就绪时，立即回退到内置合成两拍音。迟到的素材仅缓存供后续使用，不补播。静音或离开品尝界面会取消待播与当前音效。

**饮料例外**：`interaction: 'drink'` 的食物只读 `sips`。没有 `sips` 时保持安静，绝不会退回到咀嚼合成音——让一杯气泡饮发出咀嚼声是错的。

## 分阶段差异

同一份食物，吃到后面质地会变：炸鸡从脆壳吃到鸡肉、薯条从脆吃到绵、气泡饮从满杯吸到空杯。用 `tint` 和 `stages` 表达，不必为每个阶段准备一整套新文件：

```ts
sound: {
  chews: ['/audio/crispy-chicken/chew-1.mp3'],
  stages: [
    { tint: { brightness: 4, weight: -1, rate: 1.03 } },   // 阶段 1：外脆
    { tint: { brightness: 2, weight: 0.5, rate: 1.01 } },
    { tint: { brightness: 0, weight: 1.5, rate: 0.99 } },
    { tint: { brightness: -2.5, weight: 2.5, rate: 0.97 } }, // 阶段 4：肉厚
  ],
},
```

| `tint` 字段 | 作用 | 典型用法 |
| --- | --- | --- |
| `brightness` | 3 kHz 高架增益（dB） | 负值让声音变闷，模拟"从脆壳吃到肉" |
| `weight` | 220 Hz 低架增益（dB） | 正值加厚，模拟肉/芝士的密度 |
| `rate` | 播放速率倍数 | `<1` 更慢更重，`>1` 更脆更快 |
| `gain` | 线性增益倍数 | 空杯吸溜比满杯更响 |

`stages[n]` 可以**整组替换素材**（例如气泡饮第 4 阶段换成 `sip-dry-*.mp3` 的空杯吸溜），未写的字段继承基础配置，`tint` 会与基础 `tint` 合并。缺省阶段自动回退到基础素材。

想给某个食物换成模型生成的、每阶段独立的录音，见 [docs/sound-prompts.md](../../docs/sound-prompts.md)：那里有 24 条可直接投喂文本生音效模型的提示词，以及生成后的目录与登记方式。

## 音频规格

- 单声道、44.1 kHz、MP3 96 kbps（单段 8–16 KB）
- 平均响度对齐到约 **−21 dBFS**，峰值不超过 **−2 dBFS**（避免解码溢出削波）
- 素材时长：`bite`/`chew` 约 0.5–0.7 秒，`finish` 约 0.8–1.0 秒；完整播放并保留自然尾音，连续点击时以 60 ms 交叉淡化衔接，避免硬切与多段堆叠。动画独立采用 0.32 秒节奏
- 两端淡入淡出（约 12 ms / 140 ms），去掉切点爆音

## 新增一种食物

1. 建 `public/audio/<food-id>/`，按上表切好素材，写 `SOURCE.md` 记录来源与授权；
2. 在 `src/data/foods.ts` 的该食物条目里填 `sound`：

```ts
// 固体食物
sound: {
  bite: '/audio/taco/bite-1.mp3',
  chews: ['/audio/taco/chew-1.mp3', '/audio/taco/chew-2.mp3'],
  finish: '/audio/taco/finish-1.mp3',
  level: 0.42, // 可选：播放增益，默认 0.42，每口上下随机浮动 5%
},

// 饮料
interaction: 'drink',
sound: {
  chews: [],
  sips: {
    first: '/audio/milk-tea/sip-1.mp3',
    regular: ['/audio/milk-tea/sip-2.mp3', '/audio/milk-tea/sip-3.mp3'],
    finish: '/audio/milk-tea/sip-finish.mp3',
  },
},
```

3. `pnpm test` —— `foods.test.ts` 会检查**每种食物都有自己的素材、且路径必须指向自己的目录**（借用别家素材会直接失败），饮料必须配 `sips`。

音频在进入品尝界面时预取并解码（`primeBiteAudio`），点击当下不再等待网络；不同食物各自缓存，切换食物不会重复下载。

## 现有素材

| 食物 | 质感 | 来源 | 授权 |
| --- | --- | --- | --- |
| `classic-burger` | 软面包 + 肉饼 | 使用者提供的日常吃汉堡录音（爱给网） | 见 [SOURCE.md](classic-burger/SOURCE.md) |
| `crispy-chicken` | 厚脆外壳 + 肉 | Freesound #503509 · ty66kill | **CC BY 4.0（需署名）** |
| `rosemary-fries` | 细脆 | 使用者提供的炸薯条录音（爱给网） | 见 [SOURCE.md](rosemary-fries/SOURCE.md) |
| `pepperoni-pizza` | 软质块状，无脆响 | 使用者提供的饺子录音（爱给网） | 见 [SOURCE.md](pepperoni-pizza/SOURCE.md) |
| `mango-cheesecake` | 绵软 | 使用者提供的奶油蛋糕录音（爱给网） | 见 [SOURCE.md](mango-cheesecake/SOURCE.md) |
| `lemon-soda` | 满杯吸饮 → 空杯吸溜 | #422263 seenms / #699625 ondondvo / #529295 dreamstobecome | CC0 |

每种的切片位置与处理参数见各自目录下的 `SOURCE.md`。`crispy-chicken` 为 CC BY，分发时需保留 ty66kill 的署名。
