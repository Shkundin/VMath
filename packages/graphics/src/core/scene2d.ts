import { Camera2D, type Camera2DOptions } from "./camera2d.js";
import type { Renderable } from "./renderable.js";
import type { Scene2DJSON } from "../serialize/schema.js";

export interface Scene2DOptions {
  camera?: Camera2D | Camera2DOptions;
  background?: string;
}

export class Scene2D {
  camera: Camera2D;
  background: string;
  objects: Renderable[];

  constructor(options: Scene2DOptions = {}) {
    this.camera =
      options.camera instanceof Camera2D
        ? options.camera
        : new Camera2D(options.camera);
    this.background = options.background ?? "#ffffff";
    this.objects = [];
  }

  add(object: Renderable): this {
    this.objects.push(object);
    return this;
  }

  remove(id: string): this {
    this.objects = this.objects.filter((object) => object.id !== id);
    return this;
  }

  clear(): this {
    this.objects = [];
    return this;
  }

  getById<T extends Renderable = Renderable>(id: string): T | undefined {
    return this.objects.find((object) => object.id === id) as T | undefined;
  }

  render(context: CanvasRenderingContext2D): void {
    context.save();
    context.fillStyle = this.background;
    context.fillRect(0, 0, context.canvas.width, context.canvas.height);
    context.restore();

    for (const object of this.objects) {
      object.render(context, this.camera);
    }
  }

  toJSON(): Scene2DJSON {
    return {
      version: 1,
      background: this.background,
      camera: this.camera.toJSON(),
      objects: this.objects.map((object) => object.toJSON()),
    };
  }
}
