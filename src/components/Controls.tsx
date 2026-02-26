import { RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';

interface ControlsProps {
  xDomain: [number, number];
  yDomain: [number, number];
  onUpdateXDomain: (domain: [number, number]) => void;
  onUpdateYDomain: (domain: [number, number]) => void;
  gridDensity: number;
  onUpdateGridDensity: (density: number) => void;
  aspectLocked: boolean;
  onToggleAspectLocked: (locked: boolean) => void;
  onReset: () => void;
  parameters: Record<string, number>;
  onUpdateParameters: (params: Record<string, number>) => void;
}

export function Controls({
  xDomain,
  yDomain,
  onUpdateXDomain,
  onUpdateYDomain,
  gridDensity,
  onUpdateGridDensity,
  aspectLocked,
  onToggleAspectLocked,
  onReset,
  parameters,
  onUpdateParameters,
}: ControlsProps) {
  const handleZoom = (factor: number) => {
    const xMid = (xDomain[0] + xDomain[1]) / 2;
    const yMid = (yDomain[0] + yDomain[1]) / 2;
    const xSpan = (xDomain[1] - xDomain[0]) / factor;
    const ySpan = (yDomain[1] - yDomain[0]) / factor;

    onUpdateXDomain([xMid - xSpan / 2, xMid + xSpan / 2]);
    onUpdateYDomain([yMid - ySpan / 2, yMid + ySpan / 2]);
  };

  return (
    <div className="space-y-4 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">View Controls</h3>
        <div className="flex gap-1">
          <button
            onClick={() => handleZoom(1.2)}
            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleZoom(0.8)}
            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={onReset}
            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
            title="Reset View"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {Object.keys(parameters).length > 0 && (
          <div className="space-y-4 pb-4 border-b border-gray-200">
            <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wider">Parameters</h4>
            {Object.entries(parameters).map(([name, value]) => (
              <div key={name} className="space-y-1">
                 <div className="flex justify-between">
                  <label className="block text-xs font-medium text-gray-500 font-mono">{name}</label>
                  <span className="text-xs text-gray-400 font-mono">{value.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="-10"
                  max="10"
                  step="0.1"
                  value={value}
                  onChange={(e) => onUpdateParameters({ ...parameters, [name]: Number(e.target.value) })}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2">
          <div className="flex justify-between">
            <label className="block text-xs font-medium text-gray-500 uppercase">Grid Density</label>
            <span className="text-xs text-gray-400">{gridDensity} ticks</span>
          </div>
          <input
            type="range"
            min="5"
            max="20"
            step="1"
            value={gridDensity}
            onChange={(e) => onUpdateGridDensity(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
        </div>

        <div className="flex items-center justify-between">
          <label className="block text-xs font-medium text-gray-500 uppercase">Aspect Lock</label>
          <button
            type="button"
            onClick={() => onToggleAspectLocked(!aspectLocked)}
            className={`px-2 py-1 text-xs rounded border transition-colors ${
              aspectLocked
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : 'bg-gray-50 text-gray-600 border-gray-200'
            }`}
          >
            {aspectLocked ? '1:1 Locked' : 'Unlocked'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-500 uppercase">X Axis</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={xDomain[0]}
              onChange={(e) => onUpdateXDomain([Number(e.target.value), xDomain[1]])}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="text-gray-400 text-xs">to</span>
            <input
              type="number"
              value={xDomain[1]}
              onChange={(e) => onUpdateXDomain([xDomain[0], Number(e.target.value)])}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-500 uppercase">Y Axis</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={yDomain[0]}
              onChange={(e) => onUpdateYDomain([Number(e.target.value), yDomain[1]])}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
            <span className="text-gray-400 text-xs">to</span>
            <input
              type="number"
              value={yDomain[1]}
              onChange={(e) => onUpdateYDomain([yDomain[0], Number(e.target.value)])}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
