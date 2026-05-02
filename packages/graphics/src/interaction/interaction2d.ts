import type { Scene2D } from "../core/scene2d.js";

export interface Interaction2DOptions {
  onChange?: () => void;
}

export class Interaction2D {
  private canvas: HTMLCanvasElement;
  private scene: Scene2D;
  private onChange?: () => void;
  private isDragging = false;
  private lastX = 0;
  private lastY = 0;

  constructor(canvas: HTMLCanvasElement, scene: Scene2D, options: Interaction2DOptions = {}) {
    this.canvas = canvas;
    this.scene = scene;
    this.onChange = options.onChange;
  }

  attach(): void {
    this.canvas.addEventListener("pointerdown", this.handlePointerDown);
    window.addEventListener("pointermove", this.handlePointerMove);
    window.addEventListener("pointerup", this.handlePointerUp);
    this.canvas.addEventListener("wheel", this.handleWheel, { passive: false });
  }

  detach(): void {
    this.canvas.removeEventListener("pointerdown", this.handlePointerDown);
    window.removeEventListener("pointermove", this.handlePointerMove);
    window.removeEventListener("pointerup", this.handlePointerUp);
    this.canvas.removeEventListener("wheel", this.handleWheel);
  }

  private notify(): void {
    this.onChange?.();
  }

  private handlePointerDown = (event: PointerEvent): void => {
    this.isDragging = true;
    this.lastX = event.clientX;
    this.lastY = event.clientY;
    this.canvas.setPointerCapture?.(event.pointerId);
  };

  private handlePointerMove = (event: PointerEvent): void => {
    if (!this.isDragging) return;
    const dx = event.clientX - this.lastX;
    const dy = event.clientY - this.lastY;
    this.lastX = event.clientX;
    this.lastY = event.clientY;
    this.scene.camera.panBy(dx, dy);
    this.notify();
  };

  private handlePointerUp = (): void => {
    this.isDragging = false;
  };

  private handleWheel = (event: WheelEvent): void => {
    event.preventDefault();
    const factor = event.deltaY < 0 ? 1.1 : 0.9;
    const rect = this.canvas.getBoundingClientRect();
    this.scene.camera.zoomAt(
      factor,
      {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      },
      this.canvas.width,
      this.canvas.height
    );
    this.notify();
  };
}
