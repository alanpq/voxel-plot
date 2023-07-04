export default interface Renderer {
  animate(): void;
  regenerate(): void;

  pointer_move(e: PointerEvent): void;
  window_resize(): void;
}