import { ChevronDown, ChevronUp, BookOpen } from 'lucide-react';
import React, { useState } from 'react';
import { cn } from '../lib/utils';

function DocumentationComponent() {
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
            Enter mathematical expressions using standard notation. Use <code>x</code> as the independent variable; extra symbols such as <code>a</code> or <code>speed</code> become shared parameters.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Supported Operations</h4>
              <ul className="list-disc list-inside space-y-1 ml-1">
                <li>Arithmetic: <code>+, -, *, /, ^</code> (also <code>×, ÷</code>)</li>
                <li>Functions: <code>sin, cos, tan, log, sqrt</code> (also <code>√</code>)</li>
                <li>Constants: <code>pi, e</code> (also <code>π</code>)</li>
                <li>Logic: <code>x &lt; 0 ? -1 : 1</code> (Piecewise)</li>
                <li>Geometry: <code>(x, y)</code>, labeled <code>A = (x, y)</code> / <code>A(x, y)</code>, or multiple named points</li>
                <li>ML/Shader: <code>max, min, floor, mod, tanh</code></li>
                <li>Vectors: <code>dot([x, 1], [2, 3])</code>, <code>norm([x, 3])</code></li>
                <li>Visual debug: <code>sdSegment((ax, ay), (bx, by), (px, py))</code></li>
                <li>Scripting: Define variables on separate lines. Last line is result.</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Examples</h4>
              <ul className="space-y-1 font-mono text-xs bg-gray-50 p-2 rounded border border-gray-100">
                <li>x^2 - 4</li>
                <li>sin(π * x)</li>
                <li>a = 2; a * x (Variable)</li>
                <li>1 / (1 + e^-x) (Sigmoid)</li>
                <li>x - floor(x) (Fract)</li>
                <li>(1, 2) (Point)</li>
                <li>A = (1, 1.2) (Labeled point)</li>
                <li>A = (-2,-1), B = (2,.5) (Labeled segment)</li>
                <li>sdSegment((-2,-1), (2,.5), (.5,2))</li>
              </ul>
            </div>
          </div>

          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Powered by <strong>mathjs</strong>. Debug visualizations use a small app-level visualization layer on top of the same graph coordinates.
            </p>
          </div>
        </div>
      </div>
    
      <div className="space-y-2">
        <h3 className="font-semibold text-gray-900">Shader visualizations</h3>
        <p className="text-sm text-gray-600">Use Templates → Shader Visuals for interactive lineMask, circleMask, patchPoint, and drawLine teaching views.</p>
      </div>
</div>
  );
}

export const Documentation = React.memo(DocumentationComponent);
Documentation.displayName = 'Documentation';
