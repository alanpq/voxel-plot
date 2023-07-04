<script lang="ts" context="module">
	import Renderer3D from '$lib/3d';
	import Renderer2D from '$lib/2d';
	import { shell } from '$lib/generators';
	import { generate } from '$lib/generators/sphere';
	import { VoxelWorld } from '$lib/voxel';
	import * as THREE from 'three';
	import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';

	export const options = {
		is_2d: false,
		radius: 10,
		bias: 0.1,
		layer: 0,
		shell: true,

		height: 0,
	};
	export type Options = typeof options;

	const tileSize = 16;
	const tileTextureWidth = 256;
	const tileTextureHeight = 64;
	export const world = new VoxelWorld({
		cellSize: 0,
		tileSize,
		tileTextureWidth,
		tileTextureHeight
	});

	const canvas3d = document.createElement("canvas");
	canvas3d.style.display = 'block';

	const canvas2d = document.createElement("canvas");
	canvas2d.style.display = 'none';

	document.body.appendChild(canvas3d);
	document.body.appendChild(canvas2d);
	
	const gui = new GUI();
	gui.add(options, 'is_2d').name("2D").onChange(() => {
		canvas2d.style.display = options.is_2d ? 'block' : 'none';
		canvas3d.style.display = options.is_2d ? 'none' : 'block';
	});
	gui
		.add(options, 'layer', 0, options.height - 1, 1)
		.listen()
		.onChange(() => { regenerate(true) });
	gui.add(options, 'shell').onChange(() => {regenerate()});
	gui.add(options, 'radius', 0, 50, 1).onChange(() => {regenerate()});
	gui.add(options, 'bias', 0, 1).onChange(() => {regenerate()});

	const r3d = new Renderer3D(canvas3d, gui.addFolder("3D"));
	const r2d = new Renderer2D(canvas2d, gui.addFolder("2D"));
	
	const regenerate = (only_mesh = false) => {
		if(!only_mesh) {
			const output = generate(world, options);
			options.height = output.height;
			if (options.shell) shell(world);
		}
		(options.is_2d ? r2d : r3d).regenerate();
	}
	regenerate();
	


	// Init gui
	
	document.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowUp':
        world.layer = Math.min(world.cellSize - 1, world.layer + 1);
        regenerate(true);
        break;
      case 'ArrowDown':
        world.layer = Math.max(0, world.layer - 1);
        regenerate(true);
        break;
      default:
        // console.debug(e.key);
        break;
    }
	});
	document.addEventListener('pointermove', (e) => {(options.is_2d ? r2d : r3d).pointer_move(e)});
	window.addEventListener('resize', () => {(options.is_2d ? r2d : r3d).window_resize()});

	function animate() {
		requestAnimationFrame(animate);
		(options.is_2d ? r2d : r3d).animate();
	}
	animate();
</script>

<style lang="scss">
	:global(body) {
		margin: 0;
		padding: 0;
	}
</style>
