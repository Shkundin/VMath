declare module "katex/contrib/auto-render" {
  type Delimiter = {
    left: string;
    right: string;
    display: boolean;
  };

  type RenderMathInElementOptions = {
    delimiters?: Delimiter[];
    throwOnError?: boolean;
    strict?: boolean | string;
  };

  export default function renderMathInElement(
    element: HTMLElement,
    options?: RenderMathInElementOptions
  ): void;
}

declare module "katex" {
  type KatexOptions = {
    displayMode?: boolean;
    output?: "html" | "mathml" | "htmlAndMathml";
    throwOnError?: boolean;
    strict?: boolean | string;
    trust?: boolean;
  };

  export function renderToString(latex: string, options?: KatexOptions): string;
}
