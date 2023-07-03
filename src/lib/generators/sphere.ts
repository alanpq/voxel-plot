import type { VoxelGenerator } from ".";

export type SphereParams = {
  radius: number,
}

export const generate: VoxelGenerator<SphereParams> = ({ radius }) => {
  const m = [];
  const half = radius;
  for (let x = -half; x < half; x++) {
    const zs = [];
    for (let z = -half; z < half; z++) {
      const ys = [];
      for (let y = -half; y < half; y++) {
        const d = (x * x) + (y * y) + (z * z);
        ys.push(d < radius * radius);
      }
      zs.push(ys);
    }
    m.push(zs);
  }
  return {
    size: radius * 2,
    voxels: m,
  };
}