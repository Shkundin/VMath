import type { Expr } from "./ast.js";
import { binaryExpr, numberLiteral, unaryExpr, callExpr } from "./ast.js";

function isNumber(expr: Expr, value?: number): expr is Extract<Expr, { kind: "number" }> {
  return expr.kind === "number" && (value === undefined || expr.value === value);
}

export function simplifyExpr(expr: Expr): Expr {
  switch (expr.kind) {
    case "number":
    case "variable":
      return expr;

    case "unary": {
      const argument = simplifyExpr(expr.argument);

      if (expr.op === "-" && isNumber(argument)) {
        return numberLiteral(-argument.value);
      }

      if (expr.op === "-" && argument.kind === "unary" && argument.op === "-") {
        return simplifyExpr(argument.argument);
      }

      return unaryExpr(expr.op, argument);
    }

    case "call": {
      const argument = simplifyExpr(expr.argument);

      if (isNumber(argument)) {
        switch (expr.fn) {
          case "sin":
            return numberLiteral(Math.sin(argument.value));
          case "cos":
            return numberLiteral(Math.cos(argument.value));
          case "tan":
            return numberLiteral(Math.tan(argument.value));
          case "abs":
            return numberLiteral(Math.abs(argument.value));
          case "sqrt":
            return numberLiteral(Math.sqrt(argument.value));
          case "log":
            return numberLiteral(Math.log(argument.value));
          case "exp":
            return numberLiteral(Math.exp(argument.value));
        }
      }

      return callExpr(expr.fn, argument);
    }

    case "binary": {
      const left = simplifyExpr(expr.left);
      const right = simplifyExpr(expr.right);

      if (isNumber(left) && isNumber(right)) {
        switch (expr.op) {
          case "+":
            return numberLiteral(left.value + right.value);
          case "-":
            return numberLiteral(left.value - right.value);
          case "*":
            return numberLiteral(left.value * right.value);
          case "/":
            return numberLiteral(left.value / right.value);
          case "^":
            return numberLiteral(Math.pow(left.value, right.value));
        }
      }

      switch (expr.op) {
        case "+":
          if (isNumber(left, 0)) return right;
          if (isNumber(right, 0)) return left;
          break;

        case "-":
          if (isNumber(right, 0)) return left;
          break;

        case "*":
          if (isNumber(left, 0) || isNumber(right, 0)) return numberLiteral(0);
          if (isNumber(left, 1)) return right;
          if (isNumber(right, 1)) return left;
          break;

        case "/":
          if (isNumber(left, 0)) return numberLiteral(0);
          if (isNumber(right, 1)) return left;
          break;

        case "^":
          if (isNumber(right, 0)) return numberLiteral(1);
          if (isNumber(right, 1)) return left;
          if (isNumber(left, 0)) return numberLiteral(0);
          if (isNumber(left, 1)) return numberLiteral(1);
          break;
      }

      return binaryExpr(expr.op, left, right);
    }
  }
}
