import type { GUI } from "three/examples/jsm/libs/lil-gui.module.min";
import type { GeneratorOutput, VoxelGenerator } from ".";
import { options, type RegenerateFn } from "../../routes/+page.svelte";

export type SphereParams = {
  size: number,
  bias?: number,
}

export const make_gui = (gui: GUI, regenerate: RegenerateFn): GUI => {
  gui.add(options, 'size', 1, 50, 1).onChange(() => { regenerate() });
  gui.add(options, 'bias', 0, 1).onChange(() => { regenerate() });
  return gui;
}

export const generate: VoxelGenerator<SphereParams> = (world, { size, bias = 0.0 }): GeneratorOutput => {
  const even = size % 2 == 0;
  const extra = (even ? 1 : 0);

  const half = size / 2;
  const half_lo = Math.floor(half);
  const half_hi = Math.ceil(half);

  const r1 = half * half;
// console.debug({
//   even, extra, half: half_lo, r1,
// })
  world.init({
    cellSize: size,
  })
  for (let x = 0; x < size; x++) {
    for (let z = 0; z < size; z++) {
      for (let y = 0; y < size; y++) {
        const d = (
          Math.pow(x - (half_lo - extra / 2), 2) +
          Math.pow(y - (half_lo - extra / 2), 2) +
          Math.pow(z - (half_lo - extra / 2), 2)
        ) + bias;
        const voxel = (y == half_lo || y == half_lo - extra) ? 2 : 1;
        world.setVoxel(x, y, z, d <= r1 ? voxel : 0);
      }
    }
  }
  return {
    height: size,
  };
}