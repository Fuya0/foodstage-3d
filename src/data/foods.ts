export interface ModelCalibration {
  readonly scale: number;
  readonly position: readonly [number, number, number];
  readonly yaw: number;
}
export interface FoodStage {
  readonly url: string;
  readonly bites: number;
  readonly calibration: ModelCalibration;
}
export interface FoodDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly cover: string;
  readonly stages: readonly FoodStage[];
}

export const foods: readonly FoodDefinition[] = [
  {
    id: 'classic-burger',
    name: '经典汉堡',
    description: '四层香气，慢慢吃完。',
    cover: '/foods/classic-burger.webp',
    stages: [0, 1, 2, 3].map(index => ({
      url: `/models-mobile/burger-${index}.glb`,
      bites: 4,
      calibration: { scale: 1, position: [0, 0, 0], yaw: 0 },
    })),
  },
];

export function foodById(id: string): FoodDefinition {
  const food = foods.find(item => item.id === id);
  if (!food) throw new Error(`Unknown food: ${id}`);
  return food;
}
