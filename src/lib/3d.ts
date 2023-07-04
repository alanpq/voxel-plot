/* eslint-disable @typescript-eslint/ban-ts-comment */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';

import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
// @ts-ignore
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

import type { VoxelWorld } from './voxel';
import { generate } from './generators/sphere';
import { shell } from './generators';
import type Renderer from './renderer';
import { options, world } from '../routes/+page.svelte';


const positionNumComponents = 3;
const normalNumComponents = 3;
const uvNumComponents = 2;

const SSAO_OUTPUTS = {
  // @ts-ignore
  Default: SSAOPass.OUTPUT.Default,
  // @ts-ignore
  'SSAO Only': SSAOPass.OUTPUT.SSAO,
  // @ts-ignore
  'SSAO Only + Blur': SSAOPass.OUTPUT.Blur,
  // @ts-ignore
  Beauty: SSAOPass.OUTPUT.Beauty,
  // @ts-ignore
  Depth: SSAOPass.OUTPUT.Depth,
  // @ts-ignore
  Normal: SSAOPass.OUTPUT.Normal
};

export default class Renderer3D implements Renderer {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  pointer: THREE.Vector2;
  voxels: THREE.Mesh;
  renderer: THREE.WebGLRenderer;
  composer: EffectComposer;
  world_off: THREE.Vector3;
  hover_mesh: THREE.Mesh;
  controls: OrbitControls;

  locked = false;
  cur_voxel: ReturnType<VoxelWorld["intersectRay"]> | null = null;
  bb: THREE.LineSegments<THREE.BufferGeometry<THREE.NormalBufferAttributes>, THREE.LineBasicMaterial>;
  grid: THREE.GridHelper;

  constructor(canvas: HTMLCanvasElement, gui: GUI) {
    const width = window.innerWidth || 1;
    const height = window.innerHeight || 1;
    const devicePixelRatio = window.devicePixelRatio || 1;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, canvas });
    this.renderer.setClearColor(0x000000);
    this.renderer.setPixelRatio(devicePixelRatio);
    this.renderer.setSize(width, height, true);
    this.renderer.useLegacyLights = false;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1, 1000
    );
    this.camera.position.set(5, 2, options.size);
    this.pointer = new THREE.Vector2();

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0.5, 0.5, 0.5);
    this.controls.update();
    this.controls.enablePan = false;
    this.controls.enableDamping = true;

    this.grid = new THREE.GridHelper(100, 100);
    this.scene.add(this.grid);

    const ambientLight = new THREE.AmbientLight(0x4d4d4d, 1); // #4D4D4D
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(0.6, 1, 0.5).normalize();
    this.scene.add(directionalLight);

    const axes = new THREE.AxesHelper(50);
    axes.position.addScalar(0.5);
    this.scene.add(axes);

    // VOXELS
    this.world_off = new THREE.Vector3();

    const loader = new THREE.TextureLoader();
    const texture = loader.load('/flourish-cc-by-nc-sa.png');
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;

    const material = new THREE.MeshLambertMaterial({
      map: texture,
    });
    this.voxels = new THREE.Mesh(undefined, material);
    this.scene.add(this.voxels);

    // BOUNDING BOX

    const bb_mat = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });

    this.bb = new THREE.LineSegments(undefined, bb_mat);

    this.scene.add(this.bb);

    // HOVER CUBE
    const hover_geo = new THREE.BoxGeometry(1.01, 1.01, 1.01);
    const hover_mat = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      opacity: 0.5,
      transparent: true
    });
    this.hover_mesh = new THREE.Mesh(hover_geo, hover_mat);
    this.scene.add(this.hover_mesh);


    this.composer = new EffectComposer(this.renderer);

    const ssaoPass = new SSAOPass(this.scene, this.camera, window.innerWidth, window.innerHeight);
    ssaoPass.kernelRadius = 1.3;
    ssaoPass.minDistance = 0;
    this.composer.addPass(ssaoPass);
    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);

    gui.add(this.bb, 'visible').name("Draw bounding box");

    const ssao_gui = gui.addFolder('SSAO').close();
    ssao_gui
      .add(ssaoPass, 'output', SSAO_OUTPUTS)
      .onChange(function (value: keyof typeof SSAO_OUTPUTS) {
        ssaoPass.output = parseInt(value);
      });
    ssao_gui.add(ssaoPass, 'kernelRadius').min(0).max(32);
    ssao_gui.add(ssaoPass, 'minDistance').min(0.0).max(0.02);
    ssao_gui.add(ssaoPass, 'maxDistance').min(0.00001).max(0.3);

    canvas.addEventListener("mouseup", (e) => {
      if (e.button !== 2) return;
      this.locked = !this.locked;
    })

    canvas.addEventListener("dblclick", (e) => {
      if (e.button !== 0) return;
      if (!this.cur_voxel) world.layer = 0;
      else world.layer = Math.floor(this.cur_voxel.position.y + 1);
      this.regenerate();
    })

  }

  animate() {
    this.controls.update();
    this.composer.render();
  }

  pointer_move(e: PointerEvent) {
    this.pointer.set(
      (e.clientX / window.innerWidth) * 2 - 1,
      -(e.clientY / window.innerHeight) * 2 + 1
    );
    if (this.locked) return;

    const start = new THREE.Vector3();
    const end = new THREE.Vector3();
    start.setFromMatrixPosition(this.camera.matrixWorld).sub(this.world_off);
    end.set(this.pointer.x, this.pointer.y, 1).unproject(this.camera).sub(this.world_off);

    const intersect = world.intersectRay(start, end);

    if (intersect) {
      this.cur_voxel = {
        normal: intersect.normal.clone(),
        position: intersect.position.clone(),
        voxel: intersect.voxel,
      };
      const even = world.cellSize % 2 == 0;
      const even_h = world.height % 2 == 0;
      intersect.position.add(this.world_off);
      this.hover_mesh.position.copy(intersect.position).sub(intersect.normal.multiplyScalar(0.5));
      this.hover_mesh.position.set(
        even ? Math.round(this.hover_mesh.position.x) : Math.floor(this.hover_mesh.position.x) + 0.5,
        even_h ? Math.round(this.hover_mesh.position.y) : Math.floor(this.hover_mesh.position.y) + 0.5,
        even ? Math.round(this.hover_mesh.position.z) : Math.floor(this.hover_mesh.position.z) + 0.5,
      );
      this.hover_mesh.visible = true;
    } else {
      this.cur_voxel = null;
      this.hover_mesh.visible = false;
    }
  }
  window_resize() {
    const width = window.innerWidth || 1;
    const height = window.innerHeight || 1;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
  }

  regenerate() {
    this.hover_mesh.visible = false;
    const bb_geo = new THREE.EdgesGeometry(new THREE.BoxGeometry(world.cellSize, world.height, world.cellSize));
    this.bb.geometry.dispose();
    this.bb.geometry = bb_geo;

    const even = (world.cellSize % 2 == 0);
    const even_h = (world.height % 2 == 0);

    const off = Math.round((-world.cellSize / 2) + 0.5) + (even ? -0.5 : 0.0);
    this.world_off.set(
      off,
      world.layer ? (-world.layer + (even_h ? 0.5 : 0.0)) : Math.round((-world.height / 2) + 0.5) + (even_h ? -0.5 : 0.0),
      off
    );
    const { positions, normals, uvs, indices } = world.generateGeometryDataForCell(0, 0, 0);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(positions), positionNumComponents)
    );
    geometry.setAttribute(
      'normal',
      new THREE.BufferAttribute(new Float32Array(normals), normalNumComponents)
    );
    geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), uvNumComponents));
    geometry.setIndex(indices);
    this.voxels.geometry.dispose();
    this.voxels.geometry = geometry;
    this.voxels.position.copy(this.world_off);
    this.grid.position.setScalar(even ? 0.5 : 0);
    this.bb.position.setScalar(0.5);
    if (world.layer) this.bb.position.setY(-(world.layer - world.height / 2));
  };
}