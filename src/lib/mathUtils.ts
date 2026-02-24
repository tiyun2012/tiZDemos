import { compile } from 'mathjs';

export interface DataPoint {
  x: number;
  [key: string]: number | null;
}

export interface Geometry {
  type: 'point' | 'polygon';
  points: { x: number; y: number }[];
}

export function parseGeometry(expr: string): Geometry | null {
  // Match (x, y) pattern, allowing for decimals and negative numbers
  // We use a global regex to find all occurrences
  const pointRegex = /\(\s*(-?\d*\.?\d+(?:e[+-]?\d+)?)\s*,\s*(-?\d*\.?\d+(?:e[+-]?\d+)?)\s*\)/gi;
  
  const matches = [...expr.matchAll(pointRegex)];
  
  if (matches.length === 0) {
    return null;
  }

  const points = matches.map(match => ({
    x: parseFloat(match[1]),
    y: parseFloat(match[2])
  }));

  if (points.length === 1) {
    return { type: 'point', points };
  }

  return { type: 'polygon', points };
}

export function formatGeometry(geometry: Geometry): string {
  return geometry.points
    .map(p => `(${Number(p.x).toFixed(2)}, ${Number(p.y).toFixed(2)})`)
    .join(', ');
}

export function generatePoints(
  expressions: { id: string; expr: string; color: string; visible: boolean }[],
  xMin: number,
  xMax: number,
  pointCount: number = 500
): DataPoint[] {
  const step = (xMax - xMin) / (pointCount - 1);
  const data: DataPoint[] = [];

  // Filter out geometry items, only compile actual functions
  const functionExprs = expressions.filter(e => {
    if (!e.visible || e.expr.trim() === '') return false;
    return parseGeometry(e.expr) === null;
  });

  // Compile expressions once
  const compiledExprs = functionExprs
    .map((e) => {
      try {
        return { id: e.id, compiled: compile(e.expr) };
      } catch (error) {
        // console.warn(`Failed to compile expression: ${e.expr}`, error);
        return null;
      }
    })
    .filter((e): e is { id: string; compiled: any } => e !== null);

  for (let i = 0; i < pointCount; i++) {
    const x = xMin + i * step;
    const point: DataPoint = { x };

    compiledExprs.forEach(({ id, compiled }) => {
      try {
        const y = compiled.evaluate({ x });
        // Handle infinity and NaN for better plotting
        if (typeof y === 'number' && isFinite(y)) {
           point[id] = y;
        } else {
           point[id] = null;
        }
      } catch (error) {
        point[id] = null;
      }
    });

    data.push(point);
  }

  return data;
}
