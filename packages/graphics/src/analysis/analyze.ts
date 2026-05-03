import type { Expr } from "./ast.js";
import { derivativeOf } from "./differentiate.js";
import { evaluateExpr } from "./evaluate.js";
import { findRootsOnInterval } from "./roots.js";
import { classifyExpr, type ClassifiedFunction, extractPolynomialCoefficients } from "./classify.js";

const EPS = 1e-8;

export type AnalysisMode = "exact" | "hybrid" | "numeric" | "unsupported";

export interface SamplePoint {
  x: number;
  y: number;
}

export interface AnalysisPoint {
  x: number;
  y: number;
}

export interface FunctionAnalysisResult {
  mode: AnalysisMode;
  kind: "constant" | "polynomial" | "reciprocal" | "absolute_shift" | "generic";
  samples: SamplePoint[];
  zeros: number[];
  discontinuities: number[];
  criticalPoints: AnalysisPoint[];
  minimum: AnalysisPoint | null;
  maximum: AnalysisPoint | null;
  range: { minY: number; maxY: number } | null;
  domainText: string;
  rangeText: string;
  zerosText: string;
  discontinuitiesText: string;
  criticalText: string;
  modeText: string;
}

function formatNumber(value: number): string {
  if (Math.abs(value) < EPS) return "0";
  if (Math.abs(value - Math.round(value)) < EPS) return String(Math.round(value));
  return value.toFixed(4).replace(/\.?0+$/, "");
}

function formatPoint(point: AnalysisPoint): string {
  return `(${formatNumber(point.x)}, ${formatNumber(point.y)})`;
}

function uniqueRounded(values: number[], digits = 6): number[] {
  const out: number[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const rounded = Number(value.toFixed(digits));
    const key = rounded.toFixed(digits);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(rounded);
    }
  }

  return out.sort((a, b) => a - b);
}

function rootsTextFromList(roots: number[]): string {
  return roots.length > 0 ? roots.map(formatNumber).join(", ") : "Не найдены";
}

function breaksTextFromList(values: number[]): string {
  return values.length > 0 ? values.map((x) => `x = ${formatNumber(x)}`).join(", ") : "Не найдены";
}

function criticalTextFromList(points: AnalysisPoint[]): string {
  return points.length > 0 ? points.map(formatPoint).join("; ") : "Не найдены";
}

function sampleExprOnInterval(
  expr: Expr,
  xMin: number,
  xMax: number,
  samples = 2400
): { points: SamplePoint[]; invalidXs: number[] } {
  const points: SamplePoint[] = [];
  const invalidXs: number[] = [];
  const step = (xMax - xMin) / samples;

  for (let i = 0; i <= samples; i += 1) {
    const x = xMin + i * step;
    const y = evaluateExpr(expr, x);

    if (Number.isFinite(y)) {
      points.push({ x, y });
    } else {
      invalidXs.push(x);
    }
  }

  return {
    points,
    invalidXs: uniqueRounded(invalidXs, 3),
  };
}

function makeResult(
  partial: Omit<FunctionAnalysisResult, "samples" | "zeros" | "discontinuities" | "criticalPoints" | "minimum" | "maximum" | "range"> & Partial<Pick<FunctionAnalysisResult, "samples" | "zeros" | "discontinuities" | "criticalPoints" | "minimum" | "maximum" | "range">>
): FunctionAnalysisResult {
  return {
    samples: [],
    zeros: [],
    discontinuities: [],
    criticalPoints: [],
    minimum: null,
    maximum: null,
    range: null,
    ...partial,
  };
}

function analyzeConstant(value: number): FunctionAnalysisResult {
  const zerosText = Math.abs(value) < EPS ? "Все x ∈ (-∞; +∞)" : "Не найдены";

  return makeResult({
    mode: "exact",
    modeText: "Точный",
    kind: "constant",
    domainText: "(-∞; +∞)",
    rangeText: `{${formatNumber(value)}}`,
    zerosText,
    discontinuitiesText: "Не найдены",
    criticalText: "Не выделяются для постоянной функции",
    range: { minY: value, maxY: value },
  });
}

function evalPolynomial(coeffs: number[], x: number): number {
  const c0 = coeffs[0] ?? 0;
  const c1 = coeffs[1] ?? 0;
  const c2 = coeffs[2] ?? 0;
  return c0 + c1 * x + c2 * x * x;
}

function analyzePolynomial(coeffs: number[]): FunctionAnalysisResult {
  const c = coeffs[0] ?? 0;
  const b = coeffs[1] ?? 0;
  const a = coeffs[2] ?? 0;

  if (Math.abs(a) < EPS && Math.abs(b) < EPS) {
    return analyzeConstant(c);
  }

  const zeros: number[] = [];
  const criticalPoints: AnalysisPoint[] = [];
  let rangeText = "(-∞; +∞)";
  let minimum: AnalysisPoint | null = null;
  let maximum: AnalysisPoint | null = null;

  if (Math.abs(a) < EPS) {
    zeros.push(-c / b);
  } else {
    const discriminant = b * b - 4 * a * c;

    if (Math.abs(discriminant) < EPS) {
      zeros.push(-b / (2 * a));
    } else if (discriminant > 0) {
      const sqrtD = Math.sqrt(discriminant);
      zeros.push((-b - sqrtD) / (2 * a), (-b + sqrtD) / (2 * a));
    }

    const xv = -b / (2 * a);
    const yv = evalPolynomial(coeffs, xv);
    const vertex = {
      x: Number(xv.toFixed(6)),
      y: Number(yv.toFixed(6)),
    };
    criticalPoints.push(vertex);

    if (a > 0) {
      minimum = vertex;
      rangeText = `[${formatNumber(yv)}; +∞)`;
    } else {
      maximum = vertex;
      rangeText = `(-∞; ${formatNumber(yv)}]`;
    }
  }

  return makeResult({
    mode: "exact",
    modeText: "Точный",
    kind: "polynomial",
    domainText: "(-∞; +∞)",
    rangeText,
    zeros,
    zerosText: rootsTextFromList(uniqueRounded(zeros)),
    discontinuitiesText: "Не найдены",
    criticalPoints,
    criticalText: criticalTextFromList(criticalPoints),
    minimum,
    maximum,
  });
}


function analyzeAbsoluteShift(shiftX: number, shiftY: number): FunctionAnalysisResult {
  const zeros: number[] = [];

  if (shiftY < 0) {
    const d = Math.abs(shiftY);
    zeros.push(shiftX - d, shiftX + d);
  } else if (Math.abs(shiftY) < EPS) {
    zeros.push(shiftX);
  }

  const vertex = {
    x: Number(shiftX.toFixed(6)),
    y: Number(shiftY.toFixed(6)),
  };

  return makeResult({
    mode: "exact",
    modeText: "Точный",
    kind: "absolute_shift",
    domainText: "(-∞; +∞)",
    rangeText: `[${formatNumber(shiftY)}; +∞)`,
    zeros,
    zerosText: rootsTextFromList(uniqueRounded(zeros)),
    discontinuitiesText: "Не найдены",
    criticalPoints: [vertex],
    criticalText: formatPoint(vertex),
    minimum: vertex,
  });
}

function analyzeReciprocal(): FunctionAnalysisResult {
  return makeResult({
    mode: "exact",
    modeText: "Точный",
    kind: "reciprocal",
    domainText: "(-∞; 0) ∪ (0; +∞)",
    rangeText: "(-∞; 0) ∪ (0; +∞)",
    zerosText: "Не найдены",
    discontinuities: [0],
    discontinuitiesText: "x = 0",
    criticalText: "Не найдены",
  });
}

function findSingleBoundary(expr: Expr, target = 0): number | null {
  const fn = (x: number) => evaluateExpr(expr, x) - target;
  const roots = findRootsOnInterval(fn, -100, 100, {
    samples: 5000,
    tolerance: 1e-6,
    maxIterations: 80,
  });

  return roots.length === 1 ? roots[0] : null;
}

function isLinearExpr(expr: Expr): { a: number; b: number } | null {
  const coeffs = extractPolynomialCoefficients(expr);
  if (!coeffs) return null;
  if ((coeffs[2] ?? 0) !== 0) return null;
  return { a: coeffs[1] ?? 0, b: coeffs[0] ?? 0 };
}

function analyzeSpecialGeneric(expr: Expr): FunctionAnalysisResult | null {
  if (expr.kind !== "call") return null;

  if (expr.fn === "log") {
    const linear = isLinearExpr(expr.argument);
    if (linear && Math.abs(linear.a) > EPS) {
      const boundary = -linear.b / linear.a;
      const domainText =
        linear.a > 0
          ? `(${formatNumber(boundary)}; +∞)`
          : `(-∞; ${formatNumber(boundary)})`;

      const zero = (1 - linear.b) / linear.a;

      return makeResult({
        mode: "exact",
        modeText: "Точный",
        kind: "generic",
        domainText,
        rangeText: "(-∞; +∞)",
        zeros: [zero],
        zerosText: formatNumber(zero),
        discontinuities: [boundary],
        discontinuitiesText: `Граница области определения: x = ${formatNumber(boundary)}`,
        criticalText: "Не найдены",
      });
    }
  }

  if (expr.fn === "sqrt") {
    const linear = isLinearExpr(expr.argument);
    if (linear && Math.abs(linear.a) > EPS) {
      const boundary = -linear.b / linear.a;
      const domainText =
        linear.a > 0
          ? `[${formatNumber(boundary)}; +∞)`
          : `(-∞; ${formatNumber(boundary)}]`;

      return makeResult({
        mode: "exact",
        modeText: "Точный",
        kind: "generic",
        domainText,
        rangeText: "[0; +∞)",
        zeros: [boundary],
        zerosText: formatNumber(boundary),
        discontinuities: [boundary],
        discontinuitiesText: `Граница области определения: x = ${formatNumber(boundary)}`,
        criticalText: "Не найдены",
      });
    }
  }

  if (expr.fn === "tan") {
    return makeResult({
      mode: "hybrid",
      modeText: "Гибридный",
      kind: "generic",
      domainText: "ℝ \\ {π/2 + πk}",
      rangeText: "(-∞; +∞)",
      zerosText: "x = πk",
      discontinuitiesText: "x = π/2 + πk",
      criticalText: "Не найдены",
    });
  }

  return null;
}

function analyzeGeneric(expr: Expr, xMin: number, xMax: number): FunctionAnalysisResult {
  const special = analyzeSpecialGeneric(expr);
  if (special) return special;

  const derivative = derivativeOf(expr);
  const dfn = (x: number) => evaluateExpr(derivative, x);
  const fn = (x: number) => evaluateExpr(expr, x);

  const { points, invalidXs } = sampleExprOnInterval(expr, xMin, xMax, 2600);

  let minimum: AnalysisPoint | null = null;
  let maximum: AnalysisPoint | null = null;

  for (const point of points) {
    if (!minimum || point.y < minimum.y) minimum = { x: point.x, y: point.y };
    if (!maximum || point.y > maximum.y) maximum = { x: point.x, y: point.y };
  }

  const criticalXs = findRootsOnInterval(dfn, xMin, xMax, {
    samples: 2500,
    tolerance: 1e-5,
    maxIterations: 80,
  });

  const criticalPoints = criticalXs
    .map((x) => ({ x, y: evaluateExpr(expr, x) }))
    .filter((point) => Number.isFinite(point.y))
    .map((point) => ({
      x: Number(point.x.toFixed(6)),
      y: Number(point.y.toFixed(6)),
    }));

  const zeros = findRootsOnInterval(fn, xMin, xMax, {
    samples: 2500,
    tolerance: 1e-5,
    maxIterations: 80,
  }).filter((x) => Number.isFinite(fn(x)));

  return makeResult({
    mode: "numeric",
    modeText: "Численный",
    kind: "generic",
    samples: points,
    zeros,
    discontinuities: invalidXs,
    criticalPoints,
    minimum,
    maximum,
    range:
      minimum && maximum
        ? { minY: minimum.y, maxY: maximum.y }
        : null,
    domainText: "Глобальная область определения не определена точно",
    rangeText:
      minimum && maximum
        ? `[${formatNumber(minimum.y)}; ${formatNumber(maximum.y)}] (численная оценка)`
        : "Не удалось определить",
    zerosText: rootsTextFromList(zeros),
    discontinuitiesText:
      invalidXs.length > 0
        ? "Есть точки вне области определения / особые точки"
        : "Не найдены",
    criticalText: criticalTextFromList(criticalPoints),
  });
}

export function analyzeExprOnInterval(
  expr: Expr,
  xMin: number,
  xMax: number
): FunctionAnalysisResult {
  const classified: ClassifiedFunction = classifyExpr(expr);

  switch (classified.kind) {
    case "constant":
      return analyzeConstant(classified.value);
    case "polynomial":
      return analyzePolynomial(classified.coefficients);
    case "reciprocal":
      return analyzeReciprocal();
    case "absolute_shift":
      return analyzeAbsoluteShift(classified.shiftX, classified.shiftY);
    case "generic":
      return analyzeGeneric(expr, xMin, xMax);
  }
}
