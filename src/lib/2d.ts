import type Renderer from "./renderer";
import { options, world } from '../routes/+page.svelte';
import type { GUI } from "three/examples/jsm/libs/lil-gui.module.min";
import * as THREE from "three";

export default class Renderer2D implements Renderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  pointer = new THREE.Vector2();
  dragging = false;
  zoom_speed = 1;

  camera = {
    scale: 1,
    pos: new THREE.Vector2(-5, -5),
  };

  constructor(canvas: HTMLCanvasElement, gui: GUI) {
    this.canvas = canvas;
    this.canvas.width = window.innerWidth || 1;
    this.canvas.height = window.innerHeight || 1;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error("could not get 2d context");
    this.ctx = ctx;

    gui.add(this.camera, 'scale', 0.1, 5).listen();

    this.canvas.addEventListener("mousedown", () => { this.dragging = true; });
    document.addEventListener("mouseup", () => { this.dragging = false; });

    this.canvas.addEventListener("wheel", (e) => {
      const wheel = e.deltaY < 0 ? -1 : 1;
      const zoom = Math.pow(0.95, wheel * this.zoom_speed);
      this.pointer.set(
        (e.clientX),
        (e.clientY)
      );
      this.camera.pos.set(
        (this.camera.pos.x - this.pointer.x) * zoom + this.pointer.x,
        (this.camera.pos.y - this.pointer.y) * zoom + this.pointer.y,
      )
      this.camera.scale *= zoom;
    });
  }

  animate(): void {
    this.ctx.resetTransform();
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.translate(this.camera.pos.x, this.camera.pos.y);
    this.ctx.scale(this.camera.scale * 100, this.camera.scale * 100);
    this.ctx.fillRect(0, 0, 1, 1);
    for (let z = 0; z < world.cellSize; ++z) {
      for (let x = 0; x < world.cellSize; ++x) {
        const voxel = world.getVoxel(x, world.layer, z);
        if (voxel && voxel !== 100) {
          this.ctx.fillRect(x, z, 1, 1);
        }
      }
    }
  }
  regenerate(): void {
    const a = 1;
  }
  pointer_move(e: PointerEvent): void {
    if (!this.dragging) return;
    this.camera.pos.add(new THREE.Vector2(e.movementX, e.movementY));
  }
  window_resize(): void {
    const width = window.innerWidth || 1;
    const height = window.innerHeight || 1;
    this.canvas.width = width;
    this.canvas.height = height;
  }

}