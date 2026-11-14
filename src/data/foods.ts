import assetCatalog from '../../assets/catalog.json';

function assetStages(id: string): FoodStage[] {
  const food = assetCatalog.foods.find(item => item.id === id);
  if (!food) throw new Error(`Missing asset catalog entry: ${id}`);
  return food.stages.map((stage, index) => ({
    url: `/models-mobile/${food.runtimePrefix}-${index}.glb`,
    bites: stage.bites,
    calibration: {
      scale: stage.calibration.scale,
      position: [...stage.calibration.position] as [number, number, number],
      yaw: stage.calibration.yaw,
    },
    presentation: 'presentation' in stage ? stage.presentation as FoodStage['presentation'] : undefined,
  }));
}

export interface ModelCalibration {
  readonly scale: number;
  readonly position: readonly [number, number, number];
  readonly yaw: number;
}
export interface FoodStage {
  readonly url: string;
  readonly bites: number;
  readonly calibration: ModelCalibration;
  /** Stable mode retains stage-zero source coordinates and pivot as components disappear. */
  readonly presentation?: 'fixed-width' | 'physical-size' | 'physical-size-stable';
}
export interface SipSound {
  /** First sip of a stage: straw meets liquid. Falls back to `regular`. */
  readonly first?: string;
  /** Regular sips; one is picked at random for each middle sip. */
  readonly regular: readonly string[];
  /** Last sip of a stage: longer, often with ice or a swallow. Falls back to `regular`. */
  readonly finish?: string;
}
/**
 * How one stage of eating colours the same recording. Early stages are usually the
 * crisp outside of the food, later stages the softer inside.
 */
export interface SoundTint {
  /** Playback rate multiplier: >1 crisper and faster, <1 heavier and slower. */
  readonly rate?: number;
  /** Linear gain multiplier. */
  readonly gain?: number;
  /** High-shelf gain in dB at 3 kHz: positive crisper, negative duller. */
  readonly brightness?: number;
  /** Low-shelf gain in dB at 220 Hz: positive weightier, negative thinner. */
  readonly weight?: number;
}
/**
 * Recorded mouth sounds for one food. Every food ships its own set, because a crispy
 * taco and a soft burger must not sound alike. Files live in `public/audio/<food-id>/`.
 */
export interface FoodSound {
  /** Opening bite of a stage: crisp first contact. Falls back to `chews`. */
  readonly bite?: string;
  /** Regular mouthfuls; one is picked at random for each middle bite. */
  readonly chews: readonly string[];
  /** Closing mouthful of a stage: heavier and longer. Falls back to `chews`. */
  readonly finish?: string;
  /** Drinks only: sipping replaces chewing, so a soda never sounds like it is being bitten. */
  readonly sips?: SipSound;
  /** Per-stage colouring applied to whichever recording plays. */
  readonly tint?: SoundTint;
  /** Per-stage overrides, index = stage number; missing entries inherit the base set. */
  readonly stages?: readonly (Partial<FoodSound> | undefined)[];
  /** Absolute playback gain (default 0.42), for louder or quieter foods. */
  readonly level?: number;
}
export type FoodInteraction = 'solid' | 'drink';

export interface FoodDefinition {
  /** Defaults to solid for existing foods. */
  readonly interaction?: FoodInteraction;
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly cover: string;
  readonly stages: readonly FoodStage[];
  readonly sound: FoodSound;
}

export const foods: readonly FoodDefinition[] = [
  {
    id: 'crispy-chicken',
    name: '黄金炸鸡腿',
    description: '带骨鸡腿现炸至金黄，酥脆外壳与鲜嫩鸡肉逐口呈现',
    cover: '/foods/crispy-chicken-cutout.png',
    stages: assetStages('crispy-chicken'),
    sound: {
      bite: '/audio/crispy-chicken/bite-1.mp3',
      chews: ['/audio/crispy-chicken/chew-1.mp3', '/audio/crispy-chicken/chew-2.mp3'],
      finish: '/audio/crispy-chicken/finish-1.mp3',
      // 0–1 咬的是脆壳，2–3 已经进到鸡肉：越往后越闷、越重、越慢。
      stages: [
        { tint: { brightness: 2.5, weight: -0.5, rate: 1.03 } },
        { tint: { brightness: 1, weight: 0.5, rate: 1.0 } },
        { tint: { brightness: -0.5, weight: 1.5, rate: 0.99 } },
        { tint: { brightness: -2.5, weight: 2.5, rate: 0.97 } },
      ],
    },
  },
  {
    id: 'lemon-soda',
    interaction: 'drink',
    name: '鲜柠气泡饮',
    description: '透明杯中的柠檬气泡饮、冰块与柠檬片，液位逐阶段下降',
    cover: '/foods/lemon-soda.svg',
    stages: assetStages('lemon-soda'),
    sound: {
      chews: [],
      sips: {
        first: '/audio/lemon-soda/sip-1.mp3',
        regular: ['/audio/lemon-soda/sip-2.mp3', '/audio/lemon-soda/sip-3.mp3'],
        finish: '/audio/lemon-soda/sip-finish.mp3',
      },
      // 前三个阶段是满杯的正常吸饮（液体多、气声少），只有最后阶段换成空杯吸溜。
      stages: [
        { tint: { brightness: -1, rate: 1.0 } },
        { tint: { brightness: 0, gain: 1.03, rate: 1.0 } },
        { tint: { brightness: 1, gain: 1.07, rate: 1.01 } },
        {
          tint: { brightness: 3, gain: 1.16, rate: 1.04 },
          sips: {
            first: '/audio/lemon-soda/sip-dry-1.mp3',
            regular: ['/audio/lemon-soda/sip-dry-2.mp3'],
            finish: '/audio/lemon-soda/sip-dry-finish.mp3',
          },
        },
      ],
    },
  },
  {
    id: 'mango-cheesecake',
    name: '芒果芝士蛋糕',
    description: '金黄芒果层、细腻芝士与酥香饼底，逐口呈现自然咬痕',
    cover: '/foods/mango-cheesecake-cutout.png',
    stages: assetStages('mango-cheesecake'),
    sound: {
      bite: '/audio/mango-cheesecake/bite-1.mp3',
      chews: ['/audio/mango-cheesecake/chew-1.mp3', '/audio/mango-cheesecake/chew-2.mp3'],
      finish: '/audio/mango-cheesecake/finish-1.mp3',
      level: 0.47,
      // 软质甜点：变化本来就小，只做很轻的明暗差，免得听起来不像同一块蛋糕。
      stages: [
        { tint: { brightness: 0, weight: -0.5, rate: 1.01 } },
        { tint: { brightness: -0.5, rate: 1.0 } },
        { tint: { brightness: -1, weight: 0.5, rate: 0.99 } },
        { tint: { brightness: -1.5, weight: 1, rate: 0.98 } },
      ],
    },
  },
  {
    id: 'pepperoni-pizza',
    name: '意式双重芝士披萨',
    description: '金黄饼边、融化双重芝士与意式香肠，点缀新鲜罗勒',
    cover: '/foods/pizza-six-0-cutout.png',
    stages: assetStages('pepperoni-pizza'),
    sound: {
      bite: '/audio/pepperoni-pizza/bite-1.mp3',
      chews: ['/audio/pepperoni-pizza/chew-1.mp3', '/audio/pepperoni-pizza/chew-2.mp3'],
      finish: '/audio/pepperoni-pizza/finish-1.mp3',
      level: 0.35,
      // 披萨是软质块状食物：不做脆响，只有饼底的轻微韧感和芝士的黏。
      stages: [
        { tint: { brightness: 0, weight: 0, rate: 1.01 } },
        { tint: { brightness: -0.5, weight: 0.5, rate: 1.0 } },
        { tint: { brightness: -1, weight: 1, rate: 0.99 } },
        { tint: { brightness: -2, weight: 1.5, rate: 0.98 } },
      ],
    },
  },
  {
    id: 'rosemary-fries',
    name: '迷迭香薯条',
    description: '带皮粗薯现炸至金黄，撒上海盐与迷迭香',
    cover: '/foods/rosemary-fries-cutout.png',
    stages: assetStages('rosemary-fries'),
    sound: {
      bite: '/audio/rosemary-fries/bite-1.mp3',
      chews: ['/audio/rosemary-fries/chew-1.mp3', '/audio/rosemary-fries/chew-2.mp3'],
      finish: '/audio/rosemary-fries/finish-1.mp3',
      level: 0.67,
      // 细脆薯条：外层的脆感逐阶段减弱，后面更接近土豆的绵。
      stages: [
        { tint: { brightness: 2, weight: -0.5, rate: 1.02 } },
        { tint: { brightness: 0.5, weight: 0.5, rate: 1.0 } },
        { tint: { brightness: -0.5, weight: 1.5, rate: 0.985 } },
        { tint: { brightness: -2, weight: 2, rate: 0.97 } },
      ],
    },
  },
  {
    id: 'classic-burger',
    name: '经典汉堡',
    description: '四层香气，慢慢吃完。',
    cover: '/foods/burger-menu-cutout.png',
    stages: assetStages('classic-burger'),
    sound: {
      bite: '/audio/classic-burger/bite-1.mp3',
      chews: ['/audio/classic-burger/chew-1.mp3', '/audio/classic-burger/chew-2.mp3'],
      finish: '/audio/classic-burger/finish-1.mp3',
      // 生菜与烤面包的脆在前，肉饼的厚在后。
      stages: [
        { tint: { brightness: 2, weight: 0, rate: 1.02 } },
        { tint: { brightness: 1, weight: 1, rate: 1.0 } },
        { tint: { brightness: -0.5, weight: 2, rate: 0.985 } },
        { tint: { brightness: -1.5, weight: 2.5, rate: 0.97 } },
      ],
    },
  },
];

export function foodById(id: string): FoodDefinition {
  const food = foods.find(item => item.id === id);
  if (!food) throw new Error(`Unknown food: ${id}`);
  return food;
}

/**
 * Resolve the sound set for one stage. Overrides are shallow except `tint`, which merges
 * so a stage can change the texture without restating the whole recipe.
 */
export function soundForStage(sound: FoodSound, stage: number): FoodSound {
  const override = sound.stages?.[stage];
  if (!override) return sound;
  const tint = { ...sound.tint, ...override.tint };
  return {
    ...sound,
    ...override,
    tint: Object.keys(tint).length > 0 ? tint : undefined,
    stages: undefined,
  };
}
