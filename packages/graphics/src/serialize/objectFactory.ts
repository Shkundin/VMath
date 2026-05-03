import { Scene2D } from "../core/scene2d.js";
import {
  Axis2D,
  Circle2D,
  Grid2D,
  Label2D,
  Line2D,
  Point2D,
  Polyline2D,
  Rectangle2D,
} from "../renderer2d/primitives.js";
import type { Scene2DJSON, SceneObjectJSON } from "./schema.js";

export function createObjectFromJSON(data: SceneObjectJSON) {
  switch (data.type) {
    case "point2d":
      return new Point2D(data);
    case "line2d":
      return new Line2D(data);
    case "polyline2d":
      return new Polyline2D(data);
    case "grid2d":
      return new Grid2D(data);
    case "axis2d":
      return new Axis2D(data);
    case "circle2d":
      return new Circle2D(data);
    case "rectangle2d":
      return new Rectangle2D(data);
    case "label2d":
      return new Label2D(data);
    default: {
      const unsupported: never = data;
      throw new Error(`Unsupported object type: ${(unsupported as { type?: string }).type ?? "unknown"}`);
    }
  }
}

export function createSceneFromJSON(data: Scene2DJSON): Scene2D {
  const scene = new Scene2D({
    background: data.background,
    camera: data.camera,
  });

  for (const object of data.objects) {
    scene.add(createObjectFromJSON(object));
  }

  return scene;
}

export function serializeScene(scene: Scene2D): Scene2DJSON {
  return scene.toJSON();
}
