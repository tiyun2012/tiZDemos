import { ChevronDown, ChevronUp, BookOpen } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../lib/utils';

export function Documentation() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600" />
          <span className="font-medium text-gray-900">Documentation & Examples</span>
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
      </button>
      
      <div
        className={cn(
          "transition-all duration-300 ease-in-out overflow-hidden",
          isOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="p-4 space-y-4 text-sm text-gray-600 border-t border-gray-200">
          <p>
            Enter mathematical expressions using standard notation. The variable must be <code>x</code>.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Supported Operations</h4>
              <ul className="list-disc list-inside space-y-1 ml-1">
                <li>Arithmetic: <code>+, -, *, /, ^</code></li>
                <li>Functions: <code>sin, cos, tan, log, sqrt</code></li>
                <li>Constants: <code>pi, e</code></li>
                <li>Logic: <code>x &lt; 0 ? -1 : 1</code> (Piecewise)</li>
                <li>Geometry: <code>(x, y)</code> or <code>(x1, y1), (x2, y2)</code></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Examples</h4>
              <ul className="space-y-1 font-mono text-xs bg-gray-50 p-2 rounded border border-gray-100">
                <li>x^2 - 4</li>
                <li>sin(x) * x</li>
                <li>x &lt; 0 ? 0 : x (ReLU)</li>
                <li>(1, 2) (Point)</li>
                <li>(0,0), (1,1), (2,0) (Polygon)</li>
              </ul>
            </div>
          </div>

          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Powered by <strong>mathjs</strong>. Complex numbers are not supported.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
