import type { Expr, FunctionName } from "./ast";
import { binaryExpr, callExpr, numberLiteral, unaryExpr, variableExpr } from "./ast";
import { tokenize, type Token } from "./tokenize";

const SUPPORTED_UNARY_FUNCTIONS: Set<string> = new Set([
  "sin",
  "cos",
  "tan",
  "abs",
  "sqrt",
  "log",
  "exp",
  "ln",
  "log10",
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

      if (SUPPORTED_UNARY_FUNCTIONS.has(token.value)) {
        this.expect("lparen");
        const args = this.parseCallArguments();
        this.expect("rparen");
        return this.buildFunctionCall(token.value, args);
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

  private parseCallArguments(): Expr[] {
    const args: Expr[] = [];

    if (this.peek()?.type === "rparen") {
      return args;
    }

    args.push(this.parseExpression());

    while (this.peek()?.type === "comma") {
      this.advance();
      args.push(this.parseExpression());
    }

    return args;
  }

  private buildFunctionCall(name: string, args: Expr[]): Expr {
    if (name === "ln") {
      if (args.length !== 1) {
        throw new Error("ln(...) принимает ровно один аргумент");
      }
      return callExpr("log", args[0]);
    }

    if (name === "log10") {
      if (args.length !== 1) {
        throw new Error("log10(...) принимает ровно один аргумент");
      }
      return binaryExpr(
        "/",
        callExpr("log", args[0]),
        callExpr("log", numberLiteral(10))
      );
    }

    if (name === "log") {
      if (args.length === 1) {
        return callExpr("log", args[0]);
      }

      if (args.length === 2) {
        return binaryExpr(
          "/",
          callExpr("log", args[0]),
          callExpr("log", args[1])
        );
      }

      throw new Error("log(...) принимает один или два аргумента");
    }

    if (args.length !== 1) {
      throw new Error(`${name}(...) принимает ровно один аргумент`);
    }

    return callExpr(name as FunctionName, args[0]);
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
