'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import { FamilyMember, getGen2Branches } from '@/lib/data';
import { ZoomIn, ZoomOut, Maximize2, Users, Home, GitBranch, Layers } from 'lucide-react';
import { generationColors, lineageColors, rootColor } from '@/config/theme';

interface TreeNode extends FamilyMember {
  children?: TreeNode[];
}

type ColorMode = 'generation' | 'lineage';

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

// Use colors from centralized theme config
const GENERATION_COLORS = generationColors;
const LINEAGE_COLORS = lineageColors;
const ROOT_COLOR = rootColor;

export default function FamilyTreeGraph({ members, onSelectMember, highlightedId }: FamilyTreeGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 700 });
  const [currentZoom, setCurrentZoom] = useState(0.5);
  const [hoveredNode, setHoveredNode] = useState<TreeNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [colorMode, setColorMode] = useState<ColorMode>('generation');

  // Get Gen 2 branches for lineage coloring
  const gen2Branches = useMemo(() => getGen2Branches(), []);

  // Create a mapping of branch ID to color index
  const branchColorMap = useMemo(() => {
    const map = new Map<string, number>();
    gen2Branches.forEach((branch, index) => {
      map.set(branch.id, index % LINEAGE_COLORS.length);
    });
    return map;
  }, [gen2Branches]);

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
        setDimensions({ width: Math.max(width, 600), height: Math.max(height, 500) });
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
      .nodeSize([160, 180])
      .separation((a, b) => (a.parent === b.parent ? 1.1 : 1.6));

    const root = treeLayout(hierarchy);
    const nodes = root.descendants() as unknown as D3TreeNode[];
    const links = root.links() as unknown as { source: D3TreeNode; target: D3TreeNode }[];

    return { nodes, links };
  }, [treeData]);

  // Initialize D3 zoom behavior
  useEffect(() => {
    if (!svgRef.current || !gRef.current) return;

    const svg = d3.select(svgRef.current);
    const g = d3.select(gRef.current);

    // Create zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform.toString());
        setCurrentZoom(event.transform.k);
      });

    zoomRef.current = zoom;
    svg.call(zoom);

    // Set initial transform - center the tree
    const initialTransform = d3.zoomIdentity
      .translate(dimensions.width / 2, 80)
      .scale(0.5);

    svg.call(zoom.transform, initialTransform);

    return () => {
      svg.on('.zoom', null);
    };
  }, [dimensions.width, dimensions.height]);

  // Zoom control functions
  const handleZoomIn = useCallback(() => {
    if (!svgRef.current || !zoomRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().duration(300).call(zoomRef.current.scaleBy, 1.3);
  }, []);

  const handleZoomOut = useCallback(() => {
    if (!svgRef.current || !zoomRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().duration(300).call(zoomRef.current.scaleBy, 0.7);
  }, []);

  const handleResetView = useCallback(() => {
    if (!svgRef.current || !zoomRef.current) return;
    const svg = d3.select(svgRef.current);
    const resetTransform = d3.zoomIdentity
      .translate(dimensions.width / 2, 80)
      .scale(0.5);
    svg.transition().duration(500).call(zoomRef.current.transform, resetTransform);
  }, [dimensions.width]);

  const handleFitToScreen = useCallback(() => {
    if (!svgRef.current || !zoomRef.current || nodes.length === 0) return;

    // Calculate bounds
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    nodes.forEach(node => {
      minX = Math.min(minX, node.x - 80);
      maxX = Math.max(maxX, node.x + 80);
      minY = Math.min(minY, node.y - 50);
      maxY = Math.max(maxY, node.y + 50);
    });

    const treeWidth = maxX - minX;
    const treeHeight = maxY - minY;
    const scale = Math.min(
      (dimensions.width - 100) / treeWidth,
      (dimensions.height - 150) / treeHeight,
      1
    ) * 0.9;

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const svg = d3.select(svgRef.current);
    const fitTransform = d3.zoomIdentity
      .translate(dimensions.width / 2 - centerX * scale, dimensions.height / 2 - centerY * scale)
      .scale(scale);

    svg.transition().duration(500).call(zoomRef.current.transform, fitTransform);
  }, [dimensions, nodes]);

  // Generate orthogonal (right-angled) path for links - clearer for family trees
  const generateLinkPath = (source: D3TreeNode, target: D3TreeNode) => {
    const sourceY = source.y + 50; // Start from bottom of parent card
    const targetY = target.y - 50; // End at top of child card
    const midY = (sourceY + targetY) / 2; // Horizontal connector at midpoint

    return `M ${source.x} ${sourceY}
            L ${source.x} ${midY}
            L ${target.x} ${midY}
            L ${target.x} ${targetY}`;
  };

  const getGenColors = (gen: number) => {
    return GENERATION_COLORS[gen as keyof typeof GENERATION_COLORS] || GENERATION_COLORS[8];
  };

  // Get color based on color mode (generation or lineage)
  const getNodeColors = useCallback((node: TreeNode) => {
    if (colorMode === 'generation') {
      return getGenColors(node.generation);
    } else {
      // Lineage mode - color by Gen 2 branch
      if (node.generation === 1) {
        return ROOT_COLOR; // Root ancestor gets special color
      }
      const branchId = node.lineageBranchId;
      if (branchId && branchColorMap.has(branchId)) {
        const colorIndex = branchColorMap.get(branchId)!;
        return LINEAGE_COLORS[colorIndex];
      }
      return ROOT_COLOR;
    }
  }, [colorMode, branchColorMap]);

  return (
    <div ref={containerRef} className="relative w-full h-[700px] bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 rounded-2xl overflow-hidden border-2 border-gray-200 shadow-lg">
      {/* Controls */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border p-2">
        <button
          onClick={handleZoomIn}
          className="p-2.5 hover:bg-green-50 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
          title="تكبير"
        >
          <ZoomIn size={20} className="text-gray-600" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2.5 hover:bg-green-50 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
          title="تصغير"
        >
          <ZoomOut size={20} className="text-gray-600" />
        </button>
        <div className="w-full h-px bg-gray-200" />
        <button
          onClick={handleResetView}
          className="p-2.5 hover:bg-blue-50 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
          title="إعادة ضبط"
        >
          <Home size={20} className="text-gray-600" />
        </button>
        <button
          onClick={handleFitToScreen}
          className="p-2.5 hover:bg-purple-50 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
          title="ملائمة الشاشة"
        >
          <Maximize2 size={20} className="text-gray-600" />
        </button>
        <div className="w-full h-px bg-gray-200" />
        <button
          onClick={() => setColorMode(colorMode === 'generation' ? 'lineage' : 'generation')}
          className={`p-2.5 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95 ${
            colorMode === 'lineage' ? 'bg-indigo-100 hover:bg-indigo-200' : 'hover:bg-gray-100'
          }`}
          title={colorMode === 'generation' ? 'تلوين حسب السلالة' : 'تلوين حسب الجيل'}
        >
          {colorMode === 'generation' ? (
            <GitBranch size={20} className="text-gray-600" />
          ) : (
            <Layers size={20} className="text-indigo-600" />
          )}
        </button>
      </div>

      {/* Zoom indicator */}
      <div className="absolute top-4 right-4 z-20 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-xl shadow-lg border text-sm font-medium text-gray-700">
        {Math.round(currentZoom * 100)}%
      </div>

      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="cursor-grab active:cursor-grabbing"
        style={{ touchAction: 'none' }}
      >
        {/* Gradient Definitions */}
        <defs>
          {Object.entries(GENERATION_COLORS).map(([gen, colors]) => (
            <linearGradient key={gen} id={`gen-gradient-${gen}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colors.gradient[0]} />
              <stop offset="100%" stopColor={colors.gradient[1]} />
            </linearGradient>
          ))}
          {/* Lineage branch gradients */}
          {LINEAGE_COLORS.map((colors, index) => (
            <linearGradient key={`lineage-${index}`} id={`lineage-gradient-${index}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colors.gradient[0]} />
              <stop offset="100%" stopColor={colors.gradient[1]} />
            </linearGradient>
          ))}
          <linearGradient id="root-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={ROOT_COLOR.gradient[0]} />
            <stop offset="100%" stopColor={ROOT_COLOR.gradient[1]} />
          </linearGradient>
          <linearGradient id="male-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
          <linearGradient id="female-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f472b6" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
          <filter id="card-shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#000" floodOpacity="0.1" />
          </filter>
          <filter id="card-shadow-hover" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="8" stdDeviation="16" floodColor="#000" floodOpacity="0.15" />
          </filter>
          <filter id="glow-highlight" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feFlood floodColor="#fbbf24" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Transform Group - controlled by D3 zoom */}
        <g ref={gRef}>
          {/* Links */}
          <g className="links">
            {links.map((link, i) => {
              const nodeColors = getNodeColors(link.target.data);
              return (
                <g key={i}>
                  {/* Shadow/glow line for depth */}
                  <path
                    d={generateLinkPath(link.source, link.target)}
                    fill="none"
                    stroke={nodeColors.secondary}
                    strokeWidth={8}
                    strokeOpacity={0.4}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {/* Main visible line */}
                  <path
                    d={generateLinkPath(link.source, link.target)}
                    fill="none"
                    stroke={nodeColors.primary}
                    strokeWidth={3}
                    strokeOpacity={0.85}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              );
            })}
          </g>

          {/* Link connection dots */}
          <g className="link-dots">
            {links.map((link, i) => (
              <g key={i}>
                {/* Source connection point (bottom of parent) */}
                <circle
                  cx={link.source.x}
                  cy={link.source.y + 50}
                  r={5}
                  fill={getNodeColors(link.source.data).primary}
                  stroke="white"
                  strokeWidth={2}
                />
                {/* Target connection point (top of child) */}
                <circle
                  cx={link.target.x}
                  cy={link.target.y - 50}
                  r={5}
                  fill={getNodeColors(link.target.data).primary}
                  stroke="white"
                  strokeWidth={2}
                />
              </g>
            ))}
          </g>

          {/* Nodes */}
          <g className="nodes">
            {nodes.map((node) => {
              const isHighlighted = node.data.id === highlightedId;
              const isHovered = hoveredNode?.id === node.data.id;
              const isMale = node.data.gender === 'Male';
              const nodeColors = getNodeColors(node.data);

              // Get gradient ID based on color mode
              const getGradientId = () => {
                if (colorMode === 'generation') {
                  return `gen-gradient-${node.data.generation}`;
                } else {
                  if (node.data.generation === 1) return 'root-gradient';
                  const branchId = node.data.lineageBranchId;
                  if (branchId && branchColorMap.has(branchId)) {
                    return `lineage-gradient-${branchColorMap.get(branchId)}`;
                  }
                  return 'root-gradient';
                }
              };

              return (
                <g
                  key={node.data.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  className="cursor-pointer"
                  style={{ transition: 'transform 0.2s ease-out' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectMember(node.data);
                  }}
                  onMouseEnter={(e) => {
                    setHoveredNode(node.data);
                    const rect = containerRef.current?.getBoundingClientRect();
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
                      x={-72}
                      y={-50}
                      width={144}
                      height={100}
                      rx={18}
                      fill="none"
                      stroke="#fbbf24"
                      strokeWidth={4}
                      filter="url(#glow-highlight)"
                      className="animate-pulse"
                    />
                  )}

                  {/* Card background */}
                  <rect
                    x={-65}
                    y={-42}
                    width={130}
                    height={84}
                    rx={14}
                    fill="white"
                    filter={isHovered ? 'url(#card-shadow-hover)' : 'url(#card-shadow)'}
                    stroke={isHovered ? '#22c55e' : '#e5e7eb'}
                    strokeWidth={isHovered ? 2 : 1}
                  />

                  {/* Color accent bar (by generation or lineage) */}
                  <rect
                    x={-65}
                    y={-42}
                    width={130}
                    height={5}
                    fill={`url(#${getGradientId()})`}
                    style={{ clipPath: 'inset(0 0 0 0 round 14px 14px 0 0)' }}
                  />

                  {/* Avatar circle */}
                  <circle
                    cx={0}
                    cy={-12}
                    r={20}
                    fill={isMale ? 'url(#male-gradient)' : 'url(#female-gradient)'}
                    stroke="white"
                    strokeWidth={3}
                  />

                  {/* Avatar icon */}
                  <text
                    x={0}
                    y={-7}
                    textAnchor="middle"
                    fontSize={16}
                    fill="white"
                  >
                    {isMale ? '♂' : '♀'}
                  </text>

                  {/* Name */}
                  <text
                    x={0}
                    y={18}
                    textAnchor="middle"
                    fontSize={12}
                    fontWeight="600"
                    fill="#1f2937"
                    style={{ pointerEvents: 'none' }}
                  >
                    {node.data.firstName}
                  </text>

                  {/* ID & badge */}
                  <g transform="translate(0, 32)">
                    <text
                      x={-22}
                      y={0}
                      textAnchor="middle"
                      fontSize={8}
                      fill="#9ca3af"
                    >
                      {node.data.id}
                    </text>

                    <rect
                      x={8}
                      y={-9}
                      width={colorMode === 'lineage' && node.data.lineageBranchName ? 40 : 28}
                      height={14}
                      rx={7}
                      fill={`url(#${getGradientId()})`}
                    />
                    <text
                      x={colorMode === 'lineage' && node.data.lineageBranchName ? 28 : 22}
                      y={2}
                      textAnchor="middle"
                      fontSize={8}
                      fontWeight="bold"
                      fill="white"
                    >
                      {colorMode === 'generation'
                        ? `ج${node.data.generation}`
                        : node.data.lineageBranchName
                          ? `${node.data.lineageBranchName.slice(0, 4)}`
                          : 'جذر'}
                    </text>
                  </g>

                  {/* Children indicator */}
                  {(node.data.sonsCount > 0 || node.data.daughtersCount > 0) && (
                    <g transform="translate(50, -32)">
                      <circle
                        cx={0}
                        cy={0}
                        r={10}
                        fill={isMale ? '#dbeafe' : '#fce7f3'}
                        stroke={isMale ? '#93c5fd' : '#f9a8d4'}
                        strokeWidth={1}
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
          className="absolute z-30 pointer-events-none bg-white rounded-xl shadow-2xl border-2 border-gray-100 p-4 min-w-[220px] max-w-[280px]"
          style={{
            left: Math.min(Math.max(tooltipPos.x + 15, 20), dimensions.width - 260),
            top: Math.min(Math.max(tooltipPos.y - 10, 20), dimensions.height - 200),
            transform: tooltipPos.x > dimensions.width / 2 ? 'translateX(-100%)' : 'translateX(0)'
          }}
        >
          <div className="flex items-center gap-3 mb-3 pb-3 border-b">
            <div className={`w-11 h-11 rounded-full flex items-center justify-center text-xl border-2 shadow-sm ${
              hoveredNode.gender === 'Male'
                ? 'bg-blue-50 border-blue-300'
                : 'bg-pink-50 border-pink-300'
            }`}>
              {hoveredNode.gender === 'Male' ? '👨' : '👩'}
            </div>
            <div>
              <p className="font-bold text-gray-800">{hoveredNode.firstName}</p>
              <p className="text-xs text-gray-400">{hoveredNode.id}</p>
            </div>
          </div>

          {hoveredNode.fullNameAr && (
            <p className="text-sm text-gray-600 mb-3 bg-gray-50 p-2.5 rounded-lg leading-relaxed">
              {hoveredNode.fullNameAr}
            </p>
          )}

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-green-50 p-2.5 rounded-lg text-center">
              <span className="font-bold text-green-600 block text-sm">ج{hoveredNode.generation}</span>
              <span className="text-gray-500">الجيل</span>
            </div>
            <div className="bg-gray-50 p-2.5 rounded-lg text-center">
              <span className="font-bold text-gray-700 block text-sm">{hoveredNode.branch || 'الأصل'}</span>
              <span className="text-gray-500">الفرع</span>
            </div>
          </div>

          {/* Lineage info */}
          {hoveredNode.lineageBranchName && (
            <div className="mt-2 bg-indigo-50 p-2.5 rounded-lg text-center">
              <span className="font-bold text-indigo-600 block text-sm">فرع {hoveredNode.lineageBranchName}</span>
              <span className="text-gray-500 text-xs">السلالة</span>
            </div>
          )}

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

          <p className="text-xs text-center text-green-600 mt-3 font-medium">👆 انقر للمزيد</p>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 right-4 z-20">
        <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border p-3">
          <p className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1.5">
            {colorMode === 'generation' ? (
              <>
                <Layers size={14} />
                مفتاح الأجيال
              </>
            ) : (
              <>
                <GitBranch size={14} />
                مفتاح السلالات (الجيل الثاني)
              </>
            )}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {colorMode === 'generation' ? (
              // Generation colors legend
              Object.entries(GENERATION_COLORS).map(([gen, colors]) => (
                <div
                  key={gen}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-white shadow-sm"
                  style={{ background: `linear-gradient(135deg, ${colors.gradient[0]}, ${colors.gradient[1]})` }}
                >
                  الجيل {gen}
                </div>
              ))
            ) : (
              // Lineage branches legend
              <>
                <div
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-white shadow-sm"
                  style={{ background: `linear-gradient(135deg, ${ROOT_COLOR.gradient[0]}, ${ROOT_COLOR.gradient[1]})` }}
                >
                  الجذر
                </div>
                {gen2Branches.map((branch, index) => {
                  const colors = LINEAGE_COLORS[index % LINEAGE_COLORS.length];
                  return (
                    <div
                      key={branch.id}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-white shadow-sm"
                      style={{ background: `linear-gradient(135deg, ${colors.gradient[0]}, ${colors.gradient[1]})` }}
                    >
                      فرع {branch.firstName}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-white/95 backdrop-blur-sm px-5 py-2.5 rounded-xl shadow-lg border text-xs text-gray-600 font-medium">
        🖱️ سحب للتحريك • 🔍 تمرير للتكبير • 👆 انقر لعرض التفاصيل
      </div>
    </div>
  );
}
