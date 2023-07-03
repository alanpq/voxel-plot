import type { VoxelData } from "../voxel";

export type VoxelGenerator<Params> = (params: Params) => VoxelData;