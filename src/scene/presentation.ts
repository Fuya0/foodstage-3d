interface Vec3 { x: number; y: number; z: number }

/** Source stages vary in both axes; never magnify a later remnant. */
const remainingSize = [
  { width: 1, height: 1 },
  { width: 0.95, height: 0.97 },
  { width: 0.88, height: 0.90 },
  { width: 0.62, height: 0.62 },
] as const;

export function modelPlacement(base: Vec3, current: Vec3, center: Vec3, stage = 0) {
  const target = remainingSize[stage] ?? remainingSize[3];
  const scale = stage > 0 && base.x > 0 && base.y > 0 && current.x > 0 && current.y > 0
    ? Math.min(1, base.x * target.width / current.x, base.y * target.height / current.y)
    : 1;
  return {
    scale,
    centeredPosition: [-center.x, -center.y, -center.z] as const,
    position: [-center.x, -base.y / (2 * scale) - center.y + current.y / 2, -center.z] as const,
  };
}

export function modelPivot(base: Vec3, current: Vec3, scale: number): readonly [number, number, number] {
  return [0, -base.y / 2 + scale * current.y / 2, 0];
}
