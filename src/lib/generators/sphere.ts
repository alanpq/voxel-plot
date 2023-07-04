import type { GeneratorOutput, VoxelGenerator } from ".";

export type SphereParams = {
  radius: number,
  bias?: number,
}

export const generate: VoxelGenerator<SphereParams> = (world, { radius, bias = 0.0 }): GeneratorOutput => {
  world.init({
    cellSize: radius * 2,
  })
  const half = radius;
  const r1 = radius * radius;
  for (let x = -half; x < half; x++) {
    for (let z = -half; z < half; z++) {
      for (let y = -half; y < half; y++) {
        const d = ((x * x) + (y * y) + (z * z)) + bias;
        const voxel = y == 0 ? 2 : 1;
        world.setVoxel(x + half, y + half, z + half, d <= r1 ? voxel : 0);
      }
    }
  }
  return {
    height: radius * 2,
  };
}