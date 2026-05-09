export type Token =
  | { type: "number"; value: number; raw: string }
  | { type: "identifier"; value: string }
  | { type: "operator"; value: "+" | "-" | "*" | "/" | "^" }
  | { type: "lparen" }
  | { type: "rparen" }
  | { type: "comma" };

function isDigit(char: string): boolean {
  return char >= "0" && char <= "9";
}

function isIdentifierStart(char: string): boolean {
  return /[A-Za-z_]/.test(char);
}

function isIdentifierPart(char: string): boolean {
  return /[A-Za-z0-9_]/.test(char);
}

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    const char = input[i];

    if (/\s/.test(char)) {
      i += 1;
      continue;
    }

    if (isDigit(char) || (char === "." && i + 1 < input.length && isDigit(input[i + 1]))) {
      let j = i;
      let dotCount = 0;

      while (j < input.length) {
        const next = input[j];
        if (next === ".") {
          dotCount += 1;
          if (dotCount > 1) break;
          j += 1;
          continue;
        }
        if (!isDigit(next)) break;
        j += 1;
      }

      const raw = input.slice(i, j);
      const value = Number(raw);

      if (!Number.isFinite(value)) {
        throw new Error(`Некорректное число: ${raw}`);
      }

      tokens.push({ type: "number", value, raw });
      i = j;
      continue;
    }

    if (isIdentifierStart(char)) {
      let j = i + 1;
      while (j < input.length && isIdentifierPart(input[j])) {
        j += 1;
      }

      tokens.push({ type: "identifier", value: input.slice(i, j) });
      i = j;
      continue;
    }

    if (char === "+" || char === "-" || char === "*" || char === "/" || char === "^") {
      tokens.push({ type: "operator", value: char });
      i += 1;
      continue;
    }

    if (char === "(") {
      tokens.push({ type: "lparen" });
      i += 1;
      continue;
    }

    if (char === ")") {
      tokens.push({ type: "rparen" });
      i += 1;
      continue;
    }

    if (char === ",") {
      tokens.push({ type: "comma" });
      i += 1;
      continue;
    }

    throw new Error(`Неожиданный символ: ${char}`);
  }

  return tokens;
}
