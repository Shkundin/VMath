import type { Expr } from "./ast.js";
import { binaryExpr, callExpr, numberLiteral, unaryExpr, variableExpr } from "./ast.js";
import { simplifyExpr } from "./simplify.js";

function add(a: Expr, b: Expr): Expr {
  return simplifyExpr(binaryExpr("+", a, b));
}

function sub(a: Expr, b: Expr): Expr {
  return simplifyExpr(binaryExpr("-", a, b));
}

function mul(a: Expr, b: Expr): Expr {
  return simplifyExpr(binaryExpr("*", a, b));
}

function div(a: Expr, b: Expr): Expr {
  return simplifyExpr(binaryExpr("/", a, b));
}

function pow(a: Expr, b: Expr): Expr {
  return simplifyExpr(binaryExpr("^", a, b));
}

function neg(a: Expr): Expr {
  return simplifyExpr(unaryExpr("-", a));
}

export function differentiateExpr(expr: Expr): Expr {
  switch (expr.kind) {
    case "number":
      return numberLiteral(0);

    case "variable":
      return numberLiteral(1);

    case "unary":
      return simplifyExpr(neg(differentiateExpr(expr.argument)));

    case "binary": {
      const u = expr.left;
      const v = expr.right;
      const du = differentiateExpr(u);
      const dv = differentiateExpr(v);

      switch (expr.op) {
        case "+":
          return simplifyExpr(add(du, dv));

        case "-":
          return simplifyExpr(sub(du, dv));

        case "*":
          return simplifyExpr(add(mul(du, v), mul(u, dv)));

        case "/":
          return simplifyExpr(
            div(
              sub(mul(du, v), mul(u, dv)),
              pow(v, numberLiteral(2))
            )
          );

        case "^":
          if (v.kind === "number") {
            return simplifyExpr(
              mul(
                mul(numberLiteral(v.value), pow(u, numberLiteral(v.value - 1))),
                du
              )
            );
          }

          return simplifyExpr(
            mul(
              pow(u, v),
              add(
                mul(dv, callExpr("log", u)),
                div(mul(v, du), u)
              )
            )
          );
      }
    }

    case "call": {
      const u = expr.argument;
      const du = differentiateExpr(u);

      switch (expr.fn) {
        case "sin":
          return simplifyExpr(mul(callExpr("cos", u), du));

        case "cos":
          return simplifyExpr(neg(mul(callExpr("sin", u), du)));

        case "tan":
          return simplifyExpr(
            mul(
              div(numberLiteral(1), pow(callExpr("cos", u), numberLiteral(2))),
              du
            )
          );

        case "abs":
          return simplifyExpr(
            mul(
              div(u, callExpr("abs", u)),
              du
            )
          );

        case "sqrt":
          return simplifyExpr(
            div(du, mul(numberLiteral(2), callExpr("sqrt", u)))
          );

        case "log":
          return simplifyExpr(div(du, u));

        case "exp":
          return simplifyExpr(mul(callExpr("exp", u), du));
      }
    }
  }
}

export function derivativeOf(expr: Expr): Expr {
  return simplifyExpr(differentiateExpr(expr));
}

export function variable(): Expr {
  return variableExpr();
}
