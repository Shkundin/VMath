import type { Renderable } from "../core/renderable";
import { parseExpression } from "../analysis/parse";
import { compileExpr } from "../analysis/evaluate";
import type { Camera2D } from "../core/camera2d";
import type {
  Axis2DJSON,
  Circle2DJSON,
  Grid2DJSON,
  Label2DJSON,
  Line2DJSON,
  Point2DJSON,
  Polyline2DJSON,
  Rectangle2DJSON,
  SceneObjectJSON,
} from "../serialize/schema";

export interface BasePrimitiveOptions {
  id: string;
  visible?: boolean;
  strokeStyle?: string;
  fillStyle?: string;
  lineWidth?: number;
}

export interface Point2DOptions extends BasePrimitiveOptions {
  x: number;
  y: number;
  radius?: number;
}

export interface Line2DOptions extends BasePrimitiveOptions {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Polyline2DOptions extends BasePrimitiveOptions {
  points: Array<{ x: number; y: number }>;
}

export interface Grid2DOptions extends BasePrimitiveOptions {
  step?: number;
  extent?: number;
}

export interface Axis2DOptions extends BasePrimitiveOptions {
  extent?: number;
  tickStep?: number;
  tickSize?: number;
  showLabels?: boolean;
  labelFont?: string;
}

export interface FunctionGraph2DOptions extends BasePrimitiveOptions {
  fn: (x: number) => number;
  xMin?: number;
  xMax?: number;
  samples?: number;
  breakOnDiscontinuity?: boolean;
  discontinuityThreshold?: number;
}

export interface Circle2DOptions extends BasePrimitiveOptions {
  x: number;
  y: number;
  radius: number;
}

export interface Rectangle2DOptions extends BasePrimitiveOptions {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Label2DOptions extends BasePrimitiveOptions {
  x: number;
  y: number;
  text: string;
  font?: string;
}

export interface FunctionExpressionOptions extends Omit<FunctionGraph2DOptions, "fn"> {
  expression: string;
}

function getVisibleWorldBounds(camera: Camera2D, width: number, height: number) {
  const topLeft = camera.screenToWorld({ x: 0, y: 0 }, width, height);
  const bottomRight = camera.screenToWorld({ x: width, y: height }, width, height);

  return {
    minX: Math.min(topLeft.x, bottomRight.x),
    maxX: Math.max(topLeft.x, bottomRight.x),
    minY: Math.min(topLeft.y, bottomRight.y),
    maxY: Math.max(topLeft.y, bottomRight.y),
  };
}

function snapStart(value: number, step: number): number {
  return Math.floor(value / step) * step;
}

function chooseNiceStep(target: number): number {
  const safe = Math.max(target, 1e-9);
  const power = Math.pow(10, Math.floor(Math.log10(safe)));
  const normalized = safe / power;

  if (normalized <= 1) return 1 * power;
  if (normalized <= 2) return 2 * power;
  if (normalized <= 5) return 5 * power;
  return 10 * power;
}

function formatTickValue(value: number): string {
  const abs = Math.abs(value);
  if (abs < 1e-9) return "0";
  if (abs >= 1000 || abs < 0.01) return value.toExponential(1);
  if (Math.abs(value - Math.round(value)) < 1e-9) return String(Math.round(value));
  return value.toFixed(2).replace(/\.?0+$/, "");
}

abstract class BasePrimitive implements Renderable {
  id: string;
  type: string;
  visible: boolean;
  strokeStyle: string;
  fillStyle: string;
  lineWidth: number;

  constructor(type: string, options: BasePrimitiveOptions) {
    this.id = options.id;
    this.type = type;
    this.visible = options.visible ?? true;
    this.strokeStyle = options.strokeStyle ?? "#2563eb";
    this.fillStyle = options.fillStyle ?? "transparent";
    this.lineWidth = options.lineWidth ?? 2;
  }

  abstract render(context: CanvasRenderingContext2D, camera: Camera2D): void;
  abstract toJSON(): SceneObjectJSON;
}

export class Point2D extends BasePrimitive {
  x: number;
  y: number;
  radius: number;

  constructor(options: Point2DOptions) {
    super("point2d", options);
    this.x = options.x;
    this.y = options.y;
    this.radius = options.radius ?? 4;
  }

  render(context: CanvasRenderingContext2D, camera: Camera2D): void {
    if (!this.visible) return;
    const screen = camera.worldToScreen({ x: this.x, y: this.y }, context.canvas.width, context.canvas.height);
    context.save();
    context.beginPath();
    context.fillStyle = this.strokeStyle;
    context.arc(screen.x, screen.y, this.radius, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  toJSON(): Point2DJSON {
    return {
      type: "point2d",
      id: this.id,
      visible: this.visible,
      x: this.x,
      y: this.y,
      radius: this.radius,
      strokeStyle: this.strokeStyle,
      fillStyle: this.fillStyle,
      lineWidth: this.lineWidth,
    };
  }
}

export class Line2D extends BasePrimitive {
  x1: number;
  y1: number;
  x2: number;
  y2: number;

  constructor(options: Line2DOptions) {
    super("line2d", options);
    this.x1 = options.x1;
    this.y1 = options.y1;
    this.x2 = options.x2;
    this.y2 = options.y2;
  }

  render(context: CanvasRenderingContext2D, camera: Camera2D): void {
    if (!this.visible) return;
    const a = camera.worldToScreen({ x: this.x1, y: this.y1 }, context.canvas.width, context.canvas.height);
    const b = camera.worldToScreen({ x: this.x2, y: this.y2 }, context.canvas.width, context.canvas.height);

    context.save();
    context.beginPath();
    context.strokeStyle = this.strokeStyle;
    context.lineWidth = this.lineWidth;
    context.moveTo(a.x, a.y);
    context.lineTo(b.x, b.y);
    context.stroke();
    context.restore();
  }

  toJSON(): Line2DJSON {
    return {
      type: "line2d",
      id: this.id,
      visible: this.visible,
      x1: this.x1,
      y1: this.y1,
      x2: this.x2,
      y2: this.y2,
      strokeStyle: this.strokeStyle,
      fillStyle: this.fillStyle,
      lineWidth: this.lineWidth,
    };
  }
}

export class Polyline2D extends BasePrimitive {
  points: Array<{ x: number; y: number }>;

  constructor(options: Polyline2DOptions) {
    super("polyline2d", options);
    this.points = options.points;
  }

  render(context: CanvasRenderingContext2D, camera: Camera2D): void {
    if (!this.visible || this.points.length === 0) return;

    context.save();
    context.beginPath();
    context.strokeStyle = this.strokeStyle;
    context.lineWidth = this.lineWidth;

    this.points.forEach((point, index) => {
      const screen = camera.worldToScreen(point, context.canvas.width, context.canvas.height);
      if (index === 0) {
        context.moveTo(screen.x, screen.y);
      } else {
        context.lineTo(screen.x, screen.y);
      }
    });

    context.stroke();
    context.restore();
  }

  toJSON(): Polyline2DJSON {
    return {
      type: "polyline2d",
      id: this.id,
      visible: this.visible,
      points: this.points,
      strokeStyle: this.strokeStyle,
      fillStyle: this.fillStyle,
      lineWidth: this.lineWidth,
    };
  }
}

export class Grid2D extends BasePrimitive {
  step: number;
  extent: number;

  constructor(options: Grid2DOptions) {
    super("grid2d", options);
    this.step = options.step ?? 1;
    this.extent = options.extent ?? 20;
    this.strokeStyle = options.strokeStyle ?? "#eceff4";
    this.lineWidth = options.lineWidth ?? 0.8;
  }

  render(context: CanvasRenderingContext2D, camera: Camera2D): void {
    if (!this.visible) return;

    const width = context.canvas.width;
    const height = context.canvas.height;
    const bounds = getVisibleWorldBounds(camera, width, height);

    const pixelsPerWorld = camera.zoom;
    const minorStep = chooseNiceStep(32 / pixelsPerWorld);
    const majorStep = minorStep * 5;

    const startMinorX = snapStart(bounds.minX, minorStep);
    const startMinorY = snapStart(bounds.minY, minorStep);
    const startMajorX = snapStart(bounds.minX, majorStep);
    const startMajorY = snapStart(bounds.minY, majorStep);

    context.save();

    context.strokeStyle = "#eef2f7";
    context.lineWidth = 1;

    for (let x = startMinorX; x <= bounds.maxX; x += minorStep) {
      const isMajor = Math.abs((x / majorStep) - Math.round(x / majorStep)) < 1e-8;
      if (isMajor) continue;
      const a = camera.worldToScreen({ x, y: bounds.minY }, width, height);
      const b = camera.worldToScreen({ x, y: bounds.maxY }, width, height);
      context.beginPath();
      context.moveTo(a.x, a.y);
      context.lineTo(b.x, b.y);
      context.stroke();
    }

    for (let y = startMinorY; y <= bounds.maxY; y += minorStep) {
      const isMajor = Math.abs((y / majorStep) - Math.round(y / majorStep)) < 1e-8;
      if (isMajor) continue;
      const a = camera.worldToScreen({ x: bounds.minX, y }, width, height);
      const b = camera.worldToScreen({ x: bounds.maxX, y }, width, height);
      context.beginPath();
      context.moveTo(a.x, a.y);
      context.lineTo(b.x, b.y);
      context.stroke();
    }

    context.strokeStyle = "#d9e0ea";
    context.lineWidth = 1.2;

    for (let x = startMajorX; x <= bounds.maxX; x += majorStep) {
      const a = camera.worldToScreen({ x, y: bounds.minY }, width, height);
      const b = camera.worldToScreen({ x, y: bounds.maxY }, width, height);
      context.beginPath();
      context.moveTo(a.x, a.y);
      context.lineTo(b.x, b.y);
      context.stroke();
    }

    for (let y = startMajorY; y <= bounds.maxY; y += majorStep) {
      const a = camera.worldToScreen({ x: bounds.minX, y }, width, height);
      const b = camera.worldToScreen({ x: bounds.maxX, y }, width, height);
      context.beginPath();
      context.moveTo(a.x, a.y);
      context.lineTo(b.x, b.y);
      context.stroke();
    }

    context.restore();
  }

  toJSON(): Grid2DJSON {
    return {
      type: "grid2d",
      id: this.id,
      visible: this.visible,
      step: this.step,
      extent: this.extent,
      strokeStyle: this.strokeStyle,
      fillStyle: this.fillStyle,
      lineWidth: this.lineWidth,
    };
  }
}

export class Axis2D extends BasePrimitive {
  extent: number;
  tickStep: number;
  tickSize: number;
  showLabels: boolean;
  labelFont: string;

  constructor(options: Axis2DOptions) {
    super("axis2d", options);
    this.extent = options.extent ?? 20;
    this.tickStep = options.tickStep ?? 1;
    this.tickSize = options.tickSize ?? 4;
    this.showLabels = options.showLabels ?? true;
    this.labelFont = options.labelFont ?? "11px sans-serif";
    this.strokeStyle = options.strokeStyle ?? "#111827";
  }

  render(context: CanvasRenderingContext2D, camera: Camera2D): void {
    if (!this.visible) return;

    const width = context.canvas.width;
    const height = context.canvas.height;
    const bounds = getVisibleWorldBounds(camera, width, height);

    const pixelsPerWorld = camera.zoom;
    const minorStep = chooseNiceStep(32 / pixelsPerWorld);
    const majorStep = minorStep * 5;

    const xAxisVisible = bounds.minY <= 0 && bounds.maxY >= 0;
    const yAxisVisible = bounds.minX <= 0 && bounds.maxX >= 0;

    const xAxisA = camera.worldToScreen({ x: bounds.minX, y: 0 }, width, height);
    const xAxisB = camera.worldToScreen({ x: bounds.maxX, y: 0 }, width, height);
    const yAxisA = camera.worldToScreen({ x: 0, y: bounds.minY }, width, height);
    const yAxisB = camera.worldToScreen({ x: 0, y: bounds.maxY }, width, height);

    context.save();
    context.strokeStyle = this.strokeStyle;
    context.fillStyle = "#374151";
    context.lineWidth = 2;
    context.font = this.labelFont;

    if (xAxisVisible) {
      context.beginPath();
      context.moveTo(xAxisA.x, xAxisA.y);
      context.lineTo(xAxisB.x, xAxisB.y);
      context.stroke();
    }

    if (yAxisVisible) {
      context.beginPath();
      context.moveTo(yAxisA.x, yAxisA.y);
      context.lineTo(yAxisB.x, yAxisB.y);
      context.stroke();
    }

    if (xAxisVisible) {
      const startMinorX = snapStart(bounds.minX, minorStep);
      const startMajorX = snapStart(bounds.minX, majorStep);

      for (let x = startMinorX; x <= bounds.maxX; x += minorStep) {
        if (Math.abs(x) < 1e-9) continue;
        const isMajor = Math.abs((x / majorStep) - Math.round(x / majorStep)) < 1e-8;
        if (isMajor) continue;
        const p = camera.worldToScreen({ x, y: 0 }, width, height);
        context.beginPath();
        context.lineWidth = 1;
        context.moveTo(p.x, p.y - 3);
        context.lineTo(p.x, p.y + 3);
        context.stroke();
      }

      for (let x = startMajorX; x <= bounds.maxX; x += majorStep) {
        if (Math.abs(x) < 1e-9) continue;
        const p = camera.worldToScreen({ x, y: 0 }, width, height);
        context.beginPath();
        context.lineWidth = 1.5;
        context.moveTo(p.x, p.y - 6);
        context.lineTo(p.x, p.y + 6);
        context.stroke();

        if (this.showLabels) {
          context.fillText(formatTickValue(x), p.x - 10, p.y + 18);
        }
      }
    }

    if (yAxisVisible) {
      const startMinorY = snapStart(bounds.minY, minorStep);
      const startMajorY = snapStart(bounds.minY, majorStep);

      for (let y = startMinorY; y <= bounds.maxY; y += minorStep) {
        if (Math.abs(y) < 1e-9) continue;
        const isMajor = Math.abs((y / majorStep) - Math.round(y / majorStep)) < 1e-8;
        if (isMajor) continue;
        const p = camera.worldToScreen({ x: 0, y }, width, height);
        context.beginPath();
        context.lineWidth = 1;
        context.moveTo(p.x - 3, p.y);
        context.lineTo(p.x + 3, p.y);
        context.stroke();
      }

      for (let y = startMajorY; y <= bounds.maxY; y += majorStep) {
        if (Math.abs(y) < 1e-9) continue;
        const p = camera.worldToScreen({ x: 0, y }, width, height);
        context.beginPath();
        context.lineWidth = 1.5;
        context.moveTo(p.x - 6, p.y);
        context.lineTo(p.x + 6, p.y);
        context.stroke();

        if (this.showLabels) {
          context.fillText(formatTickValue(y), p.x + 10, p.y + 4);
        }
      }
    }

    context.restore();
  }

  toJSON(): Axis2DJSON {
    return {
      type: "axis2d",
      id: this.id,
      visible: this.visible,
      extent: this.extent,
      strokeStyle: this.strokeStyle,
      fillStyle: this.fillStyle,
      lineWidth: this.lineWidth,
    };
  }
}

export class FunctionGraph2D extends BasePrimitive {
  fn: (x: number) => number;
  xMin: number;
  xMax: number;
  samples: number;
  breakOnDiscontinuity: boolean;
  discontinuityThreshold: number;

  constructor(options: FunctionGraph2DOptions) {
    super("functionGraph2d", options);
    this.fn = options.fn;
    this.xMin = options.xMin ?? -10;
    this.xMax = options.xMax ?? 10;
    this.samples = options.samples ?? 400;
    this.breakOnDiscontinuity = options.breakOnDiscontinuity ?? true;
    this.discontinuityThreshold = options.discontinuityThreshold ?? 20;
  }

  private buildSegments(): Array<Array<{ x: number; y: number }>> {
    const segments: Array<Array<{ x: number; y: number }>> = [];
    let current: Array<{ x: number; y: number }> = [];
    const step = (this.xMax - this.xMin) / this.samples;
    let previousY: number | null = null;

    for (let i = 0; i <= this.samples; i += 1) {
      const x = this.xMin + i * step;
      const y = this.fn(x);

      if (!Number.isFinite(y)) {
        if (current.length > 1) segments.push(current);
        current = [];
        previousY = null;
        continue;
      }

      if (
        this.breakOnDiscontinuity &&
        previousY !== null &&
        Math.abs(y - previousY) > this.discontinuityThreshold
      ) {
        if (current.length > 1) segments.push(current);
        current = [];
      }

      current.push({ x, y });
      previousY = y;
    }

    if (current.length > 1) {
      segments.push(current);
    }

    return segments;
  }

  render(context: CanvasRenderingContext2D, camera: Camera2D): void {
    if (!this.visible) return;

    const segments = this.buildSegments();

    for (const segment of segments) {
      new Polyline2D({
        id: `${this.id}__segment`,
        points: segment,
        strokeStyle: this.strokeStyle,
        lineWidth: this.lineWidth,
        visible: this.visible,
      }).render(context, camera);
    }
  }

  toJSON(): Polyline2DJSON {
    const points = this.buildSegments().flat();

    return {
      type: "polyline2d",
      id: this.id,
      visible: this.visible,
      points,
      strokeStyle: this.strokeStyle,
      fillStyle: this.fillStyle,
      lineWidth: this.lineWidth,
    };
  }
}

export class Circle2D extends BasePrimitive {
  x: number;
  y: number;
  radius: number;

  constructor(options: Circle2DOptions) {
    super("circle2d", options);
    this.x = options.x;
    this.y = options.y;
    this.radius = options.radius;
  }

  render(context: CanvasRenderingContext2D, camera: Camera2D): void {
    if (!this.visible) return;
    const center = camera.worldToScreen({ x: this.x, y: this.y }, context.canvas.width, context.canvas.height);

    context.save();
    context.beginPath();
    context.strokeStyle = this.strokeStyle;
    context.lineWidth = this.lineWidth;
    context.arc(center.x, center.y, this.radius * camera.zoom, 0, Math.PI * 2);

    if (this.fillStyle !== "transparent") {
      context.fillStyle = this.fillStyle;
      context.fill();
    }

    context.stroke();
    context.restore();
  }

  toJSON(): Circle2DJSON {
    return {
      type: "circle2d",
      id: this.id,
      visible: this.visible,
      x: this.x,
      y: this.y,
      radius: this.radius,
      strokeStyle: this.strokeStyle,
      fillStyle: this.fillStyle,
      lineWidth: this.lineWidth,
    };
  }
}

export class Rectangle2D extends BasePrimitive {
  x: number;
  y: number;
  width: number;
  height: number;

  constructor(options: Rectangle2DOptions) {
    super("rectangle2d", options);
    this.x = options.x;
    this.y = options.y;
    this.width = options.width;
    this.height = options.height;
  }

  render(context: CanvasRenderingContext2D, camera: Camera2D): void {
    if (!this.visible) return;

    const topLeft = camera.worldToScreen(
      { x: this.x, y: this.y + this.height },
      context.canvas.width,
      context.canvas.height
    );

    const pixelWidth = this.width * camera.zoom;
    const pixelHeight = this.height * camera.zoom;

    context.save();
    context.beginPath();
    context.strokeStyle = this.strokeStyle;
    context.lineWidth = this.lineWidth;
    context.rect(topLeft.x, topLeft.y, pixelWidth, pixelHeight);

    if (this.fillStyle !== "transparent") {
      context.fillStyle = this.fillStyle;
      context.fill();
    }

    context.stroke();
    context.restore();
  }

  toJSON(): Rectangle2DJSON {
    return {
      type: "rectangle2d",
      id: this.id,
      visible: this.visible,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      strokeStyle: this.strokeStyle,
      fillStyle: this.fillStyle,
      lineWidth: this.lineWidth,
    };
  }
}

export class Label2D extends BasePrimitive {
  x: number;
  y: number;
  text: string;
  font: string;

  constructor(options: Label2DOptions) {
    super("label2d", options);
    this.x = options.x;
    this.y = options.y;
    this.text = options.text;
    this.font = options.font ?? "14px sans-serif";
    this.fillStyle = options.fillStyle ?? "#111827";
  }

  render(context: CanvasRenderingContext2D, camera: Camera2D): void {
    if (!this.visible) return;

    const screen = camera.worldToScreen({ x: this.x, y: this.y }, context.canvas.width, context.canvas.height);

    context.save();
    context.font = this.font;
    context.fillStyle = this.fillStyle;
    context.fillText(this.text, screen.x, screen.y);
    context.restore();
  }

  toJSON(): Label2DJSON {
    return {
      type: "label2d",
      id: this.id,
      visible: this.visible,
      x: this.x,
      y: this.y,
      text: this.text,
      font: this.font,
      strokeStyle: this.strokeStyle,
      fillStyle: this.fillStyle,
      lineWidth: this.lineWidth,
    };
  }
}

export function plotFunction(options: FunctionGraph2DOptions): FunctionGraph2D {
  return new FunctionGraph2D(options);
}

export function compileFunctionExpression(expression: string): (x: number) => number {
  return compileExpr(parseExpression(expression));
}

export function plotFunctionExpression(options: FunctionExpressionOptions): FunctionGraph2D {
  return new FunctionGraph2D({
    ...options,
    fn: compileFunctionExpression(options.expression),
  });
}
