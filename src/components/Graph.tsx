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
  useXAxisDomain,
  useYAxisDomain,
  usePlotArea,
} from 'recharts';
import { FunctionItem } from './FunctionList';
import { DataPoint, parseGeometry, formatGeometry, Geometry, getNiceTicks, FunctionData, buildPolylinesFromSegments } from '../lib/mathUtils';
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import React from 'react';

interface GraphProps {
  data: DataPoint[];
  functions: FunctionItem[];
  functionDataMap: Record<string, FunctionData>;
  xDomain: [number, number];
  yDomain: [number, number];
  onUpdateFunction: (id: string, updates: Partial<FunctionItem>) => void;
  onUpdateXDomain: (domain: [number, number]) => void;
  onUpdateYDomain: (domain: [number, number]) => void;
  gridDensity: number;
  aspectLocked: boolean;
  onInteractionChange?: (isInteracting: boolean) => void;
}

const MARGIN = { top: 20, right: 30, left: 0, bottom: 20 };
const Y_AXIS_WIDTH = 50;
const X_AXIS_HEIGHT = 30;
const MIN_DOMAIN_SPAN = 1e-6;
const MAX_DOMAIN_SPAN = 1e6;

const TickLabel = ({ cx, cy, axisType, tickValue }: any) => {
  if (Math.abs(tickValue) < 1e-10) return null;

  if (axisType === 'x') {
    return (
      <g>
        <line x1={cx} y1={cy} x2={cx} y2={cy + 5} stroke="#6b7280" strokeWidth={1} />
        <text x={cx} y={cy + 18} textAnchor="middle" fontSize={11} fill="#6b7280" className="font-mono">
          {Number(tickValue).toFixed(1).replace(/\.0$/, '')}
        </text>
      </g>
    );
  } else {
    return (
      <g>
        <line x1={cx} y1={cy} x2={cx - 5} y2={cy} stroke="#6b7280" strokeWidth={1} />
        <text x={cx - 8} y={cy + 4} textAnchor="end" fontSize={11} fill="#6b7280" className="font-mono">
          {Number(tickValue).toFixed(1).replace(/\.0$/, '')}
        </text>
      </g>
    );
  }
};

const CustomFunctionLayer = React.memo(({ functions, functionDataMap }: { functions: FunctionItem[], functionDataMap: Record<string, FunctionData> }) => {
  const xDomain = useXAxisDomain();
  const yDomain = useYAxisDomain();
  const plotArea = usePlotArea();

  if (!xDomain || !yDomain || !plotArea) return null;

  const getX = (x: number) => plotArea.x + ((x - (xDomain[0] as number)) / ((xDomain[1] as number) - (xDomain[0] as number))) * plotArea.width;
  const getY = (y: number) => plotArea.y + plotArea.height - ((y - (yDomain[0] as number)) / ((yDomain[1] as number) - (yDomain[0] as number))) * plotArea.height;

  return (
    <g>
      {functions.map((func) => {
        if (!func.visible) return null;
        const funcData = functionDataMap[func.id];
        if (!funcData) return null;

        if (funcData.type === 'implicit') {
          const polylines = funcData.polylines ?? buildPolylinesFromSegments(funcData.segments);
          const pathData = polylines
            .map((line) => {
              let path = '';
              for (let i = 0; i < line.length; i++) {
                const x = getX(line[i].x);
                const y = getY(line[i].y);
                if (!isFinite(x) || !isFinite(y)) continue;
                path += `${i === 0 ? 'M' : ' L'}${x},${y}`;
              }
              return path;
            })
            .filter(Boolean)
            .join(' ');
          
          return (
            <path
              key={func.id}
              d={pathData}
              stroke={func.color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          );
        } else if (funcData.type === 'parametric' || funcData.type === 'polar') {
          const pathData = funcData.points?.map((p, i) => {
            const x = getX(p.x);
            const y = getY(p.y);
            
            if (!isFinite(x) || !isFinite(y)) return '';
            
            return `${i === 0 ? 'M' : 'L'}${x},${y}`;
          }).filter(Boolean).join(' ');
          
          return (
            <path
              key={func.id}
              d={pathData}
              stroke={func.color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          );
        }
        return null;
      })}
    </g>
  );
});

export function Graph({ 
  data, 
  functions, 
  functionDataMap,
  xDomain, 
  yDomain, 
  onUpdateFunction,
  onUpdateXDomain,
  onUpdateYDomain,
  gridDensity,
  aspectLocked,
  onInteractionChange
}: GraphProps) {
  const [dragging, setDragging] = useState<{ id: string; pointIndex: number } | null>(null);
  const [panning, setPanning] = useState<{ startX: number; startY: number; startXDomain: [number, number]; startYDomain: [number, number] } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Check if origin is visible to toggle default axes
  const isOriginXVisible = yDomain[0] <= 0 && yDomain[1] >= 0;
  const isOriginYVisible = xDomain[0] <= 0 && xDomain[1] >= 0;

  const xTicks = useMemo(() => getNiceTicks(xDomain[0], xDomain[1], gridDensity), [xDomain, gridDensity]);
  const yTicks = useMemo(() => getNiceTicks(yDomain[0], yDomain[1], gridDensity), [yDomain, gridDensity]);

  const domainRefs = useRef({ x: xDomain, y: yDomain });
  const pendingDomainRef = useRef<{ x: [number, number]; y: [number, number] } | null>(null);
  const frameRef = useRef<number | null>(null);
  const interactionRefs = useRef({ wheel: false, pan: false });
  const interactionActiveRef = useRef(false);
  const wheelInteractionTimeoutRef = useRef<number | null>(null);

  const syncInteractionState = useCallback(() => {
    const nextActive = interactionRefs.current.wheel || interactionRefs.current.pan;
    if (interactionActiveRef.current === nextActive) return;
    interactionActiveRef.current = nextActive;
    onInteractionChange?.(nextActive);
  }, [onInteractionChange]);

  const flushDomainUpdate = () => {
    const pending = pendingDomainRef.current;
    frameRef.current = null;
    if (!pending) return;

    pendingDomainRef.current = null;
    onUpdateXDomain(pending.x);
    onUpdateYDomain(pending.y);
  };

  const scheduleDomainUpdate = (nextX: [number, number], nextY: [number, number]) => {
    domainRefs.current = { x: nextX, y: nextY };
    pendingDomainRef.current = { x: nextX, y: nextY };

    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(flushDomainUpdate);
  };

  useEffect(() => {
    domainRefs.current = { x: xDomain, y: yDomain };
  }, [xDomain, yDomain]);

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
      if (wheelInteractionTimeoutRef.current !== null) {
        window.clearTimeout(wheelInteractionTimeoutRef.current);
      }
      interactionRefs.current.wheel = false;
      interactionRefs.current.pan = false;
      if (interactionActiveRef.current) {
        interactionActiveRef.current = false;
        onInteractionChange?.(false);
      }
    };
  }, [onInteractionChange]);

  // Enforce 1:1 aspect ratio on resize or domain change
  useEffect(() => {
    if (!aspectLocked) return;

    const container = containerRef.current;
    if (!container) return;

    const enforceAspectRatio = () => {
      if (interactionActiveRef.current) return;

      const rect = container.getBoundingClientRect();
      const chartWidth = rect.width - MARGIN.left - MARGIN.right - Y_AXIS_WIDTH;
      const chartHeight = rect.height - MARGIN.top - MARGIN.bottom - X_AXIS_HEIGHT;
      
      if (chartWidth <= 0 || chartHeight <= 0) return;

      const currentX = domainRefs.current.x;
      const currentY = domainRefs.current.y;
      
      const xRange = currentX[1] - currentX[0];
      const currentYRange = currentY[1] - currentY[0];
      
      // Calculate what the Y range should be to maintain 1:1 aspect ratio
      const targetYRange = xRange * (chartHeight / chartWidth);
      
      // If the current Y range is significantly different from the target, update it
      // Use a small epsilon to prevent infinite loops from floating point math
      if (Math.abs(currentYRange - targetYRange) > 1e-3) {
        const yCenter = (currentY[0] + currentY[1]) / 2;
        const newYDomain: [number, number] = [
          yCenter - targetYRange / 2,
          yCenter + targetYRange / 2
        ];
        
        domainRefs.current.y = newYDomain;
        onUpdateYDomain(newYDomain);
      }
    };

    // Run once on mount and whenever xDomain changes
    enforceAspectRatio();

    const resizeObserver = new ResizeObserver(() => {
      enforceAspectRatio();
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [aspectLocked, xDomain, onUpdateYDomain]);

  // Zoom handling
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      interactionRefs.current.wheel = true;
      syncInteractionState();
      if (wheelInteractionTimeoutRef.current !== null) {
        window.clearTimeout(wheelInteractionTimeoutRef.current);
      }
      wheelInteractionTimeoutRef.current = window.setTimeout(() => {
        interactionRefs.current.wheel = false;
        syncInteractionState();
      }, 180);

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

      const currentX = domainRefs.current.x;
      const currentY = domainRefs.current.y;

      const xRange = currentX[1] - currentX[0];
      const yRange = currentY[1] - currentY[0];
      if (xRange <= 0 || yRange <= 0) return;

      // Point under mouse in domain coordinates
      const mouseDomainX = currentX[0] + (mouseX / chartWidth) * xRange;
      const mouseDomainY = currentY[1] - (mouseY / chartHeight) * yRange;

      const clampRatio = (ratio: number) => Math.max(0, Math.min(1, ratio));
      const clampSpan = (span: number) => Math.max(MIN_DOMAIN_SPAN, Math.min(MAX_DOMAIN_SPAN, span));
      const xLeftRatio = clampRatio((mouseDomainX - currentX[0]) / xRange);
      const yBottomRatio = clampRatio((mouseDomainY - currentY[0]) / yRange);

      // Calculate new domains keeping the point under mouse stationary
      let newXMin = mouseDomainX - (mouseDomainX - currentX[0]) * zoomFactor;
      let newXMax = mouseDomainX + (currentX[1] - mouseDomainX) * zoomFactor;

      let newYMin = mouseDomainY - (mouseDomainY - currentY[0]) * zoomFactor;
      let newYMax = mouseDomainY + (currentY[1] - mouseDomainY) * zoomFactor;

      const nextXSpan = clampSpan(newXMax - newXMin);
      const nextYSpan = clampSpan(newYMax - newYMin);
      const xRightRatio = 1 - xLeftRatio;
      const yTopRatio = 1 - yBottomRatio;

      newXMin = mouseDomainX - xLeftRatio * nextXSpan;
      newXMax = mouseDomainX + xRightRatio * nextXSpan;
      newYMin = mouseDomainY - yBottomRatio * nextYSpan;
      newYMax = mouseDomainY + yTopRatio * nextYSpan;

      if (!isFinite(newXMin) || !isFinite(newXMax) || !isFinite(newYMin) || !isFinite(newYMax)) return;

      const nextX: [number, number] = [newXMin, newXMax];
      const nextY: [number, number] = [newYMin, newYMax];

      scheduleDomainUpdate(nextX, nextY);
    };

    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [syncInteractionState]);

  // Custom tooltip to show values for all visible functions at the hovered x
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length && !dragging && !panning) {
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

  const handlePointMouseDown = (id: string, pointIndex: number) => {
    setDragging({ id, pointIndex });
  };

  const handleContainerMouseDown = (e: React.MouseEvent) => {
    // Middle mouse button is 1
    if (e.button === 1) {
      e.preventDefault();
      e.stopPropagation();
      interactionRefs.current.pan = true;
      syncInteractionState();
      setPanning({
        startX: e.clientX,
        startY: e.clientY,
        startXDomain: [...xDomain],
        startYDomain: [...yDomain]
      });
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!containerRef.current) return;

    if (dragging) {
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
    } else if (panning) {
      const rect = containerRef.current.getBoundingClientRect();
      const chartWidth = rect.width - MARGIN.left - MARGIN.right - Y_AXIS_WIDTH;
      const chartHeight = rect.height - MARGIN.top - MARGIN.bottom - X_AXIS_HEIGHT;

      const dxPixels = e.clientX - panning.startX;
      const dyPixels = e.clientY - panning.startY;

      const xRange = panning.startXDomain[1] - panning.startXDomain[0];
      const yRange = panning.startYDomain[1] - panning.startYDomain[0];

      // Drag right -> move view left (decrease domain)
      const dxDomain = (dxPixels / chartWidth) * xRange;
      // Drag down -> move view up (increase domain, because Y is inverted on screen)
      const dyDomain = (dyPixels / chartHeight) * yRange;

      scheduleDomainUpdate([
        panning.startXDomain[0] - dxDomain,
        panning.startXDomain[1] - dxDomain
      ], [
        panning.startYDomain[0] + dyDomain,
        panning.startYDomain[1] + dyDomain
      ]);
    }
  };

  const handleMouseUp = () => {
    setDragging(null);
    if (panning) {
      interactionRefs.current.pan = false;
      syncInteractionState();
    }
    setPanning(null);
  };

  useEffect(() => {
    if (dragging || panning) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, panning, xDomain, yDomain, geometryItems]); // Dependencies needed for calculation

  return (
    <div 
      ref={containerRef}
      className={`w-full h-full min-h-[400px] bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden select-none ${panning ? 'cursor-grabbing' : 'cursor-default'}`}
      onMouseDown={handleContainerMouseDown}
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
            ticks={xTicks}
            allowDataOverflow
            stroke="#9ca3af"
            tick={!isOriginXVisible ? { fontSize: 11, fill: '#6b7280' } : false}
            tickFormatter={(val) => Number(val).toFixed(1)}
            height={X_AXIS_HEIGHT}
            axisLine={!isOriginXVisible}
          />
          <YAxis
            type="number"
            domain={yDomain}
            ticks={yTicks}
            allowDataOverflow
            stroke="#9ca3af"
            tick={!isOriginYVisible ? { fontSize: 11, fill: '#6b7280' } : false}
            tickFormatter={(val) => Number(val).toFixed(1)}
            width={Y_AXIS_WIDTH}
            axisLine={!isOriginYVisible}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#9ca3af', strokeWidth: 1, strokeDasharray: '4 4' }} />
          
          {/* Axis lines - Always show reference lines for x=0 and y=0 */}
          <ReferenceLine y={0} stroke="#374151" strokeWidth={1.5} />
          <ReferenceLine x={0} stroke="#374151" strokeWidth={1.5} />
          
          {/* Custom Ticks for X Axis (along y=0) */}
          {isOriginXVisible && xTicks.map(tick => (
            <ReferenceDot 
              key={`x-${tick}`} 
              x={tick} 
              y={0} 
              r={0} 
              shape={(props: any) => <TickLabel {...props} axisType="x" tickValue={tick} />} 
              isFront={true}
            />
          ))}

          {/* Custom Ticks for Y Axis (along x=0) */}
          {isOriginYVisible && yTicks.map(tick => (
            <ReferenceDot 
              key={`y-${tick}`} 
              x={0} 
              y={tick} 
              r={0} 
              shape={(props: any) => <TickLabel {...props} axisType="y" tickValue={tick} />} 
              isFront={true}
            />
          ))}

          {/* Render Explicit Functions via Line (for tooltip support) */}
          {functions.map((func) => {
            const isGeometry = parseGeometry(func.expr) !== null;
            if (isGeometry || !func.visible) return null;
            
            const funcData = functionDataMap[func.id];
            if (!funcData || funcData.type !== 'explicit') return null;

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

          {/* Render Parametric, Polar, and Implicit Functions via CustomFunctionLayer */}
          <CustomFunctionLayer functions={functions} functionDataMap={functionDataMap} />

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
                  onMouseDown={(e: any, event?: any) => {
                    if (e && typeof e.stopPropagation === 'function') {
                      e.stopPropagation();
                    } else if (event && typeof event.stopPropagation === 'function') {
                      event.stopPropagation();
                    }
                    handlePointMouseDown(item.id, 0);
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
                        onMouseDown={(e: any, event?: any) => {
                          if (e && typeof e.stopPropagation === 'function') {
                            e.stopPropagation();
                          } else if (event && typeof event.stopPropagation === 'function') {
                            event.stopPropagation();
                          }
                          handlePointMouseDown(item.id, realIndex);
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
