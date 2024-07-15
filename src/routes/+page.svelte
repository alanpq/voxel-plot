<script lang="ts" context="module">
	import Renderer3D from '$lib/3d';
	import Renderer2D from '$lib/2d';
	import { GENERATORS, make_gui_folders, shell } from '$lib/generators';
	import { VoxelWorld } from '$lib/voxel';
	import * as THREE from 'three';
	import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';
	import type Renderer from '$lib/renderer';
	import type { SphereParams } from '$lib/generators/sphere';
	import type { CubeParams } from '$lib/generators/cube';
	import { writable } from 'svelte/store';
	import { onMount } from 'svelte';

	export const options: Record<string, any> & SphereParams & CubeParams = {
		is_2d: false,
		size: 10,
		bias: 0.1,
		shell: true,
		dome: false,
		flip: false,

		generator: 'sphere',
		generator_fn: GENERATORS.sphere,

		height: 0
	};
	export type Options = typeof options;

	const tileSize = 16;
	const tileTextureWidth = 256;
	const tileTextureHeight = 64;
	export const world = new VoxelWorld({
		height: 0,
		cellSize: 0,
		tileSize,
		tileTextureWidth,
		tileTextureHeight
	});

	let is_2d = writable(false);
	let cur_renderer: Renderer | null = null;
	onMount(() => {
		const canvas3d = document.createElement('canvas');
		canvas3d.style.display = 'block';

		const canvas2d = document.createElement('canvas');
		canvas2d.style.display = 'none';

		document.body.appendChild(canvas3d);
		document.body.appendChild(canvas2d);

		const gui = new GUI();
		gui
			.add(options, 'is_2d')
			.name('2D')
			.onChange(() => {
				is_2d.set(options.is_2d);
				cur_renderer = options.is_2d ? r2d : r3d;
				canvas2d.style.display = options.is_2d ? 'block' : 'none';
				canvas3d.style.display = options.is_2d ? 'none' : 'block';
				regenerate(true);
			});
		gui
			.add(world, 'layer', 0, world.height - 1, 1)
			.disable()
			.listen();
		// .onChange(() => { regenerate(true) });
		gui.add(options, 'shell').onChange(() => {
			regenerate();
		});

		let gen_folders: ReturnType<typeof make_gui_folders> | null = null;
		const gen_ctrl = gui
			.add(options, 'generator', Object.keys(GENERATORS))
			.onChange((k: keyof typeof GENERATORS) => {
				options.generator_fn = GENERATORS[k];
				if (gen_folders) {
					for (const f of Object.values(gen_folders)) f.hide();
					for (const c of gen_folders[k].show().controllers) c.updateDisplay();
				}
				regenerate();
			});
		gen_folders = make_gui_folders(gui, regenerate);
		gen_ctrl.reset();

		const r3d = new Renderer3D(canvas3d, gui.addFolder('3D').close());
		const r2d = new Renderer2D(canvas2d, gui.addFolder('2D').close());
		cur_renderer = options.is_2d ? r2d : r3d;
		regenerate();

		const loaded = localStorage.getItem('options');
		if (loaded) gui.load(JSON.parse(loaded));
		gui.onChange((e) => {
			localStorage.setItem('options', JSON.stringify(gui.save()));
		});

		document.addEventListener('keydown', (e) => {
			switch (e.key) {
				case 'ArrowUp':
					world.layer = Math.min(world.height, world.layer + 1);
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
		document.addEventListener('pointermove', (e) => {
			cur_renderer?.pointer_move(e);
		});
		window.addEventListener('resize', () => {
			cur_renderer?.window_resize();
		});

		animate();
	});

	export type RegenerateFn = typeof regenerate;
	const regenerate = (only_mesh = false) => {
		if (!only_mesh) {
			const output = options.generator_fn(world, options);
			options.height = output.height;
			if (options.shell) shell(world);
		}
		cur_renderer?.regenerate();
	};

	function animate() {
		requestAnimationFrame(animate);
		cur_renderer?.animate();
	}
</script>

<article>
	<ul>
		<li><strong>Up/Down</strong> arrow keys to change layer.</li>
		<li><strong>Scroll</strong> to zoom.</li>
		{#if $is_2d}
			<li><strong>Click and drag</strong> to pan.</li>
		{:else}
			<li><strong>Click and drag</strong> to orbit camera.</li>
			<li><strong>Double click</strong> to change layer to selected voxel.</li>
			<li><strong>Right click</strong> to lock selected voxel.</li>
		{/if}
	</ul>
</article>

<style lang="scss">
	:global(body) {
		margin: 0;
		padding: 0;
	}

	article {
		user-select: none;
		position: absolute;
		right: 0;
		bottom: 0;
		width: 30ch;
		height: auto;

		padding: 0.5em 1em;
		font-size: 12px;

		background-color: rgba(0, 0, 0, 0.583);
		color: #ebebeb;

		ul {
			list-style-type: '- ';
			padding: 0;
			margin: 0;
			margin-left: 0.6em;
		}
	}
</style>
