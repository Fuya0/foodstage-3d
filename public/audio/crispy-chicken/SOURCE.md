# 素材来源：crispy-chicken

## 原始录音

- 文件：`Ulsanbear_eating_chicken1.wav`
- 来源：<https://freesound.org/people/ty66kill/sounds/503509/>
- 作者：ty66kill
- 授权：**CC BY 4.0（需署名）** <https://creativecommons.org/licenses/by/4.0/>

选它的理由：近距离吃炸鸡的实录，4 秒内 6 次咬合，外壳脆、鸡肉厚，中频（约 1.6 kHz）明显比薯条更重，听感是"咬开厚壳再嚼肉"，不是薄脆的咔嚓。

## 切片

| 文件 | 原始起点 | 原时长 | 用途 |
| --- | --- | --- | --- |
| `bite-1.mp3` | 0.16 s | 0.75 s | 阶段第 1 口，咬断外壳 |
| `chew-1.mp3` | 1.21 s | 0.70 s | 中间口 |
| `chew-2.mp3` | 1.90 s | 0.70 s | 中间口 |
| `finish-1.mp3` | 2.49 s | 1.20 s | 阶段最后 1 口，含鸡肉咀嚼的尾巴 |

## 处理

1. `highpass=f=60` 去掉低频隆隆；
2. 12 ms 淡入、140 ms 淡出，去掉切点爆音；
3. 响度对齐到平均 **−21 dBFS**，`tanh` 软限幅把峰值压在 **−2 dBFS**；
4. 单声道、44.1 kHz、libmp3lame 96 kbps 编码。

> 该素材为 CC BY 4.0，分发本项目时需保留对 **ty66kill**（Freesound #503509）的署名。
