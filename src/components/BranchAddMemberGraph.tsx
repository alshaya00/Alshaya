'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import { FamilyMember } from '@/lib/data';
import { PendingMember } from '@/lib/branchEntry';
import { ZoomIn, ZoomOut, Maximize2, Home, UserPlus, Check } from 'lucide-react';
import { generationColors } from '@/config/theme';

interface TreeNode extends FamilyMember {
  children?: TreeNode[];
  isNewMember?: boolean;
  isTemporary?: boolean;
  isPending?: boolean;
  tempId?: string;
}

interface BranchAddMemberGraphProps {
  branchHead: FamilyMember;
  branchMembers: FamilyMember[];
  pendingMembers: PendingMember[];
  selectedFatherId: string | null;
  onSelectFather: (memberId: string) => void;
  newMemberPreview?: {
    firstName: string;
    gender: 'Male' | 'Female';
  } | null;
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

export default function BranchAddMemberGraph({
  branchHead,
  branchMembers,
  pendingMembers,
  selectedFatherId,
  onSelectFather,
  newMemberPreview
}: BranchAddMemberGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [dimensions, setDimensions] = useState({ width: 1200, height: 500 });
  const [currentZoom, setCurrentZoom] = useState(0.5);
  const [hoveredNode, setHoveredNode] = useState<TreeNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Build tree structure with branch members and pending members
  const treeData = useMemo(() => {
    const memberMap = new Map<string, TreeNode>();

    // Add all branch members (including branch head)
    branchMembers.forEach(member => {
      memberMap.set(member.id, { ...member, children: [] });
    });

    // Add pending members with their tempId
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

    // Add new member preview if we have one and a selected father
    if (newMemberPreview && selectedFatherId && newMemberPreview.firstName) {
      const selectedFather = memberMap.get(selectedFatherId);
      if (selectedFather) {
        const connector = newMemberPreview.gender === 'Male' ? 'بن' : 'بنت';
        const fullNameAr = `${newMemberPreview.firstName} ${connector} ${selectedFather.firstName} آل شايع`;

        const newMemberNode: TreeNode = {
          id: 'NEW_MEMBER',
          firstName: newMemberPreview.firstName || 'عضو جديد',
          fatherName: selectedFather.firstName,
          grandfatherName: selectedFather.fatherName || null,
          greatGrandfatherName: selectedFather.grandfatherName || null,
          familyName: 'آل شايع',
          fatherId: selectedFatherId,
          gender: newMemberPreview.gender,
          generation: selectedFather.generation + 1,
          branch: selectedFather.branch,
          sonsCount: 0,
          daughtersCount: 0,
          status: 'Living',
          birthYear: null,
          fullNameAr: fullNameAr,
          fullNameEn: null,
          phone: null,
          city: null,
          photoUrl: null,
          biography: null,
          occupation: null,
          email: null,
          isNewMember: true,
          isTemporary: true,
          children: []
        };
        memberMap.set('NEW_MEMBER', newMemberNode);
      }
    }

    // Build tree hierarchy
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
          if (a.isNewMember) return 1;
          if (b.isNewMember) return -1;
          if (a.isPending && !b.isPending) return 1;
          if (!a.isPending && b.isPending) return -1;
          return (a.birthYear || 0) - (b.birthYear || 0);
        });
        node.children.forEach(sortChildren);
      }
    };

    // Find the branch head as root
    const root = memberMap.get(branchHead.id);
    if (root) sortChildren(root);
    return root || null;
  }, [branchHead, branchMembers, pendingMembers, selectedFatherId, newMemberPreview]);

  // Handle resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setDimensions({ width: Math.max(width, 600), height: Math.max(height, 400) });
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
      .nodeSize([150, 160])
      .separation((a, b) => (a.parent === b.parent ? 1.1 : 1.5));

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

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform.toString());
        setCurrentZoom(event.transform.k);
      });

    zoomRef.current = zoom;
    svg.call(zoom);

    // Set initial transform - center the tree
    const initialTransform = d3.zoomIdentity
      .translate(dimensions.width / 2, 60)
      .scale(0.55);

    svg.call(zoom.transform, initialTransform);

    return () => {
      svg.on('.zoom', null);
    };
  }, [dimensions.width, dimensions.height]);

  // Zoom to selected father when changed
  useEffect(() => {
    if (!selectedFatherId || !svgRef.current || !zoomRef.current) return;

    const selectedNode = nodes.find(n => n.data.id === selectedFatherId);
    if (!selectedNode) return;

    const svg = d3.select(svgRef.current);
    const targetTransform = d3.zoomIdentity
      .translate(dimensions.width / 2 - selectedNode.x * 0.65, dimensions.height / 3 - selectedNode.y * 0.65)
      .scale(0.65);

    svg.transition().duration(400).call(zoomRef.current.transform, targetTransform);
  }, [selectedFatherId, nodes, dimensions]);

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
      .translate(dimensions.width / 2, 60)
      .scale(0.55);
    svg.transition().duration(500).call(zoomRef.current.transform, resetTransform);
  }, [dimensions.width]);

  const handleFitToScreen = useCallback(() => {
    if (!svgRef.current || !zoomRef.current || nodes.length === 0) return;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    nodes.forEach(node => {
      minX = Math.min(minX, node.x - 70);
      maxX = Math.max(maxX, node.x + 70);
      minY = Math.min(minY, node.y - 45);
      maxY = Math.max(maxY, node.y + 45);
    });

    const treeWidth = maxX - minX;
    const treeHeight = maxY - minY;
    const scale = Math.min(
      (dimensions.width - 80) / treeWidth,
      (dimensions.height - 120) / treeHeight,
      1
    ) * 0.85;

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const svg = d3.select(svgRef.current);
    const fitTransform = d3.zoomIdentity
      .translate(dimensions.width / 2 - centerX * scale, dimensions.height / 2 - centerY * scale)
      .scale(scale);

    svg.transition().duration(500).call(zoomRef.current.transform, fitTransform);
  }, [dimensions, nodes]);

  // Handle node click - allow selecting male members as fathers
  const handleNodeClick = (node: TreeNode) => {
    if (node.isNewMember) return;

    if (node.gender === 'Male') {
      onSelectFather(node.id);
    }
  };

  // Generate orthogonal path for links
  const generateLinkPath = (source: D3TreeNode, target: D3TreeNode) => {
    const sourceY = source.y + 42;
    const targetY = target.y - 42;
    const midY = (sourceY + targetY) / 2;

    return `M ${source.x} ${sourceY}
            L ${source.x} ${midY}
            L ${target.x} ${midY}
            L ${target.x} ${targetY}`;
  };

  const getGenColors = (gen: number) => {
    return GENERATION_COLORS[gen as keyof typeof GENERATION_COLORS] || GENERATION_COLORS[8];
  };

  return (
    <div ref={containerRef} className="relative w-full h-[450px] bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 rounded-2xl overflow-hidden border-2 border-gray-200 shadow-lg">
      {/* Controls */}
      <div className="absolute top-3 left-3 z-20 flex flex-col gap-1.5 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border p-1.5">
        <button
          onClick={handleZoomIn}
          className="p-2 hover:bg-green-50 rounded-lg transition-all"
          title="تكبير"
        >
          <ZoomIn size={18} className="text-gray-600" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 hover:bg-green-50 rounded-lg transition-all"
          title="تصغير"
        >
          <ZoomOut size={18} className="text-gray-600" />
        </button>
        <div className="w-full h-px bg-gray-200" />
        <button
          onClick={handleResetView}
          className="p-2 hover:bg-blue-50 rounded-lg transition-all"
          title="إعادة ضبط"
        >
          <Home size={18} className="text-gray-600" />
        </button>
        <button
          onClick={handleFitToScreen}
          className="p-2 hover:bg-purple-50 rounded-lg transition-all"
          title="ملائمة الشاشة"
        >
          <Maximize2 size={18} className="text-gray-600" />
        </button>
      </div>

      {/* Zoom indicator */}
      <div className="absolute top-3 right-3 z-20 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-lg shadow-lg border text-sm font-medium text-gray-700">
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
            <linearGradient key={gen} id={`branch-gen-gradient-${gen}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={colors.gradient[0]} />
              <stop offset="100%" stopColor={colors.gradient[1]} />
            </linearGradient>
          ))}
          <linearGradient id="branch-male-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
          <linearGradient id="branch-female-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f472b6" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
          <linearGradient id="branch-new-member-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
          <linearGradient id="branch-pending-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
          <filter id="branch-card-shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="3" stdDeviation="6" floodColor="#000" floodOpacity="0.1" />
          </filter>
          <filter id="branch-selected-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feFlood floodColor="#22c55e" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="branch-pending-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feFlood floodColor="#f59e0b" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge>
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
              const genColor = getGenColors(link.target.data.generation);
              const isNewMemberLink = link.target.data.isNewMember;
              const isPendingLink = link.target.data.isPending;

              return (
                <g key={i}>
                  <path
                    d={generateLinkPath(link.source, link.target)}
                    fill="none"
                    stroke={isNewMemberLink ? '#86efac' : isPendingLink ? '#fde68a' : genColor.secondary}
                    strokeWidth={isNewMemberLink ? 8 : 6}
                    strokeOpacity={0.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={isNewMemberLink || isPendingLink ? '6 3' : 'none'}
                  />
                  <path
                    d={generateLinkPath(link.source, link.target)}
                    fill="none"
                    stroke={isNewMemberLink ? '#22c55e' : isPendingLink ? '#f59e0b' : genColor.primary}
                    strokeWidth={isNewMemberLink || isPendingLink ? 3 : 2.5}
                    strokeOpacity={0.9}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={isNewMemberLink || isPendingLink ? '6 3' : 'none'}
                  />
                </g>
              );
            })}
          </g>

          {/* Nodes */}
          <g className="nodes">
            {nodes.map((node) => {
              const isSelected = node.data.id === selectedFatherId;
              const isHovered = hoveredNode?.id === node.data.id;
              const isMale = node.data.gender === 'Male';
              const isNewMember = node.data.isNewMember;
              const isPending = node.data.isPending;
              const isSelectable = isMale && !isNewMember;

              return (
                <g
                  key={node.data.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  className={isSelectable ? 'cursor-pointer' : 'cursor-default'}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNodeClick(node.data);
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
                  {/* Selection/highlight ring */}
                  {(isSelected || isNewMember || isPending) && (
                    <rect
                      x={-62}
                      y={-42}
                      width={124}
                      height={84}
                      rx={16}
                      fill="none"
                      stroke={isNewMember ? '#10b981' : isPending ? '#f59e0b' : '#22c55e'}
                      strokeWidth={isNewMember || isPending ? 2 : 3}
                      filter={isNewMember ? 'url(#branch-selected-glow)' : isPending ? 'url(#branch-pending-glow)' : 'url(#branch-selected-glow)'}
                      className={isNewMember ? 'animate-pulse' : ''}
                    />
                  )}

                  {/* Card background */}
                  <rect
                    x={-55}
                    y={-36}
                    width={110}
                    height={72}
                    rx={12}
                    fill={isNewMember ? '#ecfdf5' : isPending ? '#fefce8' : 'white'}
                    filter="url(#branch-card-shadow)"
                    stroke={isNewMember ? '#34d399' : isPending ? '#fbbf24' : isSelected ? '#22c55e' : isHovered && isSelectable ? '#86efac' : '#e5e7eb'}
                    strokeWidth={isNewMember || isPending ? 2 : isSelected ? 2 : 1}
                    strokeDasharray={isNewMember || isPending ? '4 2' : 'none'}
                  />

                  {/* Generation color accent bar */}
                  <rect
                    x={-55}
                    y={-36}
                    width={110}
                    height={4}
                    fill={isNewMember ? 'url(#branch-new-member-gradient)' : isPending ? 'url(#branch-pending-gradient)' : `url(#branch-gen-gradient-${node.data.generation})`}
                    style={{ clipPath: 'inset(0 0 0 0 round 12px 12px 0 0)' }}
                  />

                  {/* Avatar circle */}
                  <circle
                    cx={0}
                    cy={-10}
                    r={16}
                    fill={isNewMember ? 'url(#branch-new-member-gradient)' : isPending ? 'url(#branch-pending-gradient)' : isMale ? 'url(#branch-male-gradient)' : 'url(#branch-female-gradient)'}
                    stroke="white"
                    strokeWidth={2}
                  />

                  {/* Avatar icon */}
                  <text
                    x={0}
                    y={-6}
                    textAnchor="middle"
                    fontSize={isNewMember ? 12 : 13}
                    fill="white"
                  >
                    {isNewMember ? '+' : isPending ? '⏳' : isMale ? '♂' : '♀'}
                  </text>

                  {/* Name */}
                  <text
                    x={0}
                    y={14}
                    textAnchor="middle"
                    fontSize={10}
                    fontWeight="600"
                    fill={isNewMember ? '#059669' : isPending ? '#d97706' : '#1f2937'}
                    style={{ pointerEvents: 'none' }}
                  >
                    {isNewMember ? (node.data.firstName || 'جديد') : node.data.firstName}
                  </text>

                  {/* Generation badge */}
                  <g transform="translate(0, 26)">
                    <rect
                      x={-14}
                      y={-8}
                      width={28}
                      height={12}
                      rx={6}
                      fill={isNewMember ? 'url(#branch-new-member-gradient)' : isPending ? 'url(#branch-pending-gradient)' : `url(#branch-gen-gradient-${node.data.generation})`}
                    />
                    <text
                      x={0}
                      y={1}
                      textAnchor="middle"
                      fontSize={7}
                      fontWeight="bold"
                      fill="white"
                    >
                      {isNewMember ? 'جديد' : isPending ? 'مضاف' : `ج${node.data.generation}`}
                    </text>
                  </g>

                  {/* Selected indicator */}
                  {isSelected && (
                    <g transform="translate(42, -28)">
                      <circle cx={0} cy={0} r={10} fill="#22c55e" stroke="white" strokeWidth={2} />
                      <Check x={-5} y={-5} size={10} color="white" strokeWidth={3} />
                    </g>
                  )}

                  {/* Click to select indicator for male members */}
                  {isSelectable && !isSelected && isHovered && (
                    <g transform="translate(-42, -28)">
                      <rect x={-22} y={-7} width={44} height={14} rx={7} fill="#22c55e" />
                      <text x={0} y={3} textAnchor="middle" fontSize={7} fontWeight="bold" fill="white">
                        اختر كأب
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
      {hoveredNode && !hoveredNode.isNewMember && (
        <div
          className="absolute z-30 pointer-events-none bg-white rounded-xl shadow-xl border-2 border-gray-100 p-3 min-w-[180px] max-w-[240px]"
          style={{
            left: Math.min(Math.max(tooltipPos.x + 10, 10), dimensions.width - 200),
            top: Math.min(Math.max(tooltipPos.y - 10, 10), dimensions.height - 160),
            transform: tooltipPos.x > dimensions.width / 2 ? 'translateX(-100%)' : 'translateX(0)'
          }}
        >
          <div className="flex items-center gap-2 mb-2 pb-2 border-b">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm border ${
              hoveredNode.isPending
                ? 'bg-yellow-50 border-yellow-300'
                : hoveredNode.gender === 'Male'
                ? 'bg-blue-50 border-blue-300'
                : 'bg-pink-50 border-pink-300'
            }`}>
              {hoveredNode.isPending ? '⏳' : hoveredNode.gender === 'Male' ? '👨' : '👩'}
            </div>
            <div>
              <p className="font-bold text-gray-800 text-sm">{hoveredNode.firstName}</p>
              <p className="text-xs text-gray-400">
                {hoveredNode.isPending ? 'مضاف هذه الجلسة' : `ج${hoveredNode.generation}`}
              </p>
            </div>
          </div>

          {hoveredNode.gender === 'Male' ? (
            <p className="text-xs text-center text-green-600 font-medium">
              {selectedFatherId === hoveredNode.id ? '✓ تم الاختيار' : '👆 انقر للاختيار'}
            </p>
          ) : (
            <p className="text-xs text-center text-gray-400 font-medium">
              لا يمكن اختيار الإناث كأب
            </p>
          )}
        </div>
      )}

      {/* New Member Preview Tooltip */}
      {hoveredNode?.isNewMember && (
        <div
          className="absolute z-30 pointer-events-none bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-xl border-2 border-green-300 p-3 min-w-[180px]"
          style={{
            left: Math.min(Math.max(tooltipPos.x + 10, 10), dimensions.width - 200),
            top: Math.min(Math.max(tooltipPos.y - 10, 10), dimensions.height - 120),
            transform: tooltipPos.x > dimensions.width / 2 ? 'translateX(-100%)' : 'translateX(0)'
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-green-100 border-2 border-green-400">
              <UserPlus size={16} className="text-green-600" />
            </div>
            <div>
              <p className="font-bold text-green-800 text-sm">{hoveredNode.firstName || 'عضو جديد'}</p>
              <p className="text-xs text-green-600">معاينة</p>
            </div>
          </div>
          <p className="text-xs text-center text-green-700 font-medium bg-green-100 rounded-lg py-1.5">
            ج{hoveredNode.generation} • {hoveredNode.gender === 'Male' ? 'ذكر' : 'أنثى'}
          </p>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-3 left-3 right-3 z-20">
        <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border p-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-600">انقر على ♂ لاختياره كأب</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-yellow-400 rounded-full border border-yellow-500" />
                <span className="text-gray-500">مضاف</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-400 rounded-full border border-green-500" />
                <span className="text-gray-500">جديد</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-xl shadow-lg border text-xs text-gray-600 font-medium">
        🖱️ سحب للتحريك • 🔍 تمرير للتكبير • 👆 انقر لاختيار الأب
      </div>
    </div>
  );
}
