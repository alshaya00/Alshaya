'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import { FamilyMember } from '@/lib/data';
import { X, ZoomIn, ZoomOut, Maximize2, User, Users } from 'lucide-react';

interface TreeNode extends FamilyMember {
  children?: TreeNode[];
}

interface FamilyTreeGraphProps {
  members: FamilyMember[];
  onSelectMember: (member: FamilyMember) => void;
  highlightedId?: string | null;
}

interface D3TreeNode {
  x: number;
  y: number;
  data: TreeNode;
  parent: D3TreeNode | null;
  children?: D3TreeNode[];
}

const GENERATION_COLORS = {
  1: { primary: '#dc2626', secondary: '#fecaca', gradient: ['#ef4444', '#dc2626'] },
  2: { primary: '#ea580c', secondary: '#fed7aa', gradient: ['#f97316', '#ea580c'] },
  3: { primary: '#d97706', secondary: '#fef3c7', gradient: ['#f59e0b', '#d97706'] },
  4: { primary: '#16a34a', secondary: '#bbf7d0', gradient: ['#22c55e', '#16a34a'] },
  5: { primary: '#0d9488', secondary: '#99f6e4', gradient: ['#14b8a6', '#0d9488'] },
  6: { primary: '#2563eb', secondary: '#bfdbfe', gradient: ['#3b82f6', '#2563eb'] },
  7: { primary: '#4f46e5', secondary: '#c7d2fe', gradient: ['#6366f1', '#4f46e5'] },
  8: { primary: '#9333ea', secondary: '#e9d5ff', gradient: ['#a855f7', '#9333ea'] },
};

export default function FamilyTreeGraph({ members, onSelectMember, highlightedId }: FamilyTreeGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 });
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 0.6 });
  const [hoveredNode, setHoveredNode] = useState<TreeNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Build tree structure
  const treeData = useMemo(() => {
    const memberMap = new Map<string, TreeNode>();

    members.forEach(member => {
      memberMap.set(member.id, { ...member, children: [] });
    });

    let root: TreeNode | null = null;

    memberMap.forEach(node => {
      if (node.fatherId && memberMap.has(node.fatherId)) {
        const parent = memberMap.get(node.fatherId)!;
        if (!parent.children) parent.children = [];
        parent.children.push(node);
      } else if (!node.fatherId) {
        root = node;
      }
    });

    // Sort children by birth year
    const sortChildren = (node: TreeNode) => {
      if (node.children) {
        node.children.sort((a, b) => (a.birthYear || 0) - (b.birthYear || 0));
        node.children.forEach(sortChildren);
      }
    };

    if (root) sortChildren(root);
    return root;
  }, [members]);

  // Handle resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width: Math.max(width, 800), height: Math.max(height, 600) });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // D3 tree layout
  const { nodes, links } = useMemo(() => {
    if (!treeData) return { nodes: [], links: [] };

    const hierarchy = d3.hierarchy<TreeNode>(treeData);
    const treeLayout = d3.tree<TreeNode>()
      .nodeSize([180, 200])
      .separation((a, b) => (a.parent === b.parent ? 1.2 : 1.8));

    const root = treeLayout(hierarchy);
    const nodes = root.descendants() as unknown as D3TreeNode[];
    const links = root.links() as unknown as { source: D3TreeNode; target: D3TreeNode }[];

    return { nodes, links };
  }, [treeData]);

  // Calculate bounds for centering
  const bounds = useMemo(() => {
    if (nodes.length === 0) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    nodes.forEach(node => {
      minX = Math.min(minX, node.x);
      maxX = Math.max(maxX, node.x);
      minY = Math.min(minY, node.y);
      maxY = Math.max(maxY, node.y);
    });

    return { minX, maxX, minY, maxY };
  }, [nodes]);

  // Zoom handlers
  const handleZoom = useCallback((delta: number) => {
    setTransform(prev => ({
      ...prev,
      k: Math.min(2, Math.max(0.1, prev.k + delta))
    }));
  }, []);

  const resetView = useCallback(() => {
    const centerX = dimensions.width / 2;
    const centerY = 100;
    setTransform({ x: centerX, y: centerY, k: 0.6 });
  }, [dimensions]);

  // Initialize view
  useEffect(() => {
    resetView();
  }, [dimensions.width, dimensions.height]);

  // Mouse wheel zoom
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = -e.deltaY * 0.001;
      handleZoom(delta);
    };

    svg.addEventListener('wheel', handleWheel, { passive: false });
    return () => svg.removeEventListener('wheel', handleWheel);
  }, [handleZoom]);

  // Pan handling
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === svgRef.current || (e.target as Element).tagName === 'svg') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setTransform(prev => ({
        ...prev,
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      }));
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Generate curved path for links
  const generateLinkPath = (source: D3TreeNode, target: D3TreeNode) => {
    const midY = (source.y + target.y) / 2;
    return `M ${source.x} ${source.y + 50}
            C ${source.x} ${midY},
              ${target.x} ${midY},
              ${target.x} ${target.y - 50}`;
  };

  const getGenColors = (gen: number) => {
    return GENERATION_COLORS[gen as keyof typeof GENERATION_COLORS] || GENERATION_COLORS[8];
  };

  return (
    <div ref={containerRef} className="relative w-full h-[700px] bg-gradient-to-br from-slate-50 via-white to-slate-100 rounded-xl overflow-hidden border shadow-inner">
      {/* Controls */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
        <button
          onClick={() => handleZoom(0.2)}
          className="p-2 bg-white rounded-lg shadow-md hover:bg-gray-50 transition-colors border"
          title="تكبير"
        >
          <ZoomIn size={20} className="text-gray-600" />
        </button>
        <button
          onClick={() => handleZoom(-0.2)}
          className="p-2 bg-white rounded-lg shadow-md hover:bg-gray-50 transition-colors border"
          title="تصغير"
        >
          <ZoomOut size={20} className="text-gray-600" />
        </button>
        <button
          onClick={resetView}
          className="p-2 bg-white rounded-lg shadow-md hover:bg-gray-50 transition-colors border"
          title="إعادة ضبط"
        >
          <Maximize2 size={20} className="text-gray-600" />
        </button>
      </div>

      {/* Zoom indicator */}
      <div className="absolute top-4 right-4 z-20 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full shadow-md border text-sm text-gray-600">
        {Math.round(transform.k * 100)}%
      </div>

      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className={`cursor-${isPanning ? 'grabbing' : 'grab'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Gradient Definitions */}
        <defs>
          {Object.entries(GENERATION_COLORS).map(([gen, colors]) => (
            <linearGradient key={gen} id={`gen-gradient-${gen}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colors.gradient[0]} />
              <stop offset="100%" stopColor={colors.gradient[1]} />
            </linearGradient>
          ))}
          <linearGradient id="male-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
          <linearGradient id="female-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f472b6" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.15" />
          </filter>
          <filter id="shadow-hover" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="8" stdDeviation="12" floodOpacity="0.25" />
          </filter>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Transform Group */}
        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>
          {/* Links */}
          <g className="links">
            {links.map((link, i) => (
              <path
                key={i}
                d={generateLinkPath(link.source, link.target)}
                fill="none"
                stroke="url(#gen-gradient-${link.target.data.generation})"
                strokeWidth={3}
                strokeOpacity={0.4}
                className="transition-all duration-300"
              />
            ))}
          </g>

          {/* Link connection dots */}
          <g className="link-dots">
            {links.map((link, i) => (
              <g key={i}>
                <circle
                  cx={link.source.x}
                  cy={link.source.y + 50}
                  r={4}
                  fill={getGenColors(link.source.data.generation).primary}
                  opacity={0.6}
                />
                <circle
                  cx={link.target.x}
                  cy={link.target.y - 50}
                  r={4}
                  fill={getGenColors(link.target.data.generation).primary}
                  opacity={0.6}
                />
              </g>
            ))}
          </g>

          {/* Nodes */}
          <g className="nodes">
            {nodes.map((node) => {
              const isHighlighted = node.data.id === highlightedId;
              const isHovered = hoveredNode?.id === node.data.id;
              const genColors = getGenColors(node.data.generation);
              const isMale = node.data.gender === 'Male';

              return (
                <g
                  key={node.data.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  className="cursor-pointer"
                  onClick={() => onSelectMember(node.data)}
                  onMouseEnter={(e) => {
                    setHoveredNode(node.data);
                    const rect = svgRef.current?.getBoundingClientRect();
                    if (rect) {
                      setTooltipPos({
                        x: e.clientX - rect.left,
                        y: e.clientY - rect.top
                      });
                    }
                  }}
                  onMouseLeave={() => setHoveredNode(null)}
                >
                  {/* Highlight ring for searched member */}
                  {isHighlighted && (
                    <rect
                      x={-80}
                      y={-55}
                      width={160}
                      height={110}
                      rx={20}
                      fill="none"
                      stroke="#eab308"
                      strokeWidth={4}
                      filter="url(#glow)"
                      className="animate-pulse"
                    />
                  )}

                  {/* Card background */}
                  <rect
                    x={-70}
                    y={-45}
                    width={140}
                    height={90}
                    rx={16}
                    fill="white"
                    filter={isHovered ? 'url(#shadow-hover)' : 'url(#shadow)'}
                    className="transition-all duration-300"
                    style={{
                      transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                      transformOrigin: 'center'
                    }}
                  />

                  {/* Generation color accent bar */}
                  <rect
                    x={-70}
                    y={-45}
                    width={140}
                    height={6}
                    rx={3}
                    fill={`url(#gen-gradient-${node.data.generation})`}
                  />

                  {/* Avatar circle */}
                  <circle
                    cx={0}
                    cy={-15}
                    r={22}
                    fill={isMale ? 'url(#male-gradient)' : 'url(#female-gradient)'}
                    stroke="white"
                    strokeWidth={3}
                  />

                  {/* Avatar icon */}
                  <text
                    x={0}
                    y={-10}
                    textAnchor="middle"
                    fontSize={18}
                    fill="white"
                  >
                    {isMale ? '♂' : '♀'}
                  </text>

                  {/* Name */}
                  <text
                    x={0}
                    y={18}
                    textAnchor="middle"
                    fontSize={13}
                    fontWeight="bold"
                    fill="#1f2937"
                    className="select-none"
                  >
                    {node.data.firstName}
                  </text>

                  {/* ID & Generation badge */}
                  <g transform="translate(0, 35)">
                    <text
                      x={-25}
                      y={0}
                      textAnchor="middle"
                      fontSize={9}
                      fill="#6b7280"
                    >
                      {node.data.id}
                    </text>

                    <rect
                      x={5}
                      y={-10}
                      width={32}
                      height={16}
                      rx={8}
                      fill={`url(#gen-gradient-${node.data.generation})`}
                    />
                    <text
                      x={21}
                      y={2}
                      textAnchor="middle"
                      fontSize={9}
                      fontWeight="bold"
                      fill="white"
                    >
                      ج{node.data.generation}
                    </text>
                  </g>

                  {/* Children indicator */}
                  {(node.data.sonsCount > 0 || node.data.daughtersCount > 0) && (
                    <g transform="translate(55, -35)">
                      <rect
                        x={-12}
                        y={-8}
                        width={24}
                        height={16}
                        rx={8}
                        fill={isMale ? '#dbeafe' : '#fce7f3'}
                      />
                      <text
                        x={0}
                        y={4}
                        textAnchor="middle"
                        fontSize={9}
                        fontWeight="bold"
                        fill={isMale ? '#2563eb' : '#db2777'}
                      >
                        {node.data.sonsCount + node.data.daughtersCount}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        </g>
      </svg>

      {/* Tooltip */}
      {hoveredNode && (
        <div
          className="absolute z-30 pointer-events-none bg-white rounded-xl shadow-xl border p-4 min-w-[200px] transform -translate-x-1/2"
          style={{
            left: Math.min(Math.max(tooltipPos.x, 120), dimensions.width - 120),
            top: Math.min(tooltipPos.y + 20, dimensions.height - 180)
          }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl border-2 ${
              hoveredNode.gender === 'Male'
                ? 'bg-blue-50 border-blue-300'
                : 'bg-pink-50 border-pink-300'
            }`}>
              {hoveredNode.gender === 'Male' ? '👨' : '👩'}
            </div>
            <div>
              <p className="font-bold text-gray-800">{hoveredNode.firstName}</p>
              <p className="text-xs text-gray-500">{hoveredNode.id}</p>
            </div>
          </div>

          {hoveredNode.fullNameAr && (
            <p className="text-sm text-gray-600 mb-2 bg-gray-50 p-2 rounded-lg">
              {hoveredNode.fullNameAr}
            </p>
          )}

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-green-50 p-2 rounded-lg text-center">
              <span className="font-bold text-green-600 block">ج{hoveredNode.generation}</span>
              <span className="text-gray-500">الجيل</span>
            </div>
            <div className="bg-gray-50 p-2 rounded-lg text-center">
              <span className="font-bold text-gray-700 block">{hoveredNode.branch || 'الأصل'}</span>
              <span className="text-gray-500">الفرع</span>
            </div>
          </div>

          {(hoveredNode.sonsCount > 0 || hoveredNode.daughtersCount > 0) && (
            <div className="flex gap-2 mt-2">
              {hoveredNode.sonsCount > 0 && (
                <div className="flex-1 bg-blue-50 p-2 rounded-lg text-center">
                  <span className="font-bold text-blue-600 block">{hoveredNode.sonsCount}</span>
                  <span className="text-xs text-gray-500">أبناء</span>
                </div>
              )}
              {hoveredNode.daughtersCount > 0 && (
                <div className="flex-1 bg-pink-50 p-2 rounded-lg text-center">
                  <span className="font-bold text-pink-600 block">{hoveredNode.daughtersCount}</span>
                  <span className="text-xs text-gray-500">بنات</span>
                </div>
              )}
            </div>
          )}

          <p className="text-xs text-center text-gray-400 mt-3">انقر للمزيد</p>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 right-4 z-20">
        <div className="bg-white/95 backdrop-blur rounded-xl shadow-md border p-3">
          <p className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1">
            <Users size={14} />
            مفتاح الأجيال
          </p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(GENERATION_COLORS).map(([gen, colors]) => (
              <div
                key={gen}
                className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium text-white"
                style={{ background: `linear-gradient(135deg, ${colors.gradient[0]}, ${colors.gradient[1]})` }}
              >
                الجيل {gen}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-md border text-xs text-gray-500">
        🖱️ سحب للتحريك • 🔍 تمرير للتكبير/التصغير • 👆 انقر على عضو لعرض التفاصيل
      </div>
    </div>
  );
}
