import type { GUI } from "three/examples/jsm/libs/lil-gui.module.min";
import type { GeneratorOutput, VoxelGenerator } from ".";
import { options, type RegenerateFn } from "../../routes/+page.svelte";

export type CubeParams = {
  size: number,
}

export const make_gui = (gui: GUI, regenerate: RegenerateFn): GUI => {
  gui.add(options, 'size', 1, 50, 1).onChange(() => { regenerate() });
  return gui;
}

export const generate: VoxelGenerator<CubeParams> = (world, { size }): GeneratorOutput => {
  world.init({
    cellSize: size,
  })
  for (let x = 0; x < size; x++) {
    for (let z = 0; z < size; z++) {
      for (let y = 0; y < size; y++) {
        world.setVoxel(x, y, z, 1);
      }
    }
  }
  return {
    height: size,
  };
}