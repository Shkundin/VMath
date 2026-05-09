export type FunctionName =
  | "sin"
  | "cos"
  | "tan"
  | "abs"
  | "sqrt"
  | "log"
  | "exp";

export type BinaryOperator = "+" | "-" | "*" | "/" | "^";
export type UnaryOperator = "-";

export type Expr =
  | NumberLiteral
  | VariableExpr
  | BinaryExpr
  | UnaryExpr
  | CallExpr;

export interface NumberLiteral {
  kind: "number";
  value: number;
}

export interface VariableExpr {
  kind: "variable";
  name: "x";
}

export interface BinaryExpr {
  kind: "binary";
  op: BinaryOperator;
  left: Expr;
  right: Expr;
}

export interface UnaryExpr {
  kind: "unary";
  op: UnaryOperator;
  argument: Expr;
}

export interface CallExpr {
  kind: "call";
  fn: FunctionName;
  argument: Expr;
}

export function numberLiteral(value: number): NumberLiteral {
  return { kind: "number", value };
}

export function variableExpr(): VariableExpr {
  return { kind: "variable", name: "x" };
}

export function binaryExpr(op: BinaryOperator, left: Expr, right: Expr): BinaryExpr {
  return { kind: "binary", op, left, right };
}

export function unaryExpr(op: UnaryOperator, argument: Expr): UnaryExpr {
  return { kind: "unary", op, argument };
}

export function callExpr(fn: FunctionName, argument: Expr): CallExpr {
  return { kind: "call", fn, argument };
}
