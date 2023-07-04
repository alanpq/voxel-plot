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
  onion_skins = 2;

  camera = {
    scale: 1,
    pos: new THREE.Vector2(-5, -5),
  };

  constructor(canvas: HTMLCanvasElement, gui: GUI) {
    this.canvas = canvas;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error("could not get 2d context");
    this.ctx = ctx;
    this.window_resize();

    gui.add(this.camera, 'scale', 0.1, 5).listen();
    gui.add(this, 'onion_skins', 0, 5, 1).name("Onion Skin layers");
    this.canvas.addEventListener("mousedown", () => { this.dragging = true; });
    document.addEventListener("mouseup", () => { this.dragging = false; });

    this.camera.pos.set(
      this.canvas.width / 2,
      this.canvas.height / 2,
    );

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
    const w = this.canvas.width;
    const h = this.canvas.height;

    this.ctx.resetTransform();
    this.ctx.clearRect(0, 0, w, h);

    this.ctx.translate(this.camera.pos.x, this.camera.pos.y);
    this.ctx.scale(this.camera.scale, this.camera.scale);
    const x_tiles = (Math.floor(this.canvas.width / this.camera.scale) / 100) + 1;
    const y_tiles = (Math.floor(this.canvas.height / this.camera.scale) / 100) + 1;
    const origin = new THREE.Vector2(
      Math.floor((-(this.camera.pos.x) / this.camera.scale) / 100),
      Math.floor((-(this.camera.pos.y) / this.camera.scale) / 100),
    );

    this.ctx.lineWidth = 1;
    this.ctx.strokeStyle = "#D6D6D6";
    for (let x = 0; x <= x_tiles; x++) {
      for (let y = 0; y <= y_tiles; y++) {
        this.ctx.strokeRect((origin.x + x) * 100, (origin.y + y) * 100, 100, 100);
        // this.ctx.fillRect(
        //   Math.floor((-(this.camera.pos.x - w / 2) / this.camera.scale) / 100) * 100,
        //   Math.floor((-(this.camera.pos.y - h / 2) / this.camera.scale) / 100) * 100,
        //   100,
        //   100
        // );
      }
    }
    const even = world.cellSize % 2 == 0;
    const halfWorld = Math.floor(world.cellSize / 2);
    for (let o = 0; o <= this.onion_skins; ++o) {
      // console.log(o);
      const l = this.onion_skins ? (1 - (o / this.onion_skins)) : 0;

      for (let z = 0; z < world.cellSize; ++z) {
        for (let x = 0; x < world.cellSize; ++x) {
          const voxel = world.getVoxel(x, (world.layer - (this.onion_skins - o) - 1), z, true);
          if (voxel && voxel !== 100) {
            this.ctx.fillStyle = `hsl(350, 5%, ${l * 80}%)`;
            this.ctx.strokeStyle = `hsl(350, 10%, ${Math.max(0, (l * 75) - 30)}%)`;
            if (o == this.onion_skins) {
              this.ctx.fillStyle = `#333333`;
              this.ctx.strokeStyle = "#141414"
              if (!even) {
                if (x == halfWorld && z == halfWorld) { this.ctx.fillStyle = `#F3C429`; this.ctx.strokeStyle = "#9C7E19" }
                else if (x == halfWorld) { this.ctx.fillStyle = `#CE3333`; this.ctx.strokeStyle = `#851313`; }
                else if (z == halfWorld) { this.ctx.fillStyle = `#303CE2`; this.ctx.strokeStyle = `#171C69`; }
              }
            }
            this.ctx.beginPath();
            this.ctx.rect((x - halfWorld) * 100, (z - halfWorld) * 100, 100, 100);
            this.ctx.fill();
            this.ctx.stroke();

          }
        }
      }
    }
    const lw = w / this.camera.scale;
    const lh = h / this.camera.scale;
    this.ctx.lineWidth = 2;
    this.ctx.strokeStyle = "blue";
    this.ctx.beginPath();
    this.ctx.moveTo(0, -lh);
    this.ctx.lineTo(0, lh);
    this.ctx.stroke();
    if (!even) {
      this.ctx.beginPath();
      this.ctx.moveTo(100, -lh);
      this.ctx.lineTo(100, lh);
      this.ctx.stroke();
    }
    this.ctx.strokeStyle = "red";
    this.ctx.beginPath();
    this.ctx.moveTo(-lw, 0);
    this.ctx.lineTo(lw, 0);
    this.ctx.stroke();
    if (!even) {
      this.ctx.beginPath();
      this.ctx.moveTo(-lw, 100);
      this.ctx.lineTo(lw, 100);
      this.ctx.stroke();
    }

    this.ctx.fillStyle = "#3FF72681";
    this.ctx.fillRect(
      Math.floor(((-this.camera.pos.x + this.pointer.x) / this.camera.scale) / 100) * 100,
      Math.floor(((-this.camera.pos.y + this.pointer.y) / this.camera.scale) / 100) * 100,
      100,
      100
    );
  }
  regenerate(): void {
    const a = 1;
  }
  pointer_move(e: PointerEvent): void {
    this.pointer.set(
      (e.clientX),
      (e.clientY)
    );
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