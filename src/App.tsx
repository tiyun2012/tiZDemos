import { useState, useMemo, useEffect, useCallback } from 'react';
import { FunctionList, FunctionItem } from './components/FunctionList';
import { Graph } from './components/Graph';
import { Controls } from './components/Controls';
import { Documentation } from './components/Documentation';
import { generatePoints, generateFunctionData, extractVariables, FunctionData, getDerivative, detectFunctionType } from './lib/mathUtils';
import { Calculator, Github } from 'lucide-react';

const DEFAULT_X_DOMAIN: [number, number] = [-10, 10];
const DEFAULT_Y_DOMAIN: [number, number] = [-10, 10];

const INITIAL_FUNCTIONS: FunctionItem[] = [
  { id: '1', expr: 'x^2', color: '#3b82f6', visible: true },
  { id: '2', expr: 'sin(x)', color: '#ef4444', visible: true },
];

const IMPLICIT_REGEN_DEBOUNCE_MS = 180;
const ANIMATION_FPS_FAST = 60;
const ANIMATION_FPS_IMPLICIT = 24;
const TIME_SYMBOL_REGEX = /\btime\b/;

function domainsEqual(a: [number, number], b: [number, number], epsilon: number = 1e-9): boolean {
  return Math.abs(a[0] - b[0]) <= epsilon && Math.abs(a[1] - b[1]) <= epsilon;
}

function usesTimeSymbol(expr: string): boolean {
  return TIME_SYMBOL_REGEX.test(expr);
}

export default function App() {
  const [functions, setFunctions] = useState<FunctionItem[]>(INITIAL_FUNCTIONS);
  const [xDomain, setXDomain] = useState<[number, number]>(DEFAULT_X_DOMAIN);
  const [yDomain, setYDomain] = useState<[number, number]>(DEFAULT_Y_DOMAIN);
  const [gridDensity, setGridDensity] = useState(10);
  const [sidebarWidth, setSidebarWidth] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  const [parameters, setParameters] = useState<Record<string, number>>({});
  const [aspectLocked, setAspectLocked] = useState(true);
  const [isGraphInteracting, setIsGraphInteracting] = useState(false);
  const [implicitXDomain, setImplicitXDomain] = useState<[number, number]>(DEFAULT_X_DOMAIN);
  const [implicitYDomain, setImplicitYDomain] = useState<[number, number]>(DEFAULT_Y_DOMAIN);
  const [timeSeconds, setTimeSeconds] = useState(0);

  const timingMeta = useMemo(() => {
    const nonImplicitStaticFunctions: FunctionItem[] = [];
    const nonImplicitAnimatedFunctions: FunctionItem[] = [];
    const implicitStaticFunctions: FunctionItem[] = [];
    const implicitAnimatedFunctions: FunctionItem[] = [];

    let hasTimeDrivenExplicit = false;

    functions.forEach((f) => {
      if (!f.visible) return;

      const usesTime = usesTimeSymbol(f.expr);
      const type = detectFunctionType(f.expr);

      if (type === 'implicit') {
        if (usesTime) {
          implicitAnimatedFunctions.push(f);
        } else {
          implicitStaticFunctions.push(f);
        }
        return;
      }

      if (usesTime) {
        nonImplicitAnimatedFunctions.push(f);
      } else {
        nonImplicitStaticFunctions.push(f);
      }

      if (type === 'explicit' && usesTime) {
        hasTimeDrivenExplicit = true;
      }
    });

    const hasTimeDrivenNonImplicit = nonImplicitAnimatedFunctions.length > 0;
    const hasTimeDrivenImplicit = implicitAnimatedFunctions.length > 0;
    const hasTimeDrivenFunction = hasTimeDrivenNonImplicit || hasTimeDrivenImplicit;
    const hasVisibleImplicit = implicitStaticFunctions.length > 0 || implicitAnimatedFunctions.length > 0;

    return {
      nonImplicitStaticFunctions,
      nonImplicitAnimatedFunctions,
      implicitStaticFunctions,
      implicitAnimatedFunctions,
      hasTimeDrivenFunction,
      hasTimeDrivenExplicit,
      hasTimeDrivenNonImplicit,
      hasTimeDrivenImplicit,
      hasVisibleImplicit
    };
  }, [functions]);

  const {
    nonImplicitStaticFunctions,
    nonImplicitAnimatedFunctions,
    implicitStaticFunctions,
    implicitAnimatedFunctions,
    hasTimeDrivenFunction,
    hasTimeDrivenExplicit,
    hasTimeDrivenNonImplicit,
    hasTimeDrivenImplicit,
    hasVisibleImplicit
  } = timingMeta;

  useEffect(() => {
    if (!hasTimeDrivenFunction) return;

    const animationFps = hasTimeDrivenImplicit ? ANIMATION_FPS_IMPLICIT : ANIMATION_FPS_FAST;
    let rafId = 0;
    let lastEmit = 0;
    const frameBudgetMs = 1000 / animationFps;
    const start = performance.now() - timeSeconds * 1000;

    const tick = (now: number) => {
      if (now - lastEmit >= frameBudgetMs) {
        setTimeSeconds((now - start) / 1000);
        lastEmit = now;
      }
      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [hasTimeDrivenFunction, hasTimeDrivenImplicit]);

  const animatedParameters = useMemo(() => {
    return { ...parameters, time: timeSeconds };
  }, [parameters, timeSeconds]);

  const explicitEvalParameters = hasTimeDrivenExplicit ? animatedParameters : parameters;

  // Extract variables from functions
  useEffect(() => {
    const newParams = { ...parameters };
    let hasChanges = false;
    const foundVars = new Set<string>();

    functions.forEach(f => {
      if (!f.visible) return;
      const vars = extractVariables(f.expr);
      vars.forEach(v => {
        foundVars.add(v);
        if (newParams[v] === undefined) {
          newParams[v] = 1; // Default value
          hasChanges = true;
        }
      });
    });

    Object.keys(newParams).forEach((key) => {
      if (!foundVars.has(key)) {
        delete newParams[key];
        hasChanges = true;
      }
    });

    if (hasChanges) {
      setParameters(newParams);
    }
  }, [functions]);

  const data = useMemo(() => {
    return generatePoints(functions, xDomain[0], xDomain[1], 500, explicitEvalParameters);
  }, [functions, xDomain, explicitEvalParameters]);

  useEffect(() => {
    if (!hasVisibleImplicit) {
      setImplicitXDomain((prev) => (domainsEqual(prev, xDomain) ? prev : xDomain));
      setImplicitYDomain((prev) => (domainsEqual(prev, yDomain) ? prev : yDomain));
      return;
    }

    if (isGraphInteracting) return;

    const timer = window.setTimeout(() => {
      setImplicitXDomain((prev) => (domainsEqual(prev, xDomain) ? prev : xDomain));
      setImplicitYDomain((prev) => (domainsEqual(prev, yDomain) ? prev : yDomain));
    }, IMPLICIT_REGEN_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [xDomain, yDomain, isGraphInteracting, hasVisibleImplicit]);

  const nonImplicitStaticDataMap = useMemo(() => {
    const map: Record<string, FunctionData> = {};
    nonImplicitStaticFunctions.forEach(f => {
      const data = generateFunctionData(f, xDomain, yDomain, parameters);
      if (data) map[f.id] = data;
    });
    return map;
  }, [nonImplicitStaticFunctions, xDomain, yDomain, parameters]);

  const nonImplicitAnimatedDataMap = useMemo(() => {
    const map: Record<string, FunctionData> = {};
    if (!hasTimeDrivenNonImplicit) return map;

    nonImplicitAnimatedFunctions.forEach(f => {
      const data = generateFunctionData(f, xDomain, yDomain, animatedParameters);
      if (data) map[f.id] = data;
    });

    return map;
  }, [nonImplicitAnimatedFunctions, xDomain, yDomain, animatedParameters, hasTimeDrivenNonImplicit]);

  const implicitStaticDataMap = useMemo(() => {
    const map: Record<string, FunctionData> = {};
    if (!hasVisibleImplicit) return map;

    implicitStaticFunctions.forEach(f => {
      const data = generateFunctionData(f, implicitXDomain, implicitYDomain, parameters);
      if (data) map[f.id] = data;
    });

    return map;
  }, [implicitStaticFunctions, implicitXDomain, implicitYDomain, parameters, hasVisibleImplicit]);

  const implicitAnimatedDataMap = useMemo(() => {
    const map: Record<string, FunctionData> = {};
    if (!hasTimeDrivenImplicit) return map;

    implicitAnimatedFunctions.forEach(f => {
      const data = generateFunctionData(f, implicitXDomain, implicitYDomain, animatedParameters);
      if (data) map[f.id] = data;
    });

    return map;
  }, [implicitAnimatedFunctions, implicitXDomain, implicitYDomain, animatedParameters, hasTimeDrivenImplicit]);

  const functionDataMap = useMemo(() => {
    return {
      ...nonImplicitStaticDataMap,
      ...nonImplicitAnimatedDataMap,
      ...implicitStaticDataMap,
      ...implicitAnimatedDataMap
    };
  }, [nonImplicitStaticDataMap, nonImplicitAnimatedDataMap, implicitStaticDataMap, implicitAnimatedDataMap]);

  const isImplicitStale = hasVisibleImplicit && (!domainsEqual(implicitXDomain, xDomain) || !domainsEqual(implicitYDomain, yDomain));

  const addFunction = useCallback((expr: string = '') => {
    const newId = Math.random().toString(36).substr(2, 9);
    const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    setFunctions((prev) => [
      ...prev,
      { id: newId, expr, color: randomColor, visible: true },
    ]);
  }, []);

  const handleDataUpload = useCallback((content: string) => {
    const lines = content.split('\n').filter(l => l.trim());
    const points: string[] = [];
    
    lines.forEach(line => {
      // Handle CSV or whitespace separated values
      const parts = line.split(/[,\t]+/).map(p => parseFloat(p.trim()));
      // Check if valid numbers
      if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        points.push(`(${parts[0]}, ${parts[1]})`);
      }
    });
    
    if (points.length > 0) {
      addFunction(points.join(', '));
    }
  }, [addFunction]);

  const updateFunction = useCallback((id: string, updates: Partial<FunctionItem>) => {
    setFunctions((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  }, []);

  const differentiateFunction = useCallback((id: string) => {
    const func = functions.find(f => f.id === id);
    if (!func) return;
    
    const deriv = getDerivative(func.expr);
    if (deriv) {
      addFunction(deriv);
    }
  }, [functions, addFunction]);

  const removeFunction = useCallback((id: string) => {
    setFunctions((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const resetView = useCallback(() => {
    setXDomain(DEFAULT_X_DOMAIN);
    setYDomain(DEFAULT_Y_DOMAIN);
  }, []);

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
                onUploadData={handleDataUpload}
                onDifferentiate={differentiateFunction}
              />
            </div>

            <Controls
              xDomain={xDomain}
              yDomain={yDomain}
              onUpdateXDomain={setXDomain}
              onUpdateYDomain={setYDomain}
              gridDensity={gridDensity}
              onUpdateGridDensity={setGridDensity}
              aspectLocked={aspectLocked}
              onToggleAspectLocked={setAspectLocked}
              onReset={resetView}
              parameters={parameters}
              onUpdateParameters={setParameters}
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
              functionDataMap={functionDataMap}
              xDomain={xDomain}
              yDomain={yDomain}
              gridDensity={gridDensity}
              onUpdateFunction={updateFunction}
              onUpdateXDomain={setXDomain}
              onUpdateYDomain={setYDomain}
              aspectLocked={aspectLocked}
              onInteractionChange={setIsGraphInteracting}
            />
            
            <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur px-3 py-2 rounded-lg border border-gray-200 text-xs text-gray-500 shadow-sm pointer-events-none">
              <p>
                Showing {data.length} data points across x=[{xDomain[0].toFixed(1)}, {xDomain[1].toFixed(1)}]
              </p>
              <p className="mt-1">
                Scroll to zoom • Drag to pan • Drag points to edit geometry
              </p>
              {isImplicitStale && (
                <p className="mt-1 text-blue-600">
                  Rendering implicit curves...
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
