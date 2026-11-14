import { describe, expect, it } from 'vitest';
import { UnsignedByteType } from 'three';
import { createInkPass, resizeInkPass } from './FoodInkEffect';

describe('ink render budget', () => {
  it('uses an 8-bit single-sample target compatible with low-end WebGL devices', () => {
    const pass = createInkPass();
    try {
      expect(pass.target.texture.type).toBe(UnsignedByteType);
      expect(pass.target.samples).toBe(0);
    } finally { pass.dispose(); }
  });
  it('caps preview rendering at CSS resolution while keeping stroke dimensions stable', () => {
    const pass = createInkPass();
    try {
      resizeInkPass(pass, 780, 480, 390, true);
      expect([pass.target.width, pass.target.height]).toEqual([390, 240]);
      expect(pass.material.uniforms.stroke!.value).toBe(1.5);
      expect(pass.material.uniforms.shadowOffset!.value.toArray()).toEqual([2, -3]);
      resizeInkPass(pass, 780, 480, 390, false);
      expect([pass.target.width, pass.target.height]).toEqual([780, 480]);
      expect(pass.material.uniforms.stroke!.value).toBe(5);
    } finally { pass.dispose(); }
  });
});
