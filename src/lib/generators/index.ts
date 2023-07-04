import { type VoxelData, VoxelWorld } from "../voxel";

export type GeneratorOutput = {
  /** Final height of the generated shape. */
  height: number,
}
export type VoxelGenerator<Params> = (world: VoxelWorld, params: Params) => GeneratorOutput;

import * as sphere from './sphere';
import * as cube from './cube';
import type { GUI } from "three/examples/jsm/libs/lil-gui.module.min";
import type { RegenerateFn } from "../../routes/+page.svelte";

export const GENERATORS = {
  sphere: sphere.generate,
  cube: cube.generate,
};

export type Params = {
  sphere: sphere.SphereParams,
  cube: cube.CubeParams,
};

export const make_gui_folders = (gui: GUI, regenerate: RegenerateFn): { [T in keyof Params]: GUI } => {
  return {
    cube: cube.make_gui(gui.addFolder("Cube").hide(), regenerate),
    sphere: sphere.make_gui(gui.addFolder("Sphere").hide(), regenerate),
  };
}

export const shell = (world: VoxelWorld) => {
  for (let y = 0; y < world.cellSize; ++y) {
    for (let z = 0; z < world.cellSize; ++z) {
      for (let x = 0; x < world.cellSize; ++x) {
        let touching_air = false;
        for (const { dir, corners, uvRow } of VoxelWorld.faces) {
          const neighbor = world.getVoxel(
            x + dir[0],
            y + dir[1],
            z + dir[2], true);
          if (neighbor === 0) { touching_air = true; break; }
        }
        if (!touching_air) world.setVoxel(x, y, z, 100);
      }
    }
  }
}