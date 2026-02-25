import { compile, parse, derivative } from 'mathjs';

export interface DataPoint {
  x: number;
  [key: string]: number | null;
}

export interface Geometry {
  type: 'point' | 'polygon';
  points: { x: number; y: number }[];
}

export type FunctionType = 'explicit' | 'parametric' | 'polar' | 'implicit' | 'geometry';

export interface FunctionData {
  type: FunctionType;
  points: { x: number; y: number }[];
  segments?: { x: number; y: number }[][]; // For implicit plots (disconnected lines)
}

export function normalizeExpression(expr: string): string {
  let normalized = expr;
  
  // Replace common symbols and aliases
  normalized = normalized.replace(/π/g, 'pi');
  normalized = normalized.replace(/÷/g, '/');
  normalized = normalized.replace(/×/g, '*');
  normalized = normalized.replace(/√/g, 'sqrt');
  normalized = normalized.replace(/∞/g, 'Infinity');
  
  // Handle Piecewise notation: { x<0: x^2, x>=0: x } -> x<0 ? x^2 : (x>=0 ? x : null)
  if (normalized.trim().startsWith('{') && normalized.trim().endsWith('}')) {
    const content = normalized.trim().slice(1, -1);
    const parts = content.split(',').map(p => p.trim());
    
    let result = 'null';
    // Process from right to left to build nested ternary
    for (let i = parts.length - 1; i >= 0; i--) {
      const [condition, value] = parts[i].split(':').map(s => s.trim());
      if (condition && value) {
        result = `(${condition}) ? (${value}) : (${result})`;
      }
    }
    normalized = result;
  }

  return normalized;
}

export function detectFunctionType(expr: string): FunctionType {
  const normalized = normalizeExpression(expr);
  
  // Geometry
  if (parseGeometry(normalized)) return 'geometry';
  
  // Polar: r = ...
  if (/^\s*r\s*=/i.test(normalized)) return 'polar';
  
  // Parametric: (..., ...)
  if (/^\s*\(.*,.*\)\s*$/.test(normalized)) return 'parametric';
  
  // Implicit: ... = ... (but not y = ... or r = ...)
  if (normalized.includes('=') && !/^\s*(y|f\(x\))\s*=/i.test(normalized)) return 'implicit';
  
  return 'explicit';
}

export function extractVariables(expr: string): string[] {
  try {
    const normalized = normalizeExpression(expr);
    // Skip if it's a geometry definition
    if (parseGeometry(normalized)) return [];

    // Handle equations (implicit/polar) by parsing right side or both sides
    const cleanExpr = normalized.replace(/^(y|r)\s*=\s*/, '').replace('=', '-');
    
    const node = parse(cleanExpr);
    const variables = new Set<string>();
    
    node.traverse((node: any) => {
      if (node.isSymbolNode) {
        const name = node.name;
        // Filter out standard variables and constants
        if (!['x', 'y', 't', 'theta', 'r', 'pi', 'e', 'phi', 'tau', 'Infinity', 'sqrt', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'log', 'exp', 'abs', 'max', 'min', 'sign'].includes(name)) {
          variables.add(name);
        }
      }
    });
    
    return Array.from(variables);
  } catch (e) {
    return [];
  }
}

export function getDerivative(expr: string, variable: string = 'x'): string | null {
  try {
    const normalized = normalizeExpression(expr);
    // Only work for explicit functions
    if (detectFunctionType(expr) !== 'explicit') return null;
    
    // Parse and differentiate
    const node = parse(normalized);
    const deriv = derivative(node, variable);
    return deriv.toString();
  } catch (e) {
    return null;
  }
}

export function parseGeometry(expr: string): Geometry | null {
  const normalizedExpr = normalizeExpression(expr);
  
  // Match (x, y) pattern, allowing for decimals and negative numbers
  const pointRegex = /\(\s*(-?\d*\.?\d+(?:e[+-]?\d+)?)\s*,\s*(-?\d*\.?\d+(?:e[+-]?\d+)?)\s*\)/gi;
  
  const matches = [...normalizedExpr.matchAll(pointRegex)];
  
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

export function getNiceTicks(min: number, max: number, count: number = 10): number[] {
  if (min === max) return [min];
  
  const range = max - min;
  const roughStep = range / (count - 1);
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
  const normalizedStep = roughStep / magnitude;
  
  let step;
  if (normalizedStep < 1.5) step = 1 * magnitude;
  else if (normalizedStep < 3) step = 2 * magnitude;
  else if (normalizedStep < 7.5) step = 5 * magnitude;
  else step = 10 * magnitude;
  
  const start = Math.ceil(min / step) * step;
  const end = Math.floor(max / step) * step;
  
  const ticks: number[] = [];
  for (let t = start; t <= end + step / 1000; t += step) {
    const roundedTick = Math.round(t / step) * step;
    ticks.push(Number(roundedTick.toPrecision(10)));
  }
  
  return ticks;
}

// Marching Squares Implementation for Implicit Plots
function marchSquares(
  f: (x: number, y: number) => number,
  xMin: number, xMax: number,
  yMin: number, yMax: number,
  resolution: number = 50
): { x: number; y: number }[][] {
  const segments: { x: number; y: number }[][] = [];
  const dx = (xMax - xMin) / resolution;
  const dy = (yMax - yMin) / resolution;
  
  const grid: number[][] = [];
  
  // Evaluate grid
  for (let i = 0; i <= resolution; i++) {
    grid[i] = [];
    const x = xMin + i * dx;
    for (let j = 0; j <= resolution; j++) {
      const y = yMin + j * dy;
      grid[i][j] = f(x, y);
    }
  }
  
  // March
  for (let i = 0; i < resolution; i++) {
    for (let j = 0; j < resolution; j++) {
      const x = xMin + i * dx;
      const y = yMin + j * dy;
      
      const v0 = grid[i][j];
      const v1 = grid[i+1][j];
      const v2 = grid[i+1][j+1];
      const v3 = grid[i][j+1];
      
      const cellIndex = (v0 > 0 ? 1 : 0) | (v1 > 0 ? 2 : 0) | (v2 > 0 ? 4 : 0) | (v3 > 0 ? 8 : 0);
      
      // Linear interpolation for smoother lines
      const lerp = (v1: number, v2: number, p1: number, p2: number) => {
        if (Math.abs(v2 - v1) < 1e-10) return p1;
        return p1 + (p2 - p1) * (-v1 / (v2 - v1));
      };
      
      const top = { x: lerp(v0, v1, x, x + dx), y: y };
      const right = { x: x + dx, y: lerp(v1, v2, y, y + dy) };
      const bottom = { x: lerp(v3, v2, x, x + dx), y: y + dy };
      const left = { x: x, y: lerp(v0, v3, y, y + dy) };
      
      switch (cellIndex) {
        case 1: case 14: segments.push([left, bottom]); break;
        case 2: case 13: segments.push([bottom, right]); break;
        case 3: case 12: segments.push([left, right]); break;
        case 4: case 11: segments.push([top, right]); break;
        case 5: segments.push([left, top], [bottom, right]); break; // Saddle
        case 6: case 9: segments.push([top, bottom]); break;
        case 7: case 8: segments.push([left, top]); break;
        case 10: segments.push([left, bottom], [top, right]); break; // Saddle
      }
    }
  }
  
  return segments;
}

export function generateFunctionData(
  func: { id: string; expr: string; visible: boolean },
  xDomain: [number, number],
  yDomain: [number, number],
  parameters: Record<string, number> = {}
): FunctionData | null {
  if (!func.visible || !func.expr.trim()) return null;
  
  const type = detectFunctionType(func.expr);
  const normalized = normalizeExpression(func.expr);
  
  try {
    if (type === 'explicit') {
      // Explicit functions are handled by the main generatePoints for shared X-axis
      // But we can return null here or handle it if we want isolated data
      return { type, points: [] }; 
    }
    
    if (type === 'parametric') {
      // Expect (x(t), y(t))
      const parts = normalized.slice(1, -1).split(',');
      if (parts.length !== 2) return null;
      
      const xCode = compile(parts[0]);
      const yCode = compile(parts[1]);
      const points: { x: number; y: number }[] = [];
      
      // Default t range [0, 2PI] or [-10, 10]? Let's use [-10, 10] for general coverage
      const tMin = -10, tMax = 10, steps = 500;
      const dt = (tMax - tMin) / steps;
      
      for (let i = 0; i <= steps; i++) {
        const t = tMin + i * dt;
        const scope = { t, ...parameters };
        points.push({ x: xCode.evaluate(scope), y: yCode.evaluate(scope) });
      }
      return { type, points };
    }
    
    if (type === 'polar') {
      // Expect r = f(theta)
      const rhs = normalized.replace(/^\s*r\s*=\s*/i, '');
      const rCode = compile(rhs);
      const points: { x: number; y: number }[] = [];
      
      // Default theta range [0, 2PI]
      const thetaMin = 0, thetaMax = 2 * Math.PI, steps = 500;
      const dTheta = (thetaMax - thetaMin) / steps;
      
      for (let i = 0; i <= steps; i++) {
        const theta = thetaMin + i * dTheta;
        const scope = { theta, ...parameters };
        const r = rCode.evaluate(scope);
        points.push({ x: r * Math.cos(theta), y: r * Math.sin(theta) });
      }
      return { type, points };
    }
    
    if (type === 'implicit') {
      // f(x, y) = c -> f(x, y) - c = 0
      const [lhs, rhs] = normalized.split('=');
      const expr = `${lhs} - (${rhs})`;
      const code = compile(expr);
      
      const segments = marchSquares(
        (x, y) => {
          try {
            return code.evaluate({ x, y, ...parameters });
          } catch { return NaN; }
        },
        xDomain[0], xDomain[1],
        yDomain[0], yDomain[1],
        60 // Grid resolution
      );
      
      return { type, points: [], segments };
    }
    
  } catch (e) {
    console.error("Error generating data for", func.expr, e);
    return null;
  }
  
  return null;
}

export function generatePoints(
  expressions: { id: string; expr: string; color: string; visible: boolean }[],
  xMin: number,
  xMax: number,
  pointCount: number = 500,
  parameters: Record<string, number> = {}
): DataPoint[] {
  const step = (xMax - xMin) / (pointCount - 1);
  const data: DataPoint[] = [];

  // Filter for explicit functions only
  const explicitExprs = expressions.filter(e => {
    if (!e.visible || e.expr.trim() === '') return false;
    return detectFunctionType(e.expr) === 'explicit' && parseGeometry(e.expr) === null;
  });

  // Compile expressions once
  const compiledExprs = explicitExprs
    .map((e) => {
      try {
        const normalized = normalizeExpression(e.expr);
        return { id: e.id, compiled: compile(normalized) };
      } catch (error) {
        return null;
      }
    })
    .filter((e): e is { id: string; compiled: any } => e !== null);

  for (let i = 0; i < pointCount; i++) {
    const x = xMin + i * step;
    const point: DataPoint = { x };

    compiledExprs.forEach(({ id, compiled }) => {
      try {
        let y = compiled.evaluate({ x, ...parameters });
        
        if (y && typeof y === 'object' && 'entries' in y && Array.isArray(y.entries)) {
          y = y.entries[y.entries.length - 1];
        }

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
