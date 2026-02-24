import { useState, useMemo } from 'react';
import { FunctionList, FunctionItem } from './components/FunctionList';
import { Graph } from './components/Graph';
import { Controls } from './components/Controls';
import { Documentation } from './components/Documentation';
import { generatePoints } from './lib/mathUtils';
import { Calculator, Github } from 'lucide-react';

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

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar Controls */}
          <div className="lg:col-span-4 space-y-6">
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

          {/* Main Graph Area */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1 h-[600px]">
              <Graph
                data={data}
                functions={functions}
                xDomain={xDomain}
                yDomain={yDomain}
                onUpdateFunction={updateFunction}
                onUpdateXDomain={setXDomain}
                onUpdateYDomain={setYDomain}
              />
            </div>
            
            <div className="mt-4 flex items-center justify-between text-sm text-gray-500 px-2">
              <p>
                Showing {data.length} data points across x=[{xDomain[0]}, {xDomain[1]}]
              </p>
              <p>
                Mouse over the graph to inspect values
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
