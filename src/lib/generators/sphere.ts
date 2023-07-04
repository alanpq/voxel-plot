import type { GUI } from "three/examples/jsm/libs/lil-gui.module.min";
import type { GeneratorOutput, VoxelGenerator } from ".";
import { options, type RegenerateFn } from "../../routes/+page.svelte";

export type SphereParams = {
  size: number,
  dome: boolean,
  flip: boolean,
  bias?: number,
}

export const make_gui = (gui: GUI, regenerate: RegenerateFn): GUI => {
  gui.add(options, 'size', 1, 50, 1).onChange(() => { regenerate() });
  gui.add(options, 'dome').onChange(() => regenerate());
  gui.add(options, 'flip').onChange(() => regenerate());
  gui.add(options, 'bias', 0, 1).onChange(() => { regenerate() });
  return gui;
}

export const generate: VoxelGenerator<SphereParams> = (world, { size, dome = false, bias = 0.0, flip = false }): GeneratorOutput => {
  const even = size % 2 == 0;
  const extra = (even ? 1 : 0);

  const height = dome ? size / 2 : size;

  const half = size / 2;
  const half_lo = Math.floor(half);
  const h_half_lo = Math.floor(height / 2);


  const r1 = half * half;
  world.init({
    cellSize: size,
    height: height,
  })
  for (let x = 0; x < size; x++) {
    for (let z = 0; z < size; z++) {
      for (let _y = 0; _y < height; _y++) {
        const y = !flip ? (height - 1 - _y) : _y;
        const d = (
          Math.pow(x - (half_lo - extra / 2), 2) +
          Math.pow(y - (half_lo - extra / 2), 2) +
          Math.pow(z - (half_lo - extra / 2), 2)
        ) + bias;
        const voxel = (_y == h_half_lo || _y == h_half_lo - extra) ? 2 : 1;
        world.setVoxel(x, _y, z, d <= r1 ? voxel : 0);
      }
    }
  }
  return {
    height,
  };
}