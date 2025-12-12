'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import { FamilyMember } from '@/lib/data';
import { PendingMember } from '@/lib/branchEntry';
import { ZoomIn, ZoomOut, Maximize2, Home, X, Users, Eye } from 'lucide-react';

interface TreeNode extends FamilyMember {
  children?: TreeNode[];
  isPending?: boolean;
  tempId?: string;
}

interface BranchTreeViewerProps {
  branchHead: FamilyMember;
  allMembers: FamilyMember[];
  pendingMembers: PendingMember[];
  isOpen: boolean;
  onClose: () => void;
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

export default function BranchTreeViewer({
  branchHead,
  allMembers,
  pendingMembers,
  isOpen,
  onClose
}: BranchTreeViewerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 700 });
  const [currentZoom, setCurrentZoom] = useState(0.5);
  const [hoveredNode, setHoveredNode] = useState<TreeNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Get branch descendants
  const branchMembers = useMemo(() => {
    const getDescendants = (memberId: string): FamilyMember[] => {
      const children = allMembers.filter(m => m.fatherId === memberId);
      let descendants = [...children];
      children.forEach(child => {
        descendants = [...descendants, ...getDescendants(child.id)];
      });
      return descendants;
    };

    return [branchHead, ...getDescendants(branchHead.id)];
  }, [branchHead, allMembers]);

  // Build tree structure with branch members and pending members
  const treeData = useMemo(() => {
    const memberMap = new Map<string, TreeNode>();

    // Add all branch members
    branchMembers.forEach(member => {
      memberMap.set(member.id, { ...member, children: [] });
    });

    // Add pending members
    pendingMembers.filter(p => p.status === 'pending').forEach(pending => {
      const pendingNode: TreeNode = {
        id: pending.tempId,
        tempId: pending.tempId,
        firstName: pending.firstName,
        fatherName: pending.fatherName,
        grandfatherName: null,
        greatGrandfatherName: null,
        familyName: 'آل شايع',
        fatherId: pending.fatherId,
        gender: pending.gender,
        generation: pending.generation,
        branch: pending.branch,
        sonsCount: 0,
        daughtersCount: 0,
        status: 'Living',
        birthYear: pending.birthYear || null,
        fullNameAr: pending.fullNameAr,
        fullNameEn: null,
        phone: pending.phone || null,
        city: pending.city || null,
        photoUrl: null,
        biography: null,
        occupation: null,
        email: null,
        isPending: true,
        children: []
      };
      memberMap.set(pending.tempId, pendingNode);
    });

    // Build hierarchy
    memberMap.forEach(node => {
      if (node.fatherId && memberMap.has(node.fatherId)) {
        const parent = memberMap.get(node.fatherId)!;
        if (!parent.children) parent.children = [];
        parent.children.push(node);
      }
    });

    // Sort children
    const sortChildren = (node: TreeNode) => {
      if (node.children) {
        node.children.sort((a, b) => {
          if (a.isPending && !b.isPending) return 1;
          if (!a.isPending && b.isPending) return -1;
          return (a.birthYear || 0) - (b.birthYear || 0);
        });
        node.children.forEach(sortChildren);
      }
    };

    const root = memberMap.get(branchHead.id);
    if (root) sortChildren(root);
    return root || null;
  }, [branchHead, branchMembers, pendingMembers]);

  // Handle resize
  useEffect(() => {
    if (!isOpen) return;

    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width: Math.max(width, 600), height: Math.max(height, 500) });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [isOpen]);

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
    if (!isOpen || !svgRef.current || !gRef.current) return;

    const svg = d3.select(svgRef.current);
    const g = d3.select(gRef.current);

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform.toString());
        setCurrentZoom(event.transform.k);
      });

    zoomRef.current = zoom;
    svg.call(zoom);

    // Fit to screen on open
    setTimeout(() => {
      if (nodes.length > 0) {
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
        ) * 0.85;

        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        const fitTransform = d3.zoomIdentity
          .translate(dimensions.width / 2 - centerX * scale, dimensions.height / 2 - centerY * scale)
          .scale(scale);

        svg.call(zoom.transform, fitTransform);
      }
    }, 100);

    return () => {
      svg.on('.zoom', null);
    };
  }, [isOpen, dimensions, nodes]);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, 1.3);
  }, []);

  const handleZoomOut = useCallback(() => {
    if (!svgRef.current || !zoomRef.current) return;
    d3.select(svgRef.current).transition().duration(300).call(zoomRef.current.scaleBy, 0.7);
  }, []);

  const handleFitToScreen = useCallback(() => {
    if (!svgRef.current || !zoomRef.current || nodes.length === 0) return;

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
    ) * 0.85;

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const fitTransform = d3.zoomIdentity
      .translate(dimensions.width / 2 - centerX * scale, dimensions.height / 2 - centerY * scale)
      .scale(scale);

    d3.select(svgRef.current).transition().duration(500).call(zoomRef.current.transform, fitTransform);
  }, [dimensions, nodes]);

  // Generate orthogonal path
  const generateLinkPath = (source: D3TreeNode, target: D3TreeNode) => {
    const sourceY = source.y + 50;
    const targetY = target.y - 50;
    const midY = (sourceY + targetY) / 2;
    return `M ${source.x} ${sourceY} L ${source.x} ${midY} L ${target.x} ${midY} L ${target.x} ${targetY}`;
  };

  const getGenColors = (gen: number) => {
    return GENERATION_COLORS[gen as keyof typeof GENERATION_COLORS] || GENERATION_COLORS[8];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-l from-green-500 to-green-600 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Eye size={24} />
            <div>
              <h2 className="font-bold text-lg">عرض شجرة الفرع</h2>
              <p className="text-green-100 text-sm">
                فرع {branchHead.firstName} • {branchMembers.length} عضو
                {pendingMembers.length > 0 && ` + ${pendingMembers.length} جديد`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-xl transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Graph Container */}
        <div ref={containerRef} className="flex-1 relative bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
          {/* Controls */}
          <div className="absolute top-4 left-4 z-20 flex flex-col gap-2 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border p-2">
            <button onClick={handleZoomIn} className="p-2.5 hover:bg-green-50 rounded-lg" title="تكبير">
              <ZoomIn size={20} className="text-gray-600" />
            </button>
            <button onClick={handleZoomOut} className="p-2.5 hover:bg-green-50 rounded-lg" title="تصغير">
              <ZoomOut size={20} className="text-gray-600" />
            </button>
            <div className="w-full h-px bg-gray-200" />
            <button onClick={handleFitToScreen} className="p-2.5 hover:bg-purple-50 rounded-lg" title="ملائمة الشاشة">
              <Maximize2 size={20} className="text-gray-600" />
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
            <defs>
              {Object.entries(GENERATION_COLORS).map(([gen, colors]) => (
                <linearGradient key={gen} id={`viewer-gen-gradient-${gen}`} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={colors.gradient[0]} />
                  <stop offset="100%" stopColor={colors.gradient[1]} />
                </linearGradient>
              ))}
              <linearGradient id="viewer-male-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#60a5fa" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
              <linearGradient id="viewer-female-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f472b6" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
              <linearGradient id="viewer-pending-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>
              <filter id="viewer-card-shadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#000" floodOpacity="0.1" />
              </filter>
              <filter id="viewer-pending-glow" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feFlood floodColor="#f59e0b" result="color" />
                <feComposite in="color" in2="blur" operator="in" result="glow" />
                <feMerge>
                  <feMergeNode in="glow" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <g ref={gRef}>
              {/* Links */}
              <g className="links">
                {links.map((link, i) => {
                  const genColor = getGenColors(link.target.data.generation);
                  const isPending = link.target.data.isPending;
                  return (
                    <g key={i}>
                      <path
                        d={generateLinkPath(link.source, link.target)}
                        fill="none"
                        stroke={isPending ? '#fde68a' : genColor.secondary}
                        strokeWidth={8}
                        strokeOpacity={0.4}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeDasharray={isPending ? '8 4' : 'none'}
                      />
                      <path
                        d={generateLinkPath(link.source, link.target)}
                        fill="none"
                        stroke={isPending ? '#f59e0b' : genColor.primary}
                        strokeWidth={3}
                        strokeOpacity={0.85}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeDasharray={isPending ? '8 4' : 'none'}
                      />
                    </g>
                  );
                })}
              </g>

              {/* Connection dots */}
              <g className="link-dots">
                {links.map((link, i) => (
                  <g key={i}>
                    <circle
                      cx={link.source.x}
                      cy={link.source.y + 50}
                      r={5}
                      fill={getGenColors(link.source.data.generation).primary}
                      stroke="white"
                      strokeWidth={2}
                    />
                    <circle
                      cx={link.target.x}
                      cy={link.target.y - 50}
                      r={5}
                      fill={link.target.data.isPending ? '#f59e0b' : getGenColors(link.target.data.generation).primary}
                      stroke="white"
                      strokeWidth={2}
                    />
                  </g>
                ))}
              </g>

              {/* Nodes */}
              <g className="nodes">
                {nodes.map((node) => {
                  const isHovered = hoveredNode?.id === node.data.id;
                  const isMale = node.data.gender === 'Male';
                  const isPending = node.data.isPending;

                  return (
                    <g
                      key={node.data.id}
                      transform={`translate(${node.x}, ${node.y})`}
                      onMouseEnter={(e) => {
                        setHoveredNode(node.data);
                        const rect = containerRef.current?.getBoundingClientRect();
                        if (rect) {
                          setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                        }
                      }}
                      onMouseLeave={() => setHoveredNode(null)}
                    >
                      {/* Pending highlight */}
                      {isPending && (
                        <rect
                          x={-72}
                          y={-50}
                          width={144}
                          height={100}
                          rx={18}
                          fill="none"
                          stroke="#f59e0b"
                          strokeWidth={3}
                          strokeDasharray="6 3"
                          filter="url(#viewer-pending-glow)"
                        />
                      )}

                      {/* Card */}
                      <rect
                        x={-65}
                        y={-42}
                        width={130}
                        height={84}
                        rx={14}
                        fill={isPending ? '#fefce8' : 'white'}
                        filter="url(#viewer-card-shadow)"
                        stroke={isPending ? '#fbbf24' : isHovered ? '#22c55e' : '#e5e7eb'}
                        strokeWidth={isPending ? 2 : 1}
                      />

                      {/* Generation bar */}
                      <rect
                        x={-65}
                        y={-42}
                        width={130}
                        height={5}
                        fill={isPending ? 'url(#viewer-pending-gradient)' : `url(#viewer-gen-gradient-${node.data.generation})`}
                        style={{ clipPath: 'inset(0 0 0 0 round 14px 14px 0 0)' }}
                      />

                      {/* Avatar */}
                      <circle
                        cx={0}
                        cy={-12}
                        r={20}
                        fill={isPending ? 'url(#viewer-pending-gradient)' : isMale ? 'url(#viewer-male-gradient)' : 'url(#viewer-female-gradient)'}
                        stroke="white"
                        strokeWidth={3}
                      />

                      {/* Icon */}
                      <text x={0} y={-7} textAnchor="middle" fontSize={16} fill="white">
                        {isPending ? '⏳' : isMale ? '♂' : '♀'}
                      </text>

                      {/* Name */}
                      <text
                        x={0}
                        y={18}
                        textAnchor="middle"
                        fontSize={12}
                        fontWeight="600"
                        fill={isPending ? '#d97706' : '#1f2937'}
                      >
                        {node.data.firstName}
                      </text>

                      {/* ID & Gen badge */}
                      <g transform="translate(0, 32)">
                        <text x={-22} y={0} textAnchor="middle" fontSize={8} fill="#9ca3af">
                          {isPending ? 'جديد' : node.data.id}
                        </text>
                        <rect
                          x={8}
                          y={-9}
                          width={28}
                          height={14}
                          rx={7}
                          fill={isPending ? 'url(#viewer-pending-gradient)' : `url(#viewer-gen-gradient-${node.data.generation})`}
                        />
                        <text x={22} y={2} textAnchor="middle" fontSize={8} fontWeight="bold" fill="white">
                          ج{node.data.generation}
                        </text>
                      </g>

                      {/* Children count */}
                      {(node.data.sonsCount > 0 || node.data.daughtersCount > 0) && (
                        <g transform="translate(50, -32)">
                          <circle
                            cx={0}
                            cy={0}
                            r={10}
                            fill={isMale ? '#dbeafe' : '#fce7f3'}
                            stroke={isMale ? '#93c5fd' : '#f9a8d4'}
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
              className="absolute z-30 pointer-events-none bg-white rounded-xl shadow-2xl border-2 border-gray-100 p-4 min-w-[200px]"
              style={{
                left: Math.min(Math.max(tooltipPos.x + 15, 20), dimensions.width - 220),
                top: Math.min(Math.max(tooltipPos.y - 10, 20), dimensions.height - 180),
                transform: tooltipPos.x > dimensions.width / 2 ? 'translateX(-100%)' : 'translateX(0)'
              }}
            >
              <div className="flex items-center gap-3 mb-2 pb-2 border-b">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 ${
                  hoveredNode.isPending
                    ? 'bg-yellow-50 border-yellow-300'
                    : hoveredNode.gender === 'Male'
                    ? 'bg-blue-50 border-blue-300'
                    : 'bg-pink-50 border-pink-300'
                }`}>
                  {hoveredNode.isPending ? '⏳' : hoveredNode.gender === 'Male' ? '👨' : '👩'}
                </div>
                <div>
                  <p className="font-bold text-gray-800">{hoveredNode.firstName}</p>
                  <p className="text-xs text-gray-400">
                    {hoveredNode.isPending ? 'مضاف هذه الجلسة' : hoveredNode.id}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 text-xs">
                <div className="bg-green-50 px-3 py-1.5 rounded-lg">
                  <span className="font-bold text-green-600">ج{hoveredNode.generation}</span>
                </div>
                <div className="bg-gray-50 px-3 py-1.5 rounded-lg flex-1 text-center">
                  <span className="text-gray-600">{hoveredNode.gender === 'Male' ? 'ذكر' : 'أنثى'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="absolute bottom-4 left-4 right-4 z-20">
            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border p-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded-full bg-blue-500" />
                    <span className="text-xs text-gray-600">ذكر</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded-full bg-pink-500" />
                    <span className="text-xs text-gray-600">أنثى</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded-full bg-amber-400 border-2 border-amber-500 border-dashed" />
                    <span className="text-xs text-gray-600">مضاف جديد</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Users size={14} />
                  <span>{branchMembers.length + pendingMembers.length} عضو في الفرع</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
