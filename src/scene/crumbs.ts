export function compactCrumbs(
  positions: Float32Array,
  velocities: Float32Array,
  ages: Float32Array,
  lifetime: number,
) {
  let write = 0;
  for (let read = 0; read < ages.length; read++) {
    if (ages[read]! >= lifetime) continue;
    if (write !== read) {
      const source = read * 3;
      const target = write * 3;
      positions[target] = positions[source]!;
      positions[target + 1] = positions[source + 1]!;
      positions[target + 2] = positions[source + 2]!;
      velocities[target] = velocities[source]!;
      velocities[target + 1] = velocities[source + 1]!;
      velocities[target + 2] = velocities[source + 2]!;
    }
    ages[write] = ages[read]!;
    write++;
  }
  for (let index = write; index < ages.length; index++) ages[index] = Infinity;
  return write;
}
