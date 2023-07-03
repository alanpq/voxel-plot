import type { VoxelData, VoxelWorld } from "../voxel";

export type VoxelGenerator<Params> = (world: VoxelWorld, params: Params) => VoxelData;