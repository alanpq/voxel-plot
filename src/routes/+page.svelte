<script lang="ts" context="module">
	import * as THREE from 'three';
	import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
	import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';

	import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
	import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
	import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

	import { generate } from '../lib/generators/sphere';
	import * as geo from '../lib/geometry';
	import type { VoxelData } from '../lib/voxel';

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

	let data: VoxelData = {size: 0, voxels: []};

	const material = new THREE.MeshStandardMaterial({
		roughness: 0.5,
		metalness: 0
	});
	let geometry = new THREE.BufferGeometry();
	const mesh = new THREE.Mesh(geometry, material);

  let grid = new THREE.GridHelper(100, 100);
  const recompute_voxels = () => {
    data = generate(options);
    options.layer = data.size-1;

    scene.remove(grid);
    grid = new THREE.GridHelper(data.size+5, data.size+5);
    scene.add(grid);
    
    geo.update_geo(data, options, mesh);
  }
	

  recompute_voxels();
	const ambientLight = new THREE.AmbientLight(0x4d4d4d, 1); // #4D4D4D
	scene.add(ambientLight);

	const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
	directionalLight.position.set(0.6, 1, 0.5).normalize();
	scene.add(directionalLight);

	scene.add(mesh);

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
    .add(options, 'layer', 0, data.size-1, 1)
   .listen()
   .onChange(() => {geo.update_geo(data, options, mesh)});
   gui.add(options, 'radius', 0, 50, 1).onChange(recompute_voxels);
	const ssao_gui = gui.addFolder('SSAO');
	ssao_gui
		.add(ssaoPass, 'output', {
			Default: SSAOPass.OUTPUT.Default,
			'SSAO Only': SSAOPass.OUTPUT.SSAO,
			'SSAO Only + Blur': SSAOPass.OUTPUT.Blur,
			Beauty: SSAOPass.OUTPUT.Beauty,
			Depth: SSAOPass.OUTPUT.Depth,
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
				options.layer = Math.min(data.size-1, options.layer + 1);
        geo.update_geo(data, options, mesh);
				break;
			case 'ArrowDown':
				options.layer = Math.max(0, options.layer - 1);
        geo.update_geo(data, options, mesh);
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

		raycaster.setFromCamera(pointer, camera);

		const intersects = raycaster.intersectObjects([mesh], false);

		if (intersects.length > 0) {
			const intersect = intersects[0];
			if (!intersect.face) return;

			rollOverMesh.position.copy(intersect.point).sub(intersect.face.normal.multiplyScalar(0.5));
			rollOverMesh.position.addScalar(0.5).add(new THREE.Vector3(0, 0.5, 0)).floor().add(new THREE.Vector3(0, -0.5, 0));
		}
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
