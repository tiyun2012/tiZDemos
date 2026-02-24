import { Trash2, Eye, EyeOff, Plus } from 'lucide-react';
import { cn } from '../lib/utils';

export interface FunctionItem {
  id: string;
  expr: string;
  color: string;
  visible: boolean;
}

interface FunctionListProps {
  functions: FunctionItem[];
  onAddFunction: () => void;
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

export function FunctionList({
  functions,
  onAddFunction,
  onUpdateFunction,
  onRemoveFunction,
}: FunctionListProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Functions</h2>
        <button
          onClick={onAddFunction}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Function
        </button>
      </div>

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
            No functions added yet. Click "Add Function" to start plotting.
          </div>
        )}
      </div>
    </div>
  );
}
