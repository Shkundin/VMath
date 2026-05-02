import { Scene2D } from "../core/scene2d.js";
import { Interaction2D } from "../interaction/interaction2d.js";
import {
  Axis2D,
  Grid2D,
  Label2D,
  plotFunctionExpression,
} from "../renderer2d/primitives.js";

export interface Demo2DController {
  scene: Scene2D;
  interaction: Interaction2D;
  render: () => void;
  dispose: () => void;
}

export function createDemo2D(canvas: HTMLCanvasElement): Demo2DController {
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("2D canvas context is not available");
  }

  const scene = new Scene2D({
    background: "#ffffff",
    camera: { x: 0, y: 0, zoom: 45, minZoom: 10, maxZoom: 400 },
  });

  scene
    .add(new Grid2D({ id: "grid", step: 1, extent: 20 }))
    .add(new Axis2D({ id: "axis", extent: 20, strokeStyle: "#111827", lineWidth: 2 }))
    .add(
      plotFunctionExpression({
        id: "sin",
        expression: "sin(x)",
        xMin: -10,
        xMax: 10,
        samples: 600,
        strokeStyle: "#2563eb",
        lineWidth: 2,
      })
    )
    .add(
      plotFunctionExpression({
        id: "parabola",
        expression: "x^2/8 - 3",
        xMin: -8,
        xMax: 8,
        samples: 500,
        strokeStyle: "#dc2626",
        lineWidth: 2,
      })
    )
    .add(
      plotFunctionExpression({
        id: "hyperbola",
        expression: "3/x",
        xMin: -10,
        xMax: 10,
        samples: 1200,
        strokeStyle: "#16a34a",
        lineWidth: 2,
        breakOnDiscontinuity: true,
        discontinuityThreshold: 3,
      })
    )
    .add(
      plotFunctionExpression({
        id: "abs",
        expression: "abs(x) - 4",
        xMin: -10,
        xMax: 10,
        samples: 400,
        strokeStyle: "#7c3aed",
        lineWidth: 2,
      })
    )
    .add(new Label2D({ id: "l1", x: 5.5, y: 1.5, text: "y = sin(x)", fillStyle: "#2563eb", font: "16px sans-serif" }))
    .add(new Label2D({ id: "l2", x: 4.5, y: 0.5, text: "y = 3/x", fillStyle: "#16a34a", font: "16px sans-serif" }))
    .add(new Label2D({ id: "l3", x: 2.5, y: -2.5, text: "y = |x| - 4", fillStyle: "#7c3aed", font: "16px sans-serif" }))
    .add(new Label2D({ id: "l4", x: 3.5, y: -0.8, text: "y = x²/8 - 3", fillStyle: "#dc2626", font: "16px sans-serif" }));

  const render = () => {
    scene.render(context);
  };

  const interaction = new Interaction2D(canvas, scene, { onChange: render });
  interaction.attach();
  render();

  return {
    scene,
    interaction,
    render,
    dispose: () => interaction.detach(),
  };
}
