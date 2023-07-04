import * as THREE from "three";

/** data[y][z][x] */
export type VoxelData = {
  size: number,
};

export class VoxelWorld {
  static faces: {
    uvRow: number; dir: number[]; corners: { pos: number[]; uv: number[]; }[];
  }[];

  cellSize: number;
  cellSliceSize: number;
  cell: Uint8Array;
  tileSize: number;
  tileTextureWidth: number;
  tileTextureHeight: number;

  public layer = 0;
  height: number;

  constructor(options: {
    cellSize: number,
    height: number,
    tileSize: number,
    tileTextureWidth: number,
    tileTextureHeight: number,
  }) {
    this.tileSize = options.tileSize;
    this.tileTextureWidth = options.tileTextureWidth;
    this.tileTextureHeight = options.tileTextureHeight;
    this.cellSize = options.cellSize;
    this.height = options.height;
    const { cellSize, height } = this;
    this.cellSliceSize = cellSize * cellSize;
    this.cell = new Uint8Array(cellSize * cellSize * height);
  }

  init(options: { cellSize: number, height: number }) {
    this.cellSize = options.cellSize;
    this.height = options.height;
    const { cellSize, height } = this;
    this.cellSliceSize = cellSize * cellSize;
    this.cell = new Uint8Array(cellSize * cellSize * height);
  }

  computeVoxelOffset(x: number, y: number, z: number) {
    const { height, cellSize, cellSliceSize } = this;
    const voxelX = THREE.MathUtils.euclideanModulo(x, cellSize) | 0;
    const voxelY = THREE.MathUtils.euclideanModulo(y, height) | 0;
    const voxelZ = THREE.MathUtils.euclideanModulo(z, cellSize) | 0;
    return voxelY * cellSliceSize +
      voxelZ * cellSize +
      voxelX;
  }
  getCellForVoxel(x: number, y: number, z: number) {
    const { height, cellSize } = this;
    const cellX = Math.floor(x / cellSize);
    const cellY = Math.floor(y / height);
    const cellZ = Math.floor(z / cellSize);
    if (cellX !== 0 || cellY !== 0 || cellZ !== 0) {
      return null;
    }
    return this.cell;
  }
  setVoxel(x: number, y: number, z: number, v: number) {
    const cell = this.getCellForVoxel(x, y, z);
    if (!cell) {
      return;  // TODO: add a new cell?
    }
    const voxelOffset = this.computeVoxelOffset(x, y, z);
    cell[voxelOffset] = v;
  }
  getVoxel(x: number, y: number, z: number, ignore_layer = false) {
    const cell = this.getCellForVoxel(x, y, z);
    if (!cell) {
      return 0;
    }
    if (!ignore_layer && this.layer && y >= this.layer) return 0;
    const voxelOffset = this.computeVoxelOffset(x, y, z);
    return cell[voxelOffset];
  }
  generateGeometryDataForCell(cellX: number, cellY: number, cellZ: number) {
    const { height, cellSize, tileSize, tileTextureWidth, tileTextureHeight } = this;
    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];
    const startX = cellX * cellSize;
    const startY = cellY * height;
    const startZ = cellZ * cellSize;

    for (let y = 0; y < height; ++y) {
      const voxelY = startY + y;
      for (let z = 0; z < cellSize; ++z) {
        const voxelZ = startZ + z;
        for (let x = 0; x < cellSize; ++x) {
          const voxelX = startX + x;
          const voxel = this.getVoxel(voxelX, voxelY, voxelZ);
          if (voxel && voxel != 100) {
            // voxel 0 is sky (empty) so for UVs we start at 0
            const midline = voxel == 2;
            const curlayer = (this.layer && this.layer == voxelY + 1);
            const uvVoxel = curlayer ? 3 : (midline ? 7 : 2);
            // There is a voxel here but do we need faces for it?
            for (const { dir, corners, uvRow } of VoxelWorld.faces) {
              const neighbor = this.getVoxel(
                voxelX + dir[0],
                voxelY + dir[1],
                voxelZ + dir[2]);
              if (!neighbor || neighbor == 100) {
                // this voxel has no neighbor in this direction so we need a face.
                const ndx = positions.length / 3;
                for (const { pos, uv } of corners) {
                  positions.push(pos[0] + x, pos[1] + y, pos[2] + z);
                  normals.push(...dir);
                  uvs.push(
                    (uvVoxel + uv[0]) * tileSize / tileTextureWidth,
                    1 - (uvRow + 1 - uv[1]) * tileSize / tileTextureHeight);
                }
                indices.push(
                  ndx, ndx + 1, ndx + 2,
                  ndx + 2, ndx + 1, ndx + 3,
                );
              }
            }
          }
        }
      }
    }

    return {
      positions,
      normals,
      uvs,
      indices,
    };
  }
  // from
  // https://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.42.3443&rep=rep1&type=pdf
  intersectRay(start: THREE.Vector3, end: THREE.Vector3) {
    let dx = end.x - start.x;
    let dy = end.y - start.y;
    let dz = end.z - start.z;
    const lenSq = dx * dx + dy * dy + dz * dz;
    const len = Math.sqrt(lenSq);

    dx /= len;
    dy /= len;
    dz /= len;

    let t = 0.0;
    let ix = Math.floor(start.x);
    let iy = Math.floor(start.y);
    let iz = Math.floor(start.z);

    const stepX = (dx > 0) ? 1 : -1;
    const stepY = (dy > 0) ? 1 : -1;
    const stepZ = (dz > 0) ? 1 : -1;

    const txDelta = Math.abs(1 / dx);
    const tyDelta = Math.abs(1 / dy);
    const tzDelta = Math.abs(1 / dz);

    const xDist = (stepX > 0) ? (ix + 1 - start.x) : (start.x - ix);
    const yDist = (stepY > 0) ? (iy + 1 - start.y) : (start.y - iy);
    const zDist = (stepZ > 0) ? (iz + 1 - start.z) : (start.z - iz);

    // location of nearest voxel boundary, in units of t
    let txMax = (txDelta < Infinity) ? txDelta * xDist : Infinity;
    let tyMax = (tyDelta < Infinity) ? tyDelta * yDist : Infinity;
    let tzMax = (tzDelta < Infinity) ? tzDelta * zDist : Infinity;

    let steppedIndex = -1;

    // main loop along raycast vector
    while (t <= len) {
      const voxel = this.getVoxel(ix, iy, iz);
      if (voxel && voxel !== 100) {
        return {
          position: new THREE.Vector3(
            start.x + t * dx,
            start.y + t * dy,
            start.z + t * dz,
          ),
          normal: new THREE.Vector3(
            steppedIndex === 0 ? -stepX : 0,
            steppedIndex === 1 ? -stepY : 0,
            steppedIndex === 2 ? -stepZ : 0,
          ),
          voxel,
        };
      }

      // advance t to next nearest voxel boundary
      if (txMax < tyMax) {
        if (txMax < tzMax) {
          ix += stepX;
          t = txMax;
          txMax += txDelta;
          steppedIndex = 0;
        } else {
          iz += stepZ;
          t = tzMax;
          tzMax += tzDelta;
          steppedIndex = 2;
        }
      } else {
        if (tyMax < tzMax) {
          iy += stepY;
          t = tyMax;
          tyMax += tyDelta;
          steppedIndex = 1;
        } else {
          iz += stepZ;
          t = tzMax;
          tzMax += tzDelta;
          steppedIndex = 2;
        }
      }
    }
    return null;
  }
}

VoxelWorld.faces = [
  { // left
    uvRow: 0,
    dir: [-1, 0, 0,],
    corners: [
      { pos: [0, 1, 0], uv: [0, 1], },
      { pos: [0, 0, 0], uv: [0, 0], },
      { pos: [0, 1, 1], uv: [1, 1], },
      { pos: [0, 0, 1], uv: [1, 0], },
    ],
  },
  { // right
    uvRow: 0,
    dir: [1, 0, 0,],
    corners: [
      { pos: [1, 1, 1], uv: [0, 1], },
      { pos: [1, 0, 1], uv: [0, 0], },
      { pos: [1, 1, 0], uv: [1, 1], },
      { pos: [1, 0, 0], uv: [1, 0], },
    ],
  },
  { // bottom
    uvRow: 1,
    dir: [0, -1, 0,],
    corners: [
      { pos: [1, 0, 1], uv: [1, 0], },
      { pos: [0, 0, 1], uv: [0, 0], },
      { pos: [1, 0, 0], uv: [1, 1], },
      { pos: [0, 0, 0], uv: [0, 1], },
    ],
  },
  { // top
    uvRow: 2,
    dir: [0, 1, 0,],
    corners: [
      { pos: [0, 1, 1], uv: [1, 1], },
      { pos: [1, 1, 1], uv: [0, 1], },
      { pos: [0, 1, 0], uv: [1, 0], },
      { pos: [1, 1, 0], uv: [0, 0], },
    ],
  },
  { // back
    uvRow: 0,
    dir: [0, 0, -1,],
    corners: [
      { pos: [1, 0, 0], uv: [0, 0], },
      { pos: [0, 0, 0], uv: [1, 0], },
      { pos: [1, 1, 0], uv: [0, 1], },
      { pos: [0, 1, 0], uv: [1, 1], },
    ],
  },
  { // front
    uvRow: 0,
    dir: [0, 0, 1,],
    corners: [
      { pos: [0, 0, 1], uv: [0, 0], },
      { pos: [1, 0, 1], uv: [1, 0], },
      { pos: [0, 1, 1], uv: [0, 1], },
      { pos: [1, 1, 1], uv: [1, 1], },
    ],
  },
];