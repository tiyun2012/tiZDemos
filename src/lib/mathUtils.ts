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
  polylines?: PlotPoint[][];
}

export interface PlotPoint {
  x: number;
  y: number;
}

const COMPILED_EXPRESSION_CACHE_LIMIT = 200;
const compiledExpressionCache = new Map<string, any>();

function getCompiledExpression(expr: string): any {
  const cached = compiledExpressionCache.get(expr);
  if (cached) return cached;

  const compiled = compile(expr);

  // Keep cache bounded to avoid unbounded memory growth while editing.
  if (compiledExpressionCache.size >= COMPILED_EXPRESSION_CACHE_LIMIT) {
    const firstKey = compiledExpressionCache.keys().next().value;
    if (firstKey !== undefined) {
      compiledExpressionCache.delete(firstKey);
    }
  }

  compiledExpressionCache.set(expr, compiled);
  return compiled;
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

export function smoothPolyline(points: PlotPoint[], iterations: number = 2): PlotPoint[] {
  if (points.length < 3 || iterations <= 0) return points;

  let smoothed = points.map((p) => ({ x: p.x, y: p.y }));

  for (let iter = 0; iter < iterations; iter++) {
    if (smoothed.length < 3) break;

    const newPoints: PlotPoint[] = [smoothed[0]];
    for (let i = 0; i < smoothed.length - 1; i++) {
      const p0 = smoothed[i];
      const p1 = smoothed[i + 1];
      const q = { x: 0.75 * p0.x + 0.25 * p1.x, y: 0.75 * p0.y + 0.25 * p1.y };
      const r = { x: 0.25 * p0.x + 0.75 * p1.x, y: 0.25 * p0.y + 0.75 * p1.y };
      newPoints.push(q, r);
    }
    newPoints.push(smoothed[smoothed.length - 1]);
    smoothed = newPoints;
  }

  return smoothed;
}

const POLYLINE_KEY_SCALE = 1e8;

function toPointKey(point: PlotPoint): string {
  const qx = Math.round(point.x * POLYLINE_KEY_SCALE);
  const qy = Math.round(point.y * POLYLINE_KEY_SCALE);
  return `${qx}:${qy}`;
}

export function buildPolylinesFromSegments(segments: PlotPoint[][] | undefined): PlotPoint[][] {
  if (!segments || segments.length === 0) return [];

  type EndpointRef = { segmentIndex: number; endpointIndex: 0 | 1 };
  const endpointMap = new Map<string, EndpointRef[]>();
  const used = new Array(segments.length).fill(false);

  const addEndpoint = (point: PlotPoint, ref: EndpointRef) => {
    const key = toPointKey(point);
    const refs = endpointMap.get(key);
    if (refs) {
      refs.push(ref);
    } else {
      endpointMap.set(key, [ref]);
    }
  };

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (!seg || seg.length !== 2) continue;
    addEndpoint(seg[0], { segmentIndex: i, endpointIndex: 0 });
    addEndpoint(seg[1], { segmentIndex: i, endpointIndex: 1 });
  }

  const chooseNext = (point: PlotPoint): EndpointRef | null => {
    const refs = endpointMap.get(toPointKey(point));
    if (!refs) return null;
    for (const ref of refs) {
      if (!used[ref.segmentIndex]) return ref;
    }
    return null;
  };

  const extend = (polyline: PlotPoint[], atTail: boolean) => {
    const guardLimit = segments.length + 1;
    let guard = 0;

    while (guard < guardLimit) {
      guard++;
      const anchor = atTail ? polyline[polyline.length - 1] : polyline[0];
      const nextRef = chooseNext(anchor);
      if (!nextRef) break;

      const seg = segments[nextRef.segmentIndex];
      if (!seg || seg.length !== 2) {
        used[nextRef.segmentIndex] = true;
        continue;
      }

      used[nextRef.segmentIndex] = true;
      const other = seg[nextRef.endpointIndex === 0 ? 1 : 0];
      if (!other) break;

      const anchorKey = toPointKey(anchor);
      const otherKey = toPointKey(other);
      if (anchorKey === otherKey) continue;

      if (atTail) {
        polyline.push(other);
      } else {
        polyline.unshift(other);
      }
    }
  };

  const polylines: PlotPoint[][] = [];
  for (let i = 0; i < segments.length; i++) {
    if (used[i]) continue;
    const seg = segments[i];
    if (!seg || seg.length !== 2) {
      used[i] = true;
      continue;
    }

    used[i] = true;
    const polyline: PlotPoint[] = [seg[0], seg[1]];
    extend(polyline, true);
    extend(polyline, false);

    if (polyline.length >= 2) {
      polylines.push(polyline);
    }
  }

  return polylines;
}

function dedupeSortedRoots(values: number[], tolerance: number): number[] {
  if (values.length <= 1) return values;
  const sorted = [...values].sort((a, b) => a - b);
  const unique: number[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    if (Math.abs(sorted[i] - unique[unique.length - 1]) > tolerance) {
      unique.push(sorted[i]);
    }
  }
  return unique;
}

function refineRootBisection(
  g: (v: number) => number,
  lo: number,
  hi: number,
  iterations: number = 28
): number | null {
  let a = lo;
  let b = hi;
  let fa = g(a);
  let fb = g(b);

  if (!isFinite(fa) || !isFinite(fb)) return null;
  if (Math.abs(fa) <= 1e-14) return a;
  if (Math.abs(fb) <= 1e-14) return b;

  if (fa * fb > 0) {
    return Math.abs(fa) < Math.abs(fb) ? a : b;
  }

  for (let i = 0; i < iterations; i++) {
    const mid = (a + b) / 2;
    const fm = g(mid);
    if (!isFinite(fm)) return null;
    if (Math.abs(fm) <= 1e-14) return mid;

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

function findAxisAnchorPoints(
  f: (x: number, y: number) => number,
  xDomain: [number, number],
  yDomain: [number, number],
  xSamples: number,
  ySamples: number
): PlotPoint[] {
  const anchors: PlotPoint[] = [];
  const [xMin, xMax] = xDomain;
  const [yMin, yMax] = yDomain;
  const rootDetectEps = 1e-10;
  const xRoots: number[] = [];
  const yRoots: number[] = [];

  if (yMin <= 0 && yMax >= 0) {
    const sampleCount = Math.max(32, xSamples);
    const step = (xMax - xMin) / sampleCount;
    let prevX = xMin;
    let prevV = f(prevX, 0);

    for (let i = 1; i <= sampleCount; i++) {
      const currentX = i === sampleCount ? xMax : xMin + i * step;
      const currentV = f(currentX, 0);
      if (!isFinite(prevV) || !isFinite(currentV)) {
        prevX = currentX;
        prevV = currentV;
        continue;
      }

      if (Math.abs(prevV) <= rootDetectEps) {
        xRoots.push(prevX);
      }
      if (Math.abs(currentV) <= rootDetectEps) {
        xRoots.push(currentX);
      } else if (prevV * currentV < 0) {
        const root = refineRootBisection((x) => f(x, 0), prevX, currentX);
        if (root !== null) xRoots.push(root);
      }

      prevX = currentX;
      prevV = currentV;
    }

    const tolerance = Math.max(1e-8, Math.abs(xMax - xMin) * 1e-5);
    dedupeSortedRoots(xRoots, tolerance).forEach((x) => anchors.push({ x, y: 0 }));
  }

  if (xMin <= 0 && xMax >= 0) {
    const sampleCount = Math.max(32, ySamples);
    const step = (yMax - yMin) / sampleCount;
    let prevY = yMin;
    let prevV = f(0, prevY);

    for (let i = 1; i <= sampleCount; i++) {
      const currentY = i === sampleCount ? yMax : yMin + i * step;
      const currentV = f(0, currentY);
      if (!isFinite(prevV) || !isFinite(currentV)) {
        prevY = currentY;
        prevV = currentV;
        continue;
      }

      if (Math.abs(prevV) <= rootDetectEps) {
        yRoots.push(prevY);
      }
      if (Math.abs(currentV) <= rootDetectEps) {
        yRoots.push(currentY);
      } else if (prevV * currentV < 0) {
        const root = refineRootBisection((y) => f(0, y), prevY, currentY);
        if (root !== null) yRoots.push(root);
      }

      prevY = currentY;
      prevV = currentV;
    }

    const tolerance = Math.max(1e-8, Math.abs(yMax - yMin) * 1e-5);
    dedupeSortedRoots(yRoots, tolerance).forEach((y) => anchors.push({ x: 0, y }));
  }

  return anchors;
}

function snapPolylinesToAnchors(
  polylines: PlotPoint[][],
  anchors: PlotPoint[],
  snapDistance: number
): PlotPoint[][] {
  if (polylines.length === 0 || anchors.length === 0) return polylines;

  const result = polylines.map((line) => line.map((p) => ({ x: p.x, y: p.y })));
  const maxDistSq = snapDistance * snapDistance;

  for (const anchor of anchors) {
    let bestLine = -1;
    let bestPoint = -1;
    let bestDistSq = Number.POSITIVE_INFINITY;

    for (let li = 0; li < result.length; li++) {
      const line = result[li];
      for (let pi = 0; pi < line.length; pi++) {
        const dx = line[pi].x - anchor.x;
        const dy = line[pi].y - anchor.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < bestDistSq) {
          bestDistSq = d2;
          bestLine = li;
          bestPoint = pi;
        }
      }
    }

    if (bestLine >= 0 && bestPoint >= 0 && bestDistSq <= maxDistSq) {
      result[bestLine][bestPoint] = { x: anchor.x, y: anchor.y };
    }
  }

  return result;
}

// Marching Squares Implementation for Implicit Plots
function marchSquares(
  f: (x: number, y: number) => number,
  xMin: number, xMax: number,
  yMin: number, yMax: number,
  xResolution: number = 150,
  yResolution: number = xResolution
): { x: number; y: number }[][] {
  const segments: { x: number; y: number }[][] = [];
  const safeXResolution = Math.max(2, Math.floor(xResolution));
  const safeYResolution = Math.max(2, Math.floor(yResolution));
  const dx = (xMax - xMin) / safeXResolution;
  const dy = (yMax - yMin) / safeYResolution;
  
  const grid: number[][] = [];
  
  // Evaluate grid
  for (let i = 0; i <= safeXResolution; i++) {
    grid[i] = [];
    const x = xMin + i * dx;
    for (let j = 0; j <= safeYResolution; j++) {
      const y = yMin + j * dy;
      grid[i][j] = f(x, y);
    }
  }

  // Fixed epsilon avoids contour drift across zoom levels/domains.
  const zeroEpsilon = 1e-12;
  const signBit = (value: number) => value > zeroEpsilon ? 1 : 0;

  const interpolateEdge = (
    x1: number, y1: number, v1: number,
    x2: number, y2: number, v2: number
  ): { x: number; y: number } | null => {
    if (!isFinite(v1) || !isFinite(v2)) return null;

    const absV1 = Math.abs(v1);
    const absV2 = Math.abs(v2);
    if (absV1 <= zeroEpsilon && absV2 <= zeroEpsilon) {
      return { x: (x1 + x2) / 2, y: (y1 + y2) / 2 };
    }
    if (absV1 <= zeroEpsilon) return { x: x1, y: y1 };
    if (absV2 <= zeroEpsilon) return { x: x2, y: y2 };

    const denominator = v1 - v2;
    if (Math.abs(denominator) <= zeroEpsilon) {
      return { x: (x1 + x2) / 2, y: (y1 + y2) / 2 };
    }

    let t = v1 / denominator;
    if (!isFinite(t)) t = 0.5;
    t = Math.max(0, Math.min(1, t));

    return {
      x: x1 + (x2 - x1) * t,
      y: y1 + (y2 - y1) * t
    };
  };

  const pushSegment = (
    p1: { x: number; y: number } | null,
    p2: { x: number; y: number } | null
  ) => {
    if (!p1 || !p2) return;
    if (!isFinite(p1.x) || !isFinite(p1.y) || !isFinite(p2.x) || !isFinite(p2.y)) return;

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    if (dx * dx + dy * dy <= 1e-24) return;

    segments.push([p1, p2]);
  };
  
  // March
  for (let i = 0; i < safeXResolution; i++) {
    for (let j = 0; j < safeYResolution; j++) {
      const x = xMin + i * dx;
      const y = yMin + j * dy;
      
      const v0 = grid[i][j];
      const v1 = grid[i+1][j];
      const v2 = grid[i+1][j+1];
      const v3 = grid[i][j+1];

      // If the function is undefined in this cell, skip it to avoid NaNs
      if (!isFinite(v0) || !isFinite(v1) || !isFinite(v2) || !isFinite(v3)) continue;
      
      const cellIndex = signBit(v0) | (signBit(v1) << 1) | (signBit(v2) << 2) | (signBit(v3) << 3);
      if (cellIndex === 0 || cellIndex === 15) continue;

      const xRight = x + dx;
      const yTop = y + dy;

      const bottomEdge = interpolateEdge(x, y, v0, xRight, y, v1);
      const rightEdge = interpolateEdge(xRight, y, v1, xRight, yTop, v2);
      const topEdge = interpolateEdge(x, yTop, v3, xRight, yTop, v2);
      const leftEdge = interpolateEdge(x, y, v0, x, yTop, v3);

      const connectA = () => {
        pushSegment(bottomEdge, rightEdge);
        pushSegment(leftEdge, topEdge);
      };

      const connectB = () => {
        pushSegment(leftEdge, bottomEdge);
        pushSegment(rightEdge, topEdge);
      };

      const decider = v0 * v2 - v1 * v3;
      const deciderThreshold = Math.max(zeroEpsilon * zeroEpsilon, 1e-24);
      const centerEstimate = (v0 + v1 + v2 + v3) / 4;
      
      switch (cellIndex) {
        case 1: case 14: pushSegment(leftEdge, bottomEdge); break;
        case 2: case 13: pushSegment(bottomEdge, rightEdge); break;
        case 3: case 12: pushSegment(leftEdge, rightEdge); break;
        case 4: case 11: pushSegment(rightEdge, topEdge); break;
        case 5: {
          // Ambiguous saddle case: use asymptotic decider, then center estimate for tie-break.
          const chooseA = Math.abs(decider) <= deciderThreshold ? centerEstimate > zeroEpsilon : decider > 0;
          if (chooseA) {
            connectA();
          } else {
            connectB();
          }
          break;
        }
        case 6: case 9: pushSegment(bottomEdge, topEdge); break;
        case 7: case 8: pushSegment(leftEdge, topEdge); break;
        case 10: {
          // Complementary saddle case: same decider but flipped center tie-break.
          const chooseA = Math.abs(decider) <= deciderThreshold ? centerEstimate <= zeroEpsilon : decider > 0;
          if (chooseA) {
            connectA();
          } else {
            connectB();
          }
          break;
        }
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
      
      const xCode = getCompiledExpression(parts[0]);
      const yCode = getCompiledExpression(parts[1]);
      const points: { x: number; y: number }[] = [];
      const scope: Record<string, number> = { ...parameters, t: 0 };
      
      // Default t range [0, 2PI] or [-10, 10]? Let's use [-10, 10] for general coverage
      const tMin = -10, tMax = 10, steps = 500;
      const dt = (tMax - tMin) / steps;
      
      for (let i = 0; i <= steps; i++) {
        scope.t = tMin + i * dt;
        points.push({ x: xCode.evaluate(scope), y: yCode.evaluate(scope) });
      }
      return { type, points };
    }
    
    if (type === 'polar') {
      // Expect r = f(theta)
      const rhs = normalized.replace(/^\s*r\s*=\s*/i, '');
      const rCode = getCompiledExpression(rhs);
      const points: { x: number; y: number }[] = [];
      const scope: Record<string, number> = { ...parameters, theta: 0 };
      
      // Default theta range [0, 2PI]
      const thetaMin = 0, thetaMax = 2 * Math.PI, steps = 500;
      const dTheta = (thetaMax - thetaMin) / steps;
      
      for (let i = 0; i <= steps; i++) {
        const theta = thetaMin + i * dTheta;
        scope.theta = theta;
        const r = rCode.evaluate(scope);
        points.push({ x: r * Math.cos(theta), y: r * Math.sin(theta) });
      }
      return { type, points };
    }
    
    if (type === 'implicit') {
      // f(x, y) = c -> f(x, y) - c = 0
      const [lhs, rhs] = normalized.split('=');
      if (!lhs || !rhs) return null;
      
      const expr = `${lhs} - (${rhs})`;
      const code = getCompiledExpression(expr);
      const scope: Record<string, number> = { ...parameters, x: 0, y: 0 };

      // IMPORTANT: marching squares quality depends on the grid spacing (dx, dy).
      // If we keep a fixed "resolution" (cell count) while zooming, dx changes and the
      // extracted contour can visibly change shape. Here we choose a resolution based on
      // the current domain size, aiming for a roughly constant world-space step.
      const xRange = xDomain[1] - xDomain[0];
      const yRange = yDomain[1] - yDomain[0];
      const absXRange = Math.abs(xRange);
      const absYRange = Math.abs(yRange);

      // Higher sampling for cusp-heavy implicit curves (heart, astroids, etc.).
      const targetStep = 0.01;
      const minResolution = 120;
      const maxResolution = 900;
      const maxCells = 300000;

      let xResolution = Math.min(maxResolution, Math.max(minResolution, Math.ceil(absXRange / targetStep)));
      let yResolution = Math.min(maxResolution, Math.max(minResolution, Math.ceil(absYRange / targetStep)));

      // Bound total work per contour update to keep interaction responsive.
      const currentCells = xResolution * yResolution;
      if (currentCells > maxCells) {
        const scale = Math.sqrt(maxCells / currentCells);
        xResolution = Math.max(minResolution, Math.floor(xResolution * scale));
        yResolution = Math.max(minResolution, Math.floor(yResolution * scale));
      }

      const evaluateImplicit = (x: number, y: number): number => {
        scope.x = x;
        scope.y = y;
        try {
          const val = code.evaluate(scope);
          if (typeof val === 'number') return val;
          if (val && typeof val === 'object' && 're' in val) return val.re; // Extract real part of complex
          return Number(val);
        } catch {
          return NaN;
        }
      };
      
      const segments = marchSquares(
        evaluateImplicit,
        xDomain[0], xDomain[1],
        yDomain[0], yDomain[1],
        xResolution,
        yResolution
      );

      const axisAnchors = findAxisAnchorPoints(
        evaluateImplicit,
        xDomain,
        yDomain,
        xResolution,
        yResolution
      );

      const maxRange = Math.max(absXRange, absYRange);
      const smoothingIterations = maxRange <= 1 ? 2 : 1;
      const basePolylines = buildPolylinesFromSegments(segments);
      const cellStep = Math.max(
        Math.abs(xDomain[1] - xDomain[0]) / Math.max(1, xResolution),
        Math.abs(yDomain[1] - yDomain[0]) / Math.max(1, yResolution)
      );
      const snapDistance = Math.max(cellStep * 3, 1e-6);
      const anchoredBeforeSmooth = snapPolylinesToAnchors(basePolylines, axisAnchors, snapDistance);
      const smoothed = anchoredBeforeSmooth.map((line) => smoothPolyline(line, smoothingIterations));
      const polylines = snapPolylinesToAnchors(smoothed, axisAnchors, snapDistance * 1.5);
      
      return { type, points: [], segments, polylines };
    }
    
  } catch (e) {
    // Silently ignore parsing errors while user is typing incomplete expressions
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
        return { id: e.id, compiled: getCompiledExpression(normalized), scope: { ...parameters, x: 0 } };
      } catch (error) {
        return null;
      }
    })
    .filter((e): e is { id: string; compiled: any; scope: { x: number; [key: string]: number } } => e !== null);

  for (let i = 0; i < pointCount; i++) {
    const x = xMin + i * step;
    const point: DataPoint = { x };

    compiledExprs.forEach(({ id, compiled, scope }) => {
      try {
        scope.x = x;
        let y = compiled.evaluate(scope);
        
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
