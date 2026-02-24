import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceDot,
} from 'recharts';
import { FunctionItem } from './FunctionList';
import { DataPoint, parseGeometry, formatGeometry, Geometry } from '../lib/mathUtils';
import { useState, useRef, useEffect } from 'react';

interface GraphProps {
  data: DataPoint[];
  functions: FunctionItem[];
  xDomain: [number, number];
  yDomain: [number, number];
  onUpdateFunction: (id: string, updates: Partial<FunctionItem>) => void;
  onUpdateXDomain: (domain: [number, number]) => void;
  onUpdateYDomain: (domain: [number, number]) => void;
}

const MARGIN = { top: 20, right: 30, left: 0, bottom: 20 };
const Y_AXIS_WIDTH = 50;
const X_AXIS_HEIGHT = 30;

export function Graph({ 
  data, 
  functions, 
  xDomain, 
  yDomain, 
  onUpdateFunction,
  onUpdateXDomain,
  onUpdateYDomain 
}: GraphProps) {
  const [dragging, setDragging] = useState<{ id: string; pointIndex: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Zoom handling
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      const rect = container.getBoundingClientRect();
      const chartWidth = rect.width - MARGIN.left - MARGIN.right - Y_AXIS_WIDTH;
      const chartHeight = rect.height - MARGIN.top - MARGIN.bottom - X_AXIS_HEIGHT;

      // Mouse position relative to chart area
      const mouseX = e.clientX - rect.left - (MARGIN.left + Y_AXIS_WIDTH);
      const mouseY = e.clientY - rect.top - MARGIN.top;

      // Only zoom if mouse is within chart area
      if (mouseX < 0 || mouseX > chartWidth || mouseY < 0 || mouseY > chartHeight) return;

      // Calculate zoom factor (smoother with exponential)
      // deltaY > 0 is scroll down (zoom out), deltaY < 0 is scroll up (zoom in)
      const zoomFactor = Math.exp(e.deltaY * 0.001);

      const xRange = xDomain[1] - xDomain[0];
      const yRange = yDomain[1] - yDomain[0];

      // Point under mouse in domain coordinates
      const mouseDomainX = xDomain[0] + (mouseX / chartWidth) * xRange;
      const mouseDomainY = yDomain[1] - (mouseY / chartHeight) * yRange;

      // Calculate new domains keeping the point under mouse stationary
      const newXMin = mouseDomainX - (mouseDomainX - xDomain[0]) * zoomFactor;
      const newXMax = mouseDomainX + (xDomain[1] - mouseDomainX) * zoomFactor;

      const newYMin = mouseDomainY - (mouseDomainY - yDomain[0]) * zoomFactor;
      const newYMax = mouseDomainY + (yDomain[1] - mouseDomainY) * zoomFactor;

      onUpdateXDomain([newXMin, newXMax]);
      onUpdateYDomain([newYMin, newYMax]);
    };

    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [xDomain, yDomain, onUpdateXDomain, onUpdateYDomain]);

  // Custom tooltip to show values for all visible functions at the hovered x
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length && !dragging) {
      return (
        <div className="bg-white/95 backdrop-blur-sm border border-gray-200 p-3 rounded-lg shadow-lg text-xs font-mono select-none pointer-events-none">
          <p className="mb-2 font-semibold text-gray-600 border-b border-gray-100 pb-1">
            x = {Number(label).toFixed(2)}
          </p>
          {payload.map((entry: any) => (
            <div key={entry.name} className="flex items-center gap-2 py-0.5">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-500">
                {functions.find(f => f.id === entry.dataKey)?.expr || 'Function'}:
              </span>
              <span className="font-medium text-gray-900">
                {entry.value !== null ? Number(entry.value).toFixed(3) : 'undefined'}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Separate functions into regular plots and geometry
  const geometryItems = functions
    .filter(f => f.visible)
    .map(f => ({ ...f, geometry: parseGeometry(f.expr) }))
    .filter((f): f is FunctionItem & { geometry: Geometry } => f.geometry !== null);

  const handleMouseDown = (id: string, pointIndex: number) => {
    setDragging({ id, pointIndex });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!dragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const chartWidth = rect.width - MARGIN.left - MARGIN.right - Y_AXIS_WIDTH;
    const chartHeight = rect.height - MARGIN.top - MARGIN.bottom - X_AXIS_HEIGHT;
    
    // Calculate mouse position relative to chart area
    // X starts after YAxis + Margin.left
    const mouseX = e.clientX - rect.left - (MARGIN.left + Y_AXIS_WIDTH);
    // Y starts after Margin.top
    const mouseY = e.clientY - rect.top - MARGIN.top;

    // Clamp to chart area
    const clampedX = Math.max(0, Math.min(mouseX, chartWidth));
    const clampedY = Math.max(0, Math.min(mouseY, chartHeight));

    // Convert to domain coordinates
    const xRange = xDomain[1] - xDomain[0];
    const yRange = yDomain[1] - yDomain[0];

    const newX = xDomain[0] + (clampedX / chartWidth) * xRange;
    // Y is inverted in SVG/Canvas (0 is top)
    const newY = yDomain[1] - (clampedY / chartHeight) * yRange;

    // Update the geometry
    const item = geometryItems.find(f => f.id === dragging.id);
    if (item) {
      const newPoints = [...item.geometry.points];
      newPoints[dragging.pointIndex] = { x: newX, y: newY };
      
      const newExpr = formatGeometry({ ...item.geometry, points: newPoints });
      onUpdateFunction(dragging.id, { expr: newExpr });
    }
  };

  const handleMouseUp = () => {
    setDragging(null);
  };

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, xDomain, yDomain, geometryItems]); // Dependencies needed for calculation

  return (
    <div 
      ref={containerRef}
      className="w-full h-full min-h-[400px] bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden select-none"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={MARGIN}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="x"
            type="number"
            domain={xDomain}
            tickCount={10}
            allowDataOverflow
            stroke="#9ca3af"
            tick={{ fontSize: 11, fill: '#6b7280' }}
            tickFormatter={(val) => Number(val).toFixed(1)}
            height={X_AXIS_HEIGHT}
          />
          <YAxis
            type="number"
            domain={yDomain}
            allowDataOverflow
            stroke="#9ca3af"
            tick={{ fontSize: 11, fill: '#6b7280' }}
            tickFormatter={(val) => Number(val).toFixed(1)}
            width={Y_AXIS_WIDTH}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#9ca3af', strokeWidth: 1, strokeDasharray: '4 4' }} />
          
          {/* Axis lines */}
          <ReferenceLine y={0} stroke="#374151" strokeWidth={1.5} />
          <ReferenceLine x={0} stroke="#374151" strokeWidth={1.5} />

          {/* Render Functions */}
          {functions.map((func) => {
            const isGeometry = parseGeometry(func.expr) !== null;
            if (isGeometry || !func.visible) return null;
            
            return (
              <Line
                key={func.id}
                type="monotone"
                dataKey={func.id}
                stroke={func.color}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
                connectNulls={false}
              />
            );
          })}

          {/* Render Geometry (Points and Polygons) */}
          {geometryItems.map((item) => {
            if (item.geometry?.type === 'point') {
              const p = item.geometry.points[0];
              return (
                <ReferenceDot
                  key={item.id}
                  x={p.x}
                  y={p.y}
                  r={6}
                  fill="white"
                  stroke={item.color}
                  strokeWidth={2}
                  isFront={true}
                  className="cursor-move hover:fill-gray-100"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    handleMouseDown(item.id, 0);
                  }}
                />
              );
            } else if (item.geometry?.type === 'polygon') {
              // For polygons, we use a Line component with custom data
              const points = [...item.geometry.points];
              // Close the loop for rendering
              if (points.length > 2) {
                 const first = points[0];
                 const last = points[points.length - 1];
                 if (first.x !== last.x || first.y !== last.y) {
                    points.push(first);
                 }
              }

              return (
                <Line
                  key={item.id}
                  data={points}
                  dataKey="y"
                  type="linear"
                  stroke={item.color}
                  strokeWidth={2}
                  isAnimationActive={false}
                  activeDot={false}
                  dot={(props: any) => {
                    const { cx, cy, index } = props;
                    // If it's the last point (duplicate of first), map it to index 0
                    const realIndex = (index === points.length - 1 && points.length > item.geometry.points.length) ? 0 : index;
                    
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={5}
                        fill="white"
                        stroke={item.color}
                        strokeWidth={2}
                        className="cursor-move hover:fill-gray-100"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          handleMouseDown(item.id, realIndex);
                        }}
                      />
                    );
                  }}
                />
              );
            }
            return null;
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
