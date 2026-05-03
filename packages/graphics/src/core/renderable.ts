import type { Camera2D } from "./camera2d.js";
import type { SceneObjectJSON } from "../serialize/schema.js";

export interface Renderable {
  id: string;
  type: string;
  visible?: boolean;
  render(context: CanvasRenderingContext2D, camera: Camera2D): void;
  toJSON(): SceneObjectJSON;
}
