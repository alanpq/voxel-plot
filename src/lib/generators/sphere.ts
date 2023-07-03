import type { VoxelGenerator } from ".";

export type SphereParams = {
  radius: number,
}

export const generate: VoxelGenerator<SphereParams> = (world, { radius }) => {
  world.init({
    cellSize: radius * 2,
  })
  const half = radius;
  const r1 = radius * radius;
  const r2 = (radius - 1) * (radius - 1);
  for (let x = -half; x < half; x++) {
    for (let z = -half; z < half; z++) {
      for (let y = -half; y < half; y++) {
        const d = (x * x) + (y * y) + (z * z);
        world.setVoxel(x + half, y + half, z + half, (d < r1 && d >= r2) ? 1 : 0);
      }
    }
  }
  return {
    size: radius * 2,
  };
}