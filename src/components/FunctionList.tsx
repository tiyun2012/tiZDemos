import { Trash2, Eye, EyeOff, Plus, LayoutTemplate, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { useState } from 'react';

export interface FunctionItem {
  id: string;
  expr: string;
  color: string;
  visible: boolean;
}

interface FunctionListProps {
  functions: FunctionItem[];
  onAddFunction: (expr?: string) => void;
  onUpdateFunction: (id: string, updates: Partial<FunctionItem>) => void;
  onRemoveFunction: (id: string) => void;
}

const COLORS = [
  '#ef4444', // red-500
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#84cc16', // lime-500
];

const TEMPLATES = [
  { name: 'Linear', expr: '2*x + 1', category: 'Basic' },
  { name: 'Quadratic', expr: 'x^2 - 4', category: 'Basic' },
  { name: 'Cubic', expr: 'x^3 - 2*x', category: 'Basic' },
  { name: 'Sine Wave', expr: 'sin(x)', category: 'Trigonometry' },
  { name: 'Cosine Wave', expr: 'cos(x)', category: 'Trigonometry' },
  { name: 'Tangent', expr: 'tan(x)', category: 'Trigonometry' },
  { name: 'Absolute Value', expr: 'abs(x)', category: 'Piecewise' },
  { name: 'Step Function', expr: 'x < 0 ? -1 : 1', category: 'Piecewise' },
  { name: 'Piecewise Parabola', expr: 'x < 0 ? x^2 : x', category: 'Piecewise' },
  { name: 'Triangle Wave (Periodic)', expr: '2/pi * asin(sin(x))', category: 'Advanced' },
  { name: 'Square Wave', expr: 'sign(sin(x))', category: 'Advanced' },
  { name: 'Gaussian', expr: 'e^(-x^2)', category: 'Advanced' },
  { name: 'Point', expr: '(2, 3)', category: 'Geometry' },
  { name: 'Line Segment', expr: '(-2, -2), (2, 2)', category: 'Geometry' },
  { name: 'Triangle', expr: '(0, 0), (2, 0), (1, 2)', category: 'Geometry' },
  { name: 'Square', expr: '(0, 0), (2, 0), (2, 2), (0, 2)', category: 'Geometry' },
  // Machine Learning
  { name: 'Sigmoid', expr: '1 / (1 + e^-x)', category: 'Machine Learning' },
  { name: 'ReLU', expr: 'max(0, x)', category: 'Machine Learning' },
  { name: 'Leaky ReLU', expr: 'x > 0 ? x : 0.1 * x', category: 'Machine Learning' },
  { name: 'Tanh', expr: 'tanh(x)', category: 'Machine Learning' },
  { name: 'Softplus', expr: 'log(1 + e^x)', category: 'Machine Learning' },
  { name: 'Swish', expr: 'x / (1 + e^-x)', category: 'Machine Learning' },
  // Shader / Graphics
  { name: 'Step', expr: 'x > 0 ? 1 : 0', category: 'Shader' },
  { name: 'Smoothstep (0-1)', expr: 'x <= 0 ? 0 : x >= 1 ? 1 : 3*x^2 - 2*x^3', category: 'Shader' },
  { name: 'Clamp (0-1)', expr: 'max(0, min(1, x))', category: 'Shader' },
  { name: 'Fract', expr: 'x - floor(x)', category: 'Shader' },
  { name: 'Modulo', expr: 'mod(x, 2)', category: 'Shader' },
  { name: 'Pulse', expr: 'exp(-10 * (x - 1)^2)', category: 'Shader' },
];

export function FunctionList({
  functions,
  onAddFunction,
  onUpdateFunction,
  onRemoveFunction,
}: FunctionListProps) {
  const [showTemplates, setShowTemplates] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Functions</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
              showTemplates 
                ? "bg-gray-200 text-gray-900" 
                : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
            )}
            title="Choose from templates"
          >
            <LayoutTemplate className="w-4 h-4" />
            Templates
          </button>
          <button
            onClick={() => onAddFunction()}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
      </div>

      {showTemplates && (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 mb-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Select a Template</h3>
            <button 
              onClick={() => setShowTemplates(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {TEMPLATES.map((template) => (
              <button
                key={template.name}
                onClick={() => {
                  onAddFunction(template.expr);
                  setShowTemplates(false);
                }}
                className="text-left px-3 py-2 text-sm rounded-md hover:bg-blue-50 hover:text-blue-700 transition-colors border border-transparent hover:border-blue-100 group"
              >
                <div className="font-medium">{template.name}</div>
                <div className="text-xs text-gray-500 group-hover:text-blue-600 font-mono truncate">
                  {template.expr}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {functions.map((func) => (
          <div
            key={func.id}
            className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg shadow-sm group hover:border-gray-300 transition-colors"
          >
            <div
              className="w-4 h-4 rounded-full cursor-pointer shrink-0 border border-gray-200"
              style={{ backgroundColor: func.color }}
              onClick={() => {
                const currentIndex = COLORS.indexOf(func.color);
                const nextColor = COLORS[(currentIndex + 1) % COLORS.length];
                onUpdateFunction(func.id, { color: nextColor });
              }}
              title="Click to change color"
            />
            
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <span className="text-gray-500 font-mono text-sm select-none">f(x) =</span>
              <input
                type="text"
                value={func.expr}
                onChange={(e) => onUpdateFunction(func.id, { expr: e.target.value })}
                placeholder="e.g. sin(x) * x"
                className="flex-1 min-w-0 bg-transparent border-none focus:ring-0 p-0 text-sm font-mono text-gray-900 placeholder:text-gray-400"
              />
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => onUpdateFunction(func.id, { visible: !func.visible })}
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  func.visible 
                    ? "text-gray-400 hover:text-gray-600 hover:bg-gray-100" 
                    : "text-gray-300 hover:text-gray-500 hover:bg-gray-50"
                )}
                title={func.visible ? "Hide function" : "Show function"}
              >
                {func.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
              
              <button
                onClick={() => onRemoveFunction(func.id)}
                className="p-1.5 text-gray-400 rounded-md hover:text-red-600 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                title="Remove function"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {functions.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-sm bg-gray-50 rounded-lg border border-dashed border-gray-200">
            No functions added yet. Click "Add" or "Templates" to start plotting.
          </div>
        )}
      </div>
    </div>
  );
}
