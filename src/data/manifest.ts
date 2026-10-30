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

/** Original GLB copies. Identity calibration is refined through visual inspection in Task 2. */
export const manifest: readonly FoodStage[] = [0, 1, 2, 3].map(index => ({
  url: `/models/burger-${index}.glb`,
  bites: 8,
  calibration: { scale: 1, position: [0, 0, 0], yaw: 0 },
}));
