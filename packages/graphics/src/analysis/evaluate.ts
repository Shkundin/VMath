import type { Expr } from "./ast.js";

export function evaluateExpr(expr: Expr, x: number): number {
  switch (expr.kind) {
    case "number":
      return expr.value;

    case "variable":
      return x;

    case "unary": {
      const value = evaluateExpr(expr.argument, x);
      switch (expr.op) {
        case "-":
          return -value;
      }
    }

    case "binary": {
      const left = evaluateExpr(expr.left, x);
      const right = evaluateExpr(expr.right, x);

      switch (expr.op) {
        case "+":
          return left + right;
        case "-":
          return left - right;
        case "*":
          return left * right;
        case "/":
          return left / right;
        case "^":
          return Math.pow(left, right);
      }
    }

    case "call": {
      const argument = evaluateExpr(expr.argument, x);

      switch (expr.fn) {
        case "sin":
          return Math.sin(argument);
        case "cos":
          return Math.cos(argument);
        case "tan":
          return Math.tan(argument);
        case "abs":
          return Math.abs(argument);
        case "sqrt":
          return Math.sqrt(argument);
        case "log":
          return Math.log(argument);
        case "exp":
          return Math.exp(argument);
      }
    }
  }
}

export function compileExpr(expr: Expr): (x: number) => number {
  return (x: number) => evaluateExpr(expr, x);
}
