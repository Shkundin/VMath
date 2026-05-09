export interface RootFindingOptions {
  samples?: number;
  tolerance?: number;
  maxIterations?: number;
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

  return out;
}

function bisect(
  fn: (x: number) => number,
  left: number,
  right: number,
  tolerance: number,
  maxIterations: number
): number | null {
  let a = left;
  let b = right;
  let fa = fn(a);
  let fb = fn(b);

  if (!Number.isFinite(fa) || !Number.isFinite(fb)) {
    return null;
  }

  if (Math.abs(fa) < tolerance) return a;
  if (Math.abs(fb) < tolerance) return b;
  if (fa * fb > 0) return null;

  for (let i = 0; i < maxIterations; i += 1) {
    const mid = (a + b) / 2;
    const fm = fn(mid);

    if (!Number.isFinite(fm)) {
      return null;
    }

    if (Math.abs(fm) < tolerance || Math.abs(b - a) < tolerance) {
      return mid;
    }

    if (fa * fm <= 0) {
      b = mid;
      fb = fm;
    } else {
      a = mid;
      fa = fm;
    }
  }

  return (a + b) / 2;
}

export function findRootsOnInterval(
  fn: (x: number) => number,
  xMin: number,
  xMax: number,
  options: RootFindingOptions = {}
): number[] {
  const samples = options.samples ?? 2000;
  const tolerance = options.tolerance ?? 1e-6;
  const maxIterations = options.maxIterations ?? 60;

  const roots: number[] = [];
  const step = (xMax - xMin) / samples;

  let prevX = xMin;
  let prevY = fn(prevX);

  if (Number.isFinite(prevY) && Math.abs(prevY) < tolerance) {
    roots.push(prevX);
  }

  for (let i = 1; i <= samples; i += 1) {
    const x = xMin + i * step;
    const y = fn(x);

    if (Number.isFinite(prevY) && Number.isFinite(y)) {
      if (Math.abs(y) < tolerance) {
        roots.push(x);
      } else if (prevY * y < 0) {
        const root = bisect(fn, prevX, x, tolerance, maxIterations);
        if (root !== null) {
          roots.push(root);
        }
      }
    }

    prevX = x;
    prevY = y;
  }

  return uniqueRounded(roots, 5).sort((a, b) => a - b);
}
