import { describe, expect, it } from 'vitest';
import { foodById, foods, soundForStage } from './foods';

describe('food definitions', () => {
  it('has four stage definitions for crispy chicken', () => {
    const food = foodById('crispy-chicken');
    expect(food.stages).toHaveLength(4);
    expect(food.stages.map(stage => stage.bites)).toEqual([3, 3, 3, 3]);
    expect(food.stages.map(stage => stage.url)).toEqual([
      '/models-mobile/crispy-chicken-0.glb', '/models-mobile/crispy-chicken-1.glb',
      '/models-mobile/crispy-chicken-2.glb', '/models-mobile/crispy-chicken-3.glb',
    ]);
  });
  it('registers the drink and dessert as independent four-stage foods', () => {
    for (const id of ['lemon-soda', 'mango-cheesecake']) {
      const food = foodById(id);
      expect(food.stages).toHaveLength(4);
      expect(food.stages.every(stage => stage.url.startsWith(`/models-mobile/${id}-`))).toBe(true);
    }
    const soda = foodById('lemon-soda');
    expect(soda.interaction).toBe('drink');
    expect(soda.sound.chews).toEqual([]);
    expect(soda.sound.sips?.regular.length).toBeGreaterThan(0);
    expect(foodById('mango-cheesecake').sound.chews.length).toBeGreaterThan(0);
    expect(foods).toHaveLength(6);
    expect(foods.some(food => food.id === 'chocolate-brownie')).toBe(false);
    expect(foodById('mango-cheesecake').name).toBe('芒果芝士蛋糕');
  });

  it('gives every food its own playable mouth sounds', () => {
    for (const food of foods) {
      const { bite, chew, finish } = { bite: food.sound.bite, chew: food.sound.chews, finish: food.sound.finish };
      const sips = food.sound.sips;
      const urls = [bite, finish, ...chew, ...(sips ? [sips.first, sips.finish, ...sips.regular] : [])]
        .filter((url): url is string => Boolean(url));
      expect(urls.length, `${food.id} has no sounds`).toBeGreaterThan(0);
      // Each food must use its own recordings; borrowing another food's clips was a real bug.
      for (const url of urls) {
        expect(url, `${food.id} borrows ${url}`).toMatch(new RegExp(`^/audio/${food.id}/`));
      }
      if (food.interaction === 'drink') expect(sips, `${food.id} is a drink without sips`).toBeDefined();
      else expect(chew.length, `${food.id} has only sips`).toBeGreaterThan(0);
    }
  });

  it('gets duller and heavier as a solid food is eaten through', () => {
    for (const food of foods.filter(entry => entry.interaction !== 'drink')) {
      expect(food.sound.stages, `${food.id} has no stage variation`).toHaveLength(4);
      const first = soundForStage(food.sound, 0).tint!;
      const last = soundForStage(food.sound, 3).tint!;
      expect(first.brightness!, `${food.id} first stage`).toBeGreaterThan(last.brightness!);
      expect(last.weight!, `${food.id} last stage`).toBeGreaterThan(first.weight!);
      expect(first.rate!).toBeGreaterThan(last.rate!);
    }
    // Unknown stages fall back to the base set instead of throwing.
    const burger = foodById('classic-burger');
    expect(soundForStage(burger.sound, 9)).toBe(burger.sound);
  });

  it('moves the drink to a dry, louder slurp as the cup empties', () => {
    const soda = foodById('lemon-soda');
    expect(soundForStage(soda.sound, 0).sips!.finish).toBe('/audio/lemon-soda/sip-finish.mp3');
    expect(soundForStage(soda.sound, 3).sips!.finish).toBe('/audio/lemon-soda/sip-dry-finish.mp3');
    const first = soundForStage(soda.sound, 0).tint!;
    const last = soundForStage(soda.sound, 3).tint!;
    expect(last.gain!).toBeGreaterThan(first.gain ?? 1);
    expect(last.brightness!).toBeGreaterThan(first.brightness!);
    for (const stage of [0, 1, 2, 3]) {
      for (const url of [soundForStage(soda.sound, stage).sips!.finish]) {
        expect(url).toMatch(/^\/audio\/lemon-soda\//);
      }
    }
  });
});
