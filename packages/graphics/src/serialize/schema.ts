export interface Camera2DJSON {
  x?: number;
  y?: number;
  zoom?: number;
  minZoom?: number;
  maxZoom?: number;
}

export interface BaseObjectJSON {
  type: string;
  id: string;
  visible?: boolean;
  strokeStyle?: string;
  fillStyle?: string;
  lineWidth?: number;
}

export interface Point2DJSON extends BaseObjectJSON {
  type: "point2d";
  x: number;
  y: number;
  radius?: number;
}

export interface Line2DJSON extends BaseObjectJSON {
  type: "line2d";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Polyline2DJSON extends BaseObjectJSON {
  type: "polyline2d";
  points: Array<{ x: number; y: number }>;
}

export interface Grid2DJSON extends BaseObjectJSON {
  type: "grid2d";
  step?: number;
  extent?: number;
}

export interface Axis2DJSON extends BaseObjectJSON {
  type: "axis2d";
  extent?: number;
}

export interface Circle2DJSON extends BaseObjectJSON {
  type: "circle2d";
  x: number;
  y: number;
  radius: number;
}

export interface Rectangle2DJSON extends BaseObjectJSON {
  type: "rectangle2d";
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Label2DJSON extends BaseObjectJSON {
  type: "label2d";
  x: number;
  y: number;
  text: string;
  font?: string;
}

export type SceneObjectJSON =
  | Point2DJSON
  | Line2DJSON
  | Polyline2DJSON
  | Grid2DJSON
  | Axis2DJSON
  | Circle2DJSON
  | Rectangle2DJSON
  | Label2DJSON;

export interface Scene2DJSON {
  version: number;
  background?: string;
  camera?: Camera2DJSON;
  objects: SceneObjectJSON[];
}
