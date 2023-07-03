import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

import { get, type VoxelData } from './voxel';
import type { Options } from '../routes/+page.svelte';

export const pxGeometry = new THREE.PlaneGeometry(1, 1).rotateY(Math.PI / 2).translate(0.5, 0, 0);

export const nxGeometry = new THREE.PlaneGeometry(1, 1).rotateY(-Math.PI / 2).translate(-0.5, 0, 0);

export const pyGeometry = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0, 0.5, 0);

export const nyGeometry = new THREE.PlaneGeometry(1, 1).rotateX(Math.PI / 2).translate(0, -0.5, 0);

export const pzGeometry = new THREE.PlaneGeometry(1, 1).translate(0, 0, 0.5);

export const nzGeometry = new THREE.PlaneGeometry(1, 1).rotateY(Math.PI).translate(0, 0, -0.5);

const matrix = new THREE.Matrix4();
export const update_geo = (data: VoxelData, options: Options, mesh: THREE.Mesh) => {
  const geometries: any[] = [];
  const half_size = data.size / 2;
  for (let x = 0; x < data.size; x++) {
    for (let z = 0; z < data.size; z++) {
      for (let y = 0; y < data.size; y++) {
        if (!get(data, x, y, z, options.layer)) continue;
        matrix.makeTranslation(x - half_size, y - half_size + 0.5, z - half_size);

        if (!get(data, x + 1, y, z, options.layer)) geometries.push(pxGeometry.clone().applyMatrix4(matrix));
        if (!get(data, x - 1, y, z, options.layer)) geometries.push(nxGeometry.clone().applyMatrix4(matrix));

        if (!get(data, x, y + 1, z, options.layer)) geometries.push(pyGeometry.clone().applyMatrix4(matrix));
        if (!get(data, x, y - 1, z, options.layer)) geometries.push(nyGeometry.clone().applyMatrix4(matrix));

        if (!get(data, x, y, z + 1, options.layer)) geometries.push(pzGeometry.clone().applyMatrix4(matrix));
        if (!get(data, x, y, z - 1, options.layer)) geometries.push(nzGeometry.clone().applyMatrix4(matrix));
      }
    }
  }
  if (geometries.length > 0) {
    mesh.geometry.dispose();
    mesh.geometry = BufferGeometryUtils.mergeGeometries(geometries);
    mesh.geometry.computeBoundingSphere();
  } else {
    mesh.geometry.dispose();
    mesh.geometry = new THREE.BufferGeometry();
    mesh.geometry.computeBoundingSphere();
  }
};