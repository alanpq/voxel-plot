<script lang="ts" context="module">
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';

	import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
	import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
  // @ts-ignore
	import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

	import { generate } from '../lib/generators/sphere';
	import * as geo from '../lib/geometry';
	import { VoxelWorld, type VoxelData } from '../lib/voxel';

	const options = {
    radius: 10,
		layer: 0
	};
  export type Options = typeof options;

	const scene = new THREE.Scene();
	const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

	const raycaster = new THREE.Raycaster();
	let pointer = new THREE.Vector2();

	const width = window.innerWidth || 1;
	const height = window.innerHeight || 1;
	const devicePixelRatio = window.devicePixelRatio || 1;

	const renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setClearColor(0x000000);
	renderer.setPixelRatio(devicePixelRatio);
	renderer.setSize(width, height);
	renderer.useLegacyLights = false;
	document.body.appendChild(renderer.domElement);

	const rollOverGeo = new THREE.BoxGeometry(1.01, 1.01, 1.01);
	const rollOverMaterial = new THREE.MeshBasicMaterial({
		color: 0xff0000,
		opacity: 0.5,
		transparent: true
	});
	const rollOverMesh = new THREE.Mesh(rollOverGeo, rollOverMaterial);
	scene.add(rollOverMesh);

	const controls = new OrbitControls(camera, renderer.domElement);
	controls.target.set(0, 0.5, 0);
	controls.update();
	controls.enablePan = false;
	controls.enableDamping = true;

	let data: VoxelData = {size: 0};


  const loader = new THREE.TextureLoader();
  const texture = loader.load('/flourish-cc-by-nc-sa.png');
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;


  const tileSize = 16;
  const tileTextureWidth = 256;
  const tileTextureHeight = 64;

  const cellSize = 50;
  const world = new VoxelWorld({
    cellSize,
    tileSize,
    tileTextureWidth,
    tileTextureHeight,
  });

  const positionNumComponents = 3;
  const normalNumComponents = 3;
  const uvNumComponents = 2;
  const material = new THREE.MeshLambertMaterial({
    map: texture,
    // side: THREE.DoubleSide,
    alphaTest: 0.1,
    transparent: true,
  });
  const mesh = new THREE.Mesh(undefined, material);
  let world_off = new THREE.Vector3(-world.cellSize/2, -world.cellSize/2, -world.cellSize/2)

  const regenerate = (only_mesh = false) => {
    if(!only_mesh) {
      generate(world, options);
      world_off = new THREE.Vector3(-world.cellSize/2, -world.cellSize/2, -world.cellSize/2)
    }

    const {positions, normals, uvs, indices} = world.generateGeometryDataForCell(0, 0, 0);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
        'position',
        new THREE.BufferAttribute(new Float32Array(positions), positionNumComponents));
    geometry.setAttribute(
        'normal',
        new THREE.BufferAttribute(new Float32Array(normals), normalNumComponents));
    geometry.setAttribute(
        'uv',
        new THREE.BufferAttribute(new Float32Array(uvs), uvNumComponents));
    geometry.setIndex(indices);
    mesh.geometry.dispose();
    mesh.geometry = geometry;
    mesh.position.copy(world_off);

  }
  scene.add(mesh);
  regenerate();

  let grid = new THREE.GridHelper(100, 100);

	const ambientLight = new THREE.AmbientLight(0x4d4d4d, 1); // #4D4D4D
	scene.add(ambientLight);

	const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
	directionalLight.position.set(0.6, 1, 0.5).normalize();
	scene.add(directionalLight);

  scene.add(grid);
	scene.add(new THREE.AxesHelper(20));

	camera.position.set(5, 2, data.size);

	const composer = new EffectComposer(renderer);

	const ssaoPass = new SSAOPass(scene, camera, window.innerWidth, window.innerHeight);
	ssaoPass.kernelRadius = 1;
  ssaoPass.minDistance = 0;
	composer.addPass(ssaoPass);
	const outputPass = new OutputPass();
	composer.addPass(outputPass);

	// Init gui
	const gui = new GUI();
	gui
    .add(world, 'layer', 0, world.cellSize-1, 1)
   .listen()
   .onChange(() => {regenerate(true)});
   gui.add(options, 'radius', 0, 50, 1).onChange(regenerate);
	const ssao_gui = gui.addFolder('SSAO').close();
	ssao_gui
		.add(ssaoPass, 'output', {
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
		})
		.onChange(function (value: any) {
			ssaoPass.output = parseInt(value);
		});
	ssao_gui.add(ssaoPass, 'kernelRadius').min(0).max(32);
	ssao_gui.add(ssaoPass, 'minDistance').min(0.0).max(0.02);
	ssao_gui.add(ssaoPass, 'maxDistance').min(0.00001).max(0.3);

	function animate() {
		requestAnimationFrame(animate);
		controls.update();
		// renderer.render(scene, camera);
		composer.render();
	}
	animate();
	document.addEventListener('keydown', onKeyDown);
	document.addEventListener('pointermove', onPointerMove);
	window.addEventListener('resize', onWindowResize);

	function onKeyDown(e: KeyboardEvent) {
		switch (e.key) {
			case 'ArrowUp':
				world.layer = Math.min(world.cellSize-1, world.layer + 1);
        regenerate(true);
				break;
			case 'ArrowDown':
				world.layer = Math.max(0, world.layer - 1);
        regenerate(true);
				break;
      default:
        console.debug(e.key);
        break;
		}
	}

	function onPointerMove(event: PointerEvent) {
		pointer.set(
			(event.clientX / window.innerWidth) * 2 - 1,
			-(event.clientY / window.innerHeight) * 2 + 1
		);

    const start = new THREE.Vector3();
    const end = new THREE.Vector3();
    start.setFromMatrixPosition(camera.matrixWorld).sub(world_off);
    end.set(pointer.x, pointer.y, 1).unproject(camera).sub(world_off);

    const intersect = world.intersectRay(start, end);

    if (intersect) {
      intersect.position.add(world_off);
      // rollOverMesh.position.copy(intersect.position);
			rollOverMesh.position.copy(intersect.position).sub(intersect.normal.multiplyScalar(0.5));
			rollOverMesh.position.floor().addScalar(0.5);
    }

		// const intersects = raycaster.intersectObjects([mesh], false);

		// if (intersects.length > 0) {
		// 	const intersect = intersects[0];
		// 	if (!intersect.face) return;

		// 	rollOverMesh.position.copy(intersect.point).sub(intersect.face.normal.multiplyScalar(0.5));
		// 	rollOverMesh.position.addScalar(0.5).add(new THREE.Vector3(0, 0.5, 0)).floor().add(new THREE.Vector3(0, -0.5, 0));
		// }
	}

	function onWindowResize() {
		const width = window.innerWidth || 1;
		const height = window.innerHeight || 1;

		camera.aspect = width / height;
		camera.updateProjectionMatrix();
		renderer.setSize(width, height);

		composer.setSize(width, height);
	}
</script>

<style lang="scss">
	:global(body) {
		margin: 0;
		padding: 0;
	}
</style>
