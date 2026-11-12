# 咀嚼音效生成提示词 v2

> 目标：让文本生音效模型（ElevenLabs SFX / Stable Audio / AudioGen / 其他）产出**听起来像嘴里发出的**咀嚼声，
> 而不是"游戏里那种咔嚓音效"。
>
> v1 只写了"脆/软/湿"这类形容词，模型会退回它训练里最常见的套路：采样库式的干净咔嚓、或者直接编成节奏。
> v2 改成**物理节拍描述**：每个阶段写清楚"牙齿怎么合上、什么时候出汁、什么时候咽"。

## 为什么大多数"咀嚼"提示词出来不真实

| 常见写法 | 模型实际生成 | 改成 |
| --- | --- | --- |
| `crunchy chewing sound` | 采样库式的单次咔嚓，干净、无尾音、像踩碎叶子 | 描述**咬合次数与时间**：`one bite, three short crackles within 120 ms` |
| `eating sounds` | 变成 ASMR 视频感，带呼吸、带房间混响 | 明确 `close microphone, dry, no room tone` |
| `chewing`（只写一个词） | 被理解成节奏，甚至变成 beatbox | 加 `no rhythm, no melody, no instruments, non-musical foley` |
| 不写口腔 | 只有"食物碎裂"，缺"嘴" | 加 `saliva, wet lip smack, teeth meeting through food` |
| 不写阶段 | 四个阶段生成同一段 | 每阶段单独写"还剩多少外壳/多少肉" |

## 提示词结构：五个槽位

按这个顺序写，模型最稳：

1. **动作**：咬 / 嚼 / 吸，几次，多长（`one bite`, `two chews`）
2. **质感层**：外壳、内部、汁水（`crackling crust`, `soft crumb`, `juicy meat`）
3. **口腔细节**：唾液、唇齿、吞咽（`wet lip smack`, `teeth through fibers`, `brief swallow`）
4. **录制条件**：`close microphone, dry, mono, no reverb, no background`
5. **负向约束**：`no music, no rhythm, no melody, no instruments, no voice, no room tone`

## 逐食物 × 阶段提示词

### 1. 经典汉堡

| 阶段 | 英文 | 中文 | 物理节拍 |
| --- | --- | --- | --- |
| 1 | `One bite into a soft burger: crisp lettuce snaps twice, toasted bun compresses with an airy bread squish, close microphone, dry, mono, no music, 0.8 s` | 咬入软汉堡：生菜两下脆断，烤面包被压出空气声 | 0–120 ms 生菜脆断，120–400 ms 面包压缩，尾音几乎没有回响 |
| 2 | `One chew of burger: wet bread and lettuce fold together, juicy beef starts releasing, soft lip smack, close and dry, 0.8 s` | 嚼一口：湿面包与生菜折叠，牛肉开始出汁，轻微唇齿声 | 中段 300 ms 持续湿润摩擦，末尾一次轻拍 |
| 3 | `One chew of a beef patty with soft bun: dense and juicy, teeth sink through ground meat, almost no crunch, close and dry, 0.8 s` | 嚼牛肉饼与软面包：厚实多汁，牙齿陷进肉里，几乎没有脆感 | 低频为主，无明显瞬态，中段有汁水挤压声 |
| 4 | `Final mouthful of burger: heavy muffled chew of meat and bread, slow jaw, brief swallow at the end, close and dry, 0.9 s` | 最后一口：肉与面包的沉闷咀嚼，下颌缓慢，末尾轻咽 | 全程低沉，收尾 150 ms 是吞咽而非脆响 |

### 2. 黄金炸鸡腿

| 阶段 | 英文 | 中文 | 物理节拍 |
| --- | --- | --- | --- |
| 1 | `One sharp bite into fried chicken crust: breading shatters in three or four crackles within 120 ms, dry crumb falls away, close microphone, dry, no music, 0.8 s` | 咬开炸鸡脆壳：裹粉在 120 ms 内炸裂三到四下，干碎屑掉落 | 瞬态密集，高频突出，尾音短 |
| 2 | `One chew of fried chicken: saliva softens the crust, crackle is shorter, first juicy meat squelch underneath, close and dry, 0.8 s` | 嚼炸鸡：唾液让外壳变软，脆响变短，底下出现第一声肉汁 | 脆响数量减半，中频开始出现 |
| 3 | `Chewing tender fried chicken meat: soft and moist, teeth meet through fibers, almost no crust left, close and dry, 0.8 s` | 嚼嫩鸡肉：柔软多汁，牙齿穿过纤维，几乎没有外壳 | 几乎无 3 kHz 以上能量 |
| 4 | `Last bites of fried chicken: dense meaty chew, low and muffled, a little wetness, brief swallow, 0.9 s` | 最后几口：肉感厚实、低沉，带一点湿润，末尾轻咽 | 最低频、最慢、最闷 |

### 3. 迷迭香薯条

| 阶段 | 英文 | 中文 | 物理节拍 |
| --- | --- | --- | --- |
| 1 | `One crisp bite through a thick-cut french fry: a single high thin snap, then a soft potato crumble, close microphone, dry, no music, 0.7 s` | 咬断粗薯条：一声高频细脆的断裂，随后是软的土豆碎 | 单次极短瞬态 + 短尾 |
| 2 | `Two quick chews of crispy fries: light irregular crackle, potato inside starting to give, close and dry, 0.7 s` | 快速嚼两下脆薯条：不规则的轻脆响，内部开始变软 | 2–3 个不规则瞬态 |
| 3 | `Chewing a softer french fry: mostly potato texture, faint crackle only at the edges, close and dry, 0.7 s` | 嚼偏软的薯条：以土豆质感为主，只有边缘轻微脆响 | 高频明显减少 |
| 4 | `Last bites of french fries: soft mealy potato, no crack, slightly sticky, quiet, 0.9 s` | 最后几口：绵软的土豆泥感，没有脆响，略黏 | 无瞬态，低频为主 |

### 4. 意式双重芝士披萨

| 阶段 | 英文 | 中文 | 物理节拍 |
| --- | --- | --- | --- |
| 1 | `One bite into thin pizza crust: crisp crackle, then melted cheese pulling and squeaking against teeth, close microphone, dry, 0.8 s` | 咬入薄披萨饼边：脆响，随后融化芝士拉扯并与牙齿摩擦 | 脆响 100 ms + 芝士拉丝 300 ms |
| 2 | `One chew of pizza: chewy dough folding, cheese squeak, a little crisp from the crust, close and dry, 0.8 s` | 嚼披萨：面团折叠的韧性，芝士摩擦声，还有一点饼边脆感 | 中频主导，带黏连 |
| 3 | `Chewing soft pizza dough and cheese: little crunch, sticky and dense, close and dry, 0.8 s` | 嚼软饼底与芝士：几乎没有脆感，黏而厚 | 高频进一步下降 |
| 4 | `Final bite of pizza: dense sticky cheese mass, heavy low chew, 0.9 s` | 最后一口：厚重黏连的芝士团，低沉的咀嚼 | 最低频，收尾黏 |

### 5. 芒果芝士蛋糕

| 阶段 | 英文 | 中文 | 物理节拍 |
| --- | --- | --- | --- |
| 1 | `One soft bite into mango cheesecake: creamy top yields with almost no sound, faint crumb of the base, close microphone, dry, 0.9 s` | 咬入芒果芝士蛋糕：奶油层几乎无声地陷下，只有极轻的饼底颗粒 | 极弱瞬态，低频为主 |
| 2 | `Chewing dense creamy cheesecake: smooth and sticky on the palate, soft lip smack, close and dry, 0.9 s` | 嚼厚实奶油芝士：口腔里顺滑发黏，轻微唇齿声 | 中低频，持续 |
| 3 | `Chewing cheesecake with crumb base: gentle grit, slightly sticky, close and dry, 0.9 s` | 嚼到饼底：轻微颗粒感，略黏 | 出现一点点中高频 |
| 4 | `Last soft bites of cheesecake: muffled creamy chew, very quiet, brief swallow, 1.0 s` | 最后几口：沉闷安静的奶油咀嚼，末尾轻咽 | 最闷最轻 |

### 6. 鲜柠气泡饮

| 阶段 | 英文 | 中文 | 物理节拍 |
| --- | --- | --- | --- |
| 1 | `One sip of soda through a plastic straw, full cup: liquid column rises, gurgle, ice clinks once, close microphone, dry, 0.9 s` | 满杯吸一口：液体上升的咕噜声，冰块轻碰一下 | 低频液体 + 一次冰块瞬态 |
| 2 | `One shorter sip of soda: less liquid, quicker slurp, one soft gurgle, close and dry, 0.9 s` | 短吸一口：液体变少，吸溜更快，一声轻咕噜 | 时长略短 |
| 3 | `One airy sip near the bottom of the cup: more air than liquid, thin slurp, close and dry, 0.9 s` | 快见底：空气多于液体，吸溜变薄 | 低频削弱，高频气流出现 |
| 4 | `One loud dry slurp from an almost empty cup: air rushing through the straw, straw squeak, final small gulp, close and dry, 1.0 s` | 空杯底的大声吸溜：空气穿过吸管，吸管摩擦，最后一小口吞咽 | 最响、最干、末尾吞咽 |

## 负向约束（每条都建议附上）

```text
no music, no rhythm, no melody, no beat, no instruments, no singing,
no voice, no speech, no room tone, no reverb, no crowd, no background noise,
not a sound library effect, not cartoonish, not looping
```

## 验收标准（可量化，不靠耳朵猜）

拿到候选后先测这四项，再决定要不要听：

| 质感档 | 频谱重心 | 3 kHz 以上占比 | 判定 |
| --- | --- | --- | --- |
| 脆（炸鸡 1 段、薯条 1 段、披萨 1 段） | 4–7 kHz | > 0.5 | 若重心 < 3 kHz，说明模型给的是软咀嚼，不合格 |
| 中（汉堡、披萨 2–3 段） | 2–4 kHz | 0.25–0.45 | 高频太少的"糊"声不合格 |
| 软（蛋糕、汉堡 4 段） | 0.7–1.5 kHz | < 0.15 | 若有明显脆响，不合格 |
| 吸饮（气泡饮 1–3 段） | 1.2–2.0 kHz | 0.1–0.25 | 必须是液体/气流，不能有咀嚼瞬态 |

阶段之间的目标差值（对应项目里已有的 `tint`）：

- 第 1 段 → 第 4 段，3 kHz 以上能量应下降约 **6 dB**（`brightness` 从 +4 到 −2.5 dB 的听感）
- 第 1 段 → 第 4 段，220 Hz 以下应上升约 **3–4 dB**（`weight` 从 −1 到 +2.5 dB）
- 时长：`bite`/`chew` 0.5–0.7 s，`finish` 0.8–1.0 s，气泡饮 0.9–1.2 s

## 关于 MiniMax（当前账号实测）

2026-11-11 实测结果，**未消耗任何生成额度**（三次都是错误返回）：

| 接口 | 结果 |
| --- | --- |
| `api.minimax.cn/v1/music_generation` | `2049 invalid api key` |
| `api.minimax.io/v1/music_generation` | `2153 This Music API is no longer available to new users` |
| `api.minimax.io/v1/t2a_v2`（鉴权探测） | `2013 invalid params` → **说明 key 在国际站有效** |
| `music-3.0-free` | 同样 `2153` |

结论：

1. key 本身有效，但它属于国际站（`api.minimax.io`）；国内站 `api.minimax.cn` 不认这个 key。
2. MiniMax 的**音乐生成接口对该账号已关闭**（新用户不再开放），且 MiniMax **没有音效生成接口**——只有 ASR、TTS、音色复刻、音乐。
3. 所以用这个 key 生成咀嚼声这条路当前走不通，继续调用只会反复拿到 `2153`。

可行替代：

- MiniMax 网页版 **Audio**（<https://www.minimax.io/audio>）若提供音效功能，可手动用上面的提示词生成后再放进项目；
- 用 ElevenLabs Sound Effects / Stable Audio / AudioGen 跑同一套提示词；
- 若账号能开通历史付费音乐权限，再走 `music_generation`——但音乐模型本质是谱曲，做拟音仍然不保证，不推荐把额度花在这里。
