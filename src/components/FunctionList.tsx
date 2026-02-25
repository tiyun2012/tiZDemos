import { Trash2, Eye, EyeOff, Plus, LayoutTemplate, X, Code } from 'lucide-react';
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
  { name: 'Sine Zig-Zag', expr: '2/pi * asin(sin(x))', category: 'Advanced' },
  // Scripting
  { name: 'Damped Sine (Vars)', expr: 'A = 2\nk = 5\ndecay = 0.2\nA * sin(k * x) * e^(-decay * x)', category: 'Scripting' },
  { name: 'Clamped Wave', expr: 'y = sin(x)\nlimit = 0.5\nmax(min(y, limit), -limit)', category: 'Scripting' },
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
          <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
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
                  {template.expr.split('\n')[0]}
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
            className="flex flex-col gap-2 p-3 bg-white border border-gray-200 rounded-lg shadow-sm group hover:border-gray-300 transition-all focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full cursor-pointer shrink-0 border border-gray-200 hover:scale-110 transition-transform"
                  style={{ backgroundColor: func.color }}
                  onClick={() => {
                    const currentIndex = COLORS.indexOf(func.color);
                    const nextColor = COLORS[(currentIndex + 1) % COLORS.length];
                    onUpdateFunction(func.id, { color: nextColor });
                  }}
                  title="Click to change color"
                />
                <span className="text-xs font-medium text-gray-500 font-mono">f(x)</span>
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                <button
                  onClick={() => onUpdateFunction(func.id, { visible: !func.visible })}
                  className={cn(
                    "p-1 rounded hover:bg-gray-100 transition-colors",
                    func.visible ? "text-gray-400 hover:text-gray-600" : "text-gray-300"
                  )}
                  title={func.visible ? "Hide function" : "Show function"}
                >
                  {func.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
                
                <button
                  onClick={() => onRemoveFunction(func.id)}
                  className="p-1 text-gray-400 rounded hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Remove function"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            
            <div className="relative">
              <textarea
                value={func.expr}
                onChange={(e) => onUpdateFunction(func.id, { expr: e.target.value })}
                placeholder="Enter expression..."
                rows={Math.max(2, func.expr.split('\n').length)}
                className="w-full bg-gray-50 border border-gray-200 rounded-md p-2 text-sm font-mono text-gray-900 placeholder:text-gray-400 resize-none focus:outline-none focus:bg-white transition-colors leading-relaxed"
                spellCheck={false}
              />
              <div className="absolute right-2 bottom-2 pointer-events-none">
                <Code className="w-3 h-3 text-gray-300" />
              </div>
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
