# 素材来源：lemon-soda

## 原始录音

| 用途 | 文件 | 来源 | 作者 | 授权 |
| --- | --- | --- | --- | --- |
| 前三个阶段（正常吮吸） | `straw_drink_sip` | <https://freesound.org/people/ondondvo/sounds/699625/> | ondondvo | CC0 |
| 第四阶段（空杯吸溜） | `straw slurp.wav` | <https://freesound.org/people/dreamstobecome/sounds/529295/> | dreamstobecome | CC0 |

选它们的理由：气泡饮是"喝"不是"嚼"。前三个阶段取正常吮吸的窗口，第四阶段才换成空杯吸溜。

## 为什么换掉了第一口

第一版第一口取自 `Drinking water from a glass`（#422263），那条录音带冰块和玻璃杯，实际播放时有**突兀的物品撞击声**。现在前三个阶段全部改用 `straw_drink_sip` 里挑出的**无撞击、纯吮吸**窗口：

| 文件 | 起点 | 成品 | 频谱重心 | 中频占比 | 波峰因数 |
| --- | --- | --- | --- | --- | --- |
| `sip-1.mp3` | 5.20 s | 0.90 s | 1370 Hz | 0.78 | 14.5 dB |
| `sip-2.mp3` | 13.95 s | 0.90 s | 1833 Hz | 0.80 | 14.8 dB |
| `sip-3.mp3` | 18.50 s | 0.90 s | 1748 Hz | 0.79 | 14.9 dB |
| `sip-finish.mp3` | 20.30 s | 1.10 s | 1661 Hz | 0.79 | 16.1 dB |

波峰因数 14–16 dB 说明没有尖锐瞬态（冰块/杯子撞击会在 25 dB 以上），中频 0.78–0.80 是液体柱的吮吸声。

第四阶段的空杯吸溜保持不变：

| 文件 | 起点 | 成品 |
| --- | --- | --- |
| `sip-dry-1.mp3` | 3.35 s | 0.62 s |
| `sip-dry-2.mp3` | 3.85 s | 0.55 s |
| `sip-dry-finish.mp3` | 5.04 s | 0.72 s |

## 处理

1. 前段吮吸：`highpass=f=60` + `lowshelf=f=200:g=2.5`（补液体厚度）+ 温和压缩；
2. 空杯吸溜：`highpass=f=650`（抽干低频）+ `highshelf=f=4000:g=+2~3.5`（突出气流）；
3. 10 ms 淡入、120 ms 淡出；
4. 峰值 ≤ −2.5 dBFS，再按 RMS 收到 −21 dBFS；空杯最后一口 −19 dBFS，保持"更响"；
5. 单声道、44.1 kHz、96 kbps。
