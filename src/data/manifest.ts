import { foodById } from './foods';

export type { FoodStage, ModelCalibration } from './foods';

/** Backward-compatible alias for the original burger stage list. */
export const manifest = foodById('classic-burger').stages;
