import { type VoxelData, VoxelWorld } from "../voxel";

export type GeneratorOutput = {
  /** Final height of the generated shape. */
  height: number,
}
export type VoxelGenerator<Params> = (world: VoxelWorld, params: Params) => GeneratorOutput;

export const shell = (world: VoxelWorld) => {
  for (let y = 0; y < world.cellSize; ++y) {
    for (let z = 0; z < world.cellSize; ++z) {
      for (let x = 0; x < world.cellSize; ++x) {
        let touching_air = false;
        for (const { dir, corners, uvRow } of VoxelWorld.faces) {
          const neighbor = world.getVoxel(
            x + dir[0],
            y + dir[1],
            z + dir[2]);
          if (neighbor === 0) { touching_air = true; break; }
        }
        if (!touching_air) world.setVoxel(x, y, z, 100);
      }
    }
  }
}