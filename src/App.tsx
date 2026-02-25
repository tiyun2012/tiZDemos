import { useState, useMemo, useRef, useEffect } from 'react';
import { FunctionList, FunctionItem } from './components/FunctionList';
import { Graph } from './components/Graph';
import { Controls } from './components/Controls';
import { Documentation } from './components/Documentation';
import { generatePoints } from './lib/mathUtils';
import { Calculator, Github, GripVertical } from 'lucide-react';

const DEFAULT_X_DOMAIN: [number, number] = [-10, 10];
const DEFAULT_Y_DOMAIN: [number, number] = [-10, 10];

const INITIAL_FUNCTIONS: FunctionItem[] = [
  { id: '1', expr: 'x^2', color: '#3b82f6', visible: true },
  { id: '2', expr: 'sin(x)', color: '#ef4444', visible: true },
];

export default function App() {
  const [functions, setFunctions] = useState<FunctionItem[]>(INITIAL_FUNCTIONS);
  const [xDomain, setXDomain] = useState<[number, number]>(DEFAULT_X_DOMAIN);
  const [yDomain, setYDomain] = useState<[number, number]>(DEFAULT_Y_DOMAIN);
  const [sidebarWidth, setSidebarWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);

  const data = useMemo(() => {
    return generatePoints(functions, xDomain[0], xDomain[1], 500);
  }, [functions, xDomain]);

  const addFunction = (expr: string = '') => {
    const newId = Math.random().toString(36).substr(2, 9);
    const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    setFunctions([
      ...functions,
      { id: newId, expr, color: randomColor, visible: true },
    ]);
  };

  const updateFunction = (id: string, updates: Partial<FunctionItem>) => {
    setFunctions(functions.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  const removeFunction = (id: string) => {
    setFunctions(functions.filter((f) => f.id !== id));
  };

  const resetView = () => {
    setXDomain(DEFAULT_X_DOMAIN);
    setYDomain(DEFAULT_Y_DOMAIN);
  };

  // Sidebar resizing logic
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      // Constrain width between 300px and 600px
      const newWidth = Math.max(300, Math.min(600, e.clientX));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = 'default';
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shrink-0">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg text-white">
              <Calculator className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">
              Function Graph Visualizer
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/google/gemini-api"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-gray-900 transition-colors"
              title="View Source"
            >
              <Github className="w-5 h-5" />
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar Controls */}
        <div 
          className="flex-shrink-0 bg-gray-50 border-r border-gray-200 overflow-y-auto"
          style={{ width: sidebarWidth }}
        >
          <div className="p-6 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <FunctionList
                functions={functions}
                onAddFunction={addFunction}
                onUpdateFunction={updateFunction}
                onRemoveFunction={removeFunction}
              />
            </div>

            <Controls
              xDomain={xDomain}
              yDomain={yDomain}
              onUpdateXDomain={setXDomain}
              onUpdateYDomain={setYDomain}
              onReset={resetView}
            />

            <Documentation />
          </div>
        </div>

        {/* Resizer Handle */}
        <div
          className="w-1 bg-gray-200 hover:bg-blue-400 cursor-col-resize flex items-center justify-center transition-colors z-20"
          onMouseDown={() => setIsResizing(true)}
        >
          <div className="h-8 w-1 bg-gray-400 rounded-full opacity-0 hover:opacity-100 transition-opacity" />
        </div>

        {/* Main Graph Area */}
        <div className="flex-1 p-6 overflow-hidden bg-white">
          <div className="w-full h-full bg-white rounded-xl shadow-sm border border-gray-200 p-1 relative">
            <Graph
              data={data}
              functions={functions}
              xDomain={xDomain}
              yDomain={yDomain}
              onUpdateFunction={updateFunction}
              onUpdateXDomain={setXDomain}
              onUpdateYDomain={setYDomain}
            />
            
            <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-500 shadow-sm pointer-events-none">
              <p>
                Showing {data.length} data points across x=[{xDomain[0].toFixed(1)}, {xDomain[1].toFixed(1)}]
              </p>
              <p className="mt-1">
                Scroll to zoom • Drag to pan • Drag points to edit geometry
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
