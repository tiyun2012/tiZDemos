import { compile } from 'mathjs';

export interface DataPoint {
  x: number;
  [key: string]: number | null;
}

export function generatePoints(
  expressions: { id: string; expr: string; color: string; visible: boolean }[],
  xMin: number,
  xMax: number,
  pointCount: number = 500
): DataPoint[] {
  const step = (xMax - xMin) / (pointCount - 1);
  const data: DataPoint[] = [];

  // Compile expressions once
  const compiledExprs = expressions
    .filter((e) => e.visible && e.expr.trim() !== '')
    .map((e) => {
      try {
        return { id: e.id, compiled: compile(e.expr) };
      } catch (error) {
        console.warn(`Failed to compile expression: ${e.expr}`, error);
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
