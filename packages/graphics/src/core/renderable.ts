import type { Camera2D } from "./camera2d";
import type { SceneObjectJSON } from "../serialize/schema";

export interface Renderable {
  id: string;
  type: string;
  visible?: boolean;
  render(context: CanvasRenderingContext2D, camera: Camera2D): void;
  toJSON(): SceneObjectJSON;
}
