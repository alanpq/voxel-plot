import type Renderer from "./renderer";

export default class Renderer2D implements Renderer {
  ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement, gui: GUI) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("could not get 2d context");
    this.ctx = ctx;
  }

  animate(): void {
    this.ctx.fillRect(0, 0, 50, 50);
  }
  regenerate(): void {
  }
  pointer_move(e: PointerEvent): void {
  }
  window_resize(): void {
  }

}