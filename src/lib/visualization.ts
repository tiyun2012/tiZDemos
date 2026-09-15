export interface Vec2 {
  x: number;
  y: number;
}

export type VisualizationPointKey =
  | 'a'
  | 'b'
  | 'p'
  | 'center'
  | 'p00'
  | 'p10'
  | 'p01'
  | 'p11';

export interface SdSegmentVisualization {
  kind: 'sdSegment';
  a: Vec2;
  b: Vec2;
  p: Vec2;
}

export interface LineMaskVisualization {
  kind: 'lineMask';
  p: Vec2;
  a: Vec2;
  b: Vec2;
  width: number;
  aa: number;
}

export interface CircleMaskVisualization {
  kind: 'circleMask';
  p: Vec2;
  center: Vec2;
  radius: number;
  aa: number;
}

export interface PatchPointVisualization {
  kind: 'patchPoint';
  p00: Vec2;
  p10: Vec2;
  p01: Vec2;
  p11: Vec2;
  u: number;
  v: number;
}

export interface DrawLineVisualization {
  kind: 'drawLine';
  p: Vec2;
  a: Vec2;
  b: Vec2;
  width: number;
  aa: number;
}

export type VisualizationDefinition =
  | SdSegmentVisualization
  | LineMaskVisualization
  | CircleMaskVisualization
  | PatchPointVisualization
  | DrawLineVisualization;

export type VisualRole =
  | 'primary'
  | 'helper'
  | 'projection'
  | 'distance'
  | 'query'
  | 'derived'
  | 'muted'
  | 'falloff';

export interface VisualSegmentPrimitive {
  type: 'segment';
  id: string;
  from: Vec2;
  to: Vec2;
  role: VisualRole;
  dashed?: boolean;
  width?: number;
  opacity?: number;
  label?: string;
  labelAt?: number;
}

export interface VisualPointPrimitive {
  type: 'point';
  id: string;
  position: Vec2;
  role: VisualRole;
  label?: string;
  radius?: number;
  draggableKey?: VisualizationPointKey;
}

export interface VisualCirclePrimitive {
  type: 'circle';
  id: string;
  center: Vec2;
  radius: number;
  role: VisualRole;
  dashed?: boolean;
  width?: number;
  opacity?: number;
  fillOpacity?: number;
  label?: string;
}

export type VisualPrimitive = VisualSegmentPrimitive | VisualPointPrimitive | VisualCirclePrimitive;

export interface VisualMetric {
  key: string;
  label: string;
  value: number;
}

export interface VisualizationScene {
  title: string;
  subtitle: string;
  primitives: VisualPrimitive[];
  metrics: VisualMetric[];
  status: string;
}

const NUMBER_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
const POINT_PATTERN = /^\(\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)\s*,\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)\s*\)$/;

function parseNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!NUMBER_PATTERN.test(trimmed)) return null;
  const number = Number(trimmed);
  return Number.isFinite(number) ? number : null;
}

function parsePoint(value: string): Vec2 | null {
  const match = value.trim().match(POINT_PATTERN);
  if (!match) return null;
  const x = Number(match[1]);
  const y = Number(match[2]);
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}

function splitTopLevelArgs(source: string): string[] | null {
  const args: string[] = [];
  let depth = 0;
  let start = 0;

  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (char === '(' || char === '[' || char === '{') depth++;
    if (char === ')' || char === ']' || char === '}') depth--;
    if (depth < 0) return null;

    if (char === ',' && depth === 0) {
      args.push(source.slice(start, i).trim());
      start = i + 1;
    }
  }

  if (depth !== 0) return null;
  args.push(source.slice(start).trim());
  return args.filter((arg) => arg.length > 0);
}

function parseCall(expr: string): { name: string; args: string[] } | null {
  const trimmed = expr.trim();
  const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*\((.*)\)$/s);
  if (!match) return null;
  const args = splitTopLevelArgs(match[2]);
  return args ? { name: match[1], args } : null;
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '0';
  const rounded = Number(value.toFixed(3));
  return Object.is(rounded, -0) ? '0' : rounded.toString();
}

function formatPoint(point: Vec2): string {
  return `(${formatNumber(point.x)}, ${formatNumber(point.y)})`;
}

function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

function scale(v: Vec2, scalar: number): Vec2 {
  return { x: v.x * scalar, y: v.y * scalar };
}

function mix(a: Vec2, b: Vec2, t: number): Vec2 {
  return add(a, scale(sub(b, a), t));
}

function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

function length(v: Vec2): number {
  return Math.hypot(v.x, v.y);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  if (Math.abs(edge1 - edge0) < 1e-12) return x < edge0 ? 0 : 1;
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function extendLine(a: Vec2, b: Vec2, amount: number = 1000): [Vec2, Vec2] {
  const direction = sub(b, a);
  const magnitude = length(direction);
  if (magnitude < 1e-9) return [a, b];

  const unit = scale(direction, 1 / magnitude);
  return [sub(a, scale(unit, amount)), add(b, scale(unit, amount))];
}

function segmentDistanceInfo(p: Vec2, a: Vec2, b: Vec2) {
  const pa = sub(p, a);
  const ba = sub(b, a);
  const baSquared = dot(ba, ba);
  const projectionNumerator = dot(pa, ba);
  const rawT = baSquared > 1e-12 ? projectionNumerator / baSquared : 0;
  const h = clamp(rawT, 0, 1);
  const rawProjection = add(a, scale(ba, rawT));
  const closest = add(a, scale(ba, h));
  const distance = length(sub(p, closest));

  return { pa, ba, baSquared, projectionNumerator, rawT, h, rawProjection, closest, distance };
}

function segmentOffset(a: Vec2, b: Vec2, amount: number): [Vec2, Vec2] {
  const direction = sub(b, a);
  const magnitude = length(direction);
  if (magnitude < 1e-12) return [a, b];
  const normal = { x: -direction.y / magnitude, y: direction.x / magnitude };
  const offset = scale(normal, amount);
  return [add(a, offset), add(b, offset)];
}

export function parseVisualization(expr: string): VisualizationDefinition | null {
  const call = parseCall(expr);
  if (!call) return null;
  const name = call.name.toLowerCase();

  if (name === 'sdsegment' && call.args.length === 3) {
    const a = parsePoint(call.args[0]);
    const b = parsePoint(call.args[1]);
    const p = parsePoint(call.args[2]);
    if (!a || !b || !p) return null;
    return { kind: 'sdSegment', a, b, p };
  }

  if ((name === 'linemask' || name === 'drawline') && call.args.length === 5) {
    // Mirrors the GLSL teaching order: p, a, b, width, aa.
    const p = parsePoint(call.args[0]);
    const a = parsePoint(call.args[1]);
    const b = parsePoint(call.args[2]);
    const width = parseNumber(call.args[3]);
    const aa = parseNumber(call.args[4]);
    if (!p || !a || !b || width === null || aa === null) return null;
    if (name === 'drawline') return { kind: 'drawLine', p, a, b, width: Math.max(0, width), aa: Math.max(0, aa) };
    return { kind: 'lineMask', p, a, b, width: Math.max(0, width), aa: Math.max(0, aa) };
  }

  if (name === 'circlemask' && call.args.length === 4) {
    const p = parsePoint(call.args[0]);
    const center = parsePoint(call.args[1]);
    const radius = parseNumber(call.args[2]);
    const aa = parseNumber(call.args[3]);
    if (!p || !center || radius === null || aa === null) return null;
    return { kind: 'circleMask', p, center, radius: Math.max(0, radius), aa: Math.max(0, aa) };
  }

  if (name === 'patchpoint' && call.args.length === 6) {
    const p00 = parsePoint(call.args[0]);
    const p10 = parsePoint(call.args[1]);
    const p01 = parsePoint(call.args[2]);
    const p11 = parsePoint(call.args[3]);
    const u = parseNumber(call.args[4]);
    const v = parseNumber(call.args[5]);
    if (!p00 || !p10 || !p01 || !p11 || u === null || v === null) return null;
    return { kind: 'patchPoint', p00, p10, p01, p11, u, v };
  }

  return null;
}

export function formatVisualization(definition: VisualizationDefinition): string {
  switch (definition.kind) {
    case 'sdSegment':
      return `sdSegment(${formatPoint(definition.a)}, ${formatPoint(definition.b)}, ${formatPoint(definition.p)})`;
    case 'lineMask':
      return `lineMask(${formatPoint(definition.p)}, ${formatPoint(definition.a)}, ${formatPoint(definition.b)}, ${formatNumber(definition.width)}, ${formatNumber(definition.aa)})`;
    case 'drawLine':
      return `drawLine(${formatPoint(definition.p)}, ${formatPoint(definition.a)}, ${formatPoint(definition.b)}, ${formatNumber(definition.width)}, ${formatNumber(definition.aa)})`;
    case 'circleMask':
      return `circleMask(${formatPoint(definition.p)}, ${formatPoint(definition.center)}, ${formatNumber(definition.radius)}, ${formatNumber(definition.aa)})`;
    case 'patchPoint':
      return `patchPoint(${formatPoint(definition.p00)}, ${formatPoint(definition.p10)}, ${formatPoint(definition.p01)}, ${formatPoint(definition.p11)}, ${formatNumber(definition.u)}, ${formatNumber(definition.v)})`;
  }
}

export function updateVisualizationPoint(
  definition: VisualizationDefinition,
  key: VisualizationPointKey,
  point: Vec2
): VisualizationDefinition {
  switch (definition.kind) {
    case 'sdSegment':
      if (key === 'a' || key === 'b' || key === 'p') return { ...definition, [key]: point };
      return definition;
    case 'lineMask':
    case 'drawLine':
      if (key === 'a' || key === 'b' || key === 'p') return { ...definition, [key]: point };
      return definition;
    case 'circleMask':
      if (key === 'p' || key === 'center') return { ...definition, [key]: point };
      return definition;
    case 'patchPoint':
      if (key === 'p00' || key === 'p10' || key === 'p01' || key === 'p11') return { ...definition, [key]: point };
      return definition;
  }
}

function buildSdSegmentScene(definition: SdSegmentVisualization): VisualizationScene {
  const { a, b, p } = definition;
  const info = segmentDistanceInfo(p, a, b);
  const [lineStart, lineEnd] = extendLine(a, b);

  let status = 'Projection is inside the segment: clamp() leaves t unchanged.';
  if (info.baSquared <= 1e-12) {
    status = 'A and B overlap, so the segment has zero length and A is the closest point.';
  } else if (info.rawT < 0) {
    status = 'Projection falls before A: clamp() forces h = 0, so A becomes the closest point.';
  } else if (info.rawT > 1) {
    status = 'Projection falls after B: clamp() forces h = 1, so B becomes the closest point.';
  }

  return {
    title: 'sdSegment debug',
    subtitle: 'Distance from P to finite segment AB',
    status,
    metrics: [
      { key: 'dotPaBa', label: 'dot(pa, ba)', value: info.projectionNumerator },
      { key: 'dotBaBa', label: 'dot(ba, ba)', value: info.baSquared },
      { key: 'rawT', label: 'raw t', value: info.rawT },
      { key: 'h', label: 'h = clamp(t, 0, 1)', value: info.h },
      { key: 'distance', label: 'distance', value: info.distance },
    ],
    primitives: [
      { type: 'segment', id: 'infinite-line', from: lineStart, to: lineEnd, role: 'muted', dashed: true, width: 1.5 },
      { type: 'segment', id: 'segment-ab', from: a, to: b, role: 'primary', width: 4, label: 'ba', labelAt: 0.5 },
      { type: 'segment', id: 'pa-vector', from: a, to: p, role: 'helper', dashed: true, width: 1.5, label: 'pa', labelAt: 0.55 },
      { type: 'segment', id: 'raw-projection-line', from: p, to: info.rawProjection, role: 'projection', dashed: true, width: 2 },
      { type: 'segment', id: 'distance-line', from: p, to: info.closest, role: 'distance', width: 3, label: 'distance', labelAt: 0.5 },
      { type: 'point', id: 'a', position: a, role: 'primary', label: 'A', radius: 6, draggableKey: 'a' },
      { type: 'point', id: 'b', position: b, role: 'primary', label: 'B', radius: 6, draggableKey: 'b' },
      { type: 'point', id: 'p', position: p, role: 'query', label: 'P', radius: 7, draggableKey: 'p' },
      { type: 'point', id: 'raw-projection', position: info.rawProjection, role: 'projection', label: 'raw', radius: 4 },
      { type: 'point', id: 'closest', position: info.closest, role: 'distance', label: 'Q', radius: 5 },
    ],
  };
}

function buildLineMaskScene(definition: LineMaskVisualization | DrawLineVisualization): VisualizationScene {
  const { p, a, b, width, aa } = definition;
  const info = segmentDistanceInfo(p, a, b);
  const mask = 1 - smoothstep(width, width + aa, info.distance);
  const outer = width + aa;
  const [coreA1, coreB1] = segmentOffset(a, b, width);
  const [coreA2, coreB2] = segmentOffset(a, b, -width);
  const [outerA1, outerB1] = segmentOffset(a, b, outer);
  const [outerA2, outerB2] = segmentOffset(a, b, -outer);

  let status = 'P is outside the antialias band, so the mask is 0.';
  if (info.distance <= width) {
    status = 'P is inside the solid line core: smoothstep = 0, therefore mask = 1.';
  } else if (info.distance < width + aa) {
    status = 'P is inside the AA falloff band: smoothstep gradually changes the mask from 1 to 0.';
  }

  return {
    title: definition.kind === 'drawLine' ? 'drawLine debug' : 'lineMask debug',
    subtitle: definition.kind === 'drawLine'
      ? 'drawLine uses this mask as mix(color, lineColor, m)'
      : 'Finite segment distance → smoothstep antialias mask',
    status,
    metrics: [
      { key: 'distance', label: 'd = sdSegment', value: info.distance },
      { key: 'width', label: 'width', value: width },
      { key: 'aa', label: 'aa', value: aa },
      { key: 'edge1', label: 'width + aa', value: width + aa },
      { key: 'mask', label: 'mask m', value: mask },
    ],
    primitives: [
      { type: 'segment', id: 'aa-plus', from: outerA1, to: outerB1, role: 'falloff', dashed: true, width: 1.5, opacity: 0.9, label: 'width + aa', labelAt: 0.7 },
      { type: 'segment', id: 'aa-minus', from: outerA2, to: outerB2, role: 'falloff', dashed: true, width: 1.5, opacity: 0.9 },
      { type: 'circle', id: 'aa-cap-a', center: a, radius: outer, role: 'falloff', dashed: true, width: 1.5, opacity: 0.75, fillOpacity: 0.03 },
      { type: 'circle', id: 'aa-cap-b', center: b, radius: outer, role: 'falloff', dashed: true, width: 1.5, opacity: 0.75, fillOpacity: 0.03 },
      { type: 'segment', id: 'core-plus', from: coreA1, to: coreB1, role: 'primary', width: 2, opacity: 0.85, label: 'width', labelAt: 0.35 },
      { type: 'segment', id: 'core-minus', from: coreA2, to: coreB2, role: 'primary', width: 2, opacity: 0.85 },
      { type: 'circle', id: 'core-cap-a', center: a, radius: width, role: 'primary', width: 2, opacity: 0.65, fillOpacity: 0.04 },
      { type: 'circle', id: 'core-cap-b', center: b, radius: width, role: 'primary', width: 2, opacity: 0.65, fillOpacity: 0.04 },
      { type: 'segment', id: 'segment', from: a, to: b, role: 'primary', width: 4, label: 'AB', labelAt: 0.5 },
      { type: 'segment', id: 'distance', from: p, to: info.closest, role: 'distance', width: 3, label: 'd', labelAt: 0.5 },
      { type: 'point', id: 'a', position: a, role: 'primary', label: 'A', radius: 6, draggableKey: 'a' },
      { type: 'point', id: 'b', position: b, role: 'primary', label: 'B', radius: 6, draggableKey: 'b' },
      { type: 'point', id: 'p', position: p, role: 'query', label: 'P', radius: 7, draggableKey: 'p' },
      { type: 'point', id: 'closest', position: info.closest, role: 'distance', label: 'Q', radius: 5 },
    ],
  };
}

function buildCircleMaskScene(definition: CircleMaskVisualization): VisualizationScene {
  const { p, center, radius, aa } = definition;
  const delta = sub(p, center);
  const d = length(delta);
  const mask = 1 - smoothstep(radius, radius + aa, d);

  let status = 'P is outside the AA ring, so the mask is 0.';
  if (d <= radius) {
    status = 'P is inside the circle: smoothstep = 0, therefore mask = 1.';
  } else if (d < radius + aa) {
    status = 'P is in the antialias ring: the mask smoothly fades from 1 to 0.';
  }

  return {
    title: 'circleMask debug',
    subtitle: 'Radial distance → smoothstep antialias mask',
    status,
    metrics: [
      { key: 'distance', label: 'd = length(p-center)', value: d },
      { key: 'radius', label: 'radius', value: radius },
      { key: 'aa', label: 'aa', value: aa },
      { key: 'edge1', label: 'radius + aa', value: radius + aa },
      { key: 'mask', label: 'mask m', value: mask },
    ],
    primitives: [
      { type: 'circle', id: 'aa-ring', center, radius: radius + aa, role: 'falloff', dashed: true, width: 2, opacity: 0.9, fillOpacity: 0.03, label: 'radius + aa' },
      { type: 'circle', id: 'core-circle', center, radius, role: 'primary', width: 2.5, opacity: 0.95, fillOpacity: 0.04, label: 'radius' },
      { type: 'segment', id: 'radius-to-p', from: center, to: p, role: 'distance', width: 2.5, label: 'd', labelAt: 0.55 },
      { type: 'point', id: 'center', position: center, role: 'primary', label: 'C', radius: 6, draggableKey: 'center' },
      { type: 'point', id: 'p', position: p, role: 'query', label: 'P', radius: 7, draggableKey: 'p' },
    ],
  };
}

function buildPatchPointScene(definition: PatchPointVisualization): VisualizationScene {
  const { p00, p10, p01, p11, u, v } = definition;
  const top = mix(p00, p10, u);
  const bottom = mix(p01, p11, u);
  const result = mix(top, bottom, v);

  return {
    title: 'patchPoint debug',
    subtitle: 'Bilinear interpolation: mix horizontally with u, then vertically with v',
    status: `First mix the top and bottom edges at u=${formatNumber(u)}. Then mix those two intermediate points at v=${formatNumber(v)}.`,
    metrics: [
      { key: 'u', label: 'u', value: u },
      { key: 'v', label: 'v', value: v },
      { key: 'topX', label: 'top.x', value: top.x },
      { key: 'topY', label: 'top.y', value: top.y },
      { key: 'resultX', label: 'result.x', value: result.x },
      { key: 'resultY', label: 'result.y', value: result.y },
    ],
    primitives: [
      { type: 'segment', id: 'top-edge', from: p00, to: p10, role: 'primary', width: 3, label: 'mix(p00,p10,u)', labelAt: 0.52 },
      { type: 'segment', id: 'bottom-edge', from: p01, to: p11, role: 'primary', width: 3, label: 'mix(p01,p11,u)', labelAt: 0.52 },
      { type: 'segment', id: 'left-edge', from: p00, to: p01, role: 'muted', width: 2 },
      { type: 'segment', id: 'right-edge', from: p10, to: p11, role: 'muted', width: 2 },
      { type: 'segment', id: 'vertical-mix', from: top, to: bottom, role: 'projection', dashed: true, width: 2.5, label: 'mix(top,bottom,v)', labelAt: 0.5 },
      { type: 'point', id: 'p00', position: p00, role: 'primary', label: 'p00', radius: 6, draggableKey: 'p00' },
      { type: 'point', id: 'p10', position: p10, role: 'primary', label: 'p10', radius: 6, draggableKey: 'p10' },
      { type: 'point', id: 'p01', position: p01, role: 'primary', label: 'p01', radius: 6, draggableKey: 'p01' },
      { type: 'point', id: 'p11', position: p11, role: 'primary', label: 'p11', radius: 6, draggableKey: 'p11' },
      { type: 'point', id: 'top', position: top, role: 'projection', label: 'top', radius: 5 },
      { type: 'point', id: 'bottom', position: bottom, role: 'projection', label: 'bottom', radius: 5 },
      { type: 'point', id: 'result', position: result, role: 'derived', label: 'Q', radius: 7 },
    ],
  };
}

export function buildVisualizationScene(definition: VisualizationDefinition): VisualizationScene {
  switch (definition.kind) {
    case 'sdSegment': return buildSdSegmentScene(definition);
    case 'lineMask': return buildLineMaskScene(definition);
    case 'drawLine': return buildLineMaskScene(definition);
    case 'circleMask': return buildCircleMaskScene(definition);
    case 'patchPoint': return buildPatchPointScene(definition);
  }
}
