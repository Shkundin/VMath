import type { Expr } from "./ast.js";

export type FunctionKind = "constant" | "polynomial" | "reciprocal" | "generic";

export interface ConstantClassification {
  kind: "constant";
  value: number;
}

export interface PolynomialClassification {
  kind: "polynomial";
  coefficients: number[]; // c0 + c1*x + c2*x^2
}

export interface ReciprocalClassification {
  kind: "reciprocal";
  numerator: number; // k/x
}

export interface GenericClassification {
  kind: "generic";
}

export interface AbsoluteShiftClassification {
  kind: "absolute_shift";
  shiftX: number;
  shiftY: number;
}


export type ClassifiedFunction =
  | ConstantClassification
  | PolynomialClassification
  | ReciprocalClassification
  | AbsoluteShiftClassification
  | GenericClassification;

const EPS = 1e-9;

function trimCoefficients(coeffs: number[]): number[] {
  const copy = coeffs.slice();
  while (copy.length > 1 && Math.abs(copy[copy.length - 1]) < EPS) {
    copy.pop();
  }
  return copy;
}

function addPoly(a: number[], b: number[]): number[] | null {
  const size = Math.max(a.length, b.length);
  const out = new Array(size).fill(0);
  for (let i = 0; i < size; i += 1) {
    out[i] = (a[i] ?? 0) + (b[i] ?? 0);
  }
  const trimmed = trimCoefficients(out);
  return trimmed.length <= 3 ? trimmed : null;
}

function subPoly(a: number[], b: number[]): number[] | null {
  const size = Math.max(a.length, b.length);
  const out = new Array(size).fill(0);
  for (let i = 0; i < size; i += 1) {
    out[i] = (a[i] ?? 0) - (b[i] ?? 0);
  }
  const trimmed = trimCoefficients(out);
  return trimmed.length <= 3 ? trimmed : null;
}

function mulPoly(a: number[], b: number[]): number[] | null {
  const out = new Array(a.length + b.length - 1).fill(0);
  for (let i = 0; i < a.length; i += 1) {
    for (let j = 0; j < b.length; j += 1) {
      out[i + j] += a[i] * b[j];
    }
  }
  const trimmed = trimCoefficients(out);
  return trimmed.length <= 3 ? trimmed : null;
}

function scalePoly(a: number[], k: number): number[] {
  return trimCoefficients(a.map((value) => value * k));
}

function isIntegerLike(value: number): boolean {
  return Math.abs(value - Math.round(value)) < EPS;
}

export function extractPolynomialCoefficients(expr: Expr): number[] | null {
  switch (expr.kind) {
    case "number":
      return [expr.value];

    case "variable":
      return [0, 1];

    case "unary": {
      const argument = extractPolynomialCoefficients(expr.argument);
      if (!argument) return null;
      return scalePoly(argument, -1);
    }

    case "call":
      return null;

    case "binary": {
      const left = extractPolynomialCoefficients(expr.left);
      const right = extractPolynomialCoefficients(expr.right);

      switch (expr.op) {
        case "+":
          return left && right ? addPoly(left, right) : null;

        case "-":
          return left && right ? subPoly(left, right) : null;

        case "*":
          return left && right ? mulPoly(left, right) : null;

        case "/":
          if (!left || !right) return null;
          if (right.length === 1 && Math.abs(right[0]) > EPS) {
            return scalePoly(left, 1 / right[0]);
          }
          return null;

        case "^":
          if (!left || expr.right.kind !== "number") return null;
          if (!isIntegerLike(expr.right.value)) return null;
          const power = Math.round(expr.right.value);
          if (power < 0 || power > 2) return null;

          let result: number[] = [1];
          for (let i = 0; i < power; i += 1) {
            const next = mulPoly(result, left);
            if (!next) return null;
            result = next;
          }
          return trimCoefficients(result);
      }
    }
  }
}

function extractConstant(expr: Expr): number | null {
  const coeffs = extractPolynomialCoefficients(expr);
  if (!coeffs) return null;
  return coeffs.length === 1 ? coeffs[0] : null;
}


function matchAbsoluteShift(expr: Expr): { shiftX: number; shiftY: number } | null {
  function parseAbsArgument(node: Expr): number | null {
    const coeffs = extractPolynomialCoefficients(node);
    if (!coeffs) return null;

    const c0 = coeffs[0] ?? 0;
    const c1 = coeffs[1] ?? 0;
    const c2 = coeffs[2] ?? 0;

    if (Math.abs(c2) > EPS) return null;
    if (Math.abs(c1 - 1) < EPS) {
      return -c0;
    }
    if (Math.abs(c1 + 1) < EPS) {
      return c0;
    }
    return null;
  }

  function parseVertical(node: Expr): { absNode: Expr; shiftY: number } | null {
    if (node.kind === "call" && node.fn === "abs") {
      return { absNode: node, shiftY: 0 };
    }

    if (node.kind === "binary" && (node.op === "+" || node.op === "-")) {
      if (node.left.kind === "call" && node.left.fn === "abs" && node.right.kind === "number") {
        return {
          absNode: node.left,
          shiftY: node.op === "+" ? node.right.value : -node.right.value,
        };
      }

      if (node.right.kind === "call" && node.right.fn === "abs" && node.left.kind === "number" && node.op === "+") {
        return {
          absNode: node.right,
          shiftY: node.left.value,
        };
      }
    }

    return null;
  }

  const parsed = parseVertical(expr);
  if (!parsed) return null;

  const shiftX = parseAbsArgument(parsed.absNode.argument);
  if (shiftX === null) return null;

  return {
    shiftX,
    shiftY: parsed.shiftY,
  };
}

function matchReciprocalLike(expr: Expr): number | null {
  switch (expr.kind) {
    case "unary": {
      const inner = matchReciprocalLike(expr.argument);
      return inner === null ? null : -inner;
    }

    case "binary": {
      if (expr.op === "/") {
        const numerator = extractConstant(expr.left);
        const denominator = extractPolynomialCoefficients(expr.right);

        if (
          numerator !== null &&
          denominator &&
          denominator.length === 2 &&
          Math.abs(denominator[0]) < EPS &&
          Math.abs(denominator[1] - 1) < EPS
        ) {
          return numerator;
        }
      }
      return null;
    }

    default:
      return null;
  }
}

export function classifyExpr(expr: Expr): ClassifiedFunction {
  const reciprocal = matchReciprocalLike(expr);
  if (reciprocal !== null) {
    return { kind: "reciprocal", numerator: reciprocal };
  }

  const absoluteShift = matchAbsoluteShift(expr);
  if (absoluteShift !== null) {
    return {
      kind: "absolute_shift",
      shiftX: absoluteShift.shiftX,
      shiftY: absoluteShift.shiftY,
    };
  }

  const coeffs = extractPolynomialCoefficients(expr);
  if (coeffs) {
    if (coeffs.length === 1) {
      return { kind: "constant", value: coeffs[0] };
    }
    return {
      kind: "polynomial",
      coefficients: [coeffs[0] ?? 0, coeffs[1] ?? 0, coeffs[2] ?? 0],
    };
  }

  return { kind: "generic" };
}
