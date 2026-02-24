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
import { DataPoint, parseGeometry } from '../lib/mathUtils';

interface GraphProps {
  data: DataPoint[];
  functions: FunctionItem[];
  xDomain: [number, number];
  yDomain: [number, number];
}

export function Graph({ data, functions, xDomain, yDomain }: GraphProps) {
  // Custom tooltip to show values for all visible functions at the hovered x
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-sm border border-gray-200 p-3 rounded-lg shadow-lg text-xs font-mono">
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
    .filter(f => f.geometry !== null);

  return (
    <div className="w-full h-full min-h-[400px] bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
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
          />
          <YAxis
            type="number"
            domain={yDomain}
            allowDataOverflow
            stroke="#9ca3af"
            tick={{ fontSize: 11, fill: '#6b7280' }}
            tickFormatter={(val) => Number(val).toFixed(1)}
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
                  r={5}
                  fill={item.color}
                  stroke="white"
                  strokeWidth={2}
                  isFront={true}
                />
              );
            } else if (item.geometry?.type === 'polygon') {
              // For polygons, we use a Line component with custom data
              // We close the loop by adding the first point to the end if not already closed
              const points = [...item.geometry.points];
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
                  dot={{ r: 3, fill: item.color, strokeWidth: 0 }}
                  activeDot={false}
                  isAnimationActive={false}
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
