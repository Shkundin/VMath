export interface WebGLRendererOptions {
  clearColor?: [number, number, number, number];
}

export class WebGLRenderer {
  readonly canvas: HTMLCanvasElement;
  readonly gl: WebGLRenderingContext;
  clearColor: [number, number, number, number];

  constructor(canvas: HTMLCanvasElement, options: WebGLRendererOptions = {}) {
    const gl = canvas.getContext("webgl");
    if (!gl) {
      throw new Error("WebGL is not supported in this environment");
    }

    this.canvas = canvas;
    this.gl = gl;
    this.clearColor = options.clearColor ?? [1, 1, 1, 1];
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.gl.viewport(0, 0, width, height);
  }

  render(): void {
    const [r, g, b, a] = this.clearColor;
    this.gl.clearColor(r, g, b, a);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
  }
}
