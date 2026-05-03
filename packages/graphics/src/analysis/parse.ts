import type { Expr, FunctionName } from "./ast.js";
import { binaryExpr, callExpr, numberLiteral, unaryExpr, variableExpr } from "./ast.js";
import { tokenize, type Token } from "./tokenize.js";

const SUPPORTED_FUNCTIONS: Set<string> = new Set([
  "sin",
  "cos",
  "tan",
  "abs",
  "sqrt",
  "log",
  "exp",
]);

class Parser {
  private tokens: Token[];
  private index = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): Expr {
    const expr = this.parseExpression();
    if (!this.isAtEnd()) {
      throw new Error("Лишние токены в конце выражения");
    }
    return expr;
  }

  private parseExpression(): Expr {
    return this.parseAdditive();
  }

  private parseAdditive(): Expr {
    let expr = this.parseMultiplicative();

    while (true) {
      const token = this.peek();
      if (token?.type === "operator" && (token.value === "+" || token.value === "-")) {
        this.advance();
        const right = this.parseMultiplicative();
        expr = binaryExpr(token.value, expr, right);
        continue;
      }
      break;
    }

    return expr;
  }

  private parseMultiplicative(): Expr {
    let expr = this.parsePower();

    while (true) {
      const token = this.peek();
      if (token?.type === "operator" && (token.value === "*" || token.value === "/")) {
        this.advance();
        const right = this.parsePower();
        expr = binaryExpr(token.value, expr, right);
        continue;
      }
      break;
    }

    return expr;
  }

  private parsePower(): Expr {
    let expr = this.parseUnary();

    const token = this.peek();
    if (token?.type === "operator" && token.value === "^") {
      this.advance();
      const right = this.parsePower();
      expr = binaryExpr("^", expr, right);
    }

    return expr;
  }

  private parseUnary(): Expr {
    const token = this.peek();

    if (token?.type === "operator" && token.value === "-") {
      this.advance();
      return unaryExpr("-", this.parseUnary());
    }

    return this.parsePrimary();
  }

  private parsePrimary(): Expr {
    const token = this.peek();

    if (!token) {
      throw new Error("Неожиданный конец выражения");
    }

    if (token.type === "number") {
      this.advance();
      return numberLiteral(token.value);
    }

    if (token.type === "identifier") {
      this.advance();

      if (token.value === "x") {
        return variableExpr();
      }

      if (token.value === "PI") {
        return numberLiteral(Math.PI);
      }

      if (token.value === "E") {
        return numberLiteral(Math.E);
      }

      if (SUPPORTED_FUNCTIONS.has(token.value)) {
        this.expect("lparen");
        const argument = this.parseExpression();
        this.expect("rparen");
        return callExpr(token.value as FunctionName, argument);
      }

      throw new Error(`Неизвестный идентификатор: ${token.value}`);
    }

    if (token.type === "lparen") {
      this.advance();
      const expr = this.parseExpression();
      this.expect("rparen");
      return expr;
    }

    throw new Error("Ожидалось число, x, функция или скобка");
  }

  private expect(type: Token["type"]): Token {
    const token = this.peek();
    if (!token || token.type !== type) {
      throw new Error(`Ожидался токен типа ${type}`);
    }
    this.advance();
    return token;
  }

  private peek(): Token | undefined {
    return this.tokens[this.index];
  }

  private advance(): void {
    this.index += 1;
  }

  private isAtEnd(): boolean {
    return this.index >= this.tokens.length;
  }
}

export function parseExpression(input: string): Expr {
  const tokens = tokenize(input);
  const parser = new Parser(tokens);
  return parser.parse();
}
