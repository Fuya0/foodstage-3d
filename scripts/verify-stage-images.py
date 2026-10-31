"""Measure food-only pixels from transparent Playwright canvas captures."""
from pathlib import Path
from PIL import Image
import numpy as np

import sys
prefix = 'mobile-' if '--mobile' in sys.argv else ''
sizes = []
for stage in range(1, 5):
    path = Path(f'docs/screenshots/{prefix}stage-{stage}.png')
    rgba = np.asarray(Image.open(path).convert('RGBA'))
    rgb = rgba[:, :, :3].astype(np.int16)
    # Canvas screenshots inherit the white page backdrop; select saturated food,
    # excluding the neutral focus outline and soft CSS shadow.
    mask = (rgb.max(axis=2) - rgb.min(axis=2) > 28) & (rgb.min(axis=2) < 225) & (rgba[:, :, 3] > 100)
    y, x = np.where(mask)
    if not len(x):
        raise AssertionError(f'{path}: empty food capture')
    width, height = int(x.max()-x.min()+1), int(y.max()-y.min()+1)
    sizes.append((width, height))
    print(f'Stage {stage}: {width} x {height} px, {len(x)} visible pixels')
for previous, current in zip(sizes, sizes[1:]):
    assert current[0] < previous[0], (previous, current, 'width did not decrease')
    assert current[1] < previous[1], (previous, current, 'height did not decrease')
assert .5 < sizes[3][0] / sizes[2][0] < .75
assert .65 < sizes[3][1] / sizes[2][1] < .9
print('PASS: all stages shrink; final remnant retains 50–75% width and 65–90% height of stage 3.')
