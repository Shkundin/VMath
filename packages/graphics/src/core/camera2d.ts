export interface PointLike {
  x: number;
  y: number;
}

export interface Camera2DOptions {
  x?: number;
  y?: number;
  zoom?: number;
  minZoom?: number;
  maxZoom?: number;
}

export class Camera2D {
  x: number;
  y: number;
  zoom: number;
  minZoom: number;
  maxZoom: number;

  constructor(options: Camera2DOptions = {}) {
    this.x = options.x ?? 0;
    this.y = options.y ?? 0;
    this.zoom = options.zoom ?? 1;
    this.minZoom = options.minZoom ?? 0.1;
    this.maxZoom = options.maxZoom ?? 10;
  }

  worldToScreen(point: PointLike, width: number, height: number): PointLike {
    return {
      x: (point.x - this.x) * this.zoom + width / 2,
      y: height / 2 - (point.y - this.y) * this.zoom,
    };
  }

  screenToWorld(point: PointLike, width: number, height: number): PointLike {
    return {
      x: (point.x - width / 2) / this.zoom + this.x,
      y: (height / 2 - point.y) / this.zoom + this.y,
    };
  }

  panBy(dxScreen: number, dyScreen: number): void {
    this.x -= dxScreen / this.zoom;
    this.y += dyScreen / this.zoom;
  }

  zoomAt(factor: number, screenPoint: PointLike, width: number, height: number): void {
    const before = this.screenToWorld(screenPoint, width, height);
    const nextZoom = Math.min(this.maxZoom, Math.max(this.minZoom, this.zoom * factor));
    this.zoom = nextZoom;
    const after = this.screenToWorld(screenPoint, width, height);
    this.x += before.x - after.x;
    this.y += before.y - after.y;
  }

  fitToBounds(
    bounds: { minX: number; maxX: number; minY: number; maxY: number },
    width: number,
    height: number,
    padding = 40
  ): void {
    const spanX = Math.max(bounds.maxX - bounds.minX, 1e-6);
    const spanY = Math.max(bounds.maxY - bounds.minY, 1e-6);

    const usableWidth = Math.max(width - padding * 2, 1);
    const usableHeight = Math.max(height - padding * 2, 1);

    const zoomX = usableWidth / spanX;
    const zoomY = usableHeight / spanY;

    this.zoom = Math.min(this.maxZoom, Math.max(this.minZoom, Math.min(zoomX, zoomY)));
    this.x = (bounds.minX + bounds.maxX) / 2;
    this.y = (bounds.minY + bounds.maxY) / 2;
  }

  toJSON(): Camera2DOptions {
    return {
      x: this.x,
      y: this.y,
      zoom: this.zoom,
      minZoom: this.minZoom,
      maxZoom: this.maxZoom,
    };
  }

  static fromJSON(data: Camera2DOptions): Camera2D {
    return new Camera2D(data);
  }
}
